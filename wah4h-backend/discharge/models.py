from django.db import models
from core.models import TimeStampedModel, FHIRResourceModel

# ==================== DISCHARGE SUMMARY (HEADER) ====================

class Discharge(TimeStampedModel):
    """Main discharge summary record - strictly decoupled from other modules"""
    discharge_id = models.AutoField(primary_key=True)
    
    # Fortress Pattern: No FK imports - use BigIntegerField with db_index
    encounter_id = models.BigIntegerField(db_index=True)
    patient_id = models.BigIntegerField(db_index=True)
    physician_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    
    # Discharge metadata
    discharge_datetime = models.DateTimeField(null=True, blank=True)
    notice_datetime = models.DateTimeField(null=True, blank=True)
    billing_cleared_datetime = models.DateTimeField(null=True, blank=True)
    workflow_status = models.CharField(max_length=100, null=True, blank=True)
    created_by = models.CharField(max_length=255, null=True, blank=True)
    
    # Clinical documentation
    summary_of_stay = models.TextField(null=True, blank=True)
    discharge_instructions = models.TextField(null=True, blank=True)
    pending_items = models.TextField(null=True, blank=True)
    follow_up_plan = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'discharge_summary'
        indexes = [
            models.Index(fields=['encounter_id']),
            models.Index(fields=['patient_id']),
            models.Index(fields=['workflow_status']),
            models.Index(fields=['discharge_datetime']),
        ]


# ==================== PROCEDURE (PHCore STANDARD) ====================

class Procedure(FHIRResourceModel):
    """FHIR Procedure resource - procedures performed during hospitalization"""
    procedure_id = models.AutoField(primary_key=True)
    
    # References (Fortress Pattern - no FK imports)
    encounter_id = models.BigIntegerField(db_index=True)
    subject_id = models.BigIntegerField(db_index=True)
    asserter_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    based_on_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    part_of_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    location_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    recorder_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    report_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    reason_reference_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    complication_detail_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    focal_device_manipulated_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    used_reference_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    
    # Instantiation
    instantiates_canonical = models.CharField(max_length=255, null=True, blank=True)
    instantiates_uri = models.CharField(max_length=255, null=True, blank=True)
    
    # Status
    status_reason_code = models.CharField(max_length=100, null=True, blank=True)
    status_reason_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Category and Code
    category_code = models.CharField(max_length=100, null=True, blank=True)
    category_display = models.CharField(max_length=100, null=True, blank=True)
    code_code = models.CharField(max_length=100, null=True, blank=True)
    code_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Body Site
    body_site_code = models.CharField(max_length=100, null=True, blank=True)
    body_site_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Outcome
    outcome_code = models.CharField(max_length=100, null=True, blank=True)
    outcome_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Reason
    reason_code_code = models.CharField(max_length=100, null=True, blank=True)
    reason_code_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Complications
    complication_code = models.CharField(max_length=100, null=True, blank=True)
    complication_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Follow-up
    follow_up_code = models.CharField(max_length=100, null=True, blank=True)
    follow_up_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Focal Device
    focal_device_action_code = models.CharField(max_length=100, null=True, blank=True)
    focal_device_action_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Used Items
    used_code_code = models.CharField(max_length=100, null=True, blank=True)
    used_code_display = models.CharField(max_length=100, null=True, blank=True)
    
    # Performer (embedded)
    performer_actor_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    performer_function_code = models.CharField(max_length=100, null=True, blank=True)
    performer_function_display = models.CharField(max_length=100, null=True, blank=True)
    performer_on_behalf_of_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    
    # Performed timing (polymorphic)
    performed_datetime = models.DateTimeField(null=True, blank=True)
    performed_period_start = models.DateField(null=True, blank=True)
    performed_period_end = models.DateField(null=True, blank=True)
    performed_string = models.CharField(max_length=255, null=True, blank=True)
    performed_age_value = models.CharField(max_length=255, null=True, blank=True)
    performed_age_unit = models.CharField(max_length=255, null=True, blank=True)
    performed_range_low = models.CharField(max_length=255, null=True, blank=True)
    performed_range_high = models.CharField(max_length=255, null=True, blank=True)
    
    # Notes
    note = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'discharge_procedure'
        indexes = [
            models.Index(fields=['identifier']),
            models.Index(fields=['status']),
            models.Index(fields=['encounter_id']),
            models.Index(fields=['subject_id']),
            models.Index(fields=['code_code']),
            models.Index(fields=['performed_datetime']),
        ]


# ==================== PROCEDURE PERFORMER (JUNCTION TABLE) ====================

class ProcedurePerformer(models.Model):
    """Links performers to procedures - normalized child table (One-to-Many)"""
    procedure_performer_id = models.AutoField(primary_key=True)
    procedure = models.ForeignKey(
        Procedure,
        on_delete=models.CASCADE,
        related_name='performers',
        db_column='procedure_id'
    )
    
    # Fortress Pattern: External references remain BigIntegerField
    performer_actor_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    performer_on_behalf_of_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    
    # Performer function
    performer_function_code = models.CharField(max_length=100, null=True, blank=True)
    performer_function_display = models.CharField(max_length=100, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'discharge_procedure_performer'
        indexes = [
            models.Index(fields=['procedure_id']),
            models.Index(fields=['performer_actor_id']),
        ]