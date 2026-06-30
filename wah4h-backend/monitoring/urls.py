"""
monitoring/urls.py

URL Configuration for Monitoring Module.
Registers ViewSets for clinical observations (vital signs, labs) and charge items.

Routes:
- /api/monitoring/observations/
- /api/monitoring/charge-items/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from monitoring.views import (
    ObservationViewSet,
    ChargeItemViewSet,
    ChargeItemDefinitionViewSet,
)

# Initialize router
router = DefaultRouter()

# Register ViewSets with specific route prefixes
router.register(r'observations', ObservationViewSet, basename='observation')
router.register(r'charge-items', ChargeItemViewSet, basename='charge-item')
router.register(r'charge-item-definitions', ChargeItemDefinitionViewSet, basename='charge-item-definition')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]