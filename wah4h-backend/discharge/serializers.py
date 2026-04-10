import json
import logging
from rest_framework import serializers
from .models import Discharge
from patients.models import Patient
from admission.models import Encounter
from accounts.models import Practitioner, Location
from datetime import date, datetime

logger = logging.getLogger(__name__)

class DischargeSerializer(serializers.ModelSerializer):
    """
    Serializer for Discharge records.
    Standardized on camelCase for frontend dashboard alignment.
    Uses pre-fetched objects (patient_obj, encounter_obj) for efficiency.
    """
    # Aliases for Frontend Compatibility
    id = serializers.IntegerField(source='discharge_id', read_only=True)
    patient = serializers.IntegerField(source='patient_id', read_only=True)
    admission = serializers.IntegerField(source='encounter_id', read_only=True)
    status = serializers.CharField(source='workflow_status', read_only=True)
    
    # Enriched Fields (camelCase for Frontend)
    patientName = serializers.SerializerMethodField()
    room = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    birthdate = serializers.SerializerMethodField()
    condition = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    admissionDate = serializers.SerializerMethodField()
    physician = serializers.SerializerMethodField()
    estimatedDischarge = serializers.SerializerMethodField()
    dischargeDate = serializers.SerializerMethodField()
    
    # Discharge specific
    finalDiagnosis = serializers.SerializerMethodField()
    dischargeSummary = serializers.CharField(source='summary_of_stay', read_only=True)
    followUpRequired = serializers.SerializerMethodField()
    followUpPlan = serializers.CharField(source='follow_up_plan', read_only=True)
    requirements = serializers.SerializerMethodField()

    class Meta:
        model = Discharge
        fields = [
            'id', 'discharge_id', 'encounter_id', 'patient', 'admission', 'physician_id',
            'discharge_datetime', 'notice_datetime', 'billing_cleared_datetime',
            'status', 'workflow_status', 'created_by', 'summary_of_stay',
            'discharge_instructions', 'pending_items', 'follow_up_plan', 'followUpPlan',
            'patientName', 'room', 'age', 'birthdate', 'department', 'condition', 
            'admissionDate', 'dischargeDate', 'estimatedDischarge',
            'physician', 'finalDiagnosis', 'dischargeSummary', 
            'followUpRequired', 'requirements',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['discharge_id', 'created_at', 'updated_at']

    def get_patientName(self, obj):
        if hasattr(obj, 'patient_obj') and obj.patient_obj:
            return f"{obj.patient_obj.first_name} {obj.patient_obj.last_name}".strip()
        return "Unknown Patient"

    def get_room(self, obj):
        if hasattr(obj, 'encounter_obj') and obj.encounter_obj:
            # First try structured location_obj
            if hasattr(obj.encounter_obj, 'location_obj') and obj.encounter_obj.location_obj:
                return obj.encounter_obj.location_obj.name
            
            # Then try Parsing location_status (Ward|Room|Bed) from Admission backend
            if hasattr(obj.encounter_obj, 'location_status') and obj.encounter_obj.location_status:
                parts = obj.encounter_obj.location_status.split('|')
                if len(parts) >= 2 and parts[1] and parts[1].strip():
                    room_code = parts[1].strip()
                    # Try to resolve code to name
                    try:
                        loc = Location.objects.filter(identifier=room_code).first()
                        if loc:
                            return loc.name
                    except Exception:
                        logger.exception("Error resolving room code %r to location name", room_code)
                    return room_code
            
            return f"Room {obj.encounter_obj.location_id}" if obj.encounter_obj.location_id else "Unassigned"
        return "Unassigned"

    def get_age(self, obj):
        if hasattr(obj, 'patient_obj') and obj.patient_obj:
            age = obj.patient_obj.age
            return age if age is not None else "N/A"
        return "N/A"

    def get_birthdate(self, obj):
        if hasattr(obj, 'patient_obj') and obj.patient_obj and obj.patient_obj.birthdate:
            return obj.patient_obj.birthdate.isoformat()
        return None

    def get_condition(self, obj):
        if hasattr(obj, 'encounter_obj') and obj.encounter_obj:
            return obj.encounter_obj.reason_code or "Under Observation"
        return "Stable"

    def get_department(self, obj):
        if hasattr(obj, 'encounter_obj') and obj.encounter_obj:
            return obj.encounter_obj.service_type or "General"
        return "General"

    def get_admissionDate(self, obj):
        if hasattr(obj, 'encounter_obj') and obj.encounter_obj and obj.encounter_obj.period_start:
            return obj.encounter_obj.period_start.isoformat()
        return ""

    def get_physician(self, obj):
        if hasattr(obj, 'encounter_obj') and obj.encounter_obj:
            if hasattr(obj.encounter_obj, 'practitioner_obj') and obj.encounter_obj.practitioner_obj:
                p = obj.encounter_obj.practitioner_obj
                return f"Dr. {p.first_name} {p.last_name}"
        return "Dr. On-Duty"

    def get_estimatedDischarge(self, obj):
        if obj.notice_datetime:
            return obj.notice_datetime.isoformat()
        if hasattr(obj, 'encounter_obj') and obj.encounter_obj and obj.encounter_obj.period_end:
            return obj.encounter_obj.period_end.isoformat()
        return ""

    def get_dischargeDate(self, obj):
        return obj.discharge_datetime.isoformat() if obj.discharge_datetime else None

    def get_finalDiagnosis(self, obj):
        if obj.summary_of_stay and "Diagnosis:" in obj.summary_of_stay:
            try:
                return obj.summary_of_stay.split("Diagnosis:")[1].split("\n")[0].strip()
            except (IndexError, AttributeError):
                pass
        return "Pending Diagnosis"

    def get_followUpRequired(self, obj):
        return bool(obj.follow_up_plan)

    def get_requirements(self, obj):
        # Default requirements
        res = {
            'finalDiagnosis': bool(obj.summary_of_stay),
            'physicianSignature': bool(obj.physician_id),
            'medicationReconciliation': bool(obj.discharge_instructions),
            'dischargeSummary': bool(obj.summary_of_stay),
            'billingClearance': bool(obj.billing_cleared_datetime),
            'nursingNotes': True, # Default to true for MVP display
            'followUpScheduled': bool(obj.follow_up_plan)
        }
        
        # Merge with stored requirements if any
        if obj.pending_items:
            try:
                stored = json.loads(obj.pending_items)
                if isinstance(stored, dict):
                    res.update(stored)
            except (json.JSONDecodeError, TypeError):
                pass
        return res
