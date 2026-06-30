"""
pharmacy/urls.py

URL Configuration for Pharmacy Module.
Registers ViewSets for inventory management, medication requests, and medication administration.

Routes:
- /api/pharmacy/inventory/
- /api/pharmacy/requests/
- /api/pharmacy/administrations/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from pharmacy.views import (
    InventoryViewSet,
    MedicationRequestViewSet,
    MedicationAdministrationViewSet,
)

# Initialize router
router = DefaultRouter()

# Register ViewSets with specific route prefixes
router.register(r'inventory', InventoryViewSet, basename='inventory')
router.register(r'requests', MedicationRequestViewSet, basename='medication-request')
router.register(r'administrations', MedicationAdministrationViewSet, basename='medication-administration')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]