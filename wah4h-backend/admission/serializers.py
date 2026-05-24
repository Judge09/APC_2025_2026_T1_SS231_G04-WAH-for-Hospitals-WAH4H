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

# FHIR R4 / PHCore R4 utilities
from core.fhir_utils import (
    codeable_concept, fhir_extension, fhir_period, fhir_reference,
    fhir_identifier, fhir_meta,
    PHC_SERVICE_TYPE_CS, PHC_SPECIALTY_CS, PHC_APPT_TYPE_CS,
    HL7_ACT_CODE, SNOMED_SYSTEM, HL7_PARTICIPANT_TYPE, HL7_SERVICE_CATEGORY,
    WAH4H_SCHEDULE_SYSTEM, WAH4H_SLOT_SYSTEM,
    WAH4H_APPOINTMENT_SYSTEM, WAH4H_SERVICE_REQUEST_SYSTEM,
    WAH_APPOINTMENT_IDENTIFIER_SYSTEM, WAH_SERVICE_CATEGORY_CS,
)


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
            # Derive location_ids from ward/room/bed if frontend didn't send them
            if not validated_data.get('location_ids'):
                validated_data['location_ids'] = [x for x in [ward, room, bed] if x]

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

            # Keep location_ids in sync with the resolved ward/room/bed components
            if not validated_data.get('location_ids'):
                validated_data['location_ids'] = [x for x in [w, r, b] if x]

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
            'procedure_id', 'identifier', 'status',
            'status_reason_code', 'status_reason_display',
            'code_code', 'code_display',
            'category_code', 'category_display',
            'subject_id', 'patient_id', 'patient_summary',
            'encounter',
            'performed_datetime', 'performed_period_start', 'performed_period_end', 'performed_string',
            'reason_code_code', 'reason_code_display',
            'body_site_code', 'body_site_display',
            'outcome_code', 'outcome_display',
            'complication_code', 'complication_display',
            'follow_up_code', 'follow_up_display',
            'used_code_code', 'used_code_display',
            'note', 'performers',
            'location_id', 'recorder_id', 'asserter_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['procedure_id', 'identifier', 'created_at', 'updated_at']
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


# ============================================================================
# APPOINTMENT MODULE SERIALIZERS
# ============================================================================

from admission.models import Schedule, Slot, Appointment, ServiceRequest


class ScheduleSerializer(serializers.ModelSerializer):
    """
    Schedule Serializer — availability window for a practitioner / location.
    Fat Serializer pattern: validation + enriched read output in one class.
    """
    actor_name = serializers.SerializerMethodField()
    active = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            'schedule_id', 'identifier', 'status', 'active',
            'actor_practitioner_id', 'actor_location_id', 'actor_organization_id',
            'actor_name',
            'service_type_code', 'service_type_display',
            'specialty_code', 'specialty_display',
            'planning_horizon_start', 'planning_horizon_end',
            'comment', 'created_at', 'updated_at',
        ]
        read_only_fields = ['schedule_id', 'created_at', 'updated_at', 'actor_name']
        extra_kwargs = {
            'identifier':             {'required': False},
            'planning_horizon_start': {'required': True},
            'planning_horizon_end':   {'required': True},
        }

    def get_active(self, obj):
        return obj.status == "active"

    def get_actor_name(self, obj):
        if obj.actor_practitioner_id:
            try:
                p = Practitioner.objects.get(practitioner_id=obj.actor_practitioner_id)
                return f"{p.first_name} {p.last_name}".strip()
            except Practitioner.DoesNotExist:
                pass
        if obj.actor_location_id:
            try:
                from accounts.models import Location as Loc
                return Loc.objects.get(location_id=obj.actor_location_id).name
            except Exception:
                pass
        return None

    def validate(self, data):
        start = data.get('planning_horizon_start')
        end   = data.get('planning_horizon_end')
        if start and end and end <= start:
            raise serializers.ValidationError(
                {"planning_horizon_end": "End must be after start."}
            )
        # FHIR R4 Schedule.actor is 1..* — at least one actor required
        if not any([
            data.get('actor_practitioner_id'),
            data.get('actor_location_id'),
            data.get('actor_organization_id'),
        ]):
            raise serializers.ValidationError(
                {"actor": "At least one actor (practitioner, location, or organization) is required — FHIR R4 Schedule.actor is 1..*"}
            )
        if data.get('actor_practitioner_id'):
            if not Practitioner.objects.filter(
                practitioner_id=data['actor_practitioner_id']
            ).exists():
                raise serializers.ValidationError(
                    {"actor_practitioner_id": "Practitioner not found."}
                )
        return data

    @transaction.atomic
    def create(self, validated_data):
        if not validated_data.get('identifier'):
            validated_data['identifier'] = f"SCH-{''.join([str(random.randint(0,9)) for _ in range(9)])}"
        if not validated_data.get('status'):
            validated_data['status'] = 'active'
        return super().create(validated_data)

    def to_representation(self, obj):
        rep = super().to_representation(obj)
        try:
            rep['fhir'] = {
                "resourceType": "Schedule",
                "id": obj.identifier,
                "meta": fhir_meta("Schedule", obj.updated_at),
                "identifier": [fhir_identifier(WAH4H_SCHEDULE_SYSTEM, obj.identifier, use="official")],
                "active": obj.status == "active",
                "serviceType": [codeable_concept(PHC_SERVICE_TYPE_CS, obj.service_type_code, obj.service_type_display)] if obj.service_type_code else [],
                "specialty": [codeable_concept(PHC_SPECIALTY_CS, obj.specialty_code, obj.specialty_display)] if obj.specialty_code else [],
                "actor": [ref for ref in [
                    fhir_reference("Practitioner", obj.actor_practitioner_id) if obj.actor_practitioner_id else None,
                    fhir_reference("Location", obj.actor_location_id) if obj.actor_location_id else None,
                    fhir_reference("Organization", obj.actor_organization_id) if obj.actor_organization_id else None,
                ] if ref],
                "planningHorizon": fhir_period(obj.planning_horizon_start, obj.planning_horizon_end),
                "comment": obj.comment,
            }
        except Exception:
            rep['fhir'] = {}
        return rep


class SlotSerializer(serializers.ModelSerializer):
    """
    Slot Serializer — single bookable block within a Schedule.
    Enforces start < end and prevents overlap within the same schedule.
    """
    schedule_id = serializers.IntegerField(write_only=True, required=True)
    schedule_detail = serializers.SerializerMethodField()

    class Meta:
        model = Slot
        fields = [
            'slot_id', 'identifier', 'status',
            'schedule_id', 'schedule_detail',
            'service_type_code', 'service_type_display',
            'specialty_code', 'specialty_display',
            'appointment_type_code', 'appointment_type_display',
            'start', 'end', 'overbooked', 'comment',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['slot_id', 'created_at', 'updated_at', 'schedule_detail']
        extra_kwargs = {
            'start':  {'required': True},
            'end':    {'required': True},
            'status': {'required': False, 'default': 'free'},
        }

    def get_schedule_detail(self, obj):
        return {
            'schedule_id': obj.schedule_id,
            'actor_name':  ScheduleSerializer(obj.schedule).data.get('actor_name'),
            'planning_horizon_start': obj.schedule.planning_horizon_start,
            'planning_horizon_end':   obj.schedule.planning_horizon_end,
        }

    def validate(self, data):
        start = data.get('start')
        end   = data.get('end')
        if start and end and end <= start:
            raise serializers.ValidationError({"end": "Slot end must be after start."})

        schedule_id = data.get('schedule_id')
        if schedule_id:
            if not Schedule.objects.filter(schedule_id=schedule_id, status='active').exists():
                raise serializers.ValidationError(
                    {"schedule_id": "Active schedule not found."}
                )
            # Overlap check (exclude current instance on update)
            overlap_qs = Slot.objects.filter(
                schedule_id=schedule_id,
                start__lt=end,
                end__gt=start,
            )
            if self.instance:
                overlap_qs = overlap_qs.exclude(slot_id=self.instance.slot_id)
            if overlap_qs.exists():
                raise serializers.ValidationError(
                    "This time window overlaps with an existing slot in the same schedule."
                )
        return data

    @transaction.atomic
    def create(self, validated_data):
        schedule_id = validated_data.pop('schedule_id')
        schedule    = Schedule.objects.get(schedule_id=schedule_id)
        if not validated_data.get('identifier'):
            validated_data['identifier'] = f"SLT-{''.join([str(random.randint(0,9)) for _ in range(9)])}"
        if not validated_data.get('status'):
            validated_data['status'] = 'free'
        return Slot.objects.create(schedule=schedule, **validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        schedule_id = validated_data.pop('schedule_id', None)
        if schedule_id and schedule_id != instance.schedule_id:
            instance.schedule = Schedule.objects.get(schedule_id=schedule_id)
        return super().update(instance, validated_data)

    def to_representation(self, obj):
        rep = super().to_representation(obj)
        try:
            rep['fhir'] = {
                "resourceType": "Slot",
                "id": obj.identifier,
                "meta": fhir_meta("Slot", obj.updated_at),
                "identifier": [fhir_identifier(WAH4H_SLOT_SYSTEM, obj.identifier, use="official")],
                "serviceType": [codeable_concept(PHC_SERVICE_TYPE_CS, obj.service_type_code, obj.service_type_display)] if obj.service_type_code else [],
                "specialty": [codeable_concept(PHC_SPECIALTY_CS, obj.specialty_code, obj.specialty_display)] if obj.specialty_code else [],
                "appointmentType": codeable_concept(PHC_APPT_TYPE_CS, obj.appointment_type_code, obj.appointment_type_display) if obj.appointment_type_code else None,
                "schedule": fhir_reference("Schedule", obj.schedule.identifier),
                "status": obj.status,
                "start": obj.start.isoformat() if obj.start else None,
                "end": obj.end.isoformat() if obj.end else None,
                "overbooked": obj.overbooked,
                "comment": obj.comment,
            }
        except Exception:
            rep['fhir'] = {}
        return rep


class AppointmentSerializer(serializers.ModelSerializer):
    """
    Appointment Serializer — fat serializer handling the full booking lifecycle.

    Business rules enforced here:
    - Patient must exist.
    - Practitioner must exist (when provided).
    - Slot must be 'free' before booking.
    - Start must precede end.
    - A patient cannot have two overlapping 'booked'/'pending' appointments.
    - Booking a slot atomically flips Slot.status → 'busy'.
    - Cancelling/noshow flips the slot back to 'free'.
    """
    patient_summary     = serializers.SerializerMethodField()
    practitioner_summary = serializers.SerializerMethodField()
    slot_detail         = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'appointment_id', 'identifier', 'status',
            'patient_id', 'patient_summary',
            'practitioner_id', 'practitioner_summary',
            'location_id',
            'slot_id', 'slot_detail',
            'service_category_code', 'service_category_display',
            'service_type_code', 'service_type_display',
            'specialty_code', 'specialty_display',
            'appointment_type_code', 'appointment_type_display',
            'reason_code', 'priority', 'description',
            'start', 'end', 'minutes_duration', 'created_datetime',
            'patient_participation_status', 'practitioner_participation_status',
            'based_on_service_request_id', 'resulting_encounter_id',
            'cancellation_reason_code', 'cancellation_reason_display',
            'comment', 'patient_instruction',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'appointment_id', 'identifier', 'created_at', 'updated_at',
            'patient_summary', 'practitioner_summary', 'slot_detail',
        ]
        extra_kwargs = {
            'patient_id': {'required': True},
            'status':     {'required': False},
        }

    # ------------------------------------------------------------------ #
    # Enriched read fields                                                 #
    # ------------------------------------------------------------------ #

    def get_patient_summary(self, obj):
        try:
            return _patient_basic_dict(Patient.objects.get(id=obj.patient_id))
        except Patient.DoesNotExist:
            return None

    def get_practitioner_summary(self, obj):
        if not obj.practitioner_id:
            return None
        try:
            p = Practitioner.objects.get(practitioner_id=obj.practitioner_id)
            return {
                'practitioner_id': p.practitioner_id,
                'full_name': f"{p.first_name} {p.last_name}".strip(),
                'qualification_code': p.qualification_code,
            }
        except Practitioner.DoesNotExist:
            return None

    def get_slot_detail(self, obj):
        if not obj.slot_id:
            return None
        try:
            s = Slot.objects.select_related('schedule').get(slot_id=obj.slot_id)
            return {
                'slot_id': s.slot_id,
                'status':  s.status,
                'start':   s.start,
                'end':     s.end,
            }
        except Slot.DoesNotExist:
            return None

    # ------------------------------------------------------------------ #
    # Validation                                                           #
    # ------------------------------------------------------------------ #

    def validate(self, data):
        patient_id = data.get('patient_id')
        if patient_id and not Patient.objects.filter(id=patient_id).exists():
            raise serializers.ValidationError({"patient_id": "Patient not found."})

        practitioner_id = data.get('practitioner_id')
        if practitioner_id and not Practitioner.objects.filter(
            practitioner_id=practitioner_id
        ).exists():
            raise serializers.ValidationError({"practitioner_id": "Practitioner not found."})

        start = data.get('start')
        end   = data.get('end')
        if start and end and end <= start:
            raise serializers.ValidationError({"end": "Appointment end must be after start."})

        slot_id = data.get('slot_id')
        if slot_id:
            try:
                slot = Slot.objects.get(slot_id=slot_id)
            except Slot.DoesNotExist:
                raise serializers.ValidationError({"slot_id": "Slot not found."})

            # On create only — slot must be free
            if not self.instance and slot.status != 'free':
                raise serializers.ValidationError(
                    {"slot_id": f"Slot is not available (status: {slot.status})."}
                )

            # Derive start/end from slot when not explicitly provided
            if not data.get('start'):
                data['start'] = slot.start
            if not data.get('end'):
                data['end'] = slot.end

        # Prevent overlapping active bookings for the same patient
        if patient_id and start and end:
            conflict_qs = Appointment.objects.filter(
                patient_id=patient_id,
                status__in=['proposed', 'pending', 'booked', 'arrived'],
                start__lt=end,
                end__gt=start,
            )
            if self.instance:
                conflict_qs = conflict_qs.exclude(appointment_id=self.instance.appointment_id)
            if conflict_qs.exists():
                raise serializers.ValidationError(
                    "Patient already has an overlapping active appointment in this time window."
                )

        return data

    # ------------------------------------------------------------------ #
    # Write operations                                                     #
    # ------------------------------------------------------------------ #

    @transaction.atomic
    def create(self, validated_data):
        if not validated_data.get('identifier'):
            validated_data['identifier'] = f"APT-{''.join([str(random.randint(0,9)) for _ in range(9)])}"
        if not validated_data.get('status'):
            validated_data['status'] = 'booked'
        if not validated_data.get('created_datetime'):
            validated_data['created_datetime'] = timezone.now()

        slot_id = validated_data.get('slot_id')
        appointment = Appointment.objects.create(**validated_data)

        # Mark slot as busy
        if slot_id:
            Slot.objects.filter(slot_id=slot_id).update(status='busy')

        return appointment

    @transaction.atomic
    def update(self, instance, validated_data):
        old_slot_id = instance.slot_id
        new_slot_id = validated_data.get('slot_id', old_slot_id)

        appointment = super().update(instance, validated_data)

        # Slot management on slot change
        if new_slot_id and new_slot_id != old_slot_id:
            if old_slot_id:
                Slot.objects.filter(slot_id=old_slot_id).update(status='free')
            Slot.objects.filter(slot_id=new_slot_id).update(status='busy')

        # Free up slot if appointment is cancelled or noshow
        if validated_data.get('status') in ('cancelled', 'noshow', 'entered-in-error'):
            if appointment.slot_id:
                Slot.objects.filter(slot_id=appointment.slot_id).update(status='free')

        return appointment

    def to_representation(self, obj):
        rep = super().to_representation(obj)
        try:
            slot_identifier = None
            if obj.slot_id:
                try:
                    slot_identifier = Slot.objects.get(slot_id=obj.slot_id).identifier
                except Slot.DoesNotExist:
                    pass
            rep['fhir'] = {
                "resourceType": "Appointment",
                "id": obj.identifier,
                "meta": fhir_meta("Appointment", obj.updated_at),
                "identifier": [fhir_identifier(WAH_APPOINTMENT_IDENTIFIER_SYSTEM, obj.identifier, use="official")],
                "status": obj.status,
                "cancelationReason": codeable_concept(HL7_ACT_CODE, obj.cancellation_reason_code, obj.cancellation_reason_display) if obj.cancellation_reason_code else None,
                "serviceCategory": [codeable_concept(WAH_SERVICE_CATEGORY_CS, obj.service_category_code, obj.service_category_display)] if obj.service_category_code else [],
                "serviceType": [codeable_concept(PHC_SERVICE_TYPE_CS, obj.service_type_code, obj.service_type_display)] if obj.service_type_code else [],
                "specialty": [codeable_concept(PHC_SPECIALTY_CS, obj.specialty_code, obj.specialty_display)] if obj.specialty_code else [],
                "appointmentType": codeable_concept(PHC_APPT_TYPE_CS, obj.appointment_type_code, obj.appointment_type_display) if obj.appointment_type_code else None,
                "reasonCode": [{
                    "coding": [{"system": SNOMED_SYSTEM, "code": obj.reason_code}],
                    "text": obj.reason_code,
                }] if obj.reason_code else [],
                "reasonReference": [fhir_reference("Condition", obj.reason_reference_id)] if obj.reason_reference_id else [],
                "priority": obj.priority,
                "description": obj.description,
                "start": obj.start.isoformat() if obj.start else None,
                "end": obj.end.isoformat() if obj.end else None,
                "minutesDuration": obj.minutes_duration,
                "slot": [fhir_reference("Slot", slot_identifier)] if slot_identifier else [],
                "created": obj.created_datetime.isoformat() if obj.created_datetime else None,
                "patientInstruction": obj.patient_instruction,
                "basedOn": [fhir_reference("ServiceRequest", obj.based_on_service_request_id)] if obj.based_on_service_request_id else [],
                "participant": [p for p in [
                    {
                        "type": [codeable_concept(HL7_PARTICIPANT_TYPE, "SBJ", "Subject")],
                        "actor": fhir_reference("Patient", obj.patient_id),
                        "required": "required",
                        "status": obj.patient_participation_status or "accepted",
                    } if obj.patient_id else None,
                    {
                        "type": [codeable_concept(HL7_PARTICIPANT_TYPE, "ATND", "Attender")],
                        "actor": fhir_reference("Practitioner", obj.practitioner_id),
                        "required": "required",
                        "status": obj.practitioner_participation_status or "accepted",
                    } if obj.practitioner_id else None,
                    {
                        "type": [codeable_concept(HL7_PARTICIPANT_TYPE, "LOC", "Location")],
                        "actor": fhir_reference("Location", obj.location_id),
                        "required": "required",
                        "status": "accepted",
                    } if obj.location_id else None,
                ] if p],
                "comment": obj.comment,
            }
        except Exception:
            rep['fhir'] = {}
        return rep


class ServiceRequestSerializer(serializers.ModelSerializer):
    """
    ServiceRequest Serializer — FHIR R4 order/referral for a clinical service.
    """
    patient_summary = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = '__all__'
        read_only_fields = ['service_request_id', 'identifier', 'created_at', 'updated_at']

    def get_patient_summary(self, obj):
        try:
            return _patient_basic_dict(Patient.objects.get(id=obj.subject_id))
        except Patient.DoesNotExist:
            return None

    @transaction.atomic
    def create(self, validated_data):
        if not validated_data.get('identifier'):
            validated_data['identifier'] = f"SRQ-{''.join([str(random.randint(0,9)) for _ in range(9)])}"
        if not validated_data.get('status'):
            validated_data['status'] = 'active'
        return super().create(validated_data)

    def to_representation(self, obj):
        rep = super().to_representation(obj)
        try:
            rep['fhir'] = {
                "resourceType": "ServiceRequest",
                "id": obj.identifier,
                "meta": fhir_meta("ServiceRequest", obj.updated_at),
                "identifier": [fhir_identifier(WAH4H_SERVICE_REQUEST_SYSTEM, obj.identifier, use="official")],
                "status": obj.status,
                "intent": obj.intent or "order",
                "priority": obj.priority,
                "code": codeable_concept(obj.code_system or SNOMED_SYSTEM, obj.code, obj.code_display) if obj.code else None,
                "subject": fhir_reference("Patient", obj.subject_id),
                "encounter": fhir_reference("Encounter", obj.encounter_id) if obj.encounter_id else None,
                "occurrenceDateTime": obj.occurrence_datetime.isoformat() if obj.occurrence_datetime else None,
                "authoredOn": obj.authored_on.isoformat() if obj.authored_on else None,
                "requester": fhir_reference("Practitioner", obj.requester_id) if obj.requester_id else None,
                "performer": [fhir_reference("Practitioner", obj.performer_id)] if obj.performer_id else [],
                "reasonCode": [codeable_concept(SNOMED_SYSTEM, obj.reason_code)] if obj.reason_code else [],
                "note": [{"text": obj.note}] if obj.note else [],
            }
        except Exception:
            rep['fhir'] = None
        return rep