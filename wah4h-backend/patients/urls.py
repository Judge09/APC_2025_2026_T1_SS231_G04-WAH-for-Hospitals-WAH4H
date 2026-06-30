"""
patients/urls.py

URL Configuration for Patients Module.
Registers ViewSets for Patient registration, clinical conditions, allergies, and immunizations.

Routes:
- /api/patients/
- /api/patients/conditions/
- /api/patients/allergies/
- /api/patients/immunizations/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from patients.api.views import (
    PatientViewSet,
    ConditionViewSet,
    AllergyViewSet,
    ImmunizationViewSet,
    fetch_wah4pc,
    send_to_wah4pc,
    list_providers,
    list_transactions,
    get_transaction,
)

# Initialize router
router = DefaultRouter()

# Register clinical ViewSets first so specific routes take precedence
router.register(r'conditions', ConditionViewSet, basename='condition')
router.register(r'allergies', AllergyViewSet, basename='allergy')
router.register(r'immunizations', ImmunizationViewSet, basename='immunization')

# Finally register the Patient ViewSet as a catch-all on the root
router.register(r'', PatientViewSet, basename='patient')

# URL patterns
urlpatterns = [
    # WAH4PC Operations (your backend -> gateway)
    path('wah4pc/providers/', list_providers, name='wah4pc_list_providers'),
    path('wah4pc/fetch', fetch_wah4pc, name='wah4pc_fetch'),
    path('wah4pc/send', send_to_wah4pc, name='wah4pc_send'),
    path('wah4pc/transactions/', list_transactions, name='wah4pc_list_transactions'),
    path('wah4pc/transactions/<str:transaction_id>/', get_transaction, name='wah4pc_get_transaction'),

    # Patient API routes
    path('', include(router.urls)),
]