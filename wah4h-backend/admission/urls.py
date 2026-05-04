"""
admission/urls.py

URL Configuration for Admission Module.

Routes:
- /api/admission/encounters/
- /api/admission/procedures/
- /api/admission/schedules/
- /api/admission/slots/
- /api/admission/appointments/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from admission.views import (
    EncounterViewSet,
    ProcedureViewSet,
    ScheduleViewSet,
    SlotViewSet,
    AppointmentViewSet,
)

# Initialize router
router = DefaultRouter()

# Register ViewSets with specific route prefixes
router.register(r'encounters',    EncounterViewSet,    basename='encounter')
router.register(r'procedures',    ProcedureViewSet,    basename='procedure')
router.register(r'schedules',     ScheduleViewSet,     basename='schedule')
router.register(r'slots',         SlotViewSet,         basename='slot')
router.register(r'appointments',  AppointmentViewSet,  basename='appointment')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]
