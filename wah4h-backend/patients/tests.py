# patients/tests.py
"""
Comprehensive Test Suite for Patients App

Test Coverage:
1. Service Layer Tests (Business Logic)
   - Patient registration and deduplication
   - ID generation and validation
   - PhilHealth validation
   - Consent enforcement
   - Clinical data recording

2. API Layer Tests (Endpoints)
   - CRUD operations
   - Error handling (409 Conflict, 400 Bad Request)
   - Read-only field protection
   - Search and filtering

3. Serializer Tests (Data Validation)
   - Format validation
   - Required fields
   - Read-only enforcement
"""

import re
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from patients.models import Patient, Condition, AllergyIntolerance, Immunization
from patients.services import PatientService, ClinicalService, DuplicatePatientError
from patients.serializers import (
    PatientRegistrationSerializer,
    PatientUpdateSerializer,
    ConditionInputSerializer,
    AllergyIntoleranceInputSerializer,
    ImmunizationInputSerializer
)
from accounts.models import Organization, Location, Practitioner
from admission.models import Encounter

User = get_user_model()


# ============================================================================
# TEST FIXTURES & UTILITIES
# ============================================================================

class TestDataFactory:
    """
    Factory for creating test data
    """
    
    @staticmethod
    def create_organization(name="Test Hospital"):
        """Create a test organization"""
        return Organization.objects.create(
            name=name,
            active=True,
            type_code="HOSPITAL"
        )
    
    @staticmethod
    def create_location(name="Test Ward", organization=None):
        """Create a test location"""
        return Location.objects.create(
            name=name,
            status="active",
            managing_organization=organization
        )
    
    @staticmethod
    def create_practitioner(first_name="John", last_name="Doe"):
        """Create a test practitioner"""
        return Practitioner.objects.create(
            identifier=f"PRAC-{first_name}-{last_name}",
            first_name=first_name,
            last_name=last_name,
            active=True
        )
    
    @staticmethod
    def create_encounter(patient, identifier=None, status="finished"):
        """
        Create a test encounter for clinical data linkage.
        
        Per admission.csv requirements:
        - identifier: NOT NULL, UNIQUE
        - status: NOT NULL
        - subject_patient_id: NOT NULL (FK to Patient)
        """
        if identifier is None:
            # Generate unique identifier using timestamp
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
            identifier = f"ENC-TEST-{timestamp}"
        
        return Encounter.objects.create(
            identifier=identifier,
            status=status,
            subject_patient_id=patient.id
        )
    
    @staticmethod
    def create_patient_data(
        first_name="Juan",
        last_name="Dela Cruz",
        birthdate=None,
        consent_flag=True
    ):
        """Create valid patient registration data"""
        if birthdate is None:
            birthdate = date(1990, 1, 15)
        
        return {
            'first_name': first_name,
            'last_name': last_name,
            'middle_name': 'Santos',
            'gender': 'male',
            'birthdate': birthdate,
            'civil_status': 'single',
            'nationality': 'Filipino',
            'philhealth_id': '12-345678901-2',
            'mobile_number': '+639171234567',
            'consent_flag': consent_flag,
            'address_line': '123 Test Street',
            'address_city': 'Manila',
            'address_state': 'NCR',
            'address_country': 'Philippines'
        }


# ============================================================================
# SERVICE LAYER TESTS
# ============================================================================

class PatientServiceTest(TestCase):
    """
    Test PatientService business logic
    """
    
    def setUp(self):
        """Set up test fixtures"""
        self.valid_data = TestDataFactory.create_patient_data()
    
    def test_patient_id_generation_format(self):
        """
        Test: patient_id follows format P-{YYYY}{MM}-{RandomHex}
        Example: P-202602-A1B2C3
        """
        patient = PatientService.register_patient(self.valid_data)
        
        # Verify format
        pattern = r'^P-\d{6}-[A-F0-9]{6}$'
        self.assertIsNotNone(
            re.match(pattern, patient.patient_id),
            f"patient_id '{patient.patient_id}' does not match expected format"
        )
        
        # Verify year-month prefix
        now = datetime.now()
        expected_prefix = f"P-{now.strftime('%Y%m')}"
        self.assertTrue(
            patient.patient_id.startswith(expected_prefix),
            f"patient_id should start with {expected_prefix}"
        )
    
    def test_patient_id_uniqueness(self):
        """Test: Each patient gets a unique patient_id"""
        patient1 = PatientService.register_patient(self.valid_data)
        
        # Create different patient
        data2 = TestDataFactory.create_patient_data(
            first_name="Maria",
            last_name="Santos",
            birthdate=date(1995, 5, 20)
        )
        patient2 = PatientService.register_patient(data2)
        
        self.assertNotEqual(patient1.patient_id, patient2.patient_id)
    
    def test_duplicate_patient_detection(self):
        """
        Test: DuplicatePatientError raised for same Name + Birthdate
        This is the CRITICAL deduplication rule
        """
        # Register first patient
        PatientService.register_patient(self.valid_data)
        
        # Attempt duplicate with same name + birthdate
        duplicate_data = self.valid_data.copy()
        duplicate_data['philhealth_id'] = '12-987654321-9'  # Different PhilHealth
        
        with self.assertRaises(DuplicatePatientError) as context:
            PatientService.register_patient(duplicate_data)
        
        self.assertIn("already exists", str(context.exception).lower())
    
    def test_duplicate_check_case_insensitive(self):
        """Test: Duplicate detection is case-insensitive"""
        PatientService.register_patient(self.valid_data)
        
        # Try with different case
        duplicate_data = self.valid_data.copy()
        duplicate_data['first_name'] = duplicate_data['first_name'].upper()
        duplicate_data['last_name'] = duplicate_data['last_name'].upper()
        
        with self.assertRaises(DuplicatePatientError):
            PatientService.register_patient(duplicate_data)
    
    def test_philhealth_id_validation_valid_format(self):
        """Test: Valid PhilHealth ID format XX-XXXXXXXXX-X"""
        valid_formats = [
            '12-345678901-2',
            '01-123456789-0',
            '99-999999999-9'
        ]
        
        for philhealth_id in valid_formats:
            data = self.valid_data.copy()
            data['philhealth_id'] = philhealth_id
            patient = PatientService.register_patient(data)
            self.assertEqual(patient.philhealth_id, philhealth_id)
            
            # Clean up for next iteration
            patient.delete()
    
    def test_philhealth_id_validation_invalid_format(self):
        """Test: Invalid PhilHealth ID format raises ValidationError"""
        invalid_formats = [
            '12345',  # Too short
            '123-456789012',  # Wrong format
            'AB-123456789-1',  # Letters instead of numbers
            '12-12345678-1',  # Wrong number of digits
        ]
        
        for invalid_id in invalid_formats:
            data = self.valid_data.copy()
            data['philhealth_id'] = invalid_id
            
            with self.assertRaises(ValidationError):
                PatientService.register_patient(data)
    
    def test_consent_flag_required(self):
        """Test: consent_flag must be True for registration"""
        data = self.valid_data.copy()
        data['consent_flag'] = False
        
        with self.assertRaises(ValidationError) as context:
            PatientService.register_patient(data)
        
        self.assertIn("consent", str(context.exception).lower())
    
    def test_consent_flag_none_fails(self):
        """Test: consent_flag=None is treated as False"""
        data = self.valid_data.copy()
        data['consent_flag'] = None
        
        with self.assertRaises(ValidationError):
            PatientService.register_patient(data)
    
    def test_update_protected_fields(self):
        """Test: Cannot update patient_id or birthdate"""
        patient = PatientService.register_patient(self.valid_data)
        original_patient_id = patient.patient_id
        original_birthdate = patient.birthdate
        
        # Attempt to update protected fields
        update_data = {
            'patient_id': 'P-999999-HACKED',
            'birthdate': date(2000, 1, 1),
            'middle_name': 'Updated'
        }
        
        with self.assertRaises(ValidationError) as context:
            PatientService.update_patient_demographics(patient, update_data)
        
        # Verify error mentions protected fields
        error_message = str(context.exception).lower()
        self.assertTrue(
            'patient_id' in error_message or 'birthdate' in error_message,
            "Error should mention protected fields"
        )
        
        # Verify fields were NOT changed
        patient.refresh_from_db()
        self.assertEqual(patient.patient_id, original_patient_id)
        self.assertEqual(patient.birthdate, original_birthdate)
    
    def test_update_allowed_fields(self):
        """Test: Can update non-protected demographic fields"""
        patient = PatientService.register_patient(self.valid_data)
        
        update_data = {
            'middle_name': 'Updated',
            'mobile_number': '+639189999999',
            'civil_status': 'married'
        }
        
        updated_patient = PatientService.update_patient_demographics(
            patient,
            update_data
        )
        
        self.assertEqual(updated_patient.middle_name, 'Updated')
        self.assertEqual(updated_patient.mobile_number, '+639189999999')
        self.assertEqual(updated_patient.civil_status, 'married')
    
    def test_search_patients_by_query(self):
        """Test: Search patients by name"""
        PatientService.register_patient(self.valid_data)
        
        # Search by first name
        results = PatientService.search_patients(query="Juan")
        self.assertEqual(results.count(), 1)
        
        # Search by last name
        results = PatientService.search_patients(query="Cruz")
        self.assertEqual(results.count(), 1)
        
        # Search with no match
        results = PatientService.search_patients(query="NonExistent")
        self.assertEqual(results.count(), 0)
    
    def test_search_patients_by_philhealth_id(self):
        """Test: Search by exact PhilHealth ID"""
        patient = PatientService.register_patient(self.valid_data)
        
        results = PatientService.search_patients(
            philhealth_id=patient.philhealth_id
        )
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().id, patient.id)


class ClinicalServiceTest(TestCase):
    """
    Test ClinicalService business logic
    """
    
    def setUp(self):
        """Set up test fixtures"""
        patient_data = TestDataFactory.create_patient_data()
        self.patient = PatientService.register_patient(patient_data)
        self.practitioner = TestDataFactory.create_practitioner()
        
        # Create a valid Encounter (required by admission.csv schema)
        self.encounter = TestDataFactory.create_encounter(self.patient)
    
    def test_record_condition_with_auto_identifier(self):
        """Test: Condition identifier auto-generated if not provided"""
        condition_data = {
            'code': 'J00',
            'clinical_status': 'active',
            'verification_status': 'confirmed'
        }
        
        condition = ClinicalService.record_condition(
            patient=self.patient,
            data=condition_data,
            recorder=self.practitioner,
            encounter=self.encounter
        )
        
        self.assertIsNotNone(condition.identifier)
        self.assertTrue(len(condition.identifier) > 0)
    
    def test_record_condition_code_required(self):
        """Test: Condition code is mandatory"""
        condition_data = {
            'clinical_status': 'active'
            # Missing 'code'
        }
        
        with self.assertRaises(ValidationError) as context:
            ClinicalService.record_condition(
                patient=self.patient,
                data=condition_data,
                recorder=self.practitioner,
                encounter=self.encounter
            )
        
        self.assertIn("code", str(context.exception).lower())
    
    def test_record_allergy_with_auto_identifier(self):
        """Test: Allergy identifier auto-generated if not provided"""
        allergy_data = {
            'code': 'PENICILLIN',
            'clinical_status': 'active',
            'criticality': 'high'
        }
        
        allergy = ClinicalService.record_allergy(
            patient=self.patient,
            data=allergy_data,
            recorder=self.practitioner,
            encounter=self.encounter
        )
        
        self.assertIsNotNone(allergy.identifier)
    
    def test_record_immunization_status_required(self):
        """Test: Immunization status is mandatory"""
        immunization_data = {
            'vaccine_code': 'COVID-19',
            # Missing 'status'
        }
        
        with self.assertRaises(ValidationError) as context:
            ClinicalService.record_immunization(
                patient=self.patient,
                data=immunization_data,
                performer=self.practitioner,
                encounter=self.encounter
            )
        
        self.assertIn("status", str(context.exception).lower())


# ============================================================================
# SERIALIZER TESTS
# ============================================================================

class PatientSerializerTest(TestCase):
    """
    Test serializer validation logic
    """
    
    def test_registration_serializer_valid_data(self):
        """Test: PatientRegistrationSerializer accepts valid data"""
        data = TestDataFactory.create_patient_data()
        serializer = PatientRegistrationSerializer(data=data)
        
        self.assertTrue(serializer.is_valid(), serializer.errors)
    
    def test_registration_serializer_consent_required(self):
        """Test: consent_flag explicitly required"""
        data = TestDataFactory.create_patient_data()
        del data['consent_flag']
        
        serializer = PatientRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('consent_flag', serializer.errors)
    
    def test_registration_serializer_consent_must_be_true(self):
        """Test: consent_flag must be True"""
        data = TestDataFactory.create_patient_data(consent_flag=False)
        serializer = PatientRegistrationSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('consent_flag', serializer.errors)
    
    def test_registration_serializer_philhealth_format(self):
        """Test: PhilHealth ID format validation"""
        data = TestDataFactory.create_patient_data()
        data['philhealth_id'] = 'INVALID'
        
        serializer = PatientRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('philhealth_id', serializer.errors)
    
    def test_registration_serializer_future_birthdate(self):
        """Test: Birthdate cannot be in the future"""
        data = TestDataFactory.create_patient_data()
        data['birthdate'] = date.today() + timedelta(days=1)
        
        serializer = PatientRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('birthdate', serializer.errors)
    
    def test_update_serializer_protects_identity_fields(self):
        """Test: Update serializer has read-only identity fields"""
        serializer = PatientUpdateSerializer()
        readonly_fields = serializer.Meta.read_only_fields
        
        self.assertIn('patient_id', readonly_fields)
        self.assertIn('birthdate', readonly_fields)
        self.assertIn('first_name', readonly_fields)
        self.assertIn('last_name', readonly_fields)


# ============================================================================
# API LAYER TESTS
# ============================================================================

class PatientAPITest(APITestCase):
    """
    Test Patient API endpoints
    """
    
    def setUp(self):
        """Set up API client and test data"""
        self.client = APIClient()
        self.valid_data = TestDataFactory.create_patient_data()
    
    def test_create_patient_success(self):
        """
        Test: POST /api/patients/ with valid data returns 201
        Happy Path
        """
        response = self.client.post(
            '/api/patients/',
            data=self.valid_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('patient_id', response.data)
        self.assertIn('first_name', response.data)
        
        # Verify patient_id format
        pattern = r'^P-\d{6}-[A-F0-9]{6}$'
        self.assertIsNotNone(re.match(pattern, response.data['patient_id']))
    
    def test_create_patient_duplicate_returns_409(self):
        """
        Test: POST duplicate patient returns HTTP 409 Conflict
        """
        # Create first patient
        self.client.post('/api/patients/', data=self.valid_data, format='json')
        
        # Attempt duplicate
        response = self.client.post(
            '/api/patients/',
            data=self.valid_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('error', response.data)
        self.assertIn('duplicate', response.data['error'].lower())
    
    def test_create_patient_missing_required_fields_returns_400(self):
        """
        Test: POST without required fields returns HTTP 400
        """
        invalid_data = {
            'first_name': 'Juan'
            # Missing required fields
        }
        
        response = self.client.post(
            '/api/patients/',
            data=invalid_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_create_patient_no_consent_returns_400(self):
        """
        Test: POST without consent_flag=True returns HTTP 400
        """
        data = self.valid_data.copy()
        data['consent_flag'] = False
        
        response = self.client.post(
            '/api/patients/',
            data=data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('consent', str(response.data).lower())
    
    def test_create_patient_invalid_philhealth_returns_400(self):
        """
        Test: POST with invalid PhilHealth ID returns HTTP 400
        """
        data = self.valid_data.copy()
        data['philhealth_id'] = 'INVALID-FORMAT'
        
        response = self.client.post(
            '/api/patients/',
            data=data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('philhealth', str(response.data).lower())
    
    def test_update_patient_protected_fields_ignored(self):
        """
        Test: PATCH attempts to change patient_id are ignored
        Critical: Read-only enforcement
        """
        # Create patient
        create_response = self.client.post(
            '/api/patients/',
            data=self.valid_data,
            format='json'
        )
        patient_id = create_response.data['patient_id']
        original_birthdate = create_response.data['birthdate']
        
        # Attempt to change protected fields
        update_data = {
            'patient_id': 'P-999999-HACKED',
            'birthdate': '2000-01-01',
            'first_name': 'Hacked',
            'middle_name': 'Updated'  # This should work
        }
        
        response = self.client.patch(
            f'/api/patients/{patient_id}/',
            data=update_data,
            format='json'
        )
        
        # Verify protected fields were NOT changed
        patient = Patient.objects.get(patient_id=patient_id)
        self.assertEqual(patient.patient_id, patient_id)  # Unchanged
        self.assertEqual(str(patient.birthdate), original_birthdate)  # Unchanged
        self.assertNotEqual(patient.first_name, 'Hacked')  # Unchanged
        self.assertEqual(patient.middle_name, 'Updated')  # Changed (allowed)
    
    def test_update_patient_success(self):
        """
        Test: PATCH /api/patients/{id}/ updates allowed fields
        """
        # Create patient
        create_response = self.client.post(
            '/api/patients/',
            data=self.valid_data,
            format='json'
        )
        patient_id = create_response.data['patient_id']
        
        # Update allowed fields
        update_data = {
            'mobile_number': '+639189999999',
            'civil_status': 'married'
        }
        
        response = self.client.patch(
            f'/api/patients/{patient_id}/',
            data=update_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['mobile_number'], '+639189999999')
        self.assertEqual(response.data['civil_status'], 'married')
    
    def test_list_patients(self):
        """
        Test: GET /api/patients/ returns patient list
        """
        # Create test patients
        self.client.post('/api/patients/', data=self.valid_data, format='json')
        
        response = self.client.get('/api/patients/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    
    def test_retrieve_patient_by_external_id(self):
        """
        Test: GET /api/patients/{patient_id}/ retrieves by external ID
        """
        # Create patient
        create_response = self.client.post(
            '/api/patients/',
            data=self.valid_data,
            format='json'
        )
        patient_id = create_response.data['patient_id']
        
        # Retrieve by external ID
        response = self.client.get(f'/api/patients/{patient_id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['patient_id'], patient_id)
        self.assertIn('full_name', response.data)
        self.assertIn('age', response.data)
    
    def test_search_patients_by_query(self):
        """
        Test: GET /api/patients/?q=search_term filters results
        """
        # Create patient
        self.client.post('/api/patients/', data=self.valid_data, format='json')
        
        # Search by name
        response = self.client.get('/api/patients/?q=Juan')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    
    def test_search_patients_by_philhealth_id(self):
        """
        Test: GET /api/patients/?philhealth_id=XX-XXXXXXXXX-X filters
        """
        # Create patient
        create_response = self.client.post(
            '/api/patients/',
            data=self.valid_data,
            format='json'
        )
        philhealth_id = create_response.data['philhealth_id']
        
        # Search by PhilHealth ID
        response = self.client.get(
            f'/api/patients/?philhealth_id={philhealth_id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_clinical_summary_endpoint(self):
        """
        Test: GET /api/patients/{patient_id}/clinical-summary/
        """
        # Create patient
        create_response = self.client.post(
            '/api/patients/',
            data=self.valid_data,
            format='json'
        )
        patient_id = create_response.data['patient_id']
        
        # Get clinical summary
        response = self.client.get(
            f'/api/patients/{patient_id}/clinical-summary/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('patient_id', response.data)
        self.assertIn('active_conditions', response.data)
        self.assertIn('total_allergies', response.data)
        self.assertIn('total_immunizations', response.data)


class ClinicalAPITest(APITestCase):
    """
    Test Clinical API endpoints (Conditions, Allergies, Immunizations)
    """
    
    def setUp(self):
        """Set up test fixtures"""
        self.client = APIClient()
        
        # Create patient
        patient_data = TestDataFactory.create_patient_data()
        patient = PatientService.register_patient(patient_data)
        self.patient = patient
        
        # Create practitioner
        self.practitioner = TestDataFactory.create_practitioner()
        
        # Create a valid Encounter (required by admission.csv schema)
        self.encounter = TestDataFactory.create_encounter(self.patient)
    
    def test_create_condition_requires_code(self):
        """
        Test: POST /api/conditions/ without code returns 400
        """
        condition_data = {
            'subject_id': self.patient.id,
            'clinical_status': 'active',
            'encounter_id': self.encounter.encounter_id
            # Missing 'code'
        }
        
        response = self.client.post(
            '/api/conditions/',
            data=condition_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_filter_conditions_by_patient(self):
        """
        Test: GET /api/conditions/?patient_id=P-XXXX filters results
        """
        response = self.client.get(
            f'/api/conditions/?patient_id={self.patient.patient_id}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
