"""
Admission Serializers
=====================
Trinity Architecture: Direct Model Access with Fat Serializers

All validation and business logic is contained in serializers.
Uses direct ORM queries - NO service layers or ACL classes.
"""

from rest_framework import serializers
from django.db import transaction
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.utils import timezone
from datetime import date, datetime
import random

# Direct Model Imports - Trinity Pattern
from admission.models import Encounter, Procedure, ProcedurePerformer
from patients.models import Patient
from accounts.models import Practitioner, Location


def _patient_basic_dict(patient: Patient) -> dict:
    """Shared patient DTO used by multiple serializers."""
    return {
        "id": patient.id,
        "patient_id": patient.patient_id,
        "full_name": f"{patient.first_name} {patient.last_name}",
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "gender": patient.gender,
        "age": patient.age,
        "birthdate": patient.birthdate,
        "civil_status": patient.civil_status,
        "religion": patient.religion,
        "blood_type": patient.blood_type,
        "mobile_number": patient.mobile_number,
        "philhealth_id": patient.philhealth_id,
        "address": {
            "line": patient.address_line,
            "city": patient.address_city,
            "district": patient.address_district,
            "state": patient.address_state,
            "postal_code": patient.address_postal_code,
            "country": patient.address_country,
        },
        "emergency_contact": {
            "name": f"{patient.contact_first_name or ''} {patient.contact_last_name or ''}".strip(),
            "mobile": patient.contact_mobile_number,
            "relationship": patient.contact_relationship,
        },
    }

# ============================================================================
# ENCOUNTER SERIALIZERS
# ============================================================================

class EncounterSerializer(serializers.ModelSerializer):
    """
    Unified Serializer for Encounter (Admission).
    Handles validation, creation, and enriched output.
    """
    patient_id = serializers.CharField(write_only=True, required=False, allow_null=True)
    patient_summary = serializers.SerializerMethodField()
    location_summary = serializers.SerializerMethodField()
    practitioner_summary = serializers.SerializerMethodField()
    
    # Input-only fields for location components
    ward = serializers.CharField(write_only=True, required=False, allow_null=True)
    room = serializers.CharField(write_only=True, required=False, allow_null=True)
    bed = serializers.CharField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Encounter
        fields = [
            'encounter_id', 'identifier', 'status', 'class_field', 'type', 
            'service_type', 'priority', 'subject_id', 'patient_id', 'patient_summary', 
            'period_start', 'period_end', 'reason_code', 'location_id', 
            'location_ids', 'location_summary', 'location_status',
            'ward', 'room', 'bed',
            'participant_individual_id', 'participant_type', 'practitioner_summary', 
            'admit_source', 're_admission', 'diet_preference', 
            'special_courtesy', 'special_arrangement', 'discharge_disposition', 
            'discharge_destination_id', 'account_id', 'pre_admission_identifier',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['encounter_id', 'identifier', 'status', 'created_at', 'updated_at']
        extra_kwargs = {
            'subject_id': {'required': False},
            'type': {'required': True, 'allow_blank': False, 'error_messages': {'required': 'Encounter type is required', 'blank': 'Encounter type cannot be empty'}},
            'class_field': {'required': True, 'allow_blank': False, 'error_messages': {'required': 'Encounter class is required', 'blank': 'Encounter class cannot be empty'}},
        }

    def get_patient_summary(self, obj):
        """Direct ORM lookup for patient summary."""
        if not obj.subject_id:
            return None
        try:
            return _patient_basic_dict(Patient.objects.get(id=obj.subject_id))
        except Patient.DoesNotExist:
            return None

    def get_location_summary(self, obj):
        """Direct ORM lookup for location summary."""
        if not obj.location_id:
            return None
        try:
            location = Location.objects.get(location_id=obj.location_id)
            return {
                "location_id": location.location_id,
                "name": location.name,
                "ward": location.address_line,
            }
        except Location.DoesNotExist:
            return None

    def get_practitioner_summary(self, obj):
        """Direct ORM lookup for practitioner summary."""
        if not obj.participant_individual_id:
            return None
        try:
            practitioner = Practitioner.objects.get(practitioner_id=obj.participant_individual_id)
            return {
                "practitioner_id": practitioner.practitioner_id,
                "full_name": f"{practitioner.first_name} {practitioner.last_name}",
                "first_name": practitioner.first_name,
                "last_name": practitioner.last_name,
                "role": practitioner.qualification_code or "Physician",
            }
        except Practitioner.DoesNotExist:
            return None

    def validate(self, data):
        """
        Direct ORM validation - no ACL layer.
        Handles both patient_id string lookup and subject_id integer validation.
        """
        patient_id_str = data.get('patient_id')
        # Validate subject_id or patient_id is provided
        subject_id = data.get('subject_id')
        if not subject_id and not patient_id_str:
            raise serializers.ValidationError({
                "patient_id": "Patient selection is required to proceed with admission"
            })

        # Resolve patient_id string to subject_id if provided
        if patient_id_str and not subject_id:
            try:
                patient = Patient.objects.get(patient_id=patient_id_str)
                data['subject_id'] = patient.id
                subject_id = patient.id
            except Patient.DoesNotExist:
                raise serializers.ValidationError({
                    "patient_id": f"Patient with identifier {patient_id_str} does not exist"
                })

        # Validate subject_id exists using direct ORM query
        if subject_id:
            if not Patient.objects.filter(id=subject_id).exists():
                raise serializers.ValidationError({
                    "subject_id": f"Patient with ID {subject_id} does not exist"
                })
            
            # BLOCK DUPLICATE ACTIVE ADMISSIONS
            # Check if patient already has an 'in-progress' encounter (excluding the current instance if updating)
            active_encounter_query = Encounter.objects.filter(
                subject_id=subject_id,
                status='in-progress'
            )

            if self.instance:
                active_encounter_query = active_encounter_query.exclude(encounter_id=self.instance.encounter_id)

            if active_encounter_query.exists():
                raise serializers.ValidationError({
                    "non_field_errors": ["Patient is already admitted with an active encounter. Please discharge or finish the existing encounter before starting a new one."]
                })

        # Validate practitioner using direct ORM query
        participant_id = data.get('participant_individual_id')
        if participant_id:
            if not Practitioner.objects.filter(practitioner_id=participant_id).exists():
                raise serializers.ValidationError({
                    "participant_individual_id": f"Practitioner with ID {participant_id} does not exist"
                })

        # Validate location using direct ORM query
        location_id = data.get('location_id')
        if location_id:
            if not Location.objects.filter(location_id=location_id).exists():
                raise serializers.ValidationError({
                    "location_id": f"Location with ID {location_id} does not exist"
                })

        # Handle period_start date parsing and auto-defaulting
        period_start = data.get('period_start')
        if not period_start:
            # Auto-default to current date
            data['period_start'] = timezone.now().date()
        elif isinstance(period_start, str):
            # Handle ISO timestamp format (YYYY-MM-DDTHH:mm:ss)
            if 'T' in period_start:
                period_start = period_start.split('T')[0]
            try:
                data['period_start'] = datetime.strptime(period_start, '%Y-%m-%d').date()
            except ValueError:
                raise serializers.ValidationError({
                    "period_start": "Invalid date format. Expected YYYY-MM-DD"
                })

        return data

    @transaction.atomic
    def create(self, validated_data):
        # Remove patient_id from validated_data before creating model instance
        validated_data.pop('patient_id', None)
        
        # Extract location components
        ward = validated_data.pop('ward', None)
        room = validated_data.pop('room', None)
        bed = validated_data.pop('bed', None)

        if not validated_data.get('identifier'):
            random_digits = ''.join([str(random.randint(0, 9)) for _ in range(11)])
            validated_data['identifier'] = f"ENC-{random_digits}"

        # Prepare location status
        if ward or room or bed:
            validated_data['location_status'] = f"{ward or ''}|{room or ''}|{bed or ''}"

        # Default status for new encounters if not provided
        if not validated_data.get('status'):
            validated_data['status'] = 'in-progress'
        
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        # Sync location_status if components are updated
        ward = validated_data.pop('ward', None)
        room = validated_data.pop('room', None)
        bed = validated_data.pop('bed', None)

        if ward is not None or room is not None or bed is not None:
            current_status = (instance.location_status or "||").split('|')
            while len(current_status) < 3: current_status.append('')
            
            w = ward if ward is not None else current_status[0]
            r = room if room is not None else current_status[1]
            b = bed if bed is not None else current_status[2]
            
            validated_data['location_status'] = f"{w}|{r}|{b}"

        return super().update(instance, validated_data)

class EncounterDischargeSerializer(serializers.ModelSerializer):
    """
    Serializer specifically for discharging a patient.
    Uses direct ORM queries - no ACL layer.
    """
    class Meta:
        model = Encounter
        fields = ['period_end', 'discharge_disposition', 'discharge_destination_id']

    def validate_discharge_destination_id(self, value):
        """Direct ORM validation for discharge destination."""
        if value:
            if not Location.objects.filter(location_id=value).exists():
                raise serializers.ValidationError(
                    f"Discharge destination with ID {value} does not exist"
                )
        return value

    @transaction.atomic
    def save(self, **kwargs):
        """Atomic discharge operation with status update."""
        instance = self.instance
        if instance.status == 'finished':
            raise serializers.ValidationError("Encounter is already discharged")
        
        instance.status = 'finished'
        if not instance.period_end:
            instance.period_end = date.today()
        return super().save(**kwargs)

# ============================================================================
# PROCEDURE SERIALIZERS
# ============================================================================

class ProcedurePerformerSerializer(serializers.ModelSerializer):
    """Serializer for procedure performers with direct ORM lookups."""
    practitioner_summary = serializers.SerializerMethodField()

    class Meta:
        model = ProcedurePerformer
        fields = [
            'procedure_performer_id', 'performer_actor_id', 'practitioner_summary',
            'performer_function_code', 'performer_function_display', 'performer_on_behalf_of_id'
        ]

    def get_practitioner_summary(self, obj):
        """Direct ORM lookup for practitioner summary."""
        if not obj.performer_actor_id:
            return None
        try:
            practitioner = Practitioner.objects.get(practitioner_id=obj.performer_actor_id)
            return {
                "practitioner_id": practitioner.practitioner_id,
                "full_name": f"{practitioner.first_name} {practitioner.last_name}",
                "first_name": practitioner.first_name,
                "last_name": practitioner.last_name,
                "role": practitioner.qualification_code or "Physician",
            }
        except Practitioner.DoesNotExist:
            return None

class ProcedureSerializer(serializers.ModelSerializer):
    """
    Serializer for medical procedures with direct ORM validation.
    Fat Serializer pattern - all business logic here.
    """
    patient_id = serializers.CharField(write_only=True, required=False, allow_null=True)
    patient_summary = serializers.SerializerMethodField()
    performers = ProcedurePerformerSerializer(many=True, required=False)

    class Meta:
        model = Procedure
        fields = [
            'procedure_id', 'identifier', 'status', 'code_code', 'code_display',
            'category_code', 'category_display', 'subject_id', 'patient_id', 'patient_summary',
            'encounter', 'performed_datetime', 'performed_period_start', 
            'performed_period_end', 'body_site_code', 'body_site_display',
            'outcome_code', 'outcome_display', 'note', 'performers', 
            'location_id', 'recorder_id', 'asserter_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['procedure_id', 'identifier', 'status', 'created_at', 'updated_at']
        extra_kwargs = {
            'subject_id': {'required': False},
            'encounter': {'required': False},
        }

    def get_patient_summary(self, obj):
        """Direct ORM lookup for patient summary."""
        if not obj.subject_id:
            return None
        try:
            return _patient_basic_dict(Patient.objects.get(id=obj.subject_id))
        except Patient.DoesNotExist:
            return None

    def validate(self, data):
        """Direct ORM validation - no ACL layer."""
        # Resolve patient_id string to subject_id if provided
        patient_id_str = data.get('patient_id')
        if patient_id_str and not data.get('subject_id'):
            try:
                patient = Patient.objects.get(patient_id=patient_id_str)
                data['subject_id'] = patient.id
            except Patient.DoesNotExist:
                raise serializers.ValidationError({
                    "patient_id": f"Patient with identifier {patient_id_str} does not exist"
                })

        encounter = data.get('encounter')
        subject_id = data.get('subject_id')

        # Validate subject_id exists using direct ORM query
        if subject_id:
            if not Patient.objects.filter(id=subject_id).exists():
                raise serializers.ValidationError({
                    "subject_id": f"Patient with ID {subject_id} does not exist"
                })

        # Validate patient matches encounter's patient
        if encounter and subject_id and encounter.subject_id != subject_id:
            raise serializers.ValidationError(
                "Procedure subject_id must match encounter's subject_id"
            )

        return data

    @transaction.atomic
    def create(self, validated_data):
        """Atomic create operation with performer handling."""
        # Remove patient_id from validated_data
        validated_data.pop('patient_id', None)
        
        performers_data = validated_data.pop('performers', [])
        
        # Generate identifier if not provided
        if not validated_data.get('identifier'):
            random_digits = ''.join([str(random.randint(0, 9)) for _ in range(11)])
            validated_data['identifier'] = f"PROC-{random_digits}"
            
        # Set recorder_id from context if available
        if 'request' in self.context:
            user = self.context['request'].user
            if hasattr(user, 'id'):
                validated_data['recorder_id'] = user.id

        # Default status
        if not validated_data.get('status'):
            validated_data['status'] = 'completed'

        # Create procedure
        procedure = Procedure.objects.create(**validated_data)
        
        # Create performers
        for performer_data in performers_data:
            ProcedurePerformer.objects.create(procedure=procedure, **performer_data)
            
        return procedure