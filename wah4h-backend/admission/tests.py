"""
Admission App Tests
===================
Comprehensive test suite for Encounter and Procedure management.

Test Coverage:
- Serializer Layer: Input validation and output enrichment
- View Layer: RESTful API endpoints

Author: WAH4H Backend Team
Date: February 2, 2026
"""

from rest_framework import serializers
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Encounter, Procedure, ProcedurePerformer
from .serializers import (
    EncounterSerializer,
    EncounterDischargeSerializer,
    ProcedureSerializer,
)
from patients.models import Patient
from accounts.models import Practitioner


User = get_user_model()


# ==================== SERIALIZER LAYER TESTS ====================

class EncounterSerializerTests(TestCase):
    """
    Test suite for EncounterSerializer business logic.
    """
    
    def _create_encounter(self, data):
        """Helper to create encounter using serializer."""
        if 'type' not in data:
            data['type'] = 'inpatient'
        if 'class_field' not in data:
            data['class_field'] = 'IMP'
        serializer = EncounterSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def setUp(self):
        """Create test fixtures."""
        self.practitioner = Practitioner.objects.create(
            identifier='TEST-DOC-001',
            first_name='Test',
            last_name='Doctor'
        )
        
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            practitioner=self.practitioner,
            first_name='Test',
            last_name='User',
            status='active'
        )
        
        self.patient = Patient.objects.create(
            patient_id='P-TEST-001',
            first_name='John',
            last_name='Smith',
            birthdate='1990-01-01',
            gender='M'
        )
    
    def test_create_encounter_success(self):
        """Test successful encounter creation."""
        encounter_data = {
            'patient_id': 'P-TEST-001',
            'type': 'inpatient',
            'class_field': 'IMP',
            'priority': 'routine',
        }
        
        encounter = self._create_encounter(encounter_data)
        
        self.assertIsNotNone(encounter)
        self.assertTrue(encounter.identifier.startswith('ENC-'))
        self.assertEqual(encounter.subject_id, self.patient.id)
        self.assertEqual(encounter.status, 'in-progress')
    
    def test_create_encounter_invalid_patient(self):
        """Test encounter creation with non-existent patient."""
        encounter_data = {
            'patient_id': 'P-NONEXISTENT-999',
            'type': 'outpatient',
            'class_field': 'AMB',
        }
        
        with self.assertRaises(serializers.ValidationError) as context:
            self._create_encounter(encounter_data)
        
        self.assertIn('patient_id', str(context.exception))
    
    def test_discharge_encounter_success(self):
        """Test successful encounter discharge."""
        encounter = self._create_encounter({
            'patient_id': 'P-TEST-001',
            'type': 'inpatient',
            'class_field': 'IMP',
        })
        
        serializer = EncounterDischargeSerializer(encounter, data={
            'discharge_disposition': 'Home',
        }, partial=True)
        serializer.is_valid(raise_exception=True)
        discharged = serializer.save()
        
        self.assertEqual(discharged.status, 'finished')
        self.assertIsNotNone(discharged.period_end)

    def test_create_encounter_blocking_required_fields(self):
        """Test that missing required fields blocks creation."""
        # Missing type and class_field
        data = {'patient_id': 'P-TEST-001'}
        serializer = EncounterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('type', serializer.errors)
        self.assertIn('class_field', serializer.errors)
        
        # Missing patient_id
        data = {'type': 'inpatient', 'class_field': 'IMP'}
        serializer = EncounterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('patient_id', serializer.errors)

    def test_prevent_duplicate_active_admission(self):
        """Test that a patient already admitted cannot be admitted again."""
        # Admit patient
        self._create_encounter({
            'patient_id': 'P-TEST-001',
            'type': 'inpatient',
            'class_field': 'IMP',
        })
        
        # Try to admit again
        data = {
            'patient_id': 'P-TEST-001',
            'type': 'outpatient',
            'class_field': 'AMB',
        }
        serializer = EncounterSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
        self.assertEqual(
            serializer.errors['non_field_errors'][0],
            "Patient is already admitted with an active encounter. Please discharge or finish the existing encounter before starting a new one."
        )

    def test_auto_default_period_start(self):
        """Test that period_start defaults to today if not provided."""
        data = {
            'patient_id': 'P-TEST-001',
            'type': 'inpatient',
            'class_field': 'IMP',
        }
        encounter = self._create_encounter(data)
        self.assertEqual(encounter.period_start, timezone.now().date())


class ProcedureSerializerTests(TestCase):
    """
    Test suite for ProcedureSerializer business logic.
    """
    
    def _create_encounter(self, data):
        if 'type' not in data:
            data['type'] = 'inpatient'
        if 'class_field' not in data:
            data['class_field'] = 'IMP'
        serializer = EncounterSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def _record_procedure(self, data, user=None):
        context = {}
        if user:
            from unittest.mock import MagicMock
            request = MagicMock()
            request.user = user
            context['request'] = request
        serializer = ProcedureSerializer(data=data, context=context)
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def setUp(self):
        self.practitioner = Practitioner.objects.create(identifier='DOC-02', first_name='Doc')
        self.user = User.objects.create_user(username='doc', practitioner=self.practitioner)
        self.patient = Patient.objects.create(patient_id='P-02', first_name='Pat')
        self.encounter = self._create_encounter({
            'patient_id': 'P-02',
            'type': 'inpatient',
            'class_field': 'IMP',
        })

    def test_record_procedure_success(self):
        data = {
            'encounter': self.encounter.encounter_id,
            'subject_id': self.patient.id,
            'code_code': 'PROC-01',
            'code_display': 'Test Procedure',
        }
        procedure = self._record_procedure(data, self.user)
        self.assertIsNotNone(procedure.identifier)
        self.assertEqual(procedure.recorder_id, self.user.id)


# ==================== API LAYER TESTS ====================

class AdmissionAPITests(APITestCase):
    """
    Test suite for Admission API endpoints.
    """
    
    def setUp(self):
        self.practitioner = Practitioner.objects.create(identifier='API-DOC', first_name='API')
        self.user = User.objects.create_user(username='apiuser', practitioner=self.practitioner)
        self.client.force_authenticate(user=self.user)
        self.patient = Patient.objects.create(patient_id='P-API', first_name='API', last_name='Smith')
    
    def _create_encounter(self, data):
        if 'type' not in data:
            data['type'] = 'inpatient'
        if 'class_field' not in data:
            data['class_field'] = 'IMP'
        serializer = EncounterSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def test_create_encounter_api(self):
        url = reverse('encounter-list')
        data = {
            'patient_id': 'P-API',
            'type': 'inpatient',
            'class_field': 'IMP',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('identifier', response.data)

    def test_lookup_encounter_by_identifier(self):
        encounter = self._create_encounter({
            'patient_id': 'P-API',
            'type': 'inpatient',
            'class_field': 'IMP',
        })
        url = reverse('encounter-detail', kwargs={'identifier': encounter.identifier})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['identifier'], encounter.identifier)

    def test_discharge_action(self):
        encounter = self._create_encounter({
            'patient_id': 'P-API',
            'type': 'inpatient',
            'class_field': 'IMP',
        })
        url = reverse('encounter-discharge', kwargs={'identifier': encounter.identifier})
        data = {'discharge_disposition': 'Home'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'finished')
