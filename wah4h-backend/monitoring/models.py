from django.db import models
from core.models import FHIRResourceModel


class Observation(FHIRResourceModel):
    """
    Observation Header Model (PHCORE standard).
    Represents the main observation with subject, code, and timing.
    Components are stored in separate ObservationComponent table.
    """
    observation_id = models.AutoField(primary_key=True)
    
    # Fortress Pattern: External References as BigIntegerField
    subject_id = models.BigIntegerField(db_index=True)
    encounter_id = models.BigIntegerField(db_index=True)
    performer_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    specimen_id = models.BigIntegerField(null=True, blank=True)
    device_id = models.BigIntegerField(null=True, blank=True)
    derived_from_id = models.BigIntegerField(null=True, blank=True)
    focus_id = models.BigIntegerField(null=True, blank=True)
    has_member_id = models.BigIntegerField(null=True, blank=True)
    
    # Core Fields
    code = models.CharField(max_length=100, db_index=True)
    category = models.CharField(max_length=255, null=True, blank=True)
    body_site = models.CharField(max_length=255, null=True, blank=True)
    method = models.CharField(max_length=255, null=True, blank=True)
    interpretation = models.CharField(max_length=255, null=True, blank=True)
    data_absent_reason = models.CharField(max_length=255, null=True, blank=True)
    based_on = models.CharField(max_length=255, null=True, blank=True)
    part_of = models.CharField(max_length=255, null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    
    # Value Fields (Polymorphic)
    value_string = models.CharField(max_length=255, null=True, blank=True)
    value_boolean = models.BooleanField(null=True, blank=True)
    value_integer = models.CharField(max_length=255, null=True, blank=True)
    value_quantity = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    value_codeableconcept = models.CharField(max_length=100, null=True, blank=True)
    value_datetime = models.DateTimeField(null=True, blank=True)
    value_time = models.CharField(max_length=255, null=True, blank=True)
    value_period_start = models.DateField(null=True, blank=True)
    value_period_end = models.DateField(null=True, blank=True)
    value_ratio = models.CharField(max_length=255, null=True, blank=True)
    value_sampled_data = models.CharField(max_length=255, null=True, blank=True)
    value_range_low = models.CharField(max_length=255, null=True, blank=True)
    value_range_high = models.CharField(max_length=255, null=True, blank=True)
    
    # Reference Range Fields
    reference_range_low = models.CharField(max_length=255, null=True, blank=True)
    reference_range_high = models.CharField(max_length=255, null=True, blank=True)
    reference_range_type = models.CharField(max_length=100, null=True, blank=True)
    reference_range_applies_to = models.CharField(max_length=255, null=True, blank=True)
    reference_range_age_low = models.CharField(max_length=255, null=True, blank=True)
    reference_range_age_high = models.CharField(max_length=255, null=True, blank=True)
    reference_range_text = models.TextField(null=True, blank=True)
    
    # Effective Fields
    effective_datetime = models.DateTimeField(null=True, blank=True, db_index=True)
    effective_period_start = models.DateField(null=True, blank=True)
    effective_period_end = models.DateField(null=True, blank=True)
    effective_timing = models.CharField(max_length=255, null=True, blank=True)
    effective_instant = models.CharField(max_length=255, null=True, blank=True)
    
    issued = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'monitoring_observation'
        indexes = [
            models.Index(fields=['subject_id', 'effective_datetime'], name='obs_subj_eff_idx'),
            models.Index(fields=['encounter_id', 'code'], name='obs_enc_code_idx'),
            models.Index(fields=['code', 'status'], name='obs_code_status_idx'),
        ]


class ObservationComponent(models.Model):
    """
    Observation Component Detail Model (Normalized Child).
    Stores multi-component observations (e.g., Blood Pressure: Systolic/Diastolic).
    """
    component_id = models.AutoField(primary_key=True)
    observation = models.ForeignKey(
        Observation,
        on_delete=models.CASCADE,
        related_name='components',
        db_index=True
    )
    
    # Component Fields
    code = models.CharField(max_length=100, db_index=True)
    
    # Component Value Fields (Polymorphic)
    value_quantity = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    value_codeableconcept = models.CharField(max_length=100, null=True, blank=True)
    value_string = models.CharField(max_length=255, null=True, blank=True)
    value_boolean = models.BooleanField(null=True, blank=True)
    value_integer = models.CharField(max_length=255, null=True, blank=True)
    value_range_low = models.CharField(max_length=255, null=True, blank=True)
    value_range_high = models.CharField(max_length=255, null=True, blank=True)
    value_ratio = models.CharField(max_length=255, null=True, blank=True)
    value_sampled_data = models.CharField(max_length=255, null=True, blank=True)
    value_time = models.CharField(max_length=255, null=True, blank=True)
    value_datetime = models.DateTimeField(null=True, blank=True)
    value_period_start = models.DateField(null=True, blank=True)
    value_period_end = models.DateField(null=True, blank=True)
    
    data_absent_reason = models.CharField(max_length=255, null=True, blank=True)
    interpretation = models.CharField(max_length=255, null=True, blank=True)
    
    # Component Reference Range Fields
    reference_range_type = models.CharField(max_length=100, null=True, blank=True)
    reference_range_text = models.TextField(null=True, blank=True)
    reference_range_low = models.CharField(max_length=255, null=True, blank=True)
    reference_range_high = models.CharField(max_length=255, null=True, blank=True)
    reference_range_age_low = models.CharField(max_length=255, null=True, blank=True)
    reference_range_age_high = models.CharField(max_length=255, null=True, blank=True)
    reference_range_applies_to = models.CharField(max_length=255, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'monitoring_observation_component'
        indexes = [
            models.Index(fields=['observation', 'code'], name='obs_comp_obs_code_idx'),
        ]


class ChargeItem(FHIRResourceModel):
    """
    ChargeItem Model (FHIR standard).
    Represents a billable service or product charge.
    """
    chargeitem_id = models.AutoField(primary_key=True)
    
    # Fortress Pattern: External References as BigIntegerField
    subject_id = models.BigIntegerField(db_index=True)
    account_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    context_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    partof_id = models.BigIntegerField(null=True, blank=True)
    performing_organization_id = models.BigIntegerField(null=True, blank=True)
    requesting_organization_id = models.BigIntegerField(null=True, blank=True)
    performer_actor_id = models.BigIntegerField(null=True, blank=True)
    enterer_id = models.BigIntegerField(null=True, blank=True)
    cost_center_id = models.BigIntegerField(null=True, blank=True)
    
    # Core Fields
    code = models.CharField(max_length=100, db_index=True)
    definition_uri = models.CharField(max_length=255, null=True, blank=True)
    definition_canonical = models.CharField(max_length=255, null=True, blank=True)
    
    # Occurrence Fields
    occurrence_datetime = models.DateTimeField(null=True, blank=True, db_index=True)
    occurrence_period_start = models.DateField(null=True, blank=True)
    occurrence_period_end = models.DateField(null=True, blank=True)
    
    entered_date = models.DateTimeField(null=True, blank=True)
    performer_function = models.CharField(max_length=255, null=True, blank=True)
    
    # Bodysite Fields
    bodysite_code = models.CharField(max_length=100, null=True, blank=True)
    bodysite_system = models.CharField(max_length=100, null=True, blank=True)
    
    # Price Override Fields (CORRECTED DATA TYPES)
    factor_override = models.CharField(max_length=255, null=True, blank=True)
    price_override_value = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    price_override_currency = models.CharField(max_length=3, null=True, blank=True)  # ISO 4217 currency code
    override_reason = models.CharField(max_length=255, null=True, blank=True)
    
    # Reason Fields
    reason_code = models.CharField(max_length=100, null=True, blank=True)
    reason_system = models.CharField(max_length=100, null=True, blank=True)
    
    # Reference Fields
    service_reference = models.CharField(max_length=255, null=True, blank=True)
    product_reference = models.CharField(max_length=255, null=True, blank=True)
    product_codeableconcept = models.CharField(max_length=100, null=True, blank=True)
    
    # Quantity Fields (CORRECTED DATA TYPES)
    quantity_value = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    quantity_unit = models.CharField(max_length=50, null=True, blank=True)  # e.g., "mg", "mL", "tablet"
    
    supporting_information = models.CharField(max_length=255, null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'monitoring_charge_item'
        indexes = [
            models.Index(fields=['subject_id', 'occurrence_datetime'], name='chg_subj_occ_idx'),
            models.Index(fields=['account_id', 'status'], name='chg_acct_status_idx'),
            models.Index(fields=['code', 'status'], name='chg_code_status_idx'),
        ]


class ChargeItemDefinition(FHIRResourceModel):
    """
    ChargeItemDefinition Header Model (FHIR standard).
    Defines pricing templates for charge items.
    Price components are stored in separate ChargeItemDefinitionPriceComponent table.
    """
    chargeitemdefinition_id = models.AutoField(primary_key=True)
    
    # Fortress Pattern: External References as BigIntegerField
    partOf_id = models.BigIntegerField(null=True, blank=True)
    replaces_id = models.BigIntegerField(null=True, blank=True)
    
    # Metadata Fields
    url = models.URLField(max_length=255, null=True, blank=True)
    version = models.CharField(max_length=255, null=True, blank=True)
    title = models.CharField(max_length=255, null=True, blank=True)
    derivedFromUri = models.CharField(max_length=255, null=True, blank=True)
    experimental = models.CharField(max_length=255, null=True, blank=True)
    date = models.CharField(max_length=255, null=True, blank=True)
    publisher = models.CharField(max_length=255, null=True, blank=True)
    
    # Contact Fields
    contact_name = models.CharField(max_length=50, null=True, blank=True)
    contact_telecom = models.CharField(max_length=50, null=True, blank=True)
    
    description = models.TextField(null=True, blank=True)
    
    # Use Context Fields
    usecontext_code = models.TextField(null=True, blank=True)
    usecontext_value = models.TextField(null=True, blank=True)
    
    # Jurisdiction Fields
    jurisdiction_code = models.CharField(max_length=100, null=True, blank=True)
    jurisdiction_system = models.CharField(max_length=100, null=True, blank=True)
    
    copyright = models.CharField(max_length=255, null=True, blank=True)
    approvalDate = models.CharField(max_length=255, null=True, blank=True)
    lastReviewDate = models.CharField(max_length=255, null=True, blank=True)
    
    # Effective Period Fields
    effectivePeriod_start = models.DateField(null=True, blank=True)
    effectivePeriod_end = models.DateField(null=True, blank=True)
    
    code = models.CharField(max_length=100, db_index=True)
    instance_reference = models.CharField(max_length=255, null=True, blank=True)
    
    # Applicability Fields
    applicability_description = models.TextField(null=True, blank=True)
    applicability_language = models.CharField(max_length=255, null=True, blank=True)
    applicability_expression = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'monitoring_charge_item_definition'
        indexes = [
            models.Index(fields=['code', 'status'], name='chgdef_code_status_idx'),
            models.Index(fields=['effectivePeriod_start', 'effectivePeriod_end'], name='chgdef_eff_period_idx'),
        ]


class ChargeItemDefinitionPriceComponent(models.Model):
    """
    ChargeItemDefinition Price Component Detail Model (Normalized Child).
    Stores multiple pricing components (base, surcharge, discount, tax, etc.).
    """
    pricecomponent_id = models.AutoField(primary_key=True)
    charge_item_definition = models.ForeignKey(
        ChargeItemDefinition,
        on_delete=models.CASCADE,
        related_name='price_components',
        db_index=True
    )
    
    # Price Component Fields (CORRECTED DATA TYPES)
    type = models.CharField(max_length=50, null=True, blank=True)  # e.g., "base", "surcharge", "discount"
    code = models.CharField(max_length=100, null=True, blank=True)
    factor = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    amount_value = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    amount_currency = models.CharField(max_length=3, null=True, blank=True)  # ISO 4217 currency code
    
    # Applicability Fields
    applicability_description = models.TextField(null=True, blank=True)
    applicability_language = models.CharField(max_length=255, null=True, blank=True)
    applicability_expression = models.CharField(max_length=255, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'monitoring_charge_item_definition_price_component'
        indexes = [
            models.Index(fields=['charge_item_definition', 'type'], name='chgdef_pc_def_type_idx'),
        ]