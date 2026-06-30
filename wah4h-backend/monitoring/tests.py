from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
from decimal import Decimal
from datetime import datetime, date

from .models import Observation, ChargeItem, ChargeItemDefinition
from .services import ResourceResolver
from .serializers import ObservationSerializer, ChargeItemSerializer


# ==================== MODEL TESTS ====================

class ObservationModelTest(TestCase):
    """
    Test Observation model creation and basic functionality.
    Uses Manual Integer Fields for foreign keys (no actual FK relationships).
    """
    
    def test_create_observation_with_integer_fks(self):
        """Test that Observation can be created with simple integer IDs."""
        observation = Observation.objects.create(
            subject_id=1,  # Manual FK (no actual Patient object needed)
            encounter_id=100,  # Manual FK (no actual Encounter object needed)
            performer_id=50,  # Manual FK (no actual Practitioner object needed)
            code='85354-9',  # LOINC code for Blood Pressure
            category='vital-signs',
            effective_datetime=datetime.now(),
            value_quantity=Decimal('120.00')
        )
        
        self.assertEqual(observation.subject_id, 1)
        self.assertEqual(observation.encounter_id, 100)
        self.assertEqual(observation.performer_id, 50)
        self.assertEqual(observation.code, '85354-9')
        self.assertIsNotNone(observation.observation_id)
    
    def test_observation_optional_fields(self):
        """Test that optional FK fields can be None."""
        observation = Observation.objects.create(
            subject_id=1,
            encounter_id=100,
            code='29463-7',  # Body Weight
            performer_id=None,  # Optional
            specimen_id=None,  # Optional
            device_id=None  # Optional
        )
        
        self.assertIsNone(observation.performer_id)
        self.assertIsNone(observation.specimen_id)
        self.assertIsNone(observation.device_id)


class ChargeItemModelTest(TestCase):
    """
    Test ChargeItem model creation and basic functionality.
    Uses Manual Integer Fields for foreign keys.
    """
    
    def test_create_chargeitem_with_integer_fks(self):
        """Test that ChargeItem can be created with simple integer IDs."""
        charge_item = ChargeItem.objects.create(
            subject_id=1,  # Manual FK
            account_id=200,  # Manual FK
            performing_organization_id=5,  # Manual FK
            code='99213',  # CPT code
            entered_date=datetime.now(),
            quantity_value=Decimal('1.00'),
            price_override_value=Decimal('150.00')
        )
        
        self.assertEqual(charge_item.subject_id, 1)
        self.assertEqual(charge_item.account_id, 200)
        self.assertEqual(charge_item.performing_organization_id, 5)
        self.assertEqual(charge_item.code, '99213')
        self.assertIsNotNone(charge_item.chargeitem_id)
    
    def test_chargeitem_optional_fields(self):
        """Test that optional FK fields can be None."""
        charge_item = ChargeItem.objects.create(
            subject_id=1,
            code='36415',  # Venipuncture
            account_id=None,  # Optional
            performer_actor_id=None,  # Optional
            enterer_id=None  # Optional
        )
        
        self.assertIsNone(charge_item.account_id)
        self.assertIsNone(charge_item.performer_actor_id)
        self.assertIsNone(charge_item.enterer_id)


class ChargeItemDefinitionModelTest(TestCase):
    """
    Test ChargeItemDefinition model creation.
    """
    
    def test_create_chargeitem_definition(self):
        """Test that ChargeItemDefinition can be created."""
        definition = ChargeItemDefinition.objects.create(
            code='LAB-CBC',
            title='Complete Blood Count',
            version='1.0',
            date='2026-02-03',
            publisher='Hospital Lab Services'
        )
        
        self.assertEqual(definition.code, 'LAB-CBC')
        self.assertEqual(definition.title, 'Complete Blood Count')
        self.assertEqual(definition.version, '1.0')
        self.assertIsNotNone(definition.chargeitemdefinition_id)


# ==================== SERVICE LAYER TESTS ====================

class ResourceResolverTest(TestCase):
    """
    Test ResourceResolver service layer with graceful failure.
    These tests verify the "Unknown" fallback logic without requiring actual FK records.
    """
    
    def test_resolve_patient_not_found(self):
        """Test that resolve_patient returns Unknown dictionary when ID doesn't exist."""
        result = ResourceResolver.resolve_patient(999)
        
        self.assertEqual(result['full_name'], 'Unknown Patient')
        self.assertEqual(result['first_name'], 'Unknown')
        self.assertEqual(result['last_name'], 'Unknown')
        self.assertIsNone(result['patient_id'])
        self.assertIsNone(result['birthdate'])
        self.assertIsNone(result['gender'])
    
    def test_resolve_practitioner_not_found(self):
        """Test that resolve_practitioner returns Unknown dictionary when ID doesn't exist."""
        result = ResourceResolver.resolve_practitioner(999)
        
        self.assertEqual(result['full_name'], 'Unknown Practitioner')
        self.assertEqual(result['first_name'], 'Unknown')
        self.assertEqual(result['last_name'], 'Unknown')
        self.assertIsNone(result['identifier'])
    
    def test_resolve_encounter_not_found(self):
        """Test that resolve_encounter returns Unknown dictionary when ID doesn't exist."""
        result = ResourceResolver.resolve_encounter(999)
        
        self.assertEqual(result['identifier'], 'Unknown')
        self.assertEqual(result['status'], 'Unknown')
        self.assertIsNone(result['class'])
        self.assertIsNone(result['period_start'])
    
    def test_resolve_account_not_found(self):
        """Test that resolve_account returns Unknown dictionary when ID doesn't exist."""
        result = ResourceResolver.resolve_account(999)
        
        self.assertEqual(result['identifier'], 'Unknown')
        self.assertEqual(result['name'], 'Unknown Account')
        self.assertEqual(result['status'], 'Unknown')
    
    def test_resolve_organization_not_found(self):
        """Test that resolve_organization returns Unknown dictionary when ID doesn't exist."""
        result = ResourceResolver.resolve_organization(999)
        
        self.assertEqual(result['name'], 'Unknown Organization')
        self.assertIsNone(result['type_code'])
    
    def test_resolve_location_not_found(self):
        """Test that resolve_location returns Unknown dictionary when ID doesn't exist."""
        result = ResourceResolver.resolve_location(999)
        
        self.assertEqual(result['name'], 'Unknown Location')
        self.assertEqual(result['status'], 'Unknown')
    
    def test_resolve_patient_with_none(self):
        """Test that resolve_patient handles None gracefully."""
        result = ResourceResolver.resolve_patient(None)
        
        self.assertEqual(result['full_name'], 'Unknown Patient')


# ==================== SERIALIZER TESTS ====================

class ObservationSerializerTest(TestCase):
    """
    Test ObservationSerializer with mocked ResourceResolver.
    """
    
    @patch('monitoring.serializers.ResourceResolver.resolve_patient')
    @patch('monitoring.serializers.ResourceResolver.resolve_encounter')
    @patch('monitoring.serializers.ResourceResolver.resolve_practitioner')
    def test_observation_serializer_with_mocked_resolver(
        self, mock_resolve_practitioner, mock_resolve_encounter, mock_resolve_patient
    ):
        """Test that serializer calls ResourceResolver and includes resolved data."""
        # Mock return values
        mock_resolve_patient.return_value = {
            'full_name': 'Juan Dela Cruz',
            'first_name': 'Juan',
            'last_name': 'Dela Cruz',
            'patient_id': 'PAT-001',
            'birthdate': date(1990, 1, 1),
            'gender': 'male'
        }
        mock_resolve_encounter.return_value = {
            'identifier': 'ENC-001',
            'status': 'in-progress',
            'class': 'inpatient',
            'period_start': date(2026, 2, 1)
        }
        mock_resolve_practitioner.return_value = {
            'full_name': 'Dr. Maria Santos',
            'first_name': 'Maria',
            'last_name': 'Santos',
            'identifier': 'PRAC-001'
        }
        
        # Create observation
        observation = Observation.objects.create(
            subject_id=1,
            encounter_id=100,
            performer_id=50,
            code='85354-9',
            effective_datetime=datetime.now()
        )
        
        # Serialize
        serializer = ObservationSerializer(observation)
        data = serializer.data
        
        # Assert resolved fields are present
        self.assertEqual(data['subject']['full_name'], 'Juan Dela Cruz')
        self.assertEqual(data['encounter']['identifier'], 'ENC-001')
        self.assertEqual(data['performer']['full_name'], 'Dr. Maria Santos')
        
        # Assert writable FK fields are present
        self.assertEqual(data['subject_id'], 1)
        self.assertEqual(data['encounter_id'], 100)
        self.assertEqual(data['performer_id'], 50)


class ChargeItemSerializerTest(TestCase):
    """
    Test ChargeItemSerializer with mocked ResourceResolver.
    """
    
    @patch('monitoring.serializers.ResourceResolver.resolve_patient')
    @patch('monitoring.serializers.ResourceResolver.resolve_account')
    def test_chargeitem_serializer_with_mocked_resolver(
        self, mock_resolve_account, mock_resolve_patient
    ):
        """Test that serializer calls ResourceResolver and includes resolved data."""
        # Mock return values
        mock_resolve_patient.return_value = {
            'full_name': 'Juan Dela Cruz',
            'first_name': 'Juan',
            'last_name': 'Dela Cruz',
            'patient_id': 'PAT-001',
            'birthdate': date(1990, 1, 1),
            'gender': 'male'
        }
        mock_resolve_account.return_value = {
            'identifier': 'ACC-001',
            'name': 'Outpatient Account',
            'status': 'active'
        }
        
        # Create charge item
        charge_item = ChargeItem.objects.create(
            subject_id=1,
            account_id=200,
            code='99213',
            entered_date=datetime.now()
        )
        
        # Serialize
        serializer = ChargeItemSerializer(charge_item)
        data = serializer.data
        
        # Assert resolved fields are present
        self.assertEqual(data['subject']['full_name'], 'Juan Dela Cruz')
        self.assertEqual(data['account']['identifier'], 'ACC-001')
        
        # Assert writable FK fields are present
        self.assertEqual(data['subject_id'], 1)
        self.assertEqual(data['account_id'], 200)


# ==================== API VIEW TESTS ====================

class ObservationAPITest(APITestCase):
    """
    Test Observation API endpoints (ViewSet).
    """
    
    def setUp(self):
        """Create test data."""
        self.observation1 = Observation.objects.create(
            subject_id=1,
            encounter_id=100,
            performer_id=50,
            code='85354-9',
            category='vital-signs',
            effective_datetime=datetime(2026, 2, 1, 10, 0, 0),
            value_quantity=Decimal('120.00')
        )
        self.observation2 = Observation.objects.create(
            subject_id=2,
            encounter_id=101,
            performer_id=51,
            code='29463-7',
            category='vital-signs',
            effective_datetime=datetime(2026, 2, 2, 10, 0, 0),
            value_quantity=Decimal('70.00')
        )
    
    @patch('monitoring.serializers.ResourceResolver.resolve_patient')
    @patch('monitoring.serializers.ResourceResolver.resolve_encounter')
    @patch('monitoring.serializers.ResourceResolver.resolve_practitioner')
    def test_observation_list_with_mocked_resolver(
        self, mock_resolve_practitioner, mock_resolve_encounter, mock_resolve_patient
    ):
        """Test GET /observations/ with mocked resolver."""
        # Mock return values
        mock_resolve_patient.return_value = {
            'full_name': 'Juan Dela Cruz',
            'first_name': 'Juan',
            'last_name': 'Dela Cruz',
            'patient_id': 'PAT-001',
            'birthdate': date(1990, 1, 1),
            'gender': 'male'
        }
        mock_resolve_encounter.return_value = {
            'identifier': 'ENC-001',
            'status': 'in-progress',
            'class': 'inpatient',
            'period_start': date(2026, 2, 1)
        }
        mock_resolve_practitioner.return_value = {
            'full_name': 'Dr. Maria Santos',
            'first_name': 'Maria',
            'last_name': 'Santos',
            'identifier': 'PRAC-001'
        }
        
        response = self.client.get('/monitoring/observations/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        
        # Verify resolved data appears in response
        first_result = response.data['results'][0]
        self.assertEqual(first_result['subject']['full_name'], 'Juan Dela Cruz')
    
    def test_observation_filter_by_subject_id(self):
        """Test filtering by subject_id (Integer FK field)."""
        response = self.client.get('/monitoring/observations/', {'subject_id': 1})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['subject_id'], 1)
    
    def test_observation_filter_by_encounter_id(self):
        """Test filtering by encounter_id (Integer FK field)."""
        response = self.client.get('/monitoring/observations/', {'encounter_id': 100})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['encounter_id'], 100)
    
    def test_observation_filter_by_code(self):
        """Test filtering by code."""
        response = self.client.get('/monitoring/observations/', {'code': '85354-9'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['code'], '85354-9')
    
    def test_observation_create_with_raw_ids(self):
        """Test POST /observations/ with raw integer IDs."""
        data = {
            'subject_id': 3,
            'encounter_id': 102,
            'performer_id': 52,
            'code': '8867-4',  # Heart rate
            'category': 'vital-signs',
            'effective_datetime': '2026-02-03T10:00:00Z',
            'value_quantity': '72.00'
        }
        
        response = self.client.post('/monitoring/observations/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['subject_id'], 3)
        self.assertEqual(response.data['encounter_id'], 102)
        self.assertEqual(response.data['code'], '8867-4')
        
        # Verify record exists in database
        self.assertTrue(Observation.objects.filter(subject_id=3, code='8867-4').exists())
    
    def test_observation_ordering_default(self):
        """Test default ordering (most recent first)."""
        response = self.client.get('/monitoring/observations/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should be ordered by -effective_datetime (most recent first)
        self.assertEqual(results[0]['observation_id'], self.observation2.observation_id)
        self.assertEqual(results[1]['observation_id'], self.observation1.observation_id)


class ChargeItemAPITest(APITestCase):
    """
    Test ChargeItem API endpoints (ViewSet).
    """
    
    def setUp(self):
        """Create test data."""
        self.chargeitem1 = ChargeItem.objects.create(
            subject_id=1,
            account_id=200,
            code='99213',
            entered_date=datetime(2026, 2, 1, 10, 0, 0),
            quantity_value=Decimal('1.00')
        )
        self.chargeitem2 = ChargeItem.objects.create(
            subject_id=2,
            account_id=201,
            code='36415',
            entered_date=datetime(2026, 2, 2, 10, 0, 0),
            quantity_value=Decimal('1.00')
        )
    
    def test_chargeitem_list(self):
        """Test GET /charge-items/."""
        response = self.client.get('/monitoring/charge-items/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
    
    def test_chargeitem_filter_by_subject_id(self):
        """Test filtering by subject_id (Integer FK field)."""
        response = self.client.get('/monitoring/charge-items/', {'subject_id': 1})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['subject_id'], 1)
    
    def test_chargeitem_filter_by_account_id(self):
        """Test filtering by account_id (Integer FK field)."""
        response = self.client.get('/monitoring/charge-items/', {'account_id': 200})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['account_id'], 200)
    
    def test_chargeitem_create_with_raw_ids(self):
        """Test POST /charge-items/ with raw integer IDs."""
        data = {
            'subject_id': 3,
            'account_id': 202,
            'code': '80053',  # Comprehensive metabolic panel
            'entered_date': '2026-02-03T10:00:00Z',
            'quantity_value': '1.00',
            'price_override_value': '250.00'
        }
        
        response = self.client.post('/monitoring/charge-items/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['subject_id'], 3)
        self.assertEqual(response.data['account_id'], 202)
        self.assertEqual(response.data['code'], '80053')
        
        # Verify record exists in database
        self.assertTrue(ChargeItem.objects.filter(subject_id=3, code='80053').exists())
    
    def test_chargeitem_ordering_default(self):
        """Test default ordering (most recent first)."""
        response = self.client.get('/monitoring/charge-items/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        
        # Should be ordered by -entered_date (most recent first)
        self.assertEqual(results[0]['chargeitem_id'], self.chargeitem2.chargeitem_id)
        self.assertEqual(results[1]['chargeitem_id'], self.chargeitem1.chargeitem_id)


class ChargeItemDefinitionAPITest(APITestCase):
    """
    Test ChargeItemDefinition API endpoints (ViewSet).
    """
    
    def setUp(self):
        """Create test data."""
        self.definition1 = ChargeItemDefinition.objects.create(
            code='LAB-CBC',
            title='Complete Blood Count',
            version='1.0',
            date='2026-02-01'
        )
        self.definition2 = ChargeItemDefinition.objects.create(
            code='LAB-CMP',
            title='Comprehensive Metabolic Panel',
            version='1.0',
            date='2026-02-02'
        )
    
    def test_chargeitemdefinition_list(self):
        """Test GET /charge-item-definitions/."""
        response = self.client.get('/monitoring/charge-item-definitions/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
    
    def test_chargeitemdefinition_filter_by_code(self):
        """Test filtering by code."""
        response = self.client.get('/monitoring/charge-item-definitions/', {'code': 'LAB-CBC'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['code'], 'LAB-CBC')
    
    def test_chargeitemdefinition_create(self):
        """Test POST /charge-item-definitions/."""
        data = {
            'code': 'LAB-LIPID',
            'title': 'Lipid Panel',
            'version': '1.0',
            'date': '2026-02-03'
        }
        
        response = self.client.post('/monitoring/charge-item-definitions/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'LAB-LIPID')
        self.assertEqual(response.data['title'], 'Lipid Panel')
        
        # Verify record exists in database
        self.assertTrue(ChargeItemDefinition.objects.filter(code='LAB-LIPID').exists())
