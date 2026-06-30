from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from billing.models import Invoice, InvoiceLineItem, InvoiceLineItemPriceComponent
from billing.serializers import InvoiceSerializer
from laboratory.models import DiagnosticReport, LabTestDefinition
from pharmacy.models import MedicationRequest, Inventory

class InvoiceWorkflowTest(APITestCase):
    def setUp(self):
        self.invoice_data = {
            "identifier": "INV-1001",
            "subject_id": 12345,
            "status": "draft",
            "type": "clinical",
            "line_items": [
                {
                    "productOrService": "CBC",
                    "quantity": 1,
                    "unit_price": 500.00,
                    "net": "500.00",
                    "price_components": [
                        {
                            "type": "base",
                            "code": "CBC",
                            "amount_value": 500.00,
                            "amount_currency": "PHP"
                        }
                    ]
                },
                {
                    "productOrService": "Urinalysis",
                    "quantity": 2,
                    "unit_price": 150.00,
                    "net": "300.00",
                    "price_components": [
                        {
                            "type": "base",
                            "code": "URINE",
                            "amount_value": 150.00,
                            "amount_currency": "PHP"
                        }
                    ]
                }
            ]
        }

    def test_create_invoice_with_line_items_totals(self):
        """
        Test that creating an invoice via serializer:
        1. Creates nested items
        2. Auto-calculates totals
        """
        serializer = InvoiceSerializer(data=self.invoice_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        invoice = serializer.save()
        
        # Verify Invoice Created
        self.assertEqual(Invoice.objects.count(), 1)
        self.assertEqual(invoice.subject_id, 12345)
        
        # Verify Line Items
        self.assertEqual(invoice.line_items.count(), 2)
        
        # Verify Totals (500*1 + 150*2 = 800)
        self.assertEqual(invoice.total_net_value, 800.00)
        self.assertEqual(invoice.total_gross_value, 800.00)
        
        # Verify Line Item Totals (Deep Check)
        item_cbc = invoice.line_items.filter(unit_price=500).first()
        self.assertEqual(item_cbc.net_value, 500.00)

    def test_update_invoice_recalculate(self):
        """
        Test updating an invoice (adding an item) and verifying recalculation
        """
        # Create initial invoice
        serializer = InvoiceSerializer(data=self.invoice_data)
        serializer.is_valid()
        invoice = serializer.save()
        self.assertEqual(invoice.total_net_value, 800.00)
        
        # Update with new items (Replacing existing for this test as per update logic)
        new_data = {
            "line_items": [
                {
                    "productOrService": "Consultation",
                    "quantity": 1,
                    "unit_price": 1000.00,
                    "net": "1000.00"
                }
            ]
        }
        
        serializer = InvoiceSerializer(invoice, data=new_data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        invoice = serializer.save()
        
        # Verify Totals (should be 1000 now)
        self.assertEqual(invoice.total_net_value, 1000.00)

    def test_recalculate_action(self):
        """
        Test the custom recalculate action in ViewSet
        """
        # Create invoice via ORM (bypass serializer calculation)
        invoice = Invoice.objects.create(identifier="INV-TEST-RECALC", subject_id=999, status='draft')
        InvoiceLineItem.objects.create(
            invoice=invoice, 
            quantity=10, 
            unit_price=10.00
        )
        # initial total should be None or 0 depending on default, but definitely not calculated yet if we didn't call it
        
        url = reverse('invoice-recalculate', kwargs={'pk': invoice.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['total_net_value']), 100.00)

    def test_generate_action(self):
        """
        Test the generate action (integration via API)
        """
        # Setup Data
        LabTestDefinition.objects.create(
            identifier="DEF-CBC-API",
            code="CBC_API", 
            base_price=500.00, 
            name="CBC"
        )
        Inventory.objects.create(item_code="AMOX_API", unit_cost=10.00, item_name="Amox")
        
        DiagnosticReport.objects.create(
            identifier="REP-API-001",
            subject_id=999, encounter_id=1, code_code="CBC_API", status="final", billing_reference=None
        )
        MedicationRequest.objects.create(
            identifier="REQ-API-001",
            subject_id=999, encounter_id=1, medication_code="AMOX_API", dispense_quantity=5, status="active", billing_reference=None
        )
        
        url = reverse('invoice-generate')
        response = self.client.post(url, {'subject_id': 999})
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(response.data['total_net_value']), 550.00) # 500 + 5*10

    def test_create_manual_action(self):
        """
        Test creating a manual invoice (PF Only workflow)
        """
        url = reverse('invoice-create-manual')
        response = self.client.post(url, {'subject_id': 888})
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(response.data['total_net_value']), 0.00)
        self.assertEqual(response.data['status'], 'draft')
