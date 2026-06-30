"""
discharge/urls.py

URL Configuration for Discharge Module.
Registers ViewSets for clinical procedures and discharge workflow management.

Routes:
- /api/discharge/procedures/
- /api/discharge/discharges/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from discharge.views import (
    DischargeViewSet,
)

# Initialize router
router = DefaultRouter()

# Register ViewSets with specific route prefixes
router.register(r'discharges', DischargeViewSet, basename='discharge')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]