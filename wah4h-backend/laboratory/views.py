"""
Laboratory Views
=================
Enhanced viewsets with filtering, pagination, and search capabilities.
Follows the pattern established in the monitoring module.
"""


from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend

from .models import DiagnosticReport, LabTestDefinition, Specimen, ImagingStudy
from .serializers import (
    DiagnosticReportSerializer,
    LabTestDefinitionSerializer,
    SpecimenSerializer,
    ImagingStudySerializer
)


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination configuration for laboratory resources.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class DiagnosticReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for DiagnosticReport (lab test requests and results).
    
    Filtering Strategy:
        - Filter directly on Integer FK fields (subject_id, encounter_id), NOT resolved names.
        - Allows frontend to query by IDs without database joins.
    
    Filters:
        - subject_id: Patient ID (integer)
        - encounter_id: Encounter ID (integer)
        - performer_id: Practitioner ID (integer)
        - status: Report status (registered, partial, preliminary, final, amended, corrected, cancelled)
        - code_code: Test code
        - category_code: Category code
    
    Ordering:
        - Default: Most recent first (-issued_datetime)
        - Available: issued_datetime, effective_datetime, created_at, updated_at
    
    Search:
        - code_code, code_display, conclusion
    """
    queryset = DiagnosticReport.objects.all()
    serializer_class = DiagnosticReportSerializer
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter
    ]
    
    def get_serializer_class(self):
        """
        Use lightweight serializer for list views to optimize performance.
        """
        if self.action == 'list':
            # Import locally to avoid circular dependency if any, though here it is in same file
            from .serializers import DiagnosticReportListSerializer
            return DiagnosticReportListSerializer
        return DiagnosticReportSerializer
    
    # Filter on Integer FK fields directly (e.g., subject_id, NOT subject)
    filterset_fields = {
        'subject_id': ['exact'],
        'encounter_id': ['exact'],
        'performer_id': ['exact'],
        'requester_id': ['exact'],
        'status': ['exact', 'in'],
        'code_code': ['exact', 'icontains'],
        'category_code': ['exact'],
        'priority': ['exact'],  # Enable priority filtering
        'issued_datetime': ['exact', 'isnull'],
    }
    
    ordering_fields = [
        'issued_datetime',
        'effective_datetime',
        'created_at',
        'updated_at',
        'diagnostic_report_id',
    ]
    ordering = ['-issued_datetime']  # Default: Most recent first
    
    search_fields = [
        'code_code',
        'code_display',
        'conclusion',
        'identifier',
    ]

    def perform_create(self, serializer):
        """
        Custom create behavior to auto-assign requester if not provided.
        """
        user = self.request.user
        # Check if requester_id is present in the validated data
        requester_id = serializer.validated_data.get('requester_id')
        
        if not requester_id and user.is_authenticated:
            # Auto-assign to current user (User ID = Practitioner ID in this system)
            serializer.save(requester_id=user.id)
        else:
            serializer.save()

    def list(self, request, *args, **kwargs):
        """
        Optimized list view with manual pre-fetching to solve N+1 problem.
        """
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context=self._get_prefetch_context(page))
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True, context=self._get_prefetch_context(queryset))
        return Response(serializer.data)

    def _get_prefetch_context(self, queryset):
        """
        Helper to fetch related entities in bulk and return context maps.
        """
        # 1. Extract IDs
        subject_ids = set()
        practitioner_ids = set() # For both requester and performer

        for report in queryset:
            if report.subject_id:
                subject_ids.add(report.subject_id)
            if report.requester_id:
                practitioner_ids.add(report.requester_id)
            if report.performer_id:
                practitioner_ids.add(report.performer_id)
        
        # 2. Bulk Fetch
        patients_map = {}
        if subject_ids:
            from patients.models import Patient
            patients = Patient.objects.filter(id__in=subject_ids)
            patients_map = {p.id: p for p in patients}

        practitioners_map = {}
        users_map = {}
        if practitioner_ids:
            from accounts.models import Practitioner
            from django.contrib.auth.models import User
            
            # Try fetching as Practitioners first
            practitioners = Practitioner.objects.filter(practitioner_id__in=practitioner_ids)
            practitioners_map = {p.practitioner_id: p for p in practitioners}
            
            # Find IDs that weren't found in Practitioner table (fallback to User)
            missing_ids = practitioner_ids - set(practitioners_map.keys())
            if missing_ids:
                users = User.objects.filter(id__in=missing_ids)
                users_map = {u.id: u for u in users}

        return {
            'patients_map': patients_map,
            'practitioners_map': practitioners_map,
            'users_map': users_map
        }

    def get_object(self):
        """
        Resilient get_object: supports lookup by integer ID (PK) OR string identifier.
        """
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)

        try:
            # If it's a digit, treat as standard PK lookup
            # Check string content because int("LAB-123") throws, but int("123") works
            if str(lookup_value).isdigit():
                return super().get_object()
            
            # Otherwise, try lookup by identifier
            from django.shortcuts import get_object_or_404
            obj = get_object_or_404(queryset, identifier=lookup_value)
            self.check_object_permissions(self.request, obj)
            return obj
        except Exception:
            # Fallback to default behavior if anything goes wrong
            return super().get_object()

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """
        Finalize/Release a diagnostic report.
        Strict FHIR Workflow:
        1. Status -> 'final'
        2. issued_datetime -> Now() (Release Time)
        3. results_interpreter -> Current User (Verifier/Releaser)
        """
        instance = self.get_object()
        from django.utils import timezone
        
        # 1. Update Status
        instance.status = 'final'
        
        # 2. Set Released Date (Issued) if not already set
        if not instance.issued_datetime:
            instance.issued_datetime = timezone.now()
            
        # 3. Set Verifier/Releaser (Results Interpreter)
        # In this system, User ID = Practitioner ID (OneToOne PK)
        if request.user.is_authenticated:
            instance.results_interpreter_id = request.user.id
            
        instance.save()
        
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """
        Get dashboard statistics efficiently.
        Returns counts of pending, in-progress, and completed reports.
        """
        from django.db.models import Count, Q
        from django.utils import timezone
        
        today = timezone.localdate()
        
        # Efficient aggregation query instead of fetching all objects
        stats = DiagnosticReport.objects.aggregate(
            # Pending: Requested in Monitoring but not yet verified/approved by Nurse
            pending=Count('diagnostic_report_id', filter=Q(status__in=['requested', 'draft'])),
            # In-Progress (Active Queue): Verified by Nurse and ready for encoding or partially encoded
            in_progress=Count('diagnostic_report_id', filter=Q(status__in=['verified', 'registered', 'preliminary', 'partial'])),
            # To Release: Completed but NOT yet issued (released)
            to_release=Count('diagnostic_report_id', filter=Q(
                status__in=['completed', 'final', 'amended', 'corrected'],
                issued_datetime__isnull=True
            )),
            # Released Today: Issued today
            released_today=Count('diagnostic_report_id', filter=Q(
                status__in=['completed', 'final', 'amended', 'corrected'],
                issued_datetime__isnull=False,
                issued_datetime__date=today
            ))
        )
        
        return Response(stats)

    @action(detail=True, methods=['get'], url_path='pdf')
    def generate_pdf(self, request, pk=None):
        """
        Generate PDF report for a diagnostic report.
        """
        from .pdf_generator import LabResultPDFView
        from django.http import HttpResponse
        
        instance = self.get_object()
        
        pdf_buffer = LabResultPDFView.generate_pdf(instance)
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        filename = f"LabResult_{instance.diagnostic_report_id}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """
        Update the status of a diagnostic report.
        Accepts: { "status": "...", "results": ..., "conclusion": ... }
        Uses serializer to ensure proper data handling (including JSON results).
        """
        instance = self.get_object()
        
        # We use the serializer to validate and save the update
        # This ensures that 'results' -> 'result_data' mapping in the serializer is executed
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        
        if serializer.is_valid():
            # Auto-set issued_datetime when transitioning to completed/final
            new_status = request.data.get('status')
            # AUTO-RELEASE LOGIC REMOVED
            # We do NOT want to auto-set issued_datetime here.
            # The 'finalize' action is responsible for setting issued_datetime (Release Date).
            # This allows a 2-step process: Encode (Final) -> Review -> Release (Finalize).
            serializer.save()
                
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)





class LabTestDefinitionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for LabTestDefinition (test catalog/lookup table).
    
    Filters:
        - code: Test code
        - category: Test category
        - status: Active/inactive
    
    Ordering:
        - Default: code (alphabetical)
        - Available: code, display, category
    
    Search:
        - code, display, category
    """
    
    queryset = LabTestDefinition.objects.all()
    serializer_class = LabTestDefinitionSerializer
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter
    ]
    
    filterset_fields = {
        'code': ['exact', 'icontains'],
        'category': ['exact', 'icontains'],
        'status': ['exact'],
    }
    
    ordering_fields = ['code', 'display', 'category', 'created_at']
    ordering = ['code']
    
    search_fields = ['code', 'display', 'category']


class SpecimenViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Specimen (specimen tracking).
    
    Filters:
        - subject_id: Patient ID
        - type: Specimen type
        - status: Specimen status
    
    Ordering:
        - Default: Most recent first (-collection_datetime)
        - Available: collection_datetime, received_time
    
    Search:
        - type, note
    """
    
    queryset = Specimen.objects.all()
    serializer_class = SpecimenSerializer
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter
    ]
    
    filterset_fields = {
        'subject_id': ['exact'],
        'type': ['exact', 'icontains'],
        'status': ['exact'],
        'collector_id': ['exact'],
    }
    
    ordering_fields = ['collection_datetime', 'received_time', 'created_at']
    ordering = ['-collection_datetime']
    
    search_fields = ['type', 'note', 'collection_body_site']


class ImagingStudyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ImagingStudy (imaging study records).
    
    Filters:
        - subject_id: Patient ID
        - encounter_id: Encounter ID
        - modality: Imaging modality
        - status: Study status
    
    Ordering:
        - Default: Most recent first (-started)
        - Available: started, created_at
    
    Search:
        - modality, description, note
    """
    
    queryset = ImagingStudy.objects.all()
    serializer_class = ImagingStudySerializer
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter
    ]
    
    filterset_fields = {
        'subject_id': ['exact'],
        'encounter_id': ['exact'],
        'modality': ['exact', 'icontains'],
        'status': ['exact'],
        'interpreter_id': ['exact'],
    }
    
    ordering_fields = ['started', 'created_at']
    ordering = ['-started']
    
    search_fields = ['modality', 'description', 'note']