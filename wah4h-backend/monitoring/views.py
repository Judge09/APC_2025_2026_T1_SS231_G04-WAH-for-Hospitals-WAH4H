from rest_framework import viewsets, filters
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend

from .models import Observation, ChargeItem, ChargeItemDefinition
from .serializers import (
    ObservationSerializer,
    ChargeItemSerializer,
    ChargeItemDefinitionSerializer
)


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination configuration for monitoring resources.
    Critical for high-volume models like Observation (vital signs).
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class ObservationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Observation (vital signs, lab results, measurements).
    
    Filtering Strategy:
        - Filter directly on Integer FK fields (subject_id, encounter_id), NOT resolved names.
        - Allows frontend to query by IDs without database joins.
    
    Filters:
        - subject_id: Patient ID (integer)
        - encounter_id: Encounter ID (integer)
        - code: Observation code (e.g., vital sign type)
        - category: Observation category
    
    Ordering:
        - Default: Most recent first (-effective_datetime)
        - Available: effective_datetime, issued, created_at
    
    Search:
        - code, category, interpretation
    """
    queryset = Observation.objects.all()
    serializer_class = ObservationSerializer
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter
    ]
    
    # Filter on Integer FK fields directly (e.g., subject_id, NOT subject)
    filterset_fields = {
        'subject_id': ['exact'],
        'encounter_id': ['exact'],
        'performer_id': ['exact'],
        'code': ['exact', 'icontains'],
        'category': ['exact', 'icontains'],
    }
    
    ordering_fields = [
        'effective_datetime',
        'issued',
        'created_at',
        'observation_id'
    ]
    ordering = ['-effective_datetime']  # Default: Most recent first
    
    search_fields = [
        'code',
        'category',
        'interpretation',
        'note'
    ]


class ChargeItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ChargeItem (billable items, procedures, services).
    
    Filtering Strategy:
        - Filter directly on Integer FK fields (subject_id, account_id), NOT resolved names.
        - Allows frontend to query by IDs without database joins.
    
    Filters:
        - subject_id: Patient ID (integer)
        - account_id: Billing Account ID (integer)
        - code: Charge item code
        - performing_organization_id: Organization ID (integer)
    
    Ordering:
        - Default: Most recent first (-entered_date)
        - Available: entered_date, occurrence_datetime, created_at
    
    Search:
        - code, note, reason_code
    """
    queryset = ChargeItem.objects.all()
    serializer_class = ChargeItemSerializer
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter
    ]
    
    # Filter on Integer FK fields directly (e.g., subject_id, NOT subject)
    filterset_fields = {
        'subject_id': ['exact'],
        'account_id': ['exact'],
        'context_id': ['exact'],
        'performing_organization_id': ['exact'],
        'requesting_organization_id': ['exact'],
        'performer_actor_id': ['exact'],
        'code': ['exact', 'icontains'],
    }
    
    ordering_fields = [
        'entered_date',
        'occurrence_datetime',
        'created_at',
        'chargeitem_id'
    ]
    ordering = ['-entered_date']  # Default: Most recent first
    
    search_fields = [
        'code',
        'note',
        'reason_code',
        'definition_uri'
    ]


class ChargeItemDefinitionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ChargeItemDefinition (pricing definitions, billing rules).
    
    Filters:
        - code: Definition code
        - title: Definition title
        - version: Version identifier
    
    Ordering:
        - Default: Most recent first (-date)
        - Available: date, approvalDate, lastReviewDate
    
    Search:
        - code, title, description, publisher
    """
    queryset = ChargeItemDefinition.objects.all()
    serializer_class = ChargeItemDefinitionSerializer
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter
    ]
    
    filterset_fields = {
        'code': ['exact', 'icontains'],
        'title': ['exact', 'icontains'],
        'version': ['exact'],
        'publisher': ['exact', 'icontains'],
    }
    
    ordering_fields = [
        'date',
        'approvalDate',
        'lastReviewDate',
        'chargeitemdefinition_id'
    ]
    ordering = ['-date']  # Default: Most recent first
    
    search_fields = [
        'code',
        'title',
        'description',
        'publisher',
        'copyright'
    ]