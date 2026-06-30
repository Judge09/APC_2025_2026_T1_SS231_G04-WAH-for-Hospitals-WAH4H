from rest_framework import serializers
from billing.models import (
    Account, 
    Invoice, 
    InvoiceLineItem, 
    InvoiceLineItemPriceComponent, 
    Claim, 
    PaymentReconciliation, 
    PaymentNotice,
    PaymentReconciliation
)
from accounts.models import Practitioner
from django.db import transaction


class InvoiceLineItemPriceComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItemPriceComponent
        fields = '__all__'
        read_only_fields = ['line_item']


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    price_components = InvoiceLineItemPriceComponentSerializer(many=True, required=False)

    class Meta:
        model = InvoiceLineItem
        fields = '__all__'
        read_only_fields = ['invoice']


class InvoiceSerializer(serializers.ModelSerializer):
    line_items = InvoiceLineItemSerializer(many=True, required=False)
    processed_by = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = '__all__'

    def get_processed_by(self, obj):
        # 1. Check if there is a payment reconciliation with a requestor (Payment Processor)
        # We prioritize the person who took the payment (Last Touch)
        last_payment = PaymentReconciliation.objects.filter(
            invoice=obj,
            requestor_id__isnull=False
        ).order_by('-created_datetime').first()
        
        if last_payment:
            try:
                practitioner = Practitioner.objects.get(pk=last_payment.requestor_id)
                return f"{practitioner.first_name} {practitioner.last_name}"
            except Practitioner.DoesNotExist:
                pass # Fallback to invoice creator
        
        # 2. Fallback to Invoice Creator
        if obj.participant_actor_id:
            try:
                practitioner = Practitioner.objects.get(pk=obj.participant_actor_id)
                return f"{practitioner.first_name} {practitioner.last_name}"
            except Practitioner.DoesNotExist:
                return None
        return None
    
    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items', [])
        
        with transaction.atomic():
            invoice = Invoice.objects.create(**validated_data)
            
            # Efficiently create line items and collect components
            
            for idx, item_data in enumerate(line_items_data):
                price_components_data = item_data.pop('price_components', [])
                
                # Assign invoice ID directly
                item_data['invoice'] = invoice
                # Create item (traces save() method for calculation)
                line_item = InvoiceLineItem.objects.create(**item_data)
                
                # Create price components
                components_to_create = []
                for comp_data in price_components_data:
                    comp_data['line_item'] = line_item
                    components_to_create.append(InvoiceLineItemPriceComponent(**comp_data))
                
                if components_to_create:
                    InvoiceLineItemPriceComponent.objects.bulk_create(components_to_create)
            
            # Auto-calculate totals after creation
            invoice.calculate_totals()
            
        return invoice

    def update(self, instance, validated_data):
        line_items_data = validated_data.pop('line_items', None)
        
        with transaction.atomic():
            # Update Invoice fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            
            # Handle Line Items if provided
            if line_items_data is not None:
                # Existing items are deleted and replaced (Replacement strategy)
                instance.line_items.all().delete()
                
                line_items_to_create = []
                components_map = {}
                
                for idx, item_data in enumerate(line_items_data):
                    price_components_data = item_data.pop('price_components', [])
                    components_map[idx] = price_components_data
                    
                    item_data['invoice'] = instance
                    line_items_to_create.append(InvoiceLineItem(**item_data))
                
                if line_items_to_create:
                    created_items = InvoiceLineItem.objects.bulk_create(line_items_to_create)
                    
                    components_to_create = []
                    for idx, line_item in enumerate(created_items):
                        p_components = components_map.get(idx, [])
                        for comp_data in p_components:
                            comp_data['line_item'] = line_item
                            components_to_create.append(InvoiceLineItemPriceComponent(**comp_data))
                    
                    if components_to_create:
                        InvoiceLineItemPriceComponent.objects.bulk_create(components_to_create)
            
            # Recalculate totals
            instance.calculate_totals()
            
        return instance


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = '__all__'


class ClaimSerializer(serializers.ModelSerializer):
    class Meta:
        model = Claim
        fields = '__all__'


class PaymentReconciliationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentReconciliation
        fields = '__all__'


class PaymentNoticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentNotice
        fields = '__all__'
