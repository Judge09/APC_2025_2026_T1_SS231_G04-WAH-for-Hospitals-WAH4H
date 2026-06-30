from django.db import models
from core.models import TimeStampedModel, FHIRResourceModel

class Encounter(FHIRResourceModel):
    """
    Encounter: Represents a healthcare encounter (appointment, admission, visit).
    Normalized structure with Fortress Pattern for external decoupling.
    Inherits identifier, status, created_at, updated_at from FHIRResourceModel.
    """
    encounter_id = models.AutoField(primary_key=True)
    
    # Classification and typing
    class_field = models.CharField(
        max_length=100,
        db_column='class',
        null=True,
        blank=True,
        help_text="Class of encounter (inpatient, outpatient, emergency, etc.)"
    )
    type = models.CharField(max_length=100, null=True, blank=True)
    service_type = models.CharField(max_length=100, null=True, blank=True)
    priority = models.CharField(max_length=255, null=True, blank=True)
    
    # Subject (Patient) - External Reference with Fortress Pattern
    subject_id = models.BigIntegerField(null=False, blank=False, db_index=True)  # Ref to patients.Patient
    
    # External References - Fortress Pattern
    episode_of_care_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to EpisodeOfCare
    based_on_service_request_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to ServiceRequest
    appointment_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Appointment
    participant_individual_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Practitioner
    reason_reference_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Condition
    diagnosis_condition_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Condition
    # Location information - Fortress Pattern
    # Use location_ids to store the hierarchy path: [BuildingID, WingID, WardID, RoomID, BedID]
    # This allows O(1) searches for all patients in a specific ward without joins.
    location_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Primary specific location (e.g. Bed)
    location_ids = models.JSONField(
        null=True, 
        blank=True, 
        help_text="Hierarchical location path IDs [Building, Ward, Room, Bed]"
    )
    
    # External References - Fortress Pattern (Restored)
    discharge_destination_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Location
    service_provider_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Organization
    account_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Account (billing)
    
    # Participant information
    participant_type = models.CharField(max_length=100, null=True, blank=True)
    
    # Period timing
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    
    # Length of stay
    length = models.CharField(max_length=255, null=True, blank=True)
    
    # Reason for encounter
    reason_code = models.CharField(max_length=100, null=True, blank=True)
    
    # Diagnosis
    diagnosis_rank = models.CharField(max_length=255, null=True, blank=True)
    diagnosis_use = models.CharField(max_length=255, null=True, blank=True)
    
    # Location status information
    location_status = models.CharField(max_length=255, null=True, blank=True)
    location_period_start = models.DateTimeField(null=True, blank=True)
    location_period_end = models.DateTimeField(null=True, blank=True)
    
    # Hospitalization details
    admit_source = models.CharField(max_length=255, null=True, blank=True)
    re_admission = models.BooleanField(null=True, blank=True)
    diet_preference = models.CharField(max_length=255, null=True, blank=True)
    special_courtesy = models.CharField(max_length=255, null=True, blank=True)
    special_arrangement = models.CharField(max_length=255, null=True, blank=True)
    discharge_disposition = models.TextField(null=True, blank=True)
    
    # Hierarchical relationships - Internal Reference
    part_of_encounter_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to self
    
    # Pre-admission identifier
    pre_admission_identifier = models.CharField(max_length=100, null=True, blank=True)
    
    class Meta:
        db_table = 'encounter'
        verbose_name = 'Encounter'
        verbose_name_plural = 'Encounters'
    
    def __str__(self):
        return f"Encounter {self.encounter_id} - {self.identifier}"


class Procedure(FHIRResourceModel):
    """
    Procedure: Represents a medical procedure performed during an encounter.
    Normalized structure with Fortress Pattern for external references.
    Internal integrity: ForeignKey to Encounter (within admission app).
    Inherits identifier, status, created_at, updated_at from FHIRResourceModel.
    """
    procedure_id = models.AutoField(primary_key=True)
    status_reason_code = models.CharField(max_length=100, null=True, blank=True)
    status_reason_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Instantiation
    instantiates_canonical = models.CharField(max_length=255, null=True, blank=True)
    instantiates_uri = models.CharField(max_length=255, null=True, blank=True)
    
    # External References - Fortress Pattern
    based_on_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to ServiceRequest
    part_of_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to self (Procedure)
    subject_id = models.BigIntegerField(null=False, blank=False, db_index=True)  # Ref to patients.Patient
    performer_actor_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Practitioner
    performer_on_behalf_of_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Organization
    recorder_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Practitioner
    asserter_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Practitioner
    location_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Location
    reason_reference_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Condition
    complication_detail_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Condition
    report_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to DiagnosticReport
    focal_device_manipulated_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Device
    used_reference_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Medication
    
    # Internal Integrity - ForeignKey to Encounter (same app)
    encounter = models.ForeignKey(
        'Encounter',
        on_delete=models.CASCADE,
        related_name='procedures',
        db_column='encounter_id',
        null=False,
        blank=False
    )
    
    # Classification and coding
    category_code = models.CharField(max_length=100, null=True, blank=True)
    category_display = models.CharField(max_length=100, null=True, blank=True)
    code_code = models.CharField(max_length=100, null=True, blank=True)
    code_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Timing
    performed_datetime = models.DateTimeField(null=True, blank=True)
    performed_period_start = models.DateField(null=True, blank=True)
    performed_period_end = models.DateField(null=True, blank=True)
    performed_string = models.CharField(max_length=255, null=True, blank=True)
    performed_age_value = models.CharField(max_length=255, null=True, blank=True)
    performed_age_unit = models.CharField(max_length=255, null=True, blank=True)
    performed_range_low = models.CharField(max_length=255, null=True, blank=True)
    performed_range_high = models.CharField(max_length=255, null=True, blank=True)
    
    # Performer function
    performer_function_code = models.CharField(max_length=100, null=True, blank=True)
    performer_function_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Reason
    reason_code_code = models.CharField(max_length=100, null=True, blank=True)
    reason_code_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Body Site
    body_site_code = models.CharField(max_length=100, null=True, blank=True)
    body_site_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Outcome and Complications
    outcome_code = models.CharField(max_length=100, null=True, blank=True)
    outcome_display = models.CharField(max_length=100, null=True, blank=True)
    complication_code = models.CharField(max_length=100, null=True, blank=True)
    complication_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Follow-up
    follow_up_code = models.CharField(max_length=100, null=True, blank=True)
    follow_up_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Notes
    note = models.TextField(null=True, blank=True)
    
    # Focal Device
    focal_device_action_code = models.CharField(max_length=100, null=True, blank=True)
    focal_device_action_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Used codes
    used_code_code = models.CharField(max_length=100, null=True, blank=True)
    used_code_display = models.CharField(max_length=100, null=True, blank=True)
    
    class Meta:
        db_table = 'procedure'
        verbose_name = 'Procedure'
        verbose_name_plural = 'Procedures'
    
    def __str__(self):
        return f"Procedure {self.procedure_id} - {self.identifier}"


class ProcedurePerformer(TimeStampedModel):
    """
    ProcedurePerformer: Pure junction table for procedure performers.
    Normalized structure - no duplicate clinical fields.
    All clinical data (timing, body sites, outcomes) belongs to Procedure, not here.
    """
    procedure_performer_id = models.AutoField(primary_key=True)
    
    # Internal Integrity - ForeignKey to Procedure (same app)
    procedure = models.ForeignKey(
        'Procedure',
        on_delete=models.CASCADE,
        related_name='performers',
        db_column='procedure_id',
        null=False,
        blank=False
    )
    
    # External References - Fortress Pattern
    performer_actor_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Practitioner
    performer_on_behalf_of_id = models.BigIntegerField(null=True, blank=True, db_index=True)  # Ref to Organization
    
    # Performer function
    performer_function_code = models.CharField(max_length=100, null=True, blank=True)
    performer_function_display = models.CharField(max_length=100, null=True, blank=True)
    
    class Meta:
        db_table = 'procedure_performer'
        verbose_name = 'Procedure Performer'
        verbose_name_plural = 'Procedure Performers'
    
    def __str__(self):
        return f"ProcedurePerformer {self.procedure_performer_id} for Procedure {self.procedure_id}"