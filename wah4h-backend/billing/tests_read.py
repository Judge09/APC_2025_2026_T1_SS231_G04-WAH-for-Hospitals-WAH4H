from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from billing.models import Invoice, InvoiceLineItem
from laboratory.models import DiagnosticReport, LabTestDefinition
from pharmacy.models import MedicationRequest, Inventory

class PatientBillingSummaryTest(APITestCase):
    def setUp(self):
        # Setup Master Data
        self.lab_cbc = LabTestDefinition.objects.create(
            identifier="DEF-CBC", 
            code="CBC_READ", 
            base_price=500.00, 
            name="CBC"
        )
        self.lab_xray = LabTestDefinition.objects.create(
            identifier="DEF-XRAY", 
            code="XRAY_READ", 
            base_price=1500.00, 
            name="X-Ray"
        )
        self.med_amox = Inventory.objects.create(
            item_code="AMOX_READ", 
            unit_cost=10.00, 
            item_name="Amox",
            status="active"
        )
        
        self.subject_id = 88888

    def test_summary_mixed_billed_and_unbilled(self):
        """
        Test a scenario with:
        - 1 Finalized Invoice (Billed)
        - 1 Pending Lab Request (Unbilled)
        - 1 Pending Med Request (Unbilled)
        """
        # 1. Create Billed Invoice
        invoice = Invoice.objects.create(
            subject_id=self.subject_id,
            status='issued',
            total_net_value=1000.00, # Arbitrary billed amount
            total_gross_value=1000.00
        )
        
        # 2. Create Unbilled Items
        DiagnosticReport.objects.create(
            subject_id=self.subject_id, 
            encounter_id=1,
            code_code="CBC_READ", 
            status="final", 
            billing_reference=None # Unbilled
        )
        
        MedicationRequest.objects.create(
            subject_id=self.subject_id, 
            encounter_id=1,
            medication_code="AMOX_READ", 
            dispense_quantity=10, # 10 * 10 = 100
            status="active", 
            billing_reference=None # Unbilled
        )
        
        # 3. Call Summary Endpoint
        url = reverse('invoice-patient-summary')
        response = self.client.get(url, {'subject_id': self.subject_id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        # 4. Verify Totals
        self.assertEqual(float(data['billed_total']), 1000.00)
        self.assertEqual(float(data['unbilled_lab_total']), 500.00)     # CBC Base Price
        self.assertEqual(float(data['unbilled_pharmacy_total']), 100.00) # 10 * 10
        self.assertEqual(float(data['unbilled_total']), 600.00)          # 500 + 100
        self.assertEqual(float(data['grand_total']), 1600.00)            # 1000 + 600

    def test_summary_no_records(self):
        """
        Test summary for a patient with no records
        """
        url = reverse('invoice-patient-summary')
        response = self.client.get(url, {'subject_id': 99999})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        
        self.assertEqual(float(data['billed_total']), 0.00)
        self.assertEqual(float(data['unbilled_total']), 0.00)
        self.assertEqual(float(data['grand_total']), 0.00)
