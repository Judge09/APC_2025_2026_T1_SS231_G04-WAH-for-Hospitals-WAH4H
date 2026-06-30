from django.contrib import admin
from .models import DiagnosticReport, Specimen, ImagingStudy

@admin.register(DiagnosticReport)
class DiagnosticReportAdmin(admin.ModelAdmin):
    list_display = ('diagnostic_report_id', 'subject_id', 'code_display', 'effective_datetime', 'status')
    search_fields = ('=subject_id', 'code_display')
    list_filter = ('status', 'category_display')

@admin.register(Specimen)
class SpecimenAdmin(admin.ModelAdmin):
    list_display = ('specimen_id', 'subject_id', 'type', 'collection_datetime', 'collector_id', 'status')
    search_fields = ('=subject_id', 'type')
    list_filter = ('status', 'type')

@admin.register(ImagingStudy)
class ImagingStudyAdmin(admin.ModelAdmin):
    list_display = ('imaging_study_id', 'subject_id', 'modality', 'started', 'number_of_series', 'status')
    search_fields = ('=subject_id', 'modality')
    list_filter = ('status', 'modality')