"""
laboratory/urls.py

URL Configuration for Laboratory Module.
Registers ViewSets for diagnostic reports, test definitions, specimens, and imaging studies.

Routes:
- /api/laboratory/reports/
- /api/laboratory/test-definitions/
- /api/laboratory/specimens/
- /api/laboratory/imaging-studies/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from laboratory.views import (
    DiagnosticReportViewSet,
    LabTestDefinitionViewSet,
    SpecimenViewSet,
    ImagingStudyViewSet,
    #LabResultPDFView,
)

# Initialize router
router = DefaultRouter()

# Register ViewSets with specific route prefixes
router.register(r'reports', DiagnosticReportViewSet, basename='diagnostic-report')
router.register(r'test-definitions', LabTestDefinitionViewSet, basename='lab-test-definition')
router.register(r'specimens', SpecimenViewSet, basename='specimen')
router.register(r'imaging-studies', ImagingStudyViewSet, basename='imaging-study')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
    #path('reports/<int:pk>/pdf/', LabResultPDFView.as_view(), name='lab-result-pdf'),
]