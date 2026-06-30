from django.db import models
from core.models import FHIRResourceModel


class LabTestDefinition(FHIRResourceModel):
    """
    Service Catalog (Charge Master) for Laboratory Tests.
    Links lab tests to billing system via code (SKU).
    """
    test_id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    turnaround_time = models.CharField(max_length=100, null=True, blank=True)
    
    # Optimization: Dynamic Reference Ranges
    unit = models.CharField(max_length=50, blank=True, null=True, help_text="Measurement unit (e.g. mg/dL)")
    normal_range = models.JSONField(
        default=dict, 
        blank=True, 
        help_text="JSON structure for ranges, e.g. {'male': '13.5-17.5', 'female': '12.0-15.5'}"
    )

    class Meta:
        db_table = 'laboratory_test_definition'

    def __str__(self):
        return f"{self.code} - {self.name}"


class DiagnosticReport(FHIRResourceModel):
    """
    FHIR DiagnosticReport - Unified Order-to-Result Model (Trinity Approach).
    Handles complete lifecycle: Order (registered) → In-Progress (partial) → Complete (final).
    No separate ServiceRequest/Order model needed.
    """
    diagnostic_report_id = models.AutoField(primary_key=True)
    subject_id = models.BigIntegerField(db_index=True)
    encounter_id = models.BigIntegerField(db_index=True)
    
    # Billing Traceability
    billing_reference = models.CharField(max_length=100, null=True, blank=True, db_index=True, help_text="Reference to the Claim/Invoice generated")
    
    # Trinity Approach: Requester vs Performer
    requester_id = models.BigIntegerField(
        db_index=True, 
        null=True, 
        blank=True,
        help_text="Doctor/Nurse who ordered the test (from Monitoring module)"
    )
    performer_id = models.BigIntegerField(
        db_index=True, 
        null=True, 
        blank=True,
        help_text="Lab technician who performed/processed the test"
    )
    
    # Priority field for urgent test flagging
    PRIORITY_CHOICES = [
        ('routine', 'Routine'),
        ('urgent', 'Urgent'),
        ('stat', 'STAT'),
    ]
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='routine',
        db_index=True,
        help_text="Test priority level"
    )
    
    results_interpreter_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    specimen_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    based_on_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    imaging_study_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    code_code = models.CharField(max_length=100, null=True, blank=True)
    code_display = models.CharField(max_length=100, null=True, blank=True)
    category_code = models.CharField(max_length=100, null=True, blank=True)
    category_display = models.CharField(max_length=100, null=True, blank=True)
    conclusion = models.CharField(max_length=255, null=True, blank=True)
    conclusion_code = models.CharField(max_length=100, null=True, blank=True)
    conclusion_display = models.CharField(max_length=100, null=True, blank=True)
    effective_datetime = models.DateTimeField(null=True, blank=True)
    effective_period_start = models.DateField(null=True, blank=True)
    effective_period_end = models.DateField(null=True, blank=True)
    issued_datetime = models.DateTimeField(null=True, blank=True)

    
    # Flexible field to store the full result payload (parameters + metadata)
    # This allows storing the exact form data from the frontend without complex observation mapping
    result_data = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'laboratory_diagnostic_report'
        indexes = [
            models.Index(fields=['status', 'priority'], name='lab_status_priority_idx'),
            models.Index(fields=['encounter_id', 'status'], name='lab_encounter_status_idx'),
        ]


class DiagnosticReportResult(models.Model):
    diagnostic_report_result_id = models.AutoField(primary_key=True)
    diagnostic_report = models.ForeignKey(
        DiagnosticReport,
        on_delete=models.CASCADE,
        related_name='results',
        db_column='diagnostic_report_id'
    )
    observation_id = models.BigIntegerField(db_index=True)
    item_sequence = models.IntegerField()

    class Meta:
        db_table = 'laboratory_diagnostic_report_result'
        ordering = ['item_sequence']


class Specimen(FHIRResourceModel):
    specimen_id = models.AutoField(primary_key=True)
    subject_id = models.BigIntegerField(db_index=True)
    type = models.CharField(max_length=100, null=True, blank=True)
    collection_datetime = models.DateTimeField(null=True, blank=True)
    collection_method = models.CharField(max_length=255, null=True, blank=True)
    collection_body_site = models.CharField(max_length=255, null=True, blank=True)
    collector_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    received_time = models.DateTimeField(null=True, blank=True)
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'laboratory_specimen'


class ImagingStudy(FHIRResourceModel):
    imaging_study_id = models.AutoField(primary_key=True)
    subject_id = models.BigIntegerField(db_index=True)
    encounter_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    started = models.DateTimeField(null=True, blank=True)
    modality = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    number_of_series = models.IntegerField(null=True, blank=True)
    number_of_instances = models.IntegerField(null=True, blank=True)
    interpreter_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'laboratory_imaging_study'