from django.contrib import admin
from .models import Discharge, Procedure, ProcedurePerformer

@admin.register(Discharge)
class DischargeAdmin(admin.ModelAdmin):
    list_display = ('discharge_id', 'encounter_id', 'patient_id', 'discharge_datetime', 'workflow_status')
    search_fields = ('discharge_id', 'encounter_id', 'patient_id', 'workflow_status')
    list_filter = ('workflow_status', 'discharge_datetime')

@admin.register(Procedure)
class ProcedureAdmin(admin.ModelAdmin):
    list_display = ('procedure_id', 'identifier', 'status', 'encounter_id', 'subject_id', 'code_display', 'performed_datetime')
    search_fields = ('identifier', 'code_code', 'code_display')
    list_filter = ('status', 'category_code', 'performed_datetime')

@admin.register(ProcedurePerformer)
class ProcedurePerformerAdmin(admin.ModelAdmin):
    list_display = ('procedure_performer_id', 'procedure', 'performer_actor_id', 'performer_function_display')
    search_fields = ('performer_actor_id', 'performer_function_code')
    list_filter = ('performer_function_code',)