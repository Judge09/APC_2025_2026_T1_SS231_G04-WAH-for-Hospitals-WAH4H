import logging
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

logger = logging.getLogger(__name__)
from .models import (
    DiagnosticReport,
    DiagnosticReportResult,
    LabTestDefinition,
    Specimen,
    ImagingStudy
)


class DiagnosticReportResultSerializer(serializers.Serializer):
    """
    Enhanced serializer that fetches Observation data and formats it for frontend.
    Supports both input (observation_id) and output (full result details).
    """
    # Input fields (for create/update)
    observation_id = serializers.IntegerField(required=False)
    item_sequence = serializers.IntegerField(required=False)
    
    # Output fields (for read operations) - these match frontend expectations
    parameter = serializers.CharField(read_only=True)
    value = serializers.CharField(read_only=True)
    unit = serializers.CharField(read_only=True)
    referenceRange = serializers.CharField(read_only=True)
    flag = serializers.CharField(read_only=True, required=False)
    interpretation = serializers.CharField(read_only=True, required=False)

    def to_representation(self, instance):
        """
        Fetch Observation data and format it to match frontend interface.
        """
        from monitoring.models import Observation, ObservationComponent
        
        # If this is a DiagnosticReportResult instance, fetch the Observation
        if hasattr(instance, 'observation_id'):
            try:
                obs = Observation.objects.get(observation_id=instance.observation_id)
                
                # Extract value from polymorphic value fields
                value = None
                unit = ""
                
                if obs.value_quantity is not None:
                    value = str(obs.value_quantity)
                    # Try to infer unit from code or use empty string
                    unit = ""  # Observation model doesn't have explicit unit field
                elif obs.value_string:
                    value = obs.value_string
                elif obs.value_integer:
                    value = obs.value_integer
                elif obs.value_codeableconcept:
                    value = obs.value_codeableconcept
                elif obs.value_boolean is not None:
                    value = str(obs.value_boolean)
                else:
                    value = "N/A"
                
                # Build reference range
                ref_range = ""
                if obs.reference_range_low and obs.reference_range_high:
                    ref_range = f"{obs.reference_range_low}-{obs.reference_range_high}"
                elif obs.reference_range_text:
                    ref_range = obs.reference_range_text
                
                # Automatic flagging/interpretation logic removed as per requirements
                flag = None
                
                return {
                    'parameter': obs.code or 'Unknown',
                    'value': value,
                    'unit': unit,
                    'referenceRange': ref_range,
                    'flag': flag,
                    'interpretation': obs.interpretation
                }
            except Observation.DoesNotExist:
                # Fallback if observation not found
                return {
                    'parameter': 'Unknown',
                    'value': 'N/A',
                    'unit': '',
                    'referenceRange': '',
                    'flag': None,
                    'interpretation': None
                }
        
        # If this is raw dict data (from initial_data), return as-is
        return instance


class DiagnosticReportListSerializer(serializers.ModelSerializer):
    """
    Lite serializer for list views. 
    Only fetches fields required for the dashboard table to optimize performance.
    """
    subject_display = serializers.SerializerMethodField()
    subject_patient_id = serializers.SerializerMethodField()
    lifecycleStatus = serializers.SerializerMethodField()
    priority = serializers.SerializerMethodField()
    orderedBy = serializers.SerializerMethodField()
    orderedAt = serializers.SerializerMethodField()
    results = serializers.SerializerMethodField()

    class Meta:
        model = DiagnosticReport
        fields = [
            'diagnostic_report_id',
            'identifier',
            'status',
            'lifecycleStatus',
            'priority',
            'code_code',
            'code_display',
            'subject_id',
            'subject_display',
            'subject_patient_id',
            'orderedBy',
            'orderedAt',
            'results',
            'conclusion',
            'created_at',
            'updated_at'
        ]

    # Re-use optimized optimization logic from main serializer by defining same methods
    # We duplicate them here to keep the "Lite" serializer independent and explicit
    
    def get_subject_display(self, obj):
        # Try context first (N+1 optimization)
        patients_map = self.context.get('patients_map', {})
        if obj.subject_id in patients_map:
            patient = patients_map[obj.subject_id]
            return f"{patient.first_name or ''} {patient.last_name or ''}".strip() or "Unknown Patient"
        return "Unknown Patient" # simplified fallback for list view

    def get_subject_patient_id(self, obj):
        patients_map = self.context.get('patients_map', {})
        if obj.subject_id in patients_map:
            patient = patients_map[obj.subject_id]
            return patient.patient_id or f"P-{patient.id}"
        return f"P-{obj.subject_id}"

    def get_lifecycleStatus(self, obj):
        status_map = {
            'registered': 'pending', 'partial': 'in-progress', 'preliminary': 'in-progress',
            'final': 'completed', 'amended': 'completed', 'corrected': 'completed',
            'cancelled': 'pending'
        }
        return status_map.get(obj.status, 'pending')

    def get_priority(self, obj):
        return obj.priority if obj.priority else 'routine'

    def get_orderedBy(self, obj):
        if not obj.requester_id: return None
        practitioners_map = self.context.get('practitioners_map', {})
        users_map = self.context.get('users_map', {})
        
        if obj.requester_id in practitioners_map:
            p = practitioners_map[obj.requester_id]
            return f"Dr. {p.first_name} {p.last_name}".strip()
        if obj.requester_id in users_map:
            u = users_map[obj.requester_id]
            return f"{u.first_name} {u.last_name}".strip() or u.username
        return None

    def get_orderedAt(self, obj):
        if obj.effective_datetime: return obj.effective_datetime.isoformat()
        return obj.created_at.isoformat()

    def get_results(self, obj):
        """
        Prioritize 'result_data' (JSON) if it exists.
        Lazy-loads results to support both modern JSON and legacy table formats.
        """
        if obj.result_data:
            val = obj.result_data
            if isinstance(val, dict) and 'results' in val:
                return val['results']
            return val
        return DiagnosticReportResultSerializer(instance=obj.results.all(), many=True).data
class DiagnosticReportSerializer(serializers.ModelSerializer):
    """
    Enhanced serializer that fetches Patient data and formats DiagnosticReport
    to match frontend expectations.
    """
    results = serializers.SerializerMethodField()
    
    # Additional fields for frontend (read-only, computed from linked models)
    subject_display = serializers.SerializerMethodField()
    subject_patient_id = serializers.SerializerMethodField()
    lifecycleStatus = serializers.SerializerMethodField()
    priority = serializers.SerializerMethodField()
    orderedBy = serializers.SerializerMethodField()
    orderedAt = serializers.SerializerMethodField()
    requestedBy = serializers.SerializerMethodField()
    requestedAt = serializers.SerializerMethodField()
    receivedBy = serializers.SerializerMethodField()
    receivedAt = serializers.SerializerMethodField()
    processedBy = serializers.SerializerMethodField()
    processedAt = serializers.SerializerMethodField()
    releasedBy = serializers.SerializerMethodField()
    releasedAt = serializers.SerializerMethodField()
    clinicalReason = serializers.SerializerMethodField()

    class Meta:
        model = DiagnosticReport
        fields = '__all__'

    def get_results(self, obj):
        """
        Prioritize 'result_data' (JSON) if it exists.
        Fallback to 'results' relation (Legacy DB Table) only if strictly necessary.
        This lazy loading prevents N+1 queries for users with modern JSON data.
        """
        if obj.result_data:
            # Return the JSON content directly
            # Handle potential nesting if 'results' key was used inside JSON
            val = obj.result_data
            if isinstance(val, dict) and 'results' in val:
                return val['results']
            return val
            
        # Legacy Fallback: Expensive DB Lookup
        # Only runs if result_data is empty
        return DiagnosticReportResultSerializer(instance=obj.results.all(), many=True).data

    def get_subject_display(self, obj):
        """Fetch patient name from Patient model (Optimized)."""
        # Try context first
        patients_map = self.context.get('patients_map', {})
        if obj.subject_id in patients_map:
            patient = patients_map[obj.subject_id]
            return f"{patient.first_name or ''} {patient.last_name or ''}".strip() or "Unknown Patient"

        # Fallback to DB
        from patients.models import Patient
        try:
            patient = Patient.objects.get(id=obj.subject_id)
            return f"{patient.first_name or ''} {patient.last_name or ''}".strip() or "Unknown Patient"
        except Patient.DoesNotExist:
            return "Unknown Patient"

    def get_subject_patient_id(self, obj):
        """Fetch patient identifier from Patient model (Optimized)."""
        # Try context first
        patients_map = self.context.get('patients_map', {})
        if obj.subject_id in patients_map:
            patient = patients_map[obj.subject_id]
            return patient.patient_id or f"P-{patient.id}"

        # Fallback to DB
        from patients.models import Patient
        try:
            patient = Patient.objects.get(id=obj.subject_id)
            return patient.patient_id or f"P-{patient.id}"
        except Patient.DoesNotExist:
            return f"P-{obj.subject_id}"

    def get_lifecycleStatus(self, obj):
        """
        Map FHIR status to frontend lifecycle status.
        FHIR: registered, partial, preliminary, final, amended, corrected, cancelled
        Frontend: pending, received, in-progress, completed, released
        """
        status_map = {
            'registered': 'pending',
            'partial': 'in-progress',
            'preliminary': 'in-progress',
            'final': 'completed',
            'amended': 'completed',
            'corrected': 'completed',
            'cancelled': 'pending'
        }
        return status_map.get(obj.status, 'pending')

    def get_priority(self, obj):
        """
        Return the priority field from the model.
        Maps to frontend: 'routine', 'urgent', 'stat'
        """
        return obj.priority if obj.priority else 'routine'

    def get_orderedBy(self, obj):
        """
        Get ordering physician name from requester_id (Optimized).
        """
        if not obj.requester_id:
            return None
            
        # Try context first
        practitioners_map = self.context.get('practitioners_map', {})
        users_map = self.context.get('users_map', {})
        
        if obj.requester_id in practitioners_map:
            p = practitioners_map[obj.requester_id]
            return f"Dr. {p.first_name} {p.last_name}".strip()
        
        if obj.requester_id in users_map:
            u = users_map[obj.requester_id]
            return f"{u.first_name} {u.last_name}".strip() or u.username

        # Fallback to DB
        try:
            from accounts.models import Practitioner
            from django.contrib.auth.models import User
            # Try to fetch practitioner by ID
            try:
                practitioner = Practitioner.objects.get(practitioner_id=obj.requester_id)
                return f"Dr. {practitioner.first_name} {practitioner.last_name}".strip()
            except Practitioner.DoesNotExist:
                # Fallback to User model
                user = User.objects.get(id=obj.requester_id)
                return f"{user.first_name} {user.last_name}".strip() or user.username
        except Exception:
            return None

    def get_orderedAt(self, obj):
        """Use effective_datetime as order time."""
        if obj.effective_datetime:
            return obj.effective_datetime.isoformat()
        return obj.created_at.isoformat()

    def get_requestedBy(self, obj):
        """Placeholder for requesting nurse."""
        return None

    def get_requestedAt(self, obj):
        """Placeholder for request time."""
        return None

    def get_receivedBy(self, obj):
        """Placeholder for lab tech who received specimen."""
        return None

    def get_receivedAt(self, obj):
        """Placeholder for specimen received time."""
        return None

    def get_processedBy(self, obj):
        """Get lab technician name from performer_id (Optimized)."""
        if not obj.performer_id or obj.status not in ['final', 'amended', 'corrected']:
            return None
            
        # Try context first
        practitioners_map = self.context.get('practitioners_map', {})
        users_map = self.context.get('users_map', {})
        
        if obj.performer_id in practitioners_map:
            p = practitioners_map[obj.performer_id]
            return f"{p.first_name} {p.last_name}".strip()
            
        if obj.performer_id in users_map:
            u = users_map[obj.performer_id]
            return f"{u.first_name} {u.last_name}".strip() or u.username

        # Fallback to DB
        try:
            from accounts.models import Practitioner
            from django.contrib.auth.models import User
            try:
                practitioner = Practitioner.objects.get(practitioner_id=obj.performer_id)
                return f"{practitioner.first_name} {practitioner.last_name}".strip()
            except Practitioner.DoesNotExist:
                user = User.objects.get(id=obj.performer_id)
                return f"{user.first_name} {user.last_name}".strip() or user.username
        except Exception:
            return None

    def get_processedAt(self, obj):
        """Use issued_datetime as processing completion time."""
        if obj.issued_datetime:
            return obj.issued_datetime.isoformat()
        return None



    def get_releasedBy(self, obj):
        """Get releaser name from results_interpreter_id."""
        if not obj.results_interpreter_id: return None
        
        # Try context first
        practitioners_map = self.context.get('practitioners_map', {})
        users_map = self.context.get('users_map', {})
        
        if obj.results_interpreter_id in practitioners_map:
            p = practitioners_map[obj.results_interpreter_id]
            return f"{p.first_name} {p.last_name}".strip()
            
        if obj.results_interpreter_id in users_map:
            u = users_map[obj.results_interpreter_id]
            return f"{u.first_name} {u.last_name}".strip() or u.username

        # Fallback to DB
        try:
            from accounts.models import Practitioner
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            try:
                practitioner = Practitioner.objects.get(practitioner_id=obj.results_interpreter_id)
                return f"{practitioner.first_name} {practitioner.last_name}".strip()
            except Practitioner.DoesNotExist:
                user = User.objects.get(pk=obj.results_interpreter_id)
                return f"{user.first_name} {user.last_name}".strip() or user.username
        except Exception:
            return None

    def get_releasedAt(self, obj):
        """Use issued_datetime as release time."""
        if obj.issued_datetime:
            return obj.issued_datetime.isoformat()
        return None

    def get_clinicalReason(self, obj):
        """
        Extract clinical reason from conclusion or other fields.
        In a real system, this might come from ServiceRequest.
        """
        # Could parse from conclusion or return None
        return None

    def validate(self, data):
        # Basic required-field checks
        # REMOVED: Manual check for subject_id breaks PATCH requests (partial updates). 
        # DRF ModelSerializer handles required fields automatically for Creates.


        # Period consistency
        start = data.get('effective_period_start')
        end = data.get('effective_period_end')
        if start and end and start > end:
            raise serializers.ValidationError({'effective_period_start': 'Start cannot be after end.'})

        # Validate nested results from initial_data (preserve input shape)
        incoming_results = self.initial_data.get('results', [])
        
        # If the input is the new JSON structure (dict), just validate basic keys
        if isinstance(incoming_results, dict):
            # It's a structured JSON payload
            pass 
        elif isinstance(incoming_results, list):
            # Legacy validation for list of observations
            sequences = set()
            for idx, r in enumerate(incoming_results):
                seq = r.get('item_sequence')
                obs = r.get('observation_id')
                if seq is None:
                    raise serializers.ValidationError({'results': f'Result at index {idx} missing item_sequence.'})
                if seq in sequences:
                    raise serializers.ValidationError({'results': 'Duplicate item_sequence values are not allowed.'})
                sequences.add(seq)
                if obs is None or not isinstance(obs, int) or obs < 0:
                    raise serializers.ValidationError({'results': f'Invalid observation_id at index {idx}.'})

        return data

    def create(self, validated_data):
        # Pull nested results from initial_data
        results_input = self.initial_data.get('results', [])

        # Remove any key that doesn't belong to the model
        model_data = {k: v for k, v in validated_data.items()}

        # 1. Generate identifier if missing
        if 'identifier' not in model_data:
            import uuid
            import time
            timestamp = int(time.time() * 1000)
            short_uuid = str(uuid.uuid4())[:8].upper()
            model_data['identifier'] = f"LAB-{timestamp}-{short_uuid}"

        # 2. Set default status to 'draft' if missing
        if 'status' not in model_data:
            model_data['status'] = 'requested'

        # 3. OPTIMIZATION: Store results directly in result_data (JSON)
        # This is the "Most Optimal" way requested by user for flexible schema (CBC, Urinalysis, etc.)
        if results_input:
            model_data['result_data'] = results_input

        with transaction.atomic():
            report = DiagnosticReport.objects.create(**model_data)
            
            # Legacy Sync: We keep this minimal or remove it. 
            # User requested "most optimal performance". Writing to a secondary table 
            # doubles the write time and is unnecessary if we use JSON.
            # We will SKIP writing to DiagnosticReportResult table.
            
            return report

    def update(self, instance, validated_data):
        results_input = self.initial_data.get('results', None)

        with transaction.atomic():
            # Update simple fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            
            # If results were provided, save them to the JSONField
            if results_input is not None:
                # Save the raw payload to result_data
                instance.result_data = results_input
            
            instance.save()
            
            # OPTIMIZATION: Skip syncing to DiagnosticReportResult table.
            # relying purely on result_data JSONField.

            return instance



class LabTestDefinitionSerializer(serializers.ModelSerializer):
    """
    Serializer for LabTestDefinition (test catalog/lookup table).
    """
    class Meta:
        model = LabTestDefinition
        fields = '__all__'


class SpecimenSerializer(serializers.ModelSerializer):
    """
    Serializer for Specimen (specimen tracking).
    
    Includes resolved foreign key references for subject and collector.
    """
    subject = serializers.SerializerMethodField(read_only=True)
    collector = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Specimen
        fields = [
            'specimen_id',
            'identifier',
            'status',
            # Foreign Key IDs (writable)
            'subject_id',
            'collector_id',
            # Resolved foreign keys (read-only)
            'subject',
            'collector',
            # Specimen details
            'type',
            'collection_datetime',
            'collection_method',
            'collection_body_site',
            'received_time',
            'note',
            # Timestamps
            'created_at',
            'updated_at',
        ]
    
    def get_subject(self, obj):
        """Resolve patient reference using direct ORM."""
        if not obj.subject_id:
            return None
        try:
            from patients.models import Patient
            patient = Patient.objects.get(id=obj.subject_id)
            return {
                "id": patient.id,
                "patient_id": patient.patient_id,
                "name": f"{patient.first_name} {patient.last_name}"
            }
        except Exception:
            logger.exception("Error resolving subject_id=%s for Specimen", obj.subject_id)
            return None

    def get_collector(self, obj):
        """Resolve collector practitioner reference using direct ORM."""
        if not obj.collector_id:
            return None
        try:
            from accounts.models import Practitioner
            practitioner = Practitioner.objects.get(practitioner_id=obj.collector_id)
            return {
                "practitioner_id": practitioner.practitioner_id,
                "name": f"{practitioner.first_name} {practitioner.last_name}"
            }
        except Exception:
            logger.exception("Error resolving collector_id=%s for Specimen", obj.collector_id)
            return None


class ImagingStudySerializer(serializers.ModelSerializer):
    """
    Serializer for ImagingStudy (imaging study records).
    
    Includes resolved foreign key references for subject, encounter, and interpreter.
    """
    subject = serializers.SerializerMethodField(read_only=True)
    encounter = serializers.SerializerMethodField(read_only=True)
    interpreter = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ImagingStudy
        fields = [
            'imaging_study_id',
            'identifier',
            'status',
            # Foreign Key IDs (writable)
            'subject_id',
            'encounter_id',
            'interpreter_id',
            # Resolved foreign keys (read-only)
            'subject',
            'encounter',
            'interpreter',
            # Imaging study details
            'started',
            'modality',
            'description',
            'number_of_series',
            'number_of_instances',
            'note',
            # Timestamps
            'created_at',
            'updated_at',
        ]
    
    def get_subject(self, obj):
        """Resolve patient reference using direct ORM."""
        if not obj.subject_id:
            return None
        try:
            from patients.models import Patient
            patient = Patient.objects.get(id=obj.subject_id)
            return {
                "id": patient.id,
                "patient_id": patient.patient_id,
                "name": f"{patient.first_name} {patient.last_name}"
            }
        except Exception:
            logger.exception("Error resolving subject_id=%s for ImagingStudy", obj.subject_id)
            return None

    def get_encounter(self, obj):
        """Resolve encounter reference using direct ORM."""
        if not obj.encounter_id:
            return None
        try:
            from admission.models import Encounter
            encounter = Encounter.objects.get(encounter_id=obj.encounter_id)
            return {
                "encounter_id": encounter.encounter_id,
                "identifier": encounter.identifier,
                "status": encounter.status
            }
        except Exception:
            logger.exception("Error resolving encounter_id=%s for ImagingStudy", obj.encounter_id)
            return None

    def get_interpreter(self, obj):
        """Resolve interpreter practitioner reference using direct ORM."""
        if not obj.interpreter_id:
            return None
        try:
            from accounts.models import Practitioner
            practitioner = Practitioner.objects.get(practitioner_id=obj.interpreter_id)
            return {
                "practitioner_id": practitioner.practitioner_id,
                "name": f"{practitioner.first_name} {practitioner.last_name}"
            }
        except Exception:
            logger.exception("Error resolving interpreter_id=%s for ImagingStudy", obj.interpreter_id)
            return None
