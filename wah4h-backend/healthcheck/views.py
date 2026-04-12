"""
healthcheck/views.py

System health check endpoint for WAH4H backend.

GET /api/health/          - Full system health report
GET /api/health/ping/     - Lightweight liveness probe (used by Docker/load balancers)
"""

import time
from django.db import connection
from django.db.utils import OperationalError
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


def _check_database():
    """Run a lightweight query to verify the database is reachable."""
    start = time.monotonic()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        latency_ms = round((time.monotonic() - start) * 1000, 2)
        return {"status": "ok", "latency_ms": latency_ms}
    except OperationalError as exc:
        return {"status": "error", "detail": str(exc)}


def _check_modules():
    """
    Verify each core Django app can query its primary table.
    Returns a dict of module -> ok/error.
    """
    checks = {
        "accounts": ("accounts", "Organization"),
        "patients": ("patients", "Patient"),
        "admission": ("admission", "Encounter"),
        "pharmacy": ("pharmacy", "MedicationRequest"),
        "laboratory": ("laboratory", "DiagnosticReport"),
        "monitoring": ("monitoring", "Observation"),
        "billing": ("billing", "Account"),
        "discharge": ("discharge", "Discharge"),
    }

    results = {}
    for label, (app_label, model_name) in checks.items():
        try:
            from django.apps import apps
            model = apps.get_model(app_label, model_name)
            model.objects.exists()
            results[label] = "ok"
        except LookupError:
            results[label] = "model_not_found"
        except Exception as exc:
            results[label] = f"error: {exc}"
    return results


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health_check(request):
    """
    Full health report.

    Returns HTTP 200 if all components are healthy, 503 otherwise.

    Response body:
    {
        "status": "ok" | "degraded",
        "database": { "status": "ok", "latency_ms": <float> },
        "modules": { "<name>": "ok" | "error: ...", ... }
    }
    """
    db = _check_database()
    modules = _check_modules()

    all_ok = (
        db["status"] == "ok"
        and all(v == "ok" for v in modules.values())
    )

    payload = {
        "status": "ok" if all_ok else "degraded",
        "database": db,
        "modules": modules,
    }

    http_status = status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(payload, status=http_status)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def ping(request):
    """
    Lightweight liveness probe — no DB query.
    Always returns HTTP 200 {"status": "ok"} if the process is alive.
    Suitable for Docker HEALTHCHECK and load-balancer probes.
    """
    return Response({"status": "ok"})
