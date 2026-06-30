import os
import django
import sys
from decimal import Decimal

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wah4h.settings')
django.setup()

from billing.models import Account, Invoice, InvoiceLineItem, InvoiceLineItemPriceComponent, PaymentReconciliation
from django.utils import timezone
import uuid

def audit_persistence():
    print("=== STARTING DEEP PERSISTENCE AUDIT ===")
    
    # 1. Test Account Persistence
    acc_id = f"ACC-AUDIT-{uuid.uuid4().hex[:6]}"
    account = Account.objects.create(
        identifier=acc_id,
        status="active",
        type="individual",
        name="Persistence Audit Patient",
        subject_id=8888,
        description="Audit test account"
    )
    
    # Verify Account
    ref_acc = Account.objects.get(identifier=acc_id)
    assert ref_acc.name == "Persistence Audit Patient"
    assert ref_acc.subject_id == 8888
    assert ref_acc.created_at is not None
    print(f"PASS: Account {acc_id} persisted correctly.")
    
    # 2. Test Invoice and Bulk Line Items Persistence
    inv_id = f"INV-AUDIT-{uuid.uuid4().hex[:6]}"
    invoice = Invoice.objects.create(
        identifier=inv_id,
        status="draft",
        subject_id=8888,
        invoice_datetime=timezone.now(),
        total_net_value=Decimal('0.00'),
        total_gross_value=Decimal('0.00')
    )
    
    # Simulate Bulk Creation of Line Items
    items_data = [
        {'description': 'Item 1', 'unit_price': 100, 'quantity': 1, 'sequence': '1'},
        {'description': 'Item 2', 'unit_price': 250, 'quantity': 2, 'sequence': '2'},
    ]
    
    line_items = []
    for data in items_data:
        li = InvoiceLineItem(
            invoice=invoice,
            description=data['description'],
            unit_price=Decimal(data['unit_price']),
            quantity=data['quantity'],
            sequence=data['sequence'],
            net_value=Decimal(data['unit_price'] * data['quantity']),
            gross_value=Decimal(data['unit_price'] * data['quantity'])
        )
        line_items.append(li)
    
    InvoiceLineItem.objects.bulk_create(line_items)
    invoice.calculate_totals()
    
    # Simulate Price Components (Nested)
    new_li = invoice.line_items.first()
    InvoiceLineItemPriceComponent.objects.create(
        line_item=new_li,
        type='tax',
        amount_value=Decimal('12.00'),
        amount_currency='PHP'
    )
    
    # Verify Invoice Totals (Stored in DB)
    ref_inv = Invoice.objects.get(identifier=inv_id)
    assert ref_inv.total_net_value == Decimal('600.00') # 100*1 + 250*2
    assert ref_inv.line_items.count() == 2
    assert ref_inv.line_items.get(description='Item 1').price_components.count() == 1
    print(f"PASS: Invoice {inv_id}, Bulk LineItems, and nested PriceComponents persisted correctly.")
    
    # 3. Test Manual Item via API Logic
    # (Using the method logic directly)
    InvoiceLineItem.objects.create(
        invoice=invoice,
        sequence='3',
        description='[PF] Manual Consultation',
        quantity=1,
        unit_price=Decimal('500.00'),
        net_value=Decimal('500.00'),
        gross_value=Decimal('500.00')
    )
    invoice.calculate_totals()
    
    ref_inv.refresh_from_db()
    assert ref_inv.total_net_value == Decimal('1100.00')
    last_item = ref_inv.line_items.get(sequence='3')
    assert last_item.description == '[PF] Manual Consultation'
    print("PASS: Manual LineItem persisted and Total recalculated correctly.")
    
    # 4. Test Payment Reconciliation Persistence (Direct Link)
    pay_id = f"PAY-AUDIT-{uuid.uuid4().hex[:6]}"
    payment = PaymentReconciliation.objects.create(
        identifier=pay_id,
        status="active",
        invoice=invoice,
        payment_amount_value=Decimal('1100.00'),
        payment_amount_currency='PHP',
        payment_identifier='REF-AUDIT-123',
        disposition='Audit Payment',
        created_datetime=timezone.now()
    )
    
    # Verify Direct Link
    ref_pay = PaymentReconciliation.objects.get(identifier=pay_id)
    assert ref_pay.invoice.identifier == inv_id
    assert ref_pay.invoice_id == invoice.invoice_id
    print(f"PASS: Payment {pay_id} persisted with Direct Invoice Link.")
    
    # 5. Check if any unexpected NULLs remain in core fields
    # We check if 'identifier' and 'status' (required by FHIRResourceModel) are set
    for obj in [ref_acc, ref_inv, ref_pay]:
        if not obj.identifier or not obj.status:
            raise AssertionError(f"Object {obj} has missing indentifier or status!")
    
    print("=== PERSISTENCE AUDIT COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    try:
        audit_persistence()
    except Exception as e:
        print(f"AUDIT FAILED: {e}")
        sys.exit(1)
