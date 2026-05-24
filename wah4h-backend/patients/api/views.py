"""
Patient API Views
=================
CQRS-Lite Pattern: Service-Driven ViewSets with zero direct database access.

Writes (POST/PUT): Validate -> Delegate to PatientRegistrationService
Reads (GET): Delegate to PatientACL -> Format with OutputSerializer
"""

import logging
import os
import threading
import uuid

from datetime import datetime, timezone

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import connection
from django.http import JsonResponse

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

import requests as http_requests

from patients.wah4pc import (
    request_patient, fhir_to_dict, push_patient, patient_to_fhir, get_providers,
    immunization_to_fhir, immunizations_to_bundle,
    procedures_to_bundle, encounters_to_bundle,
    condition_to_fhir, conditions_to_bundle, import_condition_from_fhir, push_condition,
    allergy_to_fhir, allergies_to_bundle, import_allergy_from_fhir, push_allergy,
    observations_to_bundle, import_observation_from_fhir, push_observation,
    medicationrequests_to_bundle, import_medicationrequest_from_fhir, push_medicationrequest,
    diagnosticreports_to_bundle, import_diagnosticreport_from_fhir, push_diagnosticreport,
    import_appointment_from_fhir, request_appointment,
    gateway_get_transaction,
)
from patients.models import Patient, WAH4PCTransaction

from patients.api.serializers import (
    PatientInputSerializer,
    PatientOutputSerializer,
    ConditionSerializer,
    ConditionCreateSerializer,
    AllergySerializer,
    AllergyCreateSerializer,
    ImmunizationSerializer,
    ImmunizationCreateSerializer,
)
from patients.models import Condition, AllergyIntolerance, Immunization
from patients.services import patient_acl
from patients.services.patients_services import (
    PatientRegistrationService,
    PatientUpdateService,
    ClinicalDataService,
)

logger = logging.getLogger(__name__)


# ============================================================================
# PATIENT VIEWSET (CQRS-Lite)
# ============================================================================

class PatientViewSet(viewsets.ViewSet):
    """
    Patient ViewSet (Service-Driven)

    CQRS-Lite Architecture:
    - NO direct database access (no queryset)
    - Reads: patient_acl functions -> PatientOutputSerializer
    - Writes: PatientInputSerializer -> PatientRegistrationService/PatientUpdateService

    Endpoints:
        GET /patients/ - List patients
        GET /patients/{id}/ - Retrieve patient details
        POST /patients/ - Create new patient
        PUT /patients/{id}/ - Full update patient
        PATCH /patients/{id}/ - Partial update patient
        GET /patients/search/?q=term - Search patients
        GET /patients/{id}/conditions/ - Get patient conditions
        GET /patients/{id}/allergies/ - Get patient allergies
    """

    def list(self, request):
        """
        List all patients.

        Delegates to: PatientACL.search_patients('', limit)
        Returns: List of patient summaries
        """
        limit = int(request.query_params.get('limit', 100))

        # Delegate to ACL (empty query returns all)
        patients = patient_acl.search_patients('', limit)

        # Serialize using Output serializer
        serializer = PatientOutputSerializer(patients, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, pk=None):
        """
        Retrieve a single patient by ID.

        Delegates to: PatientACL.get_patient_details(id)
        Returns: Full patient details or 404
        """
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid patient ID format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delegate to ACL
        patient = patient_acl.get_patient_details(patient_id)

        if not patient:
            return Response(
                {'error': 'Patient not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Serialize using Output serializer
        serializer = PatientOutputSerializer(patient)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        """
        Create a new patient.

        Flow:
        1. Validate input with PatientInputSerializer
        2. Delegate to PatientRegistrationService.register_patient()
        3. Return 201 with new patient details
        """
        # Validate input
        input_serializer = PatientInputSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(
                input_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delegate to Registration Service
        try:
            patient = PatientRegistrationService.register_patient(
                input_serializer.validated_data
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to register patient: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Fetch full details via ACL
        patient_details = patient_acl.get_patient_details(patient.id)

        # Serialize output
        output_serializer = PatientOutputSerializer(patient_details)
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, pk=None):
        """
        Full update of a patient.

        Flow:
        1. Validate input with PatientInputSerializer
        2. Delegate to PatientUpdateService.update_patient()
        3. Return 200 with updated patient details
        """
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid patient ID format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate input
        input_serializer = PatientInputSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(
                input_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delegate to Update Service
        try:
            patient = PatientUpdateService.update_patient(
                patient_id,
                input_serializer.validated_data
            )
        except (ValueError, DjangoValidationError) as e:
            # PatientUpdateService raises DjangoValidationError when the
            # patient is not found (ObjectDoesNotExist).  Both exception
            # types from this service mean "not found".
            message = e.message if hasattr(e, 'message') else str(e)
            return Response(
                {'error': message},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to update patient: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Fetch full details via ACL
        patient_details = patient_acl.get_patient_details(patient.id)

        # Serialize output
        output_serializer = PatientOutputSerializer(patient_details)
        return Response(
            output_serializer.data,
            status=status.HTTP_200_OK
        )

    def partial_update(self, request, pk=None):
        """
        Partial update of a patient.

        Flow:
        1. Validate input with PatientInputSerializer (partial=True)
        2. Delegate to PatientUpdateService.update_patient()
        3. Return 200 with updated patient details
        """
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid patient ID format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate input (partial)
        input_serializer = PatientInputSerializer(
            data=request.data,
            partial=True
        )
        if not input_serializer.is_valid():
            return Response(
                input_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delegate to Update Service
        try:
            patient = PatientUpdateService.update_patient(
                patient_id,
                input_serializer.validated_data
            )
        except (ValueError, DjangoValidationError) as e:
            # PatientUpdateService raises DjangoValidationError when the
            # patient is not found (ObjectDoesNotExist).  Both exception
            # types from this service mean "not found".
            message = e.message if hasattr(e, 'message') else str(e)
            return Response(
                {'error': message},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to update patient: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Fetch full details via ACL
        patient_details = patient_acl.get_patient_details(patient.id)

        # Serialize output
        output_serializer = PatientOutputSerializer(patient_details)
        return Response(
            output_serializer.data,
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search patients by query.

        Query params:
            q: Search term (required)
            limit: Max results (optional, default: 50)

        Example: GET /patients/search/?q=Juan&limit=10

        Delegates to: PatientACL.search_patients(query, limit)
        """
        query = request.query_params.get('q', '').strip()
        limit = int(request.query_params.get('limit', 50))

        if not query:
            return Response(
                {'error': 'Search query parameter "q" is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delegate to ACL
        results = patient_acl.search_patients(query, limit)

        # Serialize output
        serializer = PatientOutputSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def conditions(self, request, pk=None):
        """
        Get all conditions for a patient.

        Example: GET /patients/{id}/conditions/

        Delegates to: PatientACL.get_patient_conditions(id)
        """
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid patient ID'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delegate to ACL
        conditions = patient_acl.get_patient_conditions(patient_id)
        return Response(conditions, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def allergies(self, request, pk=None):
        """
        Get all allergies for a patient.

        Example: GET /patients/{id}/allergies/

        Delegates to: PatientACL.get_patient_allergies(id)
        """
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid patient ID'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delegate to ACL
        allergies = patient_acl.get_patient_allergies(patient_id)
        return Response(allergies, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def immunizations(self, request, pk=None):
        """
        Get all immunizations for a patient as a FHIR Bundle (collection).

        Example: GET /patients/{id}/immunizations/

        Returns:
            {
                "resourceType": "Bundle",
                "type": "collection",
                "entry": [ { "resource": <FHIR Immunization> }, ... ]
            }
        """
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid patient ID'},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = Immunization.objects.filter(
            patient_id=patient_id
        ).select_related('patient').order_by('-occurrence_datetime', '-created_at')
        return Response(immunizations_to_bundle(qs), status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='procedures')
    def get_procedures(self, request, pk=None):
        """
        Get all procedures for a patient as a FHIR Bundle (collection).

        Reads from the Admission module (source of truth) — read-only.
        Admission models are imported locally to avoid circular dependencies.

        Example: GET /patients/{id}/procedures/

        Returns:
            {
                "resourceType": "Bundle",
                "type": "collection",
                "entry": [ { "resource": <FHIR Procedure> }, ... ]
            }
        """
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid patient ID'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not patient_acl.validate_patient_exists(patient_id):
            return Response(
                {'error': 'Patient not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Local import — avoids circular dependency; Admission is read-only here.
        from admission.models import Procedure

        qs = Procedure.objects.filter(
            subject_id=patient_id
        ).order_by('-performed_datetime', '-created_at')
        return Response(procedures_to_bundle(qs), status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='encounters')
    def get_encounters(self, request, pk=None):
        """
        Get all encounters for a patient as a FHIR Bundle (collection).

        Reads from the Admission module (source of truth) — read-only.
        Admission models are imported locally to avoid circular dependencies.

        Example: GET /patients/{id}/encounters/

        Returns:
            {
                "resourceType": "Bundle",
                "type": "collection",
                "entry": [ { "resource": <FHIR Encounter> }, ... ]
            }
        """
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid patient ID'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not patient_acl.validate_patient_exists(patient_id):
            return Response(
                {'error': 'Patient not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Local import — avoids circular dependency; Admission is read-only here.
        from admission.models import Encounter

        qs = Encounter.objects.filter(
            subject_id=patient_id
        ).order_by('-period_start', '-created_at')
        return Response(encounters_to_bundle(qs), status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='conditions/fhir')
    def get_conditions_fhir(self, request, pk=None):
        """Return all Conditions for a patient as a FHIR Bundle (collection)."""
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid patient ID'}, status=status.HTTP_400_BAD_REQUEST)
        from patients.models import Condition as ConditionModel
        qs = ConditionModel.objects.filter(patient_id=patient_id).order_by('-created_at')
        return Response(conditions_to_bundle(qs), status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='allergies/fhir')
    def get_allergies_fhir(self, request, pk=None):
        """Return all AllergyIntolerances for a patient as a FHIR Bundle (collection)."""
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid patient ID'}, status=status.HTTP_400_BAD_REQUEST)
        from patients.models import AllergyIntolerance as AllergyModel
        qs = AllergyModel.objects.filter(patient_id=patient_id).order_by('-created_at')
        return Response(allergies_to_bundle(qs), status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='observations')
    def get_observations(self, request, pk=None):
        """Return all Observations for a patient as a FHIR Bundle (collection)."""
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid patient ID'}, status=status.HTTP_400_BAD_REQUEST)
        from monitoring.models import Observation as ObservationModel
        qs = ObservationModel.objects.filter(subject_id=patient_id).order_by('-effective_datetime', '-created_at')
        return Response(observations_to_bundle(qs), status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='medication-requests')
    def get_medication_requests(self, request, pk=None):
        """Return all MedicationRequests for a patient as a FHIR Bundle (collection)."""
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid patient ID'}, status=status.HTTP_400_BAD_REQUEST)
        from pharmacy.models import MedicationRequest as MedicationRequestModel
        qs = MedicationRequestModel.objects.filter(subject_id=patient_id).order_by('-authored_on', '-created_at')
        return Response(medicationrequests_to_bundle(qs), status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='diagnostic-reports')
    def get_diagnostic_reports(self, request, pk=None):
        """Return all DiagnosticReports for a patient as a FHIR Bundle (collection)."""
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid patient ID'}, status=status.HTTP_400_BAD_REQUEST)
        from laboratory.models import DiagnosticReport as DiagnosticReportModel
        qs = DiagnosticReportModel.objects.filter(subject_id=patient_id).order_by('-issued_datetime', '-created_at')
        return Response(diagnosticreports_to_bundle(qs), status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        """
        Soft delete a patient (set status to inactive).

        Example: DELETE /patients/{id}/
        """
        try:
            patient_id = int(pk)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid patient ID'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from patients.models import Patient
            patient = Patient.objects.get(id=patient_id)
            patient.status = 'inactive'
            patient.active = False
            patient.save()

            return Response(
                {'message': f'Patient {patient.patient_id} deactivated successfully'},
                status=status.HTTP_200_OK
            )
        except Patient.DoesNotExist:
            return Response(
                {'error': 'Patient not found'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================================================
# CONDITION VIEWSET (FORTRESS PATTERN)
# ============================================================================

class ConditionViewSet(viewsets.ModelViewSet):
    """
    Condition ViewSet (Fortress Pattern)

    Reads: Standard ModelViewSet behavior (direct DB query)
    Writes: Delegated to ClinicalDataService.record_condition()

    Endpoints:
        GET /conditions/ - List conditions (with filter)
        GET /conditions/{id}/ - Retrieve condition details
        POST /conditions/ - Create new condition (via ClinicalDataService)
        PUT /conditions/{id}/ - Update condition
        PATCH /conditions/{id}/ - Partial update condition
        DELETE /conditions/{id}/ - Delete condition
    """

    queryset = Condition.objects.all().select_related('patient').order_by('-created_at')
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['patient', 'clinical_status', 'category', 'severity']
    search_fields = ['code', 'identifier']

    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'create':
            return ConditionCreateSerializer
        return ConditionSerializer

    def create(self, request, *args, **kwargs):
        """
        Create a new condition via ClinicalDataService.

        Flow:
        1. Validate input with ConditionCreateSerializer
        2. Extract patient_id from validated data
        3. Delegate to ClinicalDataService.record_condition()
        4. Return created condition with ConditionSerializer
        """
        # Validate input
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract patient_id (the patient field contains the Patient instance)
        validated_data = serializer.validated_data.copy()
        patient = validated_data.pop('patient')
        patient_id = patient.id

        # Delegate to ClinicalDataService
        try:
            condition = ClinicalDataService.record_condition(
                patient_id=patient_id,
                data=validated_data
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to record condition: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Serialize output with read serializer
        output_serializer = ConditionSerializer(condition)
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='push')
    def push_to_gateway(self, request, pk=None):
        """Push this Condition to another provider via the WAH4PC gateway."""
        condition = self.get_object()
        target_id = request.data.get('targetProviderId')
        if not target_id:
            return Response({'error': 'targetProviderId required'}, status=status.HTTP_400_BAD_REQUEST)
        result = push_condition(target_id, condition)
        if 'error' in result:
            return Response({'error': result['error']}, status=result.get('status_code', 502))
        txn_id = result.get('transactionId') or result.get('id')
        if txn_id:
            WAH4PCTransaction.objects.get_or_create(
                transaction_id=txn_id,
                defaults={
                    'type': 'send',
                    'status': result.get('status', 'PENDING'),
                    'related_patient': condition.patient,
                    'target_provider_id': target_id,
                    'idempotency_key': result.get('idempotency_key'),
                },
            )
        return Response(result, status=status.HTTP_202_ACCEPTED)


# ============================================================================
# ALLERGY VIEWSET (FORTRESS PATTERN)
# ============================================================================

class AllergyViewSet(viewsets.ModelViewSet):
    """
    Allergy Intolerance ViewSet (Fortress Pattern)

    Reads: Standard ModelViewSet behavior (direct DB query)
    Writes: Delegated to ClinicalDataService.record_allergy()

    Endpoints:
        GET /allergies/ - List allergies (with filter)
        GET /allergies/{id}/ - Retrieve allergy details
        POST /allergies/ - Create new allergy (via ClinicalDataService)
        PUT /allergies/{id}/ - Update allergy
        PATCH /allergies/{id}/ - Partial update allergy
        DELETE /allergies/{id}/ - Delete allergy
    """

    queryset = AllergyIntolerance.objects.all().select_related('patient').order_by('-created_at')
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['patient', 'clinical_status', 'category', 'criticality']
    search_fields = ['code', 'identifier']

    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'create':
            return AllergyCreateSerializer
        return AllergySerializer

    def create(self, request, *args, **kwargs):
        """
        Create a new allergy via ClinicalDataService.

        Flow:
        1. Validate input with AllergyCreateSerializer
        2. Extract patient_id from validated data
        3. Delegate to ClinicalDataService.record_allergy()
        4. Return created allergy with AllergySerializer
        """
        # Validate input
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract patient_id (the patient field contains the Patient instance)
        validated_data = serializer.validated_data.copy()
        patient = validated_data.pop('patient')
        patient_id = patient.id

        # Delegate to ClinicalDataService
        try:
            allergy = ClinicalDataService.record_allergy(
                patient_id=patient_id,
                data=validated_data
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to record allergy: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Serialize output with read serializer
        output_serializer = AllergySerializer(allergy)
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='push')
    def push_to_gateway(self, request, pk=None):
        """Push this AllergyIntolerance to another provider via the WAH4PC gateway."""
        allergy = self.get_object()
        target_id = request.data.get('targetProviderId')
        if not target_id:
            return Response({'error': 'targetProviderId required'}, status=status.HTTP_400_BAD_REQUEST)
        result = push_allergy(target_id, allergy)
        if 'error' in result:
            return Response({'error': result['error']}, status=result.get('status_code', 502))
        txn_id = result.get('transactionId') or result.get('id')
        if txn_id:
            WAH4PCTransaction.objects.get_or_create(
                transaction_id=txn_id,
                defaults={
                    'type': 'send',
                    'status': result.get('status', 'PENDING'),
                    'related_patient': allergy.patient,
                    'target_provider_id': target_id,
                    'idempotency_key': result.get('idempotency_key'),
                },
            )
        return Response(result, status=status.HTTP_202_ACCEPTED)


# ============================================================================
# IMMUNIZATION VIEWSET (FORTRESS PATTERN)
# ============================================================================

class ImmunizationViewSet(viewsets.ModelViewSet):
    """
    Immunization ViewSet (Fortress Pattern)

    Reads: Standard ModelViewSet behavior (direct DB query)
    Writes: Delegated to ClinicalDataService.record_immunization()

    Endpoints:
        GET /immunizations/ - List immunizations (with filter)
        GET /immunizations/{id}/ - Retrieve immunization details
        POST /immunizations/ - Create new immunization (via ClinicalDataService)
        PUT /immunizations/{id}/ - Update immunization
        PATCH /immunizations/{id}/ - Partial update immunization
        DELETE /immunizations/{id}/ - Delete immunization
    """

    queryset = Immunization.objects.all().select_related('patient').order_by('-created_at')
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['patient', 'status', 'vaccine_code']
    search_fields = ['identifier', 'vaccine_display', 'lot_number']

    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'create':
            return ImmunizationCreateSerializer
        return ImmunizationSerializer

    def list(self, request, *args, **kwargs):
        """
        List immunizations as a FHIR Bundle (collection).

        Returns:
            {
                "resourceType": "Bundle",
                "type": "collection",
                "entry": [ { "resource": <FHIR Immunization> }, ... ]
            }
        """
        queryset = self.filter_queryset(self.get_queryset())
        return Response(immunizations_to_bundle(queryset))

    def create(self, request, *args, **kwargs):
        """
        Create a new immunization via ClinicalDataService.

        Flow:
        1. Validate input with ImmunizationCreateSerializer
        2. Extract patient_id from validated data
        3. Delegate to ClinicalDataService.record_immunization()
        4. Return created immunization with ImmunizationSerializer
        """
        # Validate input
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract patient_id (the patient field contains the Patient instance)
        validated_data = serializer.validated_data.copy()
        patient = validated_data.pop('patient')
        patient_id = patient.id

        # Delegate to ClinicalDataService
        try:
            immunization = ClinicalDataService.record_immunization(
                patient_id=patient_id,
                data=validated_data
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to record immunization: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Return raw FHIR resource (not wrapped in Bundle) for single-record operations
        return Response(
            immunization_to_fhir(immunization),
            status=status.HTTP_201_CREATED
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a single immunization as a raw FHIR Immunization resource.

        Returns the standalone resource object directly — NOT wrapped in a Bundle.
        """
        instance = self.get_object()
        return Response(immunization_to_fhir(instance))


# ============================================================================
# WAH4PC INTEGRATION
# ============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def fetch_wah4pc(request):
    """Fetch patient data from WAH4PC gateway."""
    target_id = request.data.get('targetProviderId')
    philhealth_id = request.data.get('philHealthId')
    if not target_id or not philhealth_id:
        return Response(
            {'error': 'targetProviderId and philHealthId are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    reason = request.data.get('reason', 'Patient requested sync records')
    notes = request.data.get('notes')
    result = request_patient(target_id, philhealth_id, reason=reason, notes=notes)

    # Handle error responses
    if 'error' in result:
        return Response(
            {'error': result['error']},
            status=result.get('status_code', 500)
        )

    # Gateway may return the transaction ID as 'transactionId' or 'id' (flat or nested under 'data')
    _data = result.get('data') or {}
    txn_id = (
        result.get('transactionId') or
        result.get('id') or
        _data.get('transactionId') or
        _data.get('id')
    )
    idempotency_key = result.get('idempotency_key')

    if txn_id:
        WAH4PCTransaction.objects.get_or_create(
            transaction_id=txn_id,
            defaults={
                'type': 'fetch',
                'status': 'PENDING',
                'target_provider_id': target_id,
                'idempotency_key': idempotency_key,
            },
        )
    else:
        return Response(
            {'error': 'Gateway did not return a transaction ID. Check gateway credentials or try again.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # Guarantee transactionId is always top-level so the frontend can find it
    # regardless of whether the gateway wraps it under a 'data' key.
    return Response({**result, 'transactionId': txn_id}, status=status.HTTP_202_ACCEPTED)


@api_view(['POST'])
def webhook_receive(request):
    """
    Receive the async result from the gateway after a fetch request.

    Protocol:
        1. Validate X-Gateway-Auth — reject immediately if invalid.
        2. Require a transactionId in the payload.
        3. Look up a PENDING WAH4PCTransaction by that transactionId.
             - If found and PENDING   → process and return 200.
             - If found but not PENDING → already processed; return 200 (idempotent).
             - If not found at all      → return 404 so the gateway flags the anomaly.
        4. Persist the full inbound JSON to raw_payload.
        5. Update the transaction status to COMPLETED or FAILED.
    """
    gateway_key = os.getenv('GATEWAY_AUTH_KEY')
    auth_header = request.headers.get('X-Gateway-Auth')
    if not gateway_key or not auth_header or auth_header != gateway_key:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    txn_id = request.data.get('transactionId')
    if not txn_id:
        return Response(
            {'error': 'transactionId is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    raw_payload = dict(request.data)

    # Only process if the transaction is still PENDING
    txn = WAH4PCTransaction.objects.filter(transaction_id=txn_id, status='PENDING').first()

    if txn is None:
        # Distinguish "already finished" (idempotent 200) from "never existed" (404)
        if WAH4PCTransaction.objects.filter(transaction_id=txn_id).exists():
            return Response({'status': 'already_processed'}, status=status.HTTP_200_OK)
        return Response(
            {'error': 'Transaction not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.data.get('status') == 'SUCCESS':
        txn.raw_payload = raw_payload
        txn.status = 'COMPLETED'

        # Auto-register the patient so they appear in the dashboard immediately.
        # Mirrors the logic in webhook_receive_push.
        fhir_data = request.data.get('data')
        if fhir_data and isinstance(fhir_data, dict):
            # Gateway wraps the Patient resource inside a FHIR Bundle — unwrap it.
            if fhir_data.get('resourceType') == 'Bundle':
                entries = fhir_data.get('entry', [])
                fhir_data = next(
                    (e['resource'] for e in entries
                     if isinstance(e.get('resource'), dict)
                     and e['resource'].get('resourceType') == 'Patient'),
                    None,
                )
        if fhir_data and isinstance(fhir_data, dict):
            try:
                patient_dict = fhir_to_dict(fhir_data)
                try:
                    patient = PatientRegistrationService.register_patient(patient_dict)
                except DjangoValidationError:
                    # Patient already exists — find by philhealth_id or name+birthdate
                    philhealth_id = patient_dict.get('philhealth_id')
                    patient = None
                    if philhealth_id:
                        patient = Patient.objects.filter(philhealth_id=philhealth_id).first()
                    if not patient:
                        patient = Patient.objects.filter(
                            first_name__iexact=patient_dict.get('first_name', ''),
                            last_name__iexact=patient_dict.get('last_name', ''),
                            birthdate=patient_dict.get('birthdate'),
                        ).first()
                if patient:
                    txn.related_patient = patient
                    txn.patient_id = patient.id
            except Exception as exc:
                logger.warning(
                    '[WAH4PC] Could not auto-register patient from fetch webhook (txn=%s): %s',
                    txn_id, exc,
                )

        txn.save()
    else:
        txn.raw_payload = raw_payload
        txn.status = 'FAILED'
        error_data = request.data.get('data')
        txn.error_message = (
            error_data.get('error', 'Unknown')
            if isinstance(error_data, dict)
            else 'Unknown'
        )
        txn.save()

    return Response({'status': 'received'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_to_wah4pc(request):
    """Send local patient data to another provider via WAH4PC gateway."""
    patient_id = request.data.get('patientId')
    target_id = request.data.get('targetProviderId')
    if not patient_id or not target_id:
        return Response(
            {'error': 'patientId and targetProviderId are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

    result = push_patient(target_id, patient)

    # Handle error responses
    if 'error' in result:
        return Response(
            {'error': result['error']},
            status=result.get('status_code', 500)
        )

    _data_send = result.get('data') or {}
    txn_id = (
        result.get('transactionId') or
        result.get('id') or
        _data_send.get('transactionId') or
        _data_send.get('id')
    )
    idempotency_key = result.get('idempotency_key')

    if txn_id:
        WAH4PCTransaction.objects.get_or_create(
            transaction_id=txn_id,
            defaults={
                'type': 'send',
                'status': result.get('status', 'PENDING'),
                'patient_id': patient.id,
                'related_patient': patient,
                'target_provider_id': target_id,
                'idempotency_key': idempotency_key,
            },
        )

    return Response(result, status=status.HTTP_202_ACCEPTED)


@api_view(['POST'])
def webhook_receive_push(request):
    """
    Receive a resource pushed by another provider via the gateway.

    Protocol:
        1. Validate X-Gateway-Auth — reject immediately if invalid.
        2. Normalize the envelope — gateway may send {data, senderId, targetId, reason, resource}
           (push protocol) or {transactionId, senderId, resourceType, data} (old protocol).
        3. Persist the raw JSON body to the audit log before any processing.
        4. Non-Patient resources (Appointments, Observations, etc.):
             Log, store in WAH4PCTransaction, and return 200 OK.
             Do NOT reject — the gateway must always get a success acknowledgement.
        5. Patient resources:
             Use PatientRegistrationService.register_patient() so deduplication
             and WAH-YYYY-XXXXX ID generation are handled consistently.
             Return 400 for validation / duplicate errors; 500 for unexpected ones.
    """
    gateway_key = os.getenv('GATEWAY_AUTH_KEY')
    auth_header = request.headers.get('X-Gateway-Auth')
    if not gateway_key or not auth_header or auth_header != gateway_key:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    # Normalize envelope: gateway push uses {data, resource, senderId, targetId};
    # old internal protocol uses {transactionId, senderId, resourceType, data}.
    data = request.data.get('data') or request.data.get('resource')
    sender_id = request.data.get('senderId')
    # resourceType: old protocol sends it top-level; gateway push has it inside data
    resource_type = request.data.get('resourceType') or (
        data.get('resourceType') if isinstance(data, dict) else None
    )
    # transactionId: old protocol top-level → Idempotency-Key header → generated UUID
    txn_id = (
        request.data.get('transactionId')
        or request.headers.get('Idempotency-Key')
        or str(uuid.uuid4())
    )

    if not sender_id or not resource_type or not data:
        return Response(
            {'error': 'senderId, resourceType (or data.resourceType), and data are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Capture raw payload before any processing so it is always persisted
    raw_payload = dict(request.data)

    # ------------------------------------------------------------------
    # Non-Patient resource types: parse and upsert, then audit-log.
    # Always return 200 — the gateway must get a success acknowledgement.
    # ------------------------------------------------------------------
    if resource_type != 'Patient':
        related_patient = None
        try:
            # Try subject/patient key first (Encounter, Observation, etc.)
            subject_ref = (data.get('subject') or data.get('patient') or {}).get('reference', '')

            # For Appointment: patient is in participant[].actor, not subject/patient.
            # Gateway sends actor.identifier (PhilHealth ID); old protocol uses actor.reference.
            if not subject_ref and resource_type == 'Appointment':
                philhealth_id = None
                for part in (data.get('participant') or []):
                    actor = part.get('actor') or {}
                    actor_ref = actor.get('reference', '')
                    actor_type = actor.get('type', '')
                    actor_identifier = actor.get('identifier') or {}
                    if actor_ref.startswith('Patient/'):
                        subject_ref = actor_ref
                        break
                    if actor_type == 'Patient' or 'philhealth' in actor_identifier.get('system', ''):
                        philhealth_id = actor_identifier.get('value')
                # Resolve patient by PhilHealth ID when no reference-style match found
                if not subject_ref and philhealth_id:
                    try:
                        related_patient = Patient.objects.get(philhealth_id=philhealth_id)
                    except Patient.DoesNotExist:
                        pass

            # Extract UUID from "Patient/<uuid>" and reverse-map to local Patient
            if subject_ref.startswith('Patient/') and not related_patient:
                remote_fhir_id = subject_ref.split('/', 1)[1]
                for p in Patient.objects.all().only('id', 'first_name', 'last_name'):
                    import uuid as _uuid
                    if str(_uuid.uuid5(_uuid.NAMESPACE_OID, f'patient:{p.id}')) == remote_fhir_id:
                        related_patient = p
                        break

            if related_patient:
                if resource_type == 'Condition':
                    import_condition_from_fhir(data, related_patient)
                elif resource_type == 'AllergyIntolerance':
                    import_allergy_from_fhir(data, related_patient)
                elif resource_type == 'Observation':
                    import_observation_from_fhir(data, related_patient)
                elif resource_type == 'MedicationRequest':
                    import_medicationrequest_from_fhir(data, related_patient)
                elif resource_type == 'DiagnosticReport':
                    import_diagnosticreport_from_fhir(data, related_patient)
                elif resource_type == 'Appointment':
                    import_appointment_from_fhir(data, related_patient)
        except Exception:
            logger.exception('[WAH4PC] Failed to upsert %s (txn=%s) — storing raw payload.', resource_type, txn_id)

        logger.info(
            '[WAH4PC] Received %s push (txn=%s, sender=%s, patient=%s).',
            resource_type, txn_id, sender_id,
            related_patient.id if related_patient else 'unknown',
        )
        WAH4PCTransaction.objects.create(
            transaction_id=txn_id,
            type='receive_push',
            status='COMPLETED',
            sender_id=sender_id,
            raw_payload=raw_payload,
            related_patient=related_patient,
        )
        return Response(
            {'status': 'accepted', 'resourceType': resource_type},
            status=status.HTTP_200_OK,
        )

    # ------------------------------------------------------------------
    # Patient resource: register via service layer
    # ------------------------------------------------------------------
    try:
        patient_data = fhir_to_dict(data)
        patient = PatientRegistrationService.register_patient(patient_data)

        WAH4PCTransaction.objects.create(
            transaction_id=txn_id,
            type='receive_push',
            status='COMPLETED',
            sender_id=sender_id,
            raw_payload=raw_payload,
            patient_id=patient.id,
            related_patient=patient,
        )

        return Response(
            {'message': 'Patient created successfully', 'patientId': patient.id},
            status=status.HTTP_200_OK,
        )

    except DjangoValidationError as e:
        message = e.message if hasattr(e, 'message') else str(e)
        WAH4PCTransaction.objects.create(
            transaction_id=txn_id,
            type='receive_push',
            status='FAILED',
            sender_id=sender_id,
            raw_payload=raw_payload,
            error_message=message,
        )
        return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.exception('[WAH4PC] Unexpected error in webhook_receive_push for txn %s', txn_id)
        WAH4PCTransaction.objects.create(
            transaction_id=txn_id,
            type='receive_push',
            status='FAILED',
            sender_id=sender_id,
            raw_payload=raw_payload,
            error_message=str(e),
        )
        return Response(
            {'error': f'Failed to process pushed patient: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
def webhook_process_query(request):
    """
    Handle an incoming patient query from another provider via the gateway.

    Protocol (non-blocking):
        1. Validate X-Gateway-Auth — reject immediately if invalid.
        2. Validate that transactionId and gatewayReturnUrl are present.
        3. Acknowledge the gateway with HTTP 200 immediately — this prevents
           gateway timeouts regardless of how long the DB lookup takes.
        4. Spawn a daemon thread that:
             a. Searches for the patient using the supplied identifiers.
             b. Creates a WAH4PCTransaction audit record.
             c. POSTs the result back to gatewayReturnUrl (10 s timeout).
             d. Updates the transaction status to COMPLETED or FAILED.
             e. Closes the thread-local DB connection to avoid leaks.
    """
    gateway_key = os.getenv('GATEWAY_AUTH_KEY')
    auth_header = request.headers.get('X-Gateway-Auth')
    if not gateway_key or not auth_header or auth_header != gateway_key:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    txn_id = request.data.get('transactionId')
    # Gateway sends identifiers as 'patientIdentifiers' (selector field) or 'identifiers'
    identifiers = (
        request.data.get('patientIdentifiers')
        or request.data.get('identifiers')
        or []
    )
    _raw_return_url = request.data.get('gatewayReturnUrl') or ''
    _gateway_base = os.getenv('WAH4PC_GATEWAY_URL', 'https://wah4pc-gateway.wah.ph').rstrip('/')
    _path = '/' + _raw_return_url.split('/', 3)[-1] if '/' in _raw_return_url.split('://', 1)[-1] else ''
    return_url = _gateway_base + _path
    requester_id = request.data.get('requesterId')
    # Detect which resource type was requested: explicit param wins, then infer from return URL.
    requested_resource = request.data.get('resourceType', '')
    if not requested_resource:
        for _rt in ('Appointment', 'Encounter', 'Procedure', 'Immunization', 'Condition',
                    'AllergyIntolerance', 'Observation', 'MedicationRequest', 'DiagnosticReport'):
            if return_url and _rt in return_url:
                requested_resource = _rt
                break
        else:
            requested_resource = 'Patient'

    if not txn_id or not return_url:
        return Response(
            {'error': 'transactionId and gatewayReturnUrl are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Capture everything needed by the thread before the response is sent.
    # request.data may not be safe to access after the view returns.
    raw_payload = dict(request.data)
    idempotency_key = str(uuid.uuid4())

    def _process_query():
        txn = None
        try:
            # ----------------------------------------------------------------
            # 1. Match patient using the supplied identifier list
            # ----------------------------------------------------------------
            patient = None
            for ident in identifiers:
                system = ident.get('system', '').lower()
                value = ident.get('value')

                if not value:
                    continue

                if 'philhealth' in system:
                    patient = Patient.objects.filter(philhealth_id=value).first()
                elif 'mrn' in system or 'medical-record' in system:
                    patient = Patient.objects.filter(patient_id=value).first()
                elif 'phone' in system or 'mobile' in system:
                    patient = Patient.objects.filter(mobile_number=value).first()

                if patient:
                    break

            # ----------------------------------------------------------------
            # 2. Create audit record (idempotent — skip if already exists)
            # ----------------------------------------------------------------
            txn, created = WAH4PCTransaction.objects.get_or_create(
                transaction_id=txn_id,
                defaults={
                    'type': 'receive_query',
                    'status': 'PROCESSING',
                    'requester_id': requester_id,
                    'raw_payload': raw_payload,
                    'related_patient': patient,
                },
            )
            if not created:
                # Already handled by a previous delivery attempt
                logger.warning('[WAH4PC] Duplicate process_query for txn %s — skipping', txn_id)
                return

            # ----------------------------------------------------------------
            # 3. Build the response payload for the requested resource type
            # ----------------------------------------------------------------
            if not patient:
                response_data = {'error': 'Patient not found'}
                response_status = 'FAILED'
            elif requested_resource == 'Appointment':
                from admission.models import Appointment as AppointmentModel
                from patients.wah4pc import appointments_to_bundle
                appt_qs = AppointmentModel.objects.filter(
                    patient_id=patient.id
                ).order_by('-start', '-created_at')
                response_data = appointments_to_bundle(appt_qs)
                response_status = 'SUCCESS'
            elif requested_resource == 'Encounter':
                from admission.models import Encounter as EncounterModel
                enc_qs = EncounterModel.objects.filter(
                    subject_id=patient.id
                ).order_by('-period_start', '-created_at')
                response_data = encounters_to_bundle(enc_qs)
                response_status = 'SUCCESS'
            elif requested_resource == 'Procedure':
                from admission.models import Procedure as ProcedureModel
                proc_qs = ProcedureModel.objects.filter(
                    subject_id=patient.id
                ).order_by('-performed_datetime', '-created_at')
                response_data = procedures_to_bundle(proc_qs)
                response_status = 'SUCCESS'
            elif requested_resource == 'Immunization':
                imm_qs = Immunization.objects.filter(
                    patient=patient
                ).select_related('patient').order_by('-occurrence_datetime', '-created_at')
                response_data = immunizations_to_bundle(imm_qs)
                response_status = 'SUCCESS'
            elif requested_resource == 'Condition':
                from patients.models import Condition as ConditionModel
                cond_qs = ConditionModel.objects.filter(
                    patient=patient
                ).order_by('-created_at')
                response_data = conditions_to_bundle(cond_qs)
                response_status = 'SUCCESS'
            elif requested_resource == 'AllergyIntolerance':
                from patients.models import AllergyIntolerance as AllergyModel
                allergy_qs = AllergyModel.objects.filter(
                    patient=patient
                ).order_by('-created_at')
                response_data = allergies_to_bundle(allergy_qs)
                response_status = 'SUCCESS'
            elif requested_resource == 'Observation':
                from monitoring.models import Observation as ObservationModel
                obs_qs = ObservationModel.objects.filter(
                    subject_id=patient.id
                ).order_by('-effective_datetime', '-created_at')
                response_data = observations_to_bundle(obs_qs)
                response_status = 'SUCCESS'
            elif requested_resource == 'MedicationRequest':
                from pharmacy.models import MedicationRequest as MedicationRequestModel
                mr_qs = MedicationRequestModel.objects.filter(
                    subject_id=patient.id
                ).order_by('-authored_on', '-created_at')
                response_data = medicationrequests_to_bundle(mr_qs)
                response_status = 'SUCCESS'
            elif requested_resource == 'DiagnosticReport':
                from laboratory.models import DiagnosticReport as DiagnosticReportModel
                dr_qs = DiagnosticReportModel.objects.filter(
                    subject_id=patient.id
                ).order_by('-issued_datetime', '-created_at')
                response_data = diagnosticreports_to_bundle(dr_qs)
                response_status = 'SUCCESS'
            else:
                response_data = patient_to_fhir(patient)
                response_status = 'SUCCESS'

            # ----------------------------------------------------------------
            # 4. Send the result back to the gateway (10 s hard timeout)
            # ----------------------------------------------------------------
            gw_response = http_requests.post(
                return_url,
                headers={
                    'X-API-Key': os.getenv('WAH4PC_API_KEY'),
                    'X-Provider-ID': os.getenv('WAH4PC_PROVIDER_ID'),
                    'Idempotency-Key': idempotency_key,
                },
                json={
                    'transactionId': txn_id,
                    'status': response_status,
                    'data': response_data,
                },
                timeout=10,
            )

            if gw_response.status_code >= 400:
                logger.error(
                    '[WAH4PC] Gateway rejected process_query response for txn %s: %s %s',
                    txn_id, gw_response.status_code, gw_response.text[:200],
                )
                txn.status = 'FAILED'
                txn.error_message = f'Gateway returned {gw_response.status_code}: {gw_response.text[:200]}'
            else:
                txn.status = 'COMPLETED'
            txn.save()

        except Exception as e:
            logger.exception('[WAH4PC] process_query thread error for txn %s', txn_id)
            if txn is not None:
                txn.status = 'FAILED'
                txn.error_message = str(e)
                txn.save()
            else:
                # Thread failed before the transaction record was created
                WAH4PCTransaction.objects.filter(transaction_id=txn_id).update(
                    status='FAILED',
                    error_message=str(e),
                )
        finally:
            # Return the thread-local database connection to the pool
            connection.close()

    thread = threading.Thread(target=_process_query, daemon=True)
    thread.start()

    # Acknowledge immediately — the gateway must not wait for the thread
    return Response({'status': 'acknowledged'}, status=status.HTTP_200_OK)


@api_view(['GET'])
def list_providers(request):
    """List all active WAH4PC providers.

    This endpoint fetches the list of registered providers from the WAH4PC gateway.
    No authentication required as the gateway endpoint is public.

    Returns:
        Response: List of active providers with id, name, type, and isActive fields
    """
    providers = get_providers()
    return Response(providers, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_transactions(request):
    """List WAH4PC transactions with optional filters and pagination.

    Query params:
        patient_id: Filter by patient ID
        status: Filter by transaction status (PENDING, COMPLETED, FAILED, etc.)
        type: Filter by transaction type (fetch, send, receive_push, process_query)
        page: Page number (1-based, default 1)
        page_size: Records per page (default 50, max 200)
    """
    txns = WAH4PCTransaction.objects.all().order_by('-created_at')

    # Apply filters
    patient_id = request.query_params.get('patient_id')
    if patient_id:
        txns = txns.filter(patient_id=patient_id)

    status_filter = request.query_params.get('status')
    if status_filter:
        txns = txns.filter(status=status_filter)

    type_filter = request.query_params.get('type')
    if type_filter:
        txns = txns.filter(type=type_filter)

    # Pagination
    try:
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(200, max(1, int(request.query_params.get('page_size', 50))))
    except (ValueError, TypeError):
        page = 1
        page_size = 50

    total = txns.count()
    offset = (page - 1) * page_size
    page_txns = txns[offset: offset + page_size]

    return Response({
        'count': total,
        'page': page,
        'pageSize': page_size,
        'totalPages': max(1, (total + page_size - 1) // page_size),
        'results': [
            {
                'id': t.transaction_id,
                'type': t.type,
                'status': t.status,
                'patientId': t.patient_id,
                'relatedPatientId': t.related_patient_id,
                'targetProviderId': t.target_provider_id,
                'requesterId': t.requester_id,
                'senderId': t.sender_id,
                'rawPayload': t.raw_payload,
                'error': t.error_message,
                'createdAt': t.created_at,
                'updatedAt': t.updated_at,
            }
            for t in page_txns
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transaction(request, transaction_id):
    """Get detailed information about a specific WAH4PC transaction.

    Args:
        transaction_id: The transaction ID to retrieve

    Returns:
        Transaction details including idempotency key
    """
    try:
        txn = WAH4PCTransaction.objects.get(transaction_id=transaction_id)
    except WAH4PCTransaction.DoesNotExist:
        return Response(
            {'error': 'Transaction not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response({
        'id': txn.transaction_id,
        'type': txn.type,
        'status': txn.status,
        'patientId': txn.patient_id,
        'relatedPatientId': txn.related_patient_id,
        'targetProviderId': txn.target_provider_id,
        'requesterId': txn.requester_id,
        'senderId': txn.sender_id,
        'rawPayload': txn.raw_payload,
        'error': txn.error_message,
        'idempotencyKey': txn.idempotency_key,
        'createdAt': txn.created_at,
        'updatedAt': txn.updated_at,
    })


# ============================================================================
# FHIR SERVER ENDPOINTS
# ============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def fhir_capability_statement(request):
    """FHIR R4 CapabilityStatement — public discovery endpoint.

    External systems call GET /fhir/metadata to learn what resources and
    operations WAH4H supports before initiating interoperability exchanges.
    No authentication required per FHIR R4 spec §3.1.0.
    """
    statement = {
        "resourceType": "CapabilityStatement",
        "status": "active",
        "date": "2026-05-05",
        "kind": "instance",
        "fhirVersion": "4.0.1",
        "format": ["json"],
        "implementationGuide": [
            "https://fhir-ph-core.wah.ph/phcore/ImplementationGuide/ph-core"
        ],
        "implementation": {
            "description": "WAH4H Hospital Information System FHIR R4 Server",
            "url": "https://wah4h-backend-e0caecbeghh3hfbh.southeastasia-01.azurewebsites.net/fhir",
        },
        "rest": [{
            "mode": "server",
            "security": {
                "cors": True,
                "service": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/restful-security-service",
                                         "code": "Bearer", "display": "Bearer Token"}]}],
                "description": "JWT Bearer token required for all endpoints except /fhir/metadata",
            },
            "resource": [
                {
                    "type": "Patient",
                    "profile": "https://fhir-ph-core.wah.ph/phcore/StructureDefinition/ph-core-patient",
                    "interaction": [{"code": "read"}, {"code": "search-type"}, {"code": "create"}, {"code": "update"}],
                    "searchParam": [
                        {"name": "identifier", "type": "token"},
                        {"name": "name", "type": "string"},
                        {"name": "birthdate", "type": "date"},
                        {"name": "gender", "type": "token"},
                    ],
                    "operation": [{"name": "everything", "definition": "http://hl7.org/fhir/OperationDefinition/Patient-everything"}],
                },
                {"type": "Condition", "interaction": [{"code": "read"}, {"code": "search-type"}, {"code": "create"}]},
                {"type": "AllergyIntolerance", "interaction": [{"code": "read"}, {"code": "search-type"}, {"code": "create"}]},
                {"type": "Immunization", "interaction": [{"code": "read"}, {"code": "search-type"}, {"code": "create"}]},
                {"type": "Encounter", "interaction": [{"code": "read"}, {"code": "search-type"}]},
                {"type": "Procedure", "interaction": [{"code": "read"}, {"code": "search-type"}]},
                {"type": "Observation", "interaction": [{"code": "read"}, {"code": "search-type"}]},
                {"type": "MedicationRequest", "interaction": [{"code": "read"}, {"code": "search-type"}]},
                {"type": "DiagnosticReport", "interaction": [{"code": "read"}, {"code": "search-type"}]},
            ],
            "operation": [
                {"name": "process-query", "definition": "https://fhir-ph-core.wah.ph/phcore/OperationDefinition/process-query"},
                {"name": "receive-push", "definition": "https://fhir-ph-core.wah.ph/phcore/OperationDefinition/receive-push"},
            ],
        }],
    }
    return JsonResponse(statement, status=200, content_type='application/fhir+json')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fhir_patient_everything(request, patient_id):
    """FHIR R4 Patient/$everything — returns a searchset Bundle of all clinical
    resources associated with the patient.

    patient_id: WAH4H patient_id string (e.g. 'WAH-2026-00001') or numeric PK.
    Requires JWT authentication.
    """
    try:
        if not patient_id.lstrip('-').isdigit():
            patient = Patient.objects.get(patient_id=patient_id, status='active')
        else:
            patient = Patient.objects.get(pk=int(patient_id), status='active')
    except Patient.DoesNotExist:
        return JsonResponse({
            "resourceType": "OperationOutcome",
            "issue": [{"severity": "error", "code": "not-found",
                       "diagnostics": f"Patient '{patient_id}' not found"}],
        }, status=404, content_type='application/fhir+json')

    pid = patient.pk
    entries = [{"resource": patient_to_fhir(patient), "search": {"mode": "match"}}]

    from admission.models import Encounter, Procedure as AdmissionProcedure
    from monitoring.models import Observation as ObservationModel
    from pharmacy.models import MedicationRequest as MedicationRequestModel
    from laboratory.models import DiagnosticReport as DiagnosticReportModel

    cross_module_resources = [
        (conditions_to_bundle,       Condition.objects.filter(patient_id=pid).order_by('-created_at')),
        (allergies_to_bundle,        AllergyIntolerance.objects.filter(patient_id=pid).order_by('-created_at')),
        (immunizations_to_bundle,    Immunization.objects.filter(patient_id=pid).order_by('-created_at')),
        (encounters_to_bundle,       Encounter.objects.filter(subject_id=pid).order_by('-period_start')),
        (procedures_to_bundle,       AdmissionProcedure.objects.filter(subject_id=pid).order_by('-performed_datetime')),
        (observations_to_bundle,     ObservationModel.objects.filter(subject_id=pid).order_by('-effective_datetime')),
        (medicationrequests_to_bundle, MedicationRequestModel.objects.filter(subject_id=pid).order_by('-authored_on')),
        (diagnosticreports_to_bundle,  DiagnosticReportModel.objects.filter(subject_id=pid).order_by('-issued_datetime')),
    ]

    for bundle_fn, qs in cross_module_resources:
        try:
            bundle = bundle_fn(qs)
            for entry in bundle.get('entry', []):
                resource = entry.get('resource', entry)
                entries.append({"resource": resource, "search": {"mode": "include"}})
        except Exception:
            logger.exception("$everything bundle assembly error for patient %s", pid)

    response_bundle = {
        "resourceType": "Bundle",
        "type": "searchset",
        "timestamp": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "total": len(entries),
        "entry": entries,
    }
    return JsonResponse(response_bundle, status=200, content_type='application/fhir+json')
