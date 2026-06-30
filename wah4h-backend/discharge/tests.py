from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from admission.models import Encounter
from patients.models import Patient
from accounts.models import Practitioner
from .models import Discharge
from .serializers import DischargeSerializer

class DischargeWorkflowTests(APITestCase):
    """
    Test suite for Discharge Module MVP functionality.
    """

    def setUp(self):
        # Create Patient
        self.patient = Patient.objects.create(
            patient_id='P-DIS-001',
            first_name='Test',
            last_name='Patient'
        )

        # Create Practitioner
        self.practitioner = Practitioner.objects.create(
            identifier='DOC-DIS-001',
            first_name='Test',
            last_name='Doctor'
        )

    def test_auto_discharge_creation_on_admission(self):
        """
        Verify that creating an inpatient encounter auto-creates a discharge record.
        """
        encounter = Encounter.objects.create(
            identifier='ENC-DIS-001',
            subject_id=self.patient.id,
            class_field='IMP',
            type='inpatient',
            status='in-progress'
        )

        # Check if discharge record was created
        discharge_exists = Discharge.objects.filter(encounter_id=encounter.encounter_id).exists()
        self.assertTrue(discharge_exists)
        
        discharge = Discharge.objects.get(encounter_id=encounter.encounter_id)
        self.assertEqual(discharge.workflow_status, 'pending')
        self.assertEqual(discharge.patient_id, self.patient.id)

    def test_process_discharge_updates_encounter(self):
        """
        Verify that processing a discharge updates the associated encounter status.
        """
        # 1. Create Encounter (triggers auto-discharge)
        encounter = Encounter.objects.create(
            identifier='ENC-DIS-002',
            subject_id=self.patient.id,
            class_field='IMP'
        )
        
        discharge = Discharge.objects.get(encounter_id=encounter.encounter_id)
        
        # 2. Call process_discharge action
        url = reverse('discharge-process-discharge', kwargs={'pk': discharge.discharge_id})
        response = self.client.post(url, {'discharge_datetime': '2026-02-17T20:40:00Z'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Verify Discharge status
        discharge.refresh_from_db()
        self.assertEqual(discharge.workflow_status, 'discharged')
        
        # 4. Verify Encounter status
        encounter.refresh_from_db()
        self.assertEqual(encounter.status, 'finished')

    def test_serializer_enrichment(self):
        """
        Verify that the serializer correctly enriches data with names.
        """
        encounter = Encounter.objects.create(
            identifier='ENC-DIS-003',
            subject_id=self.patient.id,
            class_field='IMP'
        )
        
        discharge = Discharge.objects.get(encounter_id=encounter.encounter_id)
        discharge.physician_id = self.practitioner.practitioner_id
        discharge.save()
        
        # Attach pre-fetched objects as expected by the optimized serializer
        discharge.patient_obj = self.patient
        discharge.encounter_obj = encounter
        discharge.encounter_obj.practitioner_obj = self.practitioner
        
        serializer = DischargeSerializer(discharge)
        data = serializer.data
        
        self.assertEqual(data['patientName'], "Test Patient")
        self.assertEqual(data['physician'], "Dr. Test Doctor")
        self.assertEqual(data['id'], discharge.discharge_id)
