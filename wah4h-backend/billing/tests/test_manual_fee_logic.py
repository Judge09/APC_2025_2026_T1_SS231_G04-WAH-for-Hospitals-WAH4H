import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wah4h.settings')
django.setup()

from billing.models import Invoice, Account
from django.utils import timezone
from decimal import Decimal
from django.test import Client
import json

def test_manual_fee():
    print("Starting manual fee backend test...")
    
    # 1. Create a stub patient/account if needed, but we can just use an existing one or create a dummy
    # For a unit-like test in a script, let's create a draft invoice
    account = Account.objects.create(
        identifier="ACC-TEST-FEE",
        name="Test Patient",
        status="active",
        type="individual",
        subject_id=9999
    )
    
    invoice = Invoice.objects.create(
        identifier="INV-FEE-TEST",
        status="draft",
        subject_id=9999,
        invoice_datetime=timezone.now(),
        total_net_value=0,
        total_gross_value=0
    )
    
    print(f"Created Invoice {invoice.identifier} with total 0")
    
    # 2. Add manual item via ViewSet action (simulating API call)
    from billing.views import InvoiceViewSet
    from rest_framework.test import APIRequestFactory
    
    factory = APIRequestFactory()
    view = InvoiceViewSet.as_view({'post': 'add_item'})
    
    # Add PF
    request = factory.post(f'/api/billing/invoices/{invoice.invoice_id}/add_item/', {
        'description': 'Consultation Fee',
        'amount': 500,
        'category': 'pf'
    }, format='json')
    
    response = view(request, pk=invoice.invoice_id)
    print(f"Add PF Response Status: {response.status_code}")
    
    # Refresh invoice
    invoice.refresh_from_db()
    print(f"Invoice Total after PF: {invoice.total_net_value}")
    
    # Add Room
    request = factory.post(f'/api/billing/invoices/{invoice.invoice_id}/add_item/', {
        'description': 'Ward Room (1 Day)',
        'amount': 1500,
        'category': 'room'
    }, format='json')
    
    response = view(request, pk=invoice.invoice_id)
    print(f"Add Room Response Status: {response.status_code}")
    
    invoice.refresh_from_db()
    print(f"Invoice Total after Room: {invoice.total_net_value}")
    
    # Final check
    if invoice.total_net_value == Decimal('2000.00'):
        print("SUCCESS: Manual fee backend logic is correct.")
    else:
        print(f"FAILURE: Expected 2000.00, got {invoice.total_net_value}")

if __name__ == "__main__":
    test_manual_fee()
