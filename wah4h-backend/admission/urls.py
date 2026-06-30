"""
admission/urls.py

URL Configuration for Admission Module.
Registers ViewSets for patient encounters (admissions).

Routes:
- /api/admission/encounters/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from admission.views import (
    EncounterViewSet,
    ProcedureViewSet,
)

# Initialize router
router = DefaultRouter()

# Register ViewSets with specific route prefixes
router.register(r'encounters', EncounterViewSet, basename='encounter')
router.register(r'procedures', ProcedureViewSet, basename='procedure')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]
