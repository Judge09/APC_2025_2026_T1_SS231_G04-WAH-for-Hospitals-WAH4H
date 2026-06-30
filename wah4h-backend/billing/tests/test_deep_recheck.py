from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from billing.models import Invoice
from laboratory.models import DiagnosticReport, LabTestDefinition
from pharmacy.models import MedicationRequest, Inventory
from decimal import Decimal

class DeepBillingRecheckTest(APITestCase):
    def setUp(self):
        # 1. Setup Reference Data
        # Create without IDs to let AutoField handle it, but identifier must be unique
        self.lab_def = LabTestDefinition.objects.create(
            identifier="DEF-CBC-RECHECK",
            code="CBC_RECHECK", 
            base_price=Decimal("500.00"), 
            name="CBC Recheck"
        )
        self.med_item = Inventory.objects.create(
            item_code="AMOX_RECHECK", 
            unit_cost=Decimal("10.00"), 
            item_name="Amox Recheck"
        )
        self.subject_id = 88888

    def test_full_billing_lifecycle(self):
        """
        Simulates:
        1. Order Creation (Lab & Pharmacy)
        2. Invoice Generation
        3. Invoice Verification
        4. Payment Recording
        5. Balance Verification
        """
        
        # 1. Create Orders
        LabTestDefinition.objects.get_or_create(
            identifier="DEF-CBC-RECHECK",
            defaults={
                "code": "CBC_RECHECK", 
                "base_price": Decimal("500.00"), 
                "name": "CBC Recheck"
            }
        )
        # Ensure we have clean slate for this subject
        DiagnosticReport.objects.filter(subject_id=self.subject_id).delete()
        MedicationRequest.objects.filter(subject_id=self.subject_id).delete()
        
        rpt = DiagnosticReport.objects.create(
            subject_id=self.subject_id, 
            encounter_id=1, 
            code_code="CBC_RECHECK", 
            status="final", 
            billing_reference=None
        )
        med = MedicationRequest.objects.create(
            subject_id=self.subject_id, 
            encounter_id=1, 
            medication_code="AMOX_RECHECK", 
            dispense_quantity=5, 
            status="active", 
            billing_reference=None
        )

        # 2. Generate Invoice
        url_generate = reverse('invoice-generate')
        response = self.client.post(url_generate, {'subject_id': self.subject_id})
        
        if response.status_code != status.HTTP_201_CREATED:
            print(f"Generate Error: {response.data}")
            
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        invoice_id = response.data['invoice_id']
        invoice = Invoice.objects.get(pk=invoice_id)
        
        # 3. Verify Invoice Content
        # Total = 500 (Lab) + 5*10 (Meds) = 550
        print(f"Invoice Total Net: {invoice.total_net_value}")
        self.assertEqual(invoice.total_net_value, Decimal("550.00"))
        # Depending on logic, status might be 'draft' or 'issued' initially. Assuming logic sets to draft/issued.
        # Let's check what it is.
        print(f"Invoice Status: {invoice.status}")
        
        # Verify Line Items
        self.assertEqual(invoice.line_items.count(), 2)
        
        # Verify Source Documents Updated matches identifier
        rpt.refresh_from_db()
        med.refresh_from_db()
        self.assertEqual(rpt.billing_reference, invoice.identifier)
        self.assertEqual(med.billing_reference, invoice.identifier)

        # 4. Record Payment (Partial)
        # Assuming URL pattern is /api/billing/invoices/{pk}/record_payment/
        url_pay = reverse('invoice-record-payment', kwargs={'pk': invoice_id})
        
        # Payment 1: 250
        payment_data_partial = {
            "amount": 250.00,
            "method": "cash",
            "reference": "OR-001"
        }
        res_partial = self.client.post(url_pay, payment_data_partial)
        self.assertEqual(res_partial.status_code, status.HTTP_200_OK)
        
        # Verify status is NOT balanced yet
        invoice.refresh_from_db()
        self.assertNotEqual(invoice.status, 'balanced')

        # 5. Record Payment (Remaining)
        # Remaining is 300
        payment_data_full = {
            "amount": 300.00, 
            "method": "cash",
            "reference": "OR-002"
        }
        res_full = self.client.post(url_pay, payment_data_full)
        self.assertEqual(res_full.status_code, status.HTTP_200_OK)

        # 6. Verify Final Status
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, 'balanced')
