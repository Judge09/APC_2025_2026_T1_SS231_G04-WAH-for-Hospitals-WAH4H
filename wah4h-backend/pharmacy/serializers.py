import logging
from rest_framework import serializers
from .models import Inventory, Medication, MedicationRequest, MedicationAdministration

logger = logging.getLogger(__name__)


class InventoryListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views — omits rarely-needed fields."""
    class Meta:
        model = Inventory
        fields = [
            'inventory_id', 'item_code', 'item_name', 'category',
            'current_stock', 'reorder_level', 'unit_of_measure',
            'unit_cost', 'status', 'expiry_date', 'form',
        ]


class InventorySerializer(serializers.ModelSerializer):
    """Full serializer for create/retrieve/update."""
    class Meta:
        model = Inventory
        fields = [
            'inventory_id', 'item_code', 'item_name', 'category',
            'batch_number', 'current_stock', 'reorder_level',
            'unit_of_measure', 'unit_cost', 'status', 'expiry_date',
            'last_restocked_datetime', 'created_by', 'manufacturer',
            'form', 'description', 'created_at', 'updated_at',
        ]


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = [
            'medication_id', 'identifier', 'status',
            'code_code', 'code_display', 'code_system', 'code_version',
            'created_at', 'updated_at',
        ]


from patients.models import Patient
from accounts.models import Practitioner


class MedicationRequestListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    patient_name = serializers.SerializerMethodField()
    practitioner_name = serializers.SerializerMethodField()

    class Meta:
        model = MedicationRequest
        fields = [
            'medication_request_id', 'identifier', 'status',
            'subject_id', 'patient_name', 'encounter_id',
            'requester_id', 'practitioner_name',
            'medication_code', 'medication_display',
            'intent', 'priority', 'authored_on',
            'dispense_quantity', 'note', 'created_at',
        ]

    def get_patient_name(self, obj):
        if not obj.subject_id:
            return "Unknown"
        patients_map = self.context.get('patients_map', {})
        if obj.subject_id in patients_map:
            patient = patients_map[obj.subject_id]
            return f"{patient.first_name} {patient.last_name}".strip()
        patient = Patient.objects.filter(id=obj.subject_id).first()
        if patient:
            return f"{patient.first_name} {patient.last_name}".strip()
        return "Unknown"

    def get_practitioner_name(self, obj):
        if not obj.requester_id:
            return "Unknown"
        practitioners_map = self.context.get('practitioners_map', {})
        if obj.requester_id in practitioners_map:
            practitioner = practitioners_map[obj.requester_id]
            return f"{practitioner.first_name} {practitioner.last_name}".strip()
        practitioner = Practitioner.objects.filter(practitioner_id=obj.requester_id).first()
        if practitioner:
            return f"{practitioner.first_name} {practitioner.last_name}".strip()
        return "Unknown"


class MedicationRequestSerializer(MedicationRequestListSerializer):
    """Full serializer for create/retrieve/update — includes all dosage fields."""

    class Meta(MedicationRequestListSerializer.Meta):
        fields = MedicationRequestListSerializer.Meta.fields + [
            'performer_id', 'recorder_id', 'based_on_id', 'insurance_id',
            'billing_reference', 'medication_reference', 'medication_system',
            'category', 'do_not_perform', 'reported_boolean',
            'status_reason', 'reason_code',
            'dispense_initial_fill_quantity', 'dispense_initial_fill_duration',
            'dispense_interval', 'dispense_validity_period_start',
            'dispense_validity_period_end', 'dispense_repeats_allowed',
            'group_identifier', 'course_of_therapy_type',
            'updated_at',
        ]


class MedicationAdministrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationAdministration
        fields = [
            'medication_administration_id', 'identifier', 'status',
            'subject_id', 'context_id', 'performer_actor_id', 'request_id',
            'medication_code', 'medication_display',
            'effective_datetime', 'effective_period_start', 'effective_period_end',
            'performer_function', 'reason_code', 'note',
            'created_at', 'updated_at',
        ]
