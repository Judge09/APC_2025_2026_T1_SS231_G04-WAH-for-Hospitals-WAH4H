from django.contrib import admin
from .models import Observation, ChargeItem, ChargeItemDefinition


@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    """
    Admin interface for Observation model.
    
    Note: subject_id is an IntegerField (not ForeignKey), so we avoid
    relational lookups like 'subject__last_name' in search_fields.
    """
    list_display = (
        'observation_id',
        'subject_id',
        'encounter_id',
        'code',
        'category',
        'effective_datetime',
        'value_quantity'
    )
    
    # Search only on string fields (subject_id is integer, can't use icontains)
    search_fields = (
        'code',
        'category',
        'interpretation',
        'note'
    )
    
    list_filter = (
        'category',
        'effective_datetime',
        'issued'
    )
    
    date_hierarchy = 'effective_datetime'
    
    ordering = ('-effective_datetime',)
    
    readonly_fields = ('observation_id', 'created_at', 'updated_at')


@admin.register(ChargeItem)
class ChargeItemAdmin(admin.ModelAdmin):
    """
    Admin interface for ChargeItem model.
    
    Note: subject_id and account_id are IntegerFields (not ForeignKey),
    so we avoid relational lookups in search_fields.
    """
    list_display = (
        'chargeitem_id',
        'subject_id',
        'account_id',
        'code',
        'entered_date',
        'quantity_value',
        'price_override_value'
    )
    
    # Search only on string fields
    search_fields = (
        'code',
        'definition_uri',
        'reason_code',
        'note'
    )
    
    list_filter = (
        'entered_date',
        'occurrence_datetime'
    )
    
    date_hierarchy = 'entered_date'
    
    ordering = ('-entered_date',)
    
    readonly_fields = ('chargeitem_id', 'created_at', 'updated_at')


@admin.register(ChargeItemDefinition)
class ChargeItemDefinitionAdmin(admin.ModelAdmin):
    """
    Admin interface for ChargeItemDefinition model.
    """
    list_display = (
        'chargeitemdefinition_id',
        'code',
        'title',
        'version',
        'publisher',
        'date'
    )
    
    search_fields = (
        'code',
        'title',
        'description',
        'publisher',
        'copyright'
    )
    
    list_filter = (
        'date',
        'experimental',
        'publisher'
    )
    
    ordering = ('-date',)
    
    readonly_fields = ('chargeitemdefinition_id', 'created_at', 'updated_at')