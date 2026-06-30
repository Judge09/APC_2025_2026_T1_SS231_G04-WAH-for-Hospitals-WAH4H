from django.contrib import admin
from .models import Inventory, Medication, MedicationRequest, MedicationAdministration


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('inventory_id', 'item_name', 'current_stock', 'expiry_date', 'status', 'created_at')
    search_fields = ('item_name', 'item_code', 'batch_number', 'category')
    list_filter = ('status', 'category', 'expiry_date')
    readonly_fields = ('inventory_id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Inventory Information', {
            'fields': ('inventory_id', 'item_code', 'item_name', 'category', 'batch_number', 'status')
        }),
        ('Stock Details', {
            'fields': ('current_stock', 'reorder_level', 'unit_of_measure', 'unit_cost')
        }),
        ('Dates & Audit', {
            'fields': ('expiry_date', 'last_restocked_datetime', 'created_by', 'created_at', 'updated_at')
        }),
    )


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ('medication_id', 'code_display', 'code_code', 'status', 'created_at')
    search_fields = ('code_display', 'code_code', 'identifier')
    list_filter = ('status',)
    readonly_fields = ('medication_id', 'identifier', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Medication Identity', {
            'fields': ('medication_id', 'identifier', 'status')
        }),
        ('Code Information', {
            'fields': ('code_code', 'code_display', 'code_system', 'code_version')
        }),
        ('FHIR Metadata', {
            'fields': ('implicit_rules', 'created_at', 'updated_at')
        }),
    )


@admin.register(MedicationRequest)
class MedicationRequestAdmin(admin.ModelAdmin):
    list_display = (
        'medication_request_id', 
        'subject_info', 
        'encounter_info',
        'medication_display', 
        'status', 
        'priority',
        'authored_on'
    )
    search_fields = (
        'identifier', 
        'medication_display', 
        'medication_code',
        'subject_id',
        'encounter_id'
    )
    list_filter = ('status', 'priority', 'intent', 'category')
    readonly_fields = (
        'medication_request_id', 
        'identifier',
        'subject_id', 
        'encounter_id',
        'requester_id',
        'performer_id',
        'recorder_id',
        'based_on_id',
        'insurance_id',
        'reported_reference_id',
        'reason_reference_id',
        'created_at', 
        'updated_at'
    )
    
    fieldsets = (
        ('Request Identity', {
            'fields': ('medication_request_id', 'identifier', 'status', 'status_reason')
        }),
        ('Patient & Encounter (Decoupled References)', {
            'fields': ('subject_id', 'encounter_id', 'insurance_id'),
            'description': 'These are integer references to external modules (Fortress Architecture)'
        }),
        ('Request Details', {
            'fields': ('intent', 'category', 'priority', 'do_not_perform', 'authored_on')
        }),
        ('Medication', {
            'fields': ('medication_reference', 'medication_code', 'medication_display', 'medication_system')
        }),
        ('Practitioners (Decoupled)', {
            'fields': ('requester_id', 'performer_id', 'performer_type', 'recorder_id', 'reported_reference_id', 'reported_boolean')
        }),
        ('Clinical Context', {
            'fields': ('based_on_id', 'reason_code', 'reason_reference_id', 'course_of_therapy_type', 'note')
        }),
        ('Dosage Instructions', {
            'fields': (
                'dosage_text', 'dosage_site', 'dosage_route', 'dosage_method',
                'dosage_dose_value', 'dosage_dose_unit',
                'dosage_rate_quantity_value', 'dosage_rate_quantity_unit',
                'dosage_rate_ratio_numerator', 'dosage_rate_ratio_denominator'
            )
        }),
        ('Dispense Request', {
            'fields': (
                'dispense_quantity', 'dispense_initial_fill_quantity', 'dispense_initial_fill_duration',
                'dispense_interval', 'dispense_validity_period_start', 'dispense_validity_period_end',
                'dispense_repeats_allowed'
            )
        }),
        ('Additional FHIR Fields', {
            'fields': ('group_identifier', 'instantiates_canonical', 'instantiates_uri')
        }),
        ('Audit Trail', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def subject_info(self, obj):
        """Display patient reference as readable ID"""
        return f"Patient ID: {obj.subject_id}"
    subject_info.short_description = "Patient"
    subject_info.admin_order_field = 'subject_id'
    
    def encounter_info(self, obj):
        """Display encounter reference as readable ID"""
        return f"Encounter ID: {obj.encounter_id}"
    encounter_info.short_description = "Encounter"
    encounter_info.admin_order_field = 'encounter_id'


@admin.register(MedicationAdministration)
class MedicationAdministrationAdmin(admin.ModelAdmin):
    list_display = (
        'medication_administration_id', 
        'subject_info',
        'medication_display',
        'status',
        'effective_datetime',
        'performer_info'
    )
    search_fields = (
        'identifier',
        'medication_display',
        'medication_code',
        'subject_id',
        'context_id',
        'performer_actor_id'
    )
    list_filter = ('status', 'category', 'effective_datetime')
    readonly_fields = (
        'medication_administration_id',
        'identifier',
        'subject_id',
        'context_id',
        'performer_actor_id',
        'request_id',
        'part_of_id',
        'device_id',
        'event_history_id',
        'reason_reference_id',
        'created_at',
        'updated_at'
    )
    
    fieldsets = (
        ('Administration Identity', {
            'fields': ('medication_administration_id', 'identifier', 'status', 'status_reason')
        }),
        ('Patient & Context (Decoupled References)', {
            'fields': ('subject_id', 'context_id', 'request_id'),
            'description': 'These are integer references to external modules (Fortress Architecture)'
        }),
        ('Medication', {
            'fields': ('medication_reference', 'medication_code', 'medication_display', 'medication_system')
        }),
        ('Administration Details', {
            'fields': ('category', 'effective_datetime', 'effective_period_start', 'effective_period_end')
        }),
        ('Performer (Decoupled)', {
            'fields': ('performer_actor_id', 'performer_function')
        }),
        ('Clinical Context', {
            'fields': ('part_of_id', 'reason_code', 'reason_reference_id', 'device_id', 'event_history_id', 'note')
        }),
        ('Dosage', {
            'fields': (
                'dosage_text', 'dosage_site', 'dosage_route', 'dosage_method',
                'dosage_dose_value', 'dosage_dose_unit',
                'dosage_rate_quantity_value', 'dosage_rate_quantity_unit',
                'dosage_rate_ratio_numerator', 'dosage_rate_ratio_denominator'
            )
        }),
        ('FHIR Metadata', {
            'fields': ('instantiates_uri',)
        }),
        ('Audit Trail', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def subject_info(self, obj):
        """Display patient reference as readable ID"""
        return f"Patient ID: {obj.subject_id}"
    subject_info.short_description = "Patient"
    subject_info.admin_order_field = 'subject_id'
    
    def performer_info(self, obj):
        """Display performer reference as readable ID"""
        if obj.performer_actor_id:
            return f"Practitioner ID: {obj.performer_actor_id}"
        return "—"
    performer_info.short_description = "Performer"
    performer_info.admin_order_field = 'performer_actor_id'