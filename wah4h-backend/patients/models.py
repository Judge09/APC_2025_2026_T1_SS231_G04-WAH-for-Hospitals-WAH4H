from django.core.validators import RegexValidator
from django.db import models
from core.models import TimeStampedModel, FHIRResourceModel


class Patient(TimeStampedModel):
    """
    PHCORE Standard Patient Model
    Aligned with Philippine LGU requirements and Data Dictionary
    """
    id = models.BigAutoField(primary_key=True)
    patient_id = models.CharField(max_length=255, unique=True, null=True, blank=True, db_index=True)

    # Name fields
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    middle_name = models.CharField(max_length=255, null=True, blank=True)
    suffix_name = models.CharField(max_length=255, null=True, blank=True)

    # Demographics
    gender = models.CharField(max_length=100, null=True, blank=True)
    birthdate = models.DateField(null=True, blank=True)
    civil_status = models.CharField(max_length=255, null=True, blank=True)
    nationality = models.CharField(max_length=255, null=True, blank=True)
    religion = models.CharField(max_length=255, null=True, blank=True)

    # Health identifiers
    philhealth_id = models.CharField(
        max_length=14,
        null=True,
        blank=True,
        validators=[
            RegexValidator(
                regex=r'^\d{2}-\d{9}-\d$',
                message='PhilHealth ID must follow the format XX-XXXXXXXXX-X (e.g. 12-345678901-2).',
            )
        ],
    )
    blood_type = models.CharField(max_length=100, null=True, blank=True)
    pwd_type = models.CharField(max_length=100, null=True, blank=True)

    # Occupation and Education
    occupation = models.CharField(max_length=255, null=True, blank=True)
    education = models.CharField(max_length=255, null=True, blank=True)

    # Contact information
    mobile_number = models.CharField(max_length=255, null=True, blank=True)

    # Address fields
    address_line = models.CharField(max_length=255, null=True, blank=True)
    address_city = models.CharField(max_length=255, null=True, blank=True)
    address_district = models.CharField(max_length=255, null=True, blank=True)
    address_state = models.CharField(max_length=255, null=True, blank=True)
    address_postal_code = models.CharField(max_length=100, null=True, blank=True)
    address_country = models.CharField(max_length=255, null=True, blank=True)

    # Emergency contact
    contact_first_name = models.CharField(max_length=50, null=True, blank=True)
    contact_last_name = models.CharField(max_length=50, null=True, blank=True)
    contact_mobile_number = models.CharField(max_length=50, null=True, blank=True)
    contact_relationship = models.CharField(max_length=50, null=True, blank=True)

    # Indigenous and PWD flags
    indigenous_flag = models.BooleanField(null=True, blank=True)
    indigenous_group = models.CharField(max_length=255, null=True, blank=True)

    # Consent and media
    consent_flag = models.BooleanField(null=True, blank=True)
    image_url = models.URLField(max_length=255, null=True, blank=True)

    # Status
    active = models.BooleanField(default=True)
    status = models.CharField(max_length=20, default='active')  # active/inactive

    @property
    def age(self):
        """Calculate age from birthdate."""
        if not self.birthdate:
            return None
        from datetime import date
        today = date.today()
        return today.year - self.birthdate.year - ((today.month, today.day) < (self.birthdate.month, self.birthdate.day))

    def save(self, *args, **kwargs):
        """
        Override save() to keep active (bool) and status (str) in sync.

        Single source of truth: `active` drives `status`.
            active=True  → status='active'
            active=False → status='inactive'

        This prevents the two fields from ever diverging, regardless of
        which field a caller sets.
        """
        self.status = 'active' if self.active else 'inactive'
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'patient'
        indexes = [
            models.Index(fields=['patient_id']),
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['philhealth_id']),
        ]

    def __str__(self):
        return f"{self.patient_id or self.id}: {self.first_name} {self.last_name}"


class Condition(FHIRResourceModel):
    """
    FHIR Standard Condition Model
    """
    condition_id = models.AutoField(primary_key=True)
    identifier = models.CharField(max_length=100, unique=True, null=False, blank=False)

    # Status fields
    clinical_status = models.CharField(max_length=100, null=True, blank=True)
    verification_status = models.CharField(max_length=100, null=True, blank=True)

    # Classification
    category = models.CharField(max_length=255, null=True, blank=True)
    severity = models.CharField(max_length=255, null=True, blank=True)
    code = models.CharField(max_length=100, null=False, blank=False)

    # Relationships
    patient = models.ForeignKey(
        'Patient',
        on_delete=models.CASCADE,
        db_column='subject_id',
        null=False,
        blank=False,
        related_name='conditions'
    )
    # nullable so conditions can be recorded from the patient profile
    # without a formal encounter context.
    encounter_id = models.BigIntegerField(db_index=True, null=True, blank=True)

    # Body site
    body_site = models.CharField(max_length=255, null=True, blank=True)

    # Onset timing
    onset_datetime = models.DateTimeField(null=True, blank=True)
    onset_age = models.DateField(null=True, blank=True)
    onset_period_start = models.DateField(null=True, blank=True)
    onset_period_end = models.DateField(null=True, blank=True)

    # Abatement timing
    abatement_datetime = models.DateTimeField(null=True, blank=True)
    abatement_age = models.DateField(null=True, blank=True)
    abatement_period_start = models.DateField(null=True, blank=True)
    abatement_period_end = models.DateField(null=True, blank=True)

    # Recording
    recorded_date = models.DateField(null=True, blank=True)
    recorder_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    asserter_id = models.BigIntegerField(db_index=True, null=True, blank=True)

    # Stage information
    stage_summary = models.TextField(null=True, blank=True)
    stage_type = models.CharField(max_length=100, null=True, blank=True)
    stage_assessment_id = models.IntegerField(null=True, blank=True)

    # Evidence
    evidence_code = models.CharField(max_length=100, null=True, blank=True)
    evidence_detail_id = models.IntegerField(null=True, blank=True)

    # Notes
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'condition'
        indexes = [
            models.Index(fields=['identifier']),
            models.Index(fields=['patient']),
        ]

    def __str__(self):
        return f"Condition {self.identifier}: {self.code}"


class AllergyIntolerance(FHIRResourceModel):
    """
    FHIR Standard Allergy Intolerance Model
    """
    allergy_id = models.AutoField(primary_key=True)
    identifier = models.CharField(max_length=100, unique=True, null=False, blank=False)

    # Status fields
    clinical_status = models.CharField(max_length=100, null=True, blank=True)
    verification_status = models.CharField(max_length=100, null=True, blank=True)

    # Type and category
    type = models.CharField(max_length=100, null=True, blank=True)
    category = models.CharField(max_length=255, null=True, blank=True)
    criticality = models.CharField(max_length=255, null=True, blank=True)

    # Code
    code = models.CharField(max_length=100, null=False, blank=False)

    # Relationships
    patient = models.ForeignKey(
        'Patient',
        on_delete=models.CASCADE,
        db_column='patient_id',
        null=False,
        blank=False,
        related_name='allergies'
    )
    # nullable so allergies can be recorded from the patient profile
    # without a formal encounter context.
    encounter_id = models.BigIntegerField(db_index=True, null=True, blank=True)

    # Onset timing
    onset_datetime = models.DateTimeField(null=True, blank=True)
    onset_age = models.DateField(null=True, blank=True)
    onset_period_start = models.DateField(null=True, blank=True)
    onset_period_end = models.DateField(null=True, blank=True)
    onset_range_low = models.DateField(null=True, blank=True)
    onset_range_high = models.DateField(null=True, blank=True)

    # Recording
    recorded_date = models.DateField(null=True, blank=True)
    recorder_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    asserter_id = models.BigIntegerField(db_index=True, null=True, blank=True)

    # Last occurrence
    last_occurrence = models.CharField(max_length=255, null=True, blank=True)

    # Reaction details
    reaction_description = models.TextField(null=True, blank=True)
    reaction_onset = models.DateField(null=True, blank=True)
    reaction_severity = models.CharField(max_length=255, null=True, blank=True)
    reaction_exposure_route = models.CharField(max_length=255, null=True, blank=True)
    reaction_note = models.TextField(null=True, blank=True)
    reaction_manifestation = models.CharField(max_length=255, null=True, blank=True)
    reaction_substance = models.CharField(max_length=255, null=True, blank=True)

    # Notes
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'allergy_intolerance'
        indexes = [
            models.Index(fields=['identifier']),
            models.Index(fields=['patient']),
        ]

    def __str__(self):
        return f"Allergy {self.identifier}: {self.code}"


class Immunization(FHIRResourceModel):
    """
    PHCORE Standard Immunization Model
    """
    immunization_id = models.AutoField(primary_key=True)
    identifier = models.CharField(max_length=100, unique=True, null=False, blank=False)

    # Status
    status = models.CharField(max_length=100, null=False, blank=False)
    status_reason_code = models.CharField(max_length=100, null=True, blank=True)
    status_reason_display = models.CharField(max_length=100, null=True, blank=True)

    # Vaccine
    vaccine_code = models.CharField(max_length=100, null=True, blank=True)
    vaccine_display = models.CharField(max_length=100, null=True, blank=True)

    # Relationships
    patient = models.ForeignKey(
        'Patient',
        on_delete=models.CASCADE,
        db_column='patient_id',
        null=False,
        blank=False,
        related_name='immunizations'
    )
    encounter_id = models.BigIntegerField(db_index=True, null=False, blank=False)

    # Occurrence
    occurrence_datetime = models.DateTimeField(null=True, blank=True)
    occurrence_string = models.CharField(max_length=255, null=True, blank=True)

    # Recording
    recorded_datetime = models.DateTimeField(null=True, blank=True)
    primary_source = models.BooleanField(null=True, blank=True)

    # Report origin
    report_origin_code = models.CharField(max_length=100, null=True, blank=True)
    report_origin_display = models.CharField(max_length=100, null=True, blank=True)

    # Location
    location_id = models.BigIntegerField(db_index=True, null=True, blank=True)

    # Manufacturer
    manufacturer_id = models.BigIntegerField(db_index=True, null=True, blank=True)

    # Lot and expiration
    lot_number = models.CharField(max_length=255, null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)

    # Site and route
    site_code = models.CharField(max_length=100, null=True, blank=True)
    site_display = models.CharField(max_length=100, null=True, blank=True)
    route_code = models.CharField(max_length=100, null=True, blank=True)
    route_display = models.CharField(max_length=100, null=True, blank=True)

    # Dose quantity
    dose_quantity_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dose_quantity_unit = models.CharField(max_length=50, null=True, blank=True)

    # Performer
    performer_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    performer_function_code = models.CharField(max_length=100, null=True, blank=True)
    performer_function_display = models.CharField(max_length=100, null=True, blank=True)
    actor_id = models.BigIntegerField(db_index=True, null=True, blank=True)
    performer_name = models.CharField(max_length=255, null=True, blank=True)

    # Note
    note = models.TextField(null=True, blank=True)

    # Reason
    reason_code = models.CharField(max_length=100, null=True, blank=True)
    reason_display = models.CharField(max_length=100, null=True, blank=True)
    reason_reference_id = models.IntegerField(null=True, blank=True)

    # Subpotent
    is_subpotent = models.BooleanField(null=True, blank=True)
    subpotent_reason_code = models.CharField(max_length=100, null=True, blank=True)
    subpotent_reason_display = models.CharField(max_length=100, null=True, blank=True)

    # Education
    education_document_type = models.CharField(max_length=100, null=True, blank=True)
    education_reference = models.CharField(max_length=255, null=True, blank=True)
    education_publication_date = models.DateField(null=True, blank=True)
    education_presentation_date = models.DateField(null=True, blank=True)

    # Program eligibility
    program_eligibility_code = models.CharField(max_length=100, null=True, blank=True)
    program_eligibility_display = models.CharField(max_length=100, null=True, blank=True)

    # Funding source
    funding_source_code = models.CharField(max_length=100, null=True, blank=True)
    funding_source_display = models.CharField(max_length=100, null=True, blank=True)

    # Reaction
    reaction_id = models.IntegerField(null=True, blank=True)
    reaction_date = models.DateField(null=True, blank=True)
    reaction_detail_id = models.IntegerField(null=True, blank=True)
    reaction_reported = models.BooleanField(null=True, blank=True)

    # Protocol applied
    protocol_applied_id = models.IntegerField(null=True, blank=True)
    protocol_series = models.CharField(max_length=255, null=True, blank=True)
    protocol_authority_id = models.IntegerField(null=True, blank=True)
    protocol_target_disease_code = models.CharField(max_length=100, null=True, blank=True)
    protocol_target_disease_display = models.CharField(max_length=100, null=True, blank=True)

    # Dose number
    dose_number_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    dose_number_unit = models.CharField(max_length=255, null=True, blank=True)

    # Series doses
    series_doses_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    series_doses_unit = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'immunization'
        indexes = [
            models.Index(fields=['identifier']),
            models.Index(fields=['patient']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Immunization {self.identifier}: {self.vaccine_display or self.vaccine_code}"


class WAH4PCTransaction(TimeStampedModel):
    """
    Audit log for every inbound and outbound WAH4PC gateway interaction.

    Inbound fields (populated by webhook views):
        requester_id  — provider ID that originated the query (process-query)
        sender_id     — provider ID that pushed the data (receive-push)
        raw_payload   — full inbound JSON body for debugging / compliance audit

    Outbound fields (populated by fetch/send views):
        target_provider_id — provider we sent a request or push to
        idempotency_key    — UUID used for safe retries

    Both directions:
        related_patient    — FK to the local Patient record involved, if any
        patient_id         — legacy plain-integer copy (kept for backward compat)
    """

    transaction_id = models.CharField(max_length=255, unique=True, db_index=True)
    type = models.CharField(max_length=20)
    status = models.CharField(max_length=20, default='PENDING')

    # Legacy plain-integer patient reference (kept for backward compatibility)
    patient_id = models.IntegerField(null=True, blank=True)

    # FK to the Patient record involved in this transaction
    related_patient = models.ForeignKey(
        'Patient',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='transactions',
        db_column='related_patient_id',
    )

    target_provider_id = models.CharField(max_length=255, null=True, blank=True)

    # Audit fields — who sent / requested, and the raw payload
    requester_id = models.CharField(max_length=100, null=True, blank=True)
    sender_id = models.CharField(max_length=100, null=True, blank=True)
    raw_payload = models.JSONField(null=True, blank=True)

    error_message = models.TextField(null=True, blank=True)
    idempotency_key = models.CharField(max_length=255, null=True, blank=True, db_index=True)

    class Meta:
        db_table = 'wah4pc_transaction'

    def __str__(self):
        return f"{self.type} {self.transaction_id}: {self.status}"
