from rest_framework import viewsets, status
from .models import Account, Claim, Invoice, PaymentReconciliation, PaymentNotice, InvoiceLineItem
from django.db.models import Sum, Q, F
from decimal import Decimal, InvalidOperation
from django.db import transaction
from .serializers import (
    AccountSerializer, 
    ClaimSerializer, 
    InvoiceSerializer, 
    PaymentReconciliationSerializer, 
    PaymentNoticeSerializer
)

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer

class ClaimViewSet(viewsets.ModelViewSet):
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer

from rest_framework.decorators import action
from rest_framework.response import Response

from django.utils import timezone
import uuid

class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        queryset = Invoice.objects.all().prefetch_related(
            'line_items',
            'line_items__price_components'
        )
        subject_id = self.request.query_params.get('subject_id')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        return queryset

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        invoice = self.get_object()
        invoice.calculate_totals()
        return Response(self.get_serializer(invoice).data)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        subject_id = request.data.get('subject_id')
        if not subject_id:
            return Response({"error": "subject_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Capture user if available (linked practitioner)
        user = request.user
        actor_id = None
        if user.is_authenticated and hasattr(user, 'practitioner'):
            actor_id = user.practitioner.practitioner_id
            
        invoice = Invoice.objects.generate_from_pending_orders(subject_id)
        
        if invoice:
            # Update with actor_id if available
            if actor_id:
                invoice.participant_actor_id = actor_id
                invoice.save(update_fields=['participant_actor_id'])
                
            return Response(self.get_serializer(invoice).data, status=status.HTTP_201_CREATED)
        else:
            return Response({"message": "No pending items to bill"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def create_manual(self, request):
        """
        Force create an empty invoice for manual billing (e.g. PF Only).
        """
        subject_id = request.data.get('subject_id')
        if not subject_id:
            return Response({"error": "subject_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        invoice = Invoice.objects.create_empty_invoice(subject_id)
        
        # Capture user if available
        user = request.user
        if user.is_authenticated and hasattr(user, 'practitioner'):
            invoice.participant_actor_id = user.practitioner.practitioner_id
            invoice.save(update_fields=['participant_actor_id'])
            
        return Response(self.get_serializer(invoice).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def patient_summary(self, request):
        subject_id = request.query_params.get('subject_id')
        if not subject_id:
            return Response({"error": "subject_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 1. Calculate Total Billed (Finalized/Draft Invoices)
        # Assuming we want all invoices regardless of status for now, or filter by 'issued'/'draft'
        billed_agg = Invoice.objects.filter(subject_id=subject_id).exclude(status='cancelled').aggregate(
            total=Sum('total_net_value')
        )
        billed_total = billed_agg['total'] or 0
        
        # 2. Calculate Unbilled (Pending Lab + Pharmacy)
        unbilled_totals = Invoice.objects.get_pending_totals(subject_id)
        
        return Response({
            "subject_id": subject_id,
            "billed_total": billed_total,
            "unbilled_lab_total": unbilled_totals['lab_total'],
            "unbilled_pharmacy_total": unbilled_totals['pharmacy_total'],
            "unbilled_total": unbilled_totals['grand_total'],
            "grand_total": billed_total + unbilled_totals['grand_total']
        })

    @action(detail=False, methods=['get'])
    def dashboard_summary(self, request):
        """
        Aggregates data for the Billing Clerk Dashboard.
        1. Revenue Today (Total Gross of Invoices issued today)
        2. Pending Claims Count
        3. Outstanding Balance (Total Net of 'issued' invoices)
        4. Insured Patients % (Patients with Claims / Patients with Invoices)
        5. Weekly Revenue (Last 7 days)
        """
        today = timezone.now().date()
        
        # 1. Revenue Today
        revenue_today_agg = Invoice.objects.filter(
            invoice_datetime__date=today
        ).aggregate(total=Sum('total_gross_value'))
        revenue_today = revenue_today_agg['total'] or 0

        # 2. Pending Claims
        pending_claims_count = Claim.objects.filter(
            status__in=['pending', 'review']
        ).count()

        # 3. Outstanding Balance (Issued but not balanced)
        # Assuming 'issued' status implies outstanding. 'balanced' implies paid.
        outstanding_agg = Invoice.objects.filter(
            status='issued'
        ).aggregate(total=Sum('total_net_value'))
        outstanding_balance = outstanding_agg['total'] or 0

        # 4. Insured Patients Percentage
        # Patients with at least one Claim vs Patients with at least one Invoice
        patients_with_claims = Claim.objects.values('subject_id').distinct().count()
        patients_with_invoices = Invoice.objects.values('subject_id').distinct().count()
        
        insured_percentage = 0
        if patients_with_invoices > 0:
            insured_percentage = round((patients_with_claims / patients_with_invoices) * 100)

        # 5. Weekly Revenue (Last 7 days)
        # We need to return a list of { day, amount } for the last 7 days including today
        days_map = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        weekly_revenue = []
        
        # Loop backwards from today for 7 days
        for i in range(6, -1, -1):
            date = today - timezone.timedelta(days=i)
            day_label = days_map[date.weekday()]
            
            daily_rev = Invoice.objects.filter(
                invoice_datetime__date=date
            ).aggregate(total=Sum('total_gross_value'))['total'] or 0
            
            weekly_revenue.append({
                'day': day_label,
                'amount': daily_rev
            })

        return Response({
            "revenue_today": revenue_today,
            "revenue_change": 0, # Placeholder for now, could implement yesterday comparison
            "pending_claims": pending_claims_count,
            "pending_claims_change": 0, # Placeholder
            "outstanding_balance": outstanding_balance,
            "insured_patients_percentage": insured_percentage,
            "weekly_revenue": weekly_revenue
        })


    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """
        Manually add a line item (e.g., Professional Fee, Room Charge) to an invoice.
        """
        invoice = self.get_object()
        
        if invoice.status in ['balanced', 'cancelled']:
            return Response(
                {"error": f"Cannot add items to an invoice with status '{invoice.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        description = request.data.get('description')
        amount = request.data.get('amount')
        category = request.data.get('category', 'manual')
        
        if not description or amount is None:
            return Response(
                {"error": "Description and amount are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            amount_val = Decimal(str(amount))
        except (InvalidOperation, TypeError):
            return Response(
                {"error": "Invalid amount format."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        with transaction.atomic():
            # Get next sequence
            last_item = invoice.line_items.order_by('sequence').last()
            next_seq = str(int(last_item.sequence) + 1) if last_item and last_item.sequence.isdigit() else "1"
            
            InvoiceLineItem.objects.create(
                invoice=invoice,
                sequence=next_seq,
                description=f"[{category.upper()}] {description}",
                quantity=1,
                unit_price=amount_val,
                net_value=amount_val,
                gross_value=amount_val
            )
            
            # Recalculate totals
            invoice.calculate_totals()
            
        serializer = self.get_serializer(invoice)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        invoice = self.get_object()
        
        amount = request.data.get('amount')
        method = request.data.get('method')
        reference = request.data.get('reference')
        
        if not amount:
            return Response({"error": "amount is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            amount_val = float(amount)
        except ValueError:
             return Response({"error": "Invalid amount format"}, status=status.HTTP_400_BAD_REQUEST)

        # Capture user if available (linked practitioner) for Payment Processor
        user = request.user
        requestor_id = None
        if user.is_authenticated and hasattr(user, 'practitioner'):
            requestor_id = user.practitioner.practitioner_id
            
        # Create Payment Record
        # Note: In a real world scenario, this might need a more complex link (e.g. via PaymentNotice or LineItem)
        # For now, we creating a PaymentReconciliation record to track the event
        
        # Auto-generate OR Number (reference)
        # Format: OR-{YYMMDD}-{Seq} (e.g., OR-240219-0001)
        # Unique per day
        today_str = timezone.now().strftime('%y%m%d')
        
        # Count existing payments for today to determine sequence
        # Note: This is a simple counter. For high concurrency, use a sequence table or UUID.
        # Given the clinic scale, this is acceptable.
        start_of_day = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_count = PaymentReconciliation.objects.filter(
            created_datetime__gte=start_of_day
        ).count()
        
        sequence = daily_count + 1
        payment_identifier = f"OR-{today_str}-{sequence:04d}"

        payment = PaymentReconciliation.objects.create(
            identifier=f"PAY-{uuid.uuid4()}",
            status='active',
            invoice=invoice, # Direct link
            payment_amount_value=amount_val,
            payment_amount_currency='PHP',
            payment_identifier=payment_identifier, # Auto-generated OR
            disposition=f"Payment for Invoice {invoice.identifier} via {method}",
            created_datetime=timezone.now(),
            requestor_id=requestor_id # Save the Payment Processor
        )
        
        # Calculate balance based on direct invoice link
        total_paid_agg = PaymentReconciliation.objects.filter(
            invoice=invoice,
            status='active'
        ).aggregate(total=Sum('payment_amount_value'))
        
        total_paid = total_paid_agg['total'] or 0
        
        if total_paid >= invoice.total_net_value:
            invoice.status = 'balanced'
            invoice.save()
            
        return Response({
            "message": "Payment recorded",
            "total_paid": total_paid,
            "balance": invoice.total_net_value - total_paid,
            "status": invoice.status,
            "payment_identifier": payment_identifier # Return OR for receipt
        }, status=status.HTTP_200_OK)

class PaymentReconciliationViewSet(viewsets.ModelViewSet):
    queryset = PaymentReconciliation.objects.all()
    serializer_class = PaymentReconciliationSerializer

class PaymentNoticeViewSet(viewsets.ModelViewSet):
    queryset = PaymentNotice.objects.all()
    serializer_class = PaymentNoticeSerializer