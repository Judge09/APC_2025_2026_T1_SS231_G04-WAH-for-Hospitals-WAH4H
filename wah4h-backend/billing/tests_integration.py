from django.test import TestCase
from django.utils import timezone
from billing.models import Invoice, InvoiceLineItem
from laboratory.models import DiagnosticReport, LabTestDefinition
from pharmacy.models import MedicationRequest, Inventory
from billing.serializers import InvoiceSerializer

class InvoiceIntegrationTest(TestCase):
    def setUp(self):
        # Setup Master Data
        self.lab_test = LabTestDefinition.objects.create(
            identifier="DEF-CBC",
            code="CBC", 
            name="Complete Blood Count", 
            base_price=500.00,
            category="Hematology"
        )
        self.med_item = Inventory.objects.create(
            item_code="AMOX500", 
            item_name="Amoxicillin 500mg", 
            unit_cost=10.00,
            status="active"
        )
        
        # Setup Patient Data
        self.subject_id = 99999

    def test_generate_invoice_from_orders(self):
        """
        Test generating an invoice that aggregates:
        1. A pending DiagnosticReport
        2. A pending MedicationRequest
        """
        # 1. Create Pending Orders
        lab_report = DiagnosticReport.objects.create(
            subject_id=self.subject_id,
            encounter_id=1,
            code_code="CBC",
            status="final",
            billing_reference=None # Unbilled
        )
        
        med_request = MedicationRequest.objects.create(
            subject_id=self.subject_id,
            encounter_id=1,
            medication_code="AMOX500",
            dispense_quantity=10, # 10 * 10.00 = 100.00
            status="active",
            billing_reference=None # Unbilled
        )
        
        # 2. Run Generation
        invoice = Invoice.objects.generate_from_pending_orders(self.subject_id)
        
        # 3. Verify Invoice Header
        self.assertIsNotNone(invoice)
        self.assertEqual(invoice.subject_id, self.subject_id)
        self.assertEqual(invoice.status, 'draft')
        
        # 4. Verify Totals
        # Lab (500) + Meds (100) = 600
        self.assertEqual(invoice.total_net_value, 600.00)
        
        # 5. Verify Line Items
        self.assertEqual(invoice.line_items.count(), 2)
        
        lab_line = invoice.line_items.filter(sequence='LAB').first()
        self.assertEqual(lab_line.unit_price, 500.00)
        self.assertEqual(lab_line.chargeitem_reference_id, lab_report.pk)
        
        pharm_line = invoice.line_items.filter(sequence='PHARMACY').first()
        self.assertEqual(pharm_line.unit_price, 10.00)
        self.assertEqual(pharm_line.quantity, 10)
        self.assertEqual(pharm_line.net_value, 100.00)
        
        # 6. Verify Back-links (Billing Reference updated)
        lab_report.refresh_from_db()
        med_request.refresh_from_db()
        
        self.assertEqual(lab_report.billing_reference, str(invoice.identifier))
        self.assertEqual(med_request.billing_reference, str(invoice.identifier))

    def test_generate_no_pending_items(self):
        """
        Test that no invoice is created if there are no pending items
        """
        invoice = Invoice.objects.generate_from_pending_orders(self.subject_id)
        self.assertIsNone(invoice)
    
    def test_already_billed_items_ignored(self):
        """
        Test that items with existing billing_reference are ignored
        """
        DiagnosticReport.objects.create(
            subject_id=self.subject_id,
            encounter_id=1,
            code_code="CBC",
            status="final",
            billing_reference="INV-EXISTING" # Already billed
        )
        
        invoice = Invoice.objects.generate_from_pending_orders(self.subject_id)
        self.assertIsNone(invoice)
