"""
healthcheck/urls.py

Routes:
  GET /api/health/       - Full system health report (DB + all modules)
  GET /api/health/ping/  - Lightweight liveness probe
"""

from django.urls import path
from .views import health_check, ping

urlpatterns = [
    path('', health_check, name='health-check'),
    path('ping/', ping, name='health-ping'),
]
