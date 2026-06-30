from django.db import models
from core.models import TimeStampedModel, FHIRResourceModel


class Medication(FHIRResourceModel):
    """
    FHIR Medication Resource - Lookup Table
    Inherits: identifier, status, created_at, updated_at from FHIRResourceModel
    """
    medication_id = models.AutoField(primary_key=True)
    code_code = models.CharField(max_length=100, unique=True, null=True, blank=True)
    code_display = models.CharField(max_length=100, null=True, blank=True)
    code_system = models.CharField(max_length=100, null=True, blank=True)
    code_version = models.CharField(max_length=100, null=True, blank=True)
    implicit_rules = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'medication'
        indexes = [
            models.Index(fields=['code_code']),
        ]


class MedicationRequest(FHIRResourceModel):
    """
    FHIR MedicationRequest Resource - Header (Normalized)
    Inherits: identifier, status, created_at, updated_at from FHIRResourceModel
    Fortress Pattern: All external references use BigIntegerField (NO ForeignKey)
    """
    medication_request_id = models.AutoField(primary_key=True)
    
    # Decoupled Reference Fields (BigIntegerField - Fortress Pattern)
    subject_id = models.BigIntegerField(db_index=True)  # Reference to patients.Patient
    encounter_id = models.BigIntegerField(db_index=True)  # Reference to admission.Encounter
    requester_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to accounts.Practitioner
    performer_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to accounts.Practitioner
    recorder_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to accounts.Practitioner
    based_on_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to admission.ServiceRequest
    insurance_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to billing.Coverage
    reported_reference_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to accounts.Practitioner
    reason_reference_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to patients.Condition
    
    # Medication CodeableConcept or Reference
    medication_reference = models.CharField(max_length=255, null=True, blank=True)
    medication_code = models.CharField(max_length=100, null=True, blank=True)
    medication_display = models.CharField(max_length=100, null=True, blank=True)
    medication_system = models.CharField(max_length=100, null=True, blank=True)
    
    # Billing Traceability
    billing_reference = models.CharField(max_length=100, null=True, blank=True, db_index=True, help_text="Reference to the Claim/Invoice generated")
    
    # Request Details
    intent = models.CharField(max_length=255, null=True, blank=True)
    category = models.CharField(max_length=255, null=True, blank=True)
    priority = models.CharField(max_length=255, null=True, blank=True)
    do_not_perform = models.BooleanField(null=True, blank=True)
    reported_boolean = models.BooleanField(null=True, blank=True)
    authored_on = models.DateTimeField(null=True, blank=True)
    status_reason = models.CharField(max_length=100, null=True, blank=True)
    reason_code = models.CharField(max_length=100, null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    
    # Dispense Request
    dispense_quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dispense_initial_fill_quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dispense_initial_fill_duration = models.CharField(max_length=255, null=True, blank=True)
    dispense_interval = models.CharField(max_length=255, null=True, blank=True)
    dispense_validity_period_start = models.CharField(max_length=255, null=True, blank=True)
    dispense_validity_period_end = models.CharField(max_length=255, null=True, blank=True)
    dispense_repeats_allowed = models.CharField(max_length=255, null=True, blank=True)
    
    # Additional Fields
    group_identifier = models.CharField(max_length=100, null=True, blank=True)
    course_of_therapy_type = models.CharField(max_length=100, null=True, blank=True)
    instantiates_canonical = models.CharField(max_length=255, null=True, blank=True)
    instantiates_uri = models.CharField(max_length=255, null=True, blank=True)
    performer_type = models.CharField(max_length=100, null=True, blank=True)
    
    class Meta:
        db_table = 'medication_request'
        indexes = [
            models.Index(fields=['subject_id', 'encounter_id']),
            models.Index(fields=['status', 'authored_on']),
        ]


class MedicationRequestDosage(models.Model):
    """
    FHIR MedicationRequest Dosage Instructions - Child Table (Normalized)
    One-to-Many relationship with MedicationRequest
    """
    dosage_id = models.AutoField(primary_key=True)
    medication_request = models.ForeignKey(
        MedicationRequest,
        on_delete=models.CASCADE,
        related_name='dosages',
        db_column='medication_request_id'
    )
    
    # Dosage Instructions
    dosage_text = models.TextField(null=True, blank=True)
    dosage_site = models.CharField(max_length=255, null=True, blank=True)
    dosage_route = models.CharField(max_length=255, null=True, blank=True)
    dosage_method = models.CharField(max_length=255, null=True, blank=True)
    
    # Dose Quantity
    dosage_dose_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dosage_dose_unit = models.CharField(max_length=50, null=True, blank=True)  # FIXED: CharField for units
    
    # Rate
    dosage_rate_quantity_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dosage_rate_quantity_unit = models.CharField(max_length=50, null=True, blank=True)  # FIXED: CharField for units
    dosage_rate_ratio_numerator = models.CharField(max_length=255, null=True, blank=True)
    dosage_rate_ratio_denominator = models.CharField(max_length=255, null=True, blank=True)
    
    # Timing and Sequence
    sequence = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'medication_request_dosage'
        ordering = ['sequence']
        indexes = [
            models.Index(fields=['medication_request', 'sequence']),
        ]


class Inventory(TimeStampedModel):
    """
    Pharmacy Inventory Management - Independent Table
    Inherits: created_at, updated_at from TimeStampedModel
    """
    inventory_id = models.AutoField(primary_key=True)
    item_code = models.CharField(max_length=100, unique=True, db_index=True)
    item_name = models.CharField(max_length=255, null=True, blank=True)
    category = models.CharField(max_length=255, null=True, blank=True)
    batch_number = models.CharField(max_length=255, null=True, blank=True)
    current_stock = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=0)
    unit_of_measure = models.CharField(max_length=50, null=True, blank=True)  # e.g., "mg", "ml", "tablets"
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=100, db_index=True)
    expiry_date = models.DateField(null=True, blank=True)
    last_restocked_datetime = models.DateTimeField(null=True, blank=True)
    created_by = models.CharField(max_length=255, null=True, blank=True)
    manufacturer = models.CharField(max_length=255, null=True, blank=True)
    form = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True) # Optional description
    
    class Meta:
        db_table = 'inventory'
        indexes = [
            models.Index(fields=['item_code', 'status']),
            models.Index(fields=['expiry_date']),
        ]


class MedicationAdministration(FHIRResourceModel):
    """
    FHIR MedicationAdministration Resource - Header (Normalized)
    Inherits: identifier, status, created_at, updated_at from FHIRResourceModel
    Fortress Pattern: All external references use BigIntegerField (NO ForeignKey)
    """
    medication_administration_id = models.AutoField(primary_key=True)
    
    # Decoupled Reference Fields (BigIntegerField - Fortress Pattern)
    subject_id = models.BigIntegerField(db_index=True)  # Reference to patients.Patient
    context_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to admission.Encounter
    performer_actor_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to accounts.Practitioner
    request_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to pharmacy.MedicationRequest
    part_of_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to admission.Procedure
    device_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to admission.Device
    event_history_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to monitoring.Observation
    reason_reference_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Reference to patients.Condition
    
    # Medication CodeableConcept or Reference
    medication_reference = models.CharField(max_length=255, null=True, blank=True)
    medication_code = models.CharField(max_length=100, null=True, blank=True)
    medication_display = models.CharField(max_length=100, null=True, blank=True)
    medication_system = models.CharField(max_length=100, null=True, blank=True)
    
    # Administration Details
    instantiates_uri = models.CharField(max_length=255, null=True, blank=True)
    status_reason = models.CharField(max_length=100, null=True, blank=True)
    category = models.CharField(max_length=255, null=True, blank=True)
    effective_datetime = models.DateTimeField(null=True, blank=True)
    effective_period_start = models.DateField(null=True, blank=True)
    effective_period_end = models.DateField(null=True, blank=True)
    performer_function = models.CharField(max_length=255, null=True, blank=True)
    reason_code = models.CharField(max_length=100, null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'medication_administration'
        indexes = [
            models.Index(fields=['subject_id', 'effective_datetime']),
            models.Index(fields=['request_id']),
        ]


class MedicationAdministrationDosage(models.Model):
    """
    FHIR MedicationAdministration Dosage - Child Table (Normalized)
    One-to-One relationship with MedicationAdministration (can be extended to One-to-Many if needed)
    """
    dosage_id = models.AutoField(primary_key=True)
    medication_administration = models.OneToOneField(
        MedicationAdministration,
        on_delete=models.CASCADE,
        related_name='dosage',
        db_column='medication_administration_id'
    )
    
    # Dosage Details
    dosage_text = models.TextField(null=True, blank=True)
    dosage_site = models.CharField(max_length=255, null=True, blank=True)
    dosage_route = models.CharField(max_length=255, null=True, blank=True)
    dosage_method = models.CharField(max_length=255, null=True, blank=True)
    
    # Dose Quantity
    dosage_dose_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dosage_dose_unit = models.CharField(max_length=50, null=True, blank=True)  # FIXED: CharField for units
    
    # Rate
    dosage_rate_quantity_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dosage_rate_quantity_unit = models.CharField(max_length=50, null=True, blank=True)  # FIXED: CharField for units
    dosage_rate_ratio_numerator = models.CharField(max_length=255, null=True, blank=True)
    dosage_rate_ratio_denominator = models.CharField(max_length=255, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'medication_administration_dosage'