from rest_framework import serializers
from billing.models import (
    Account,
    Invoice,
    InvoiceLineItem,
    InvoiceLineItemPriceComponent,
    Claim,
    ClaimCareTeam,
    ClaimDiagnosis,
    ClaimProcedure,
    ClaimItem,
    ClaimResponse,
    ClaimResponseTotal,
    ClaimResponseItem,
    Coverage,
    PaymentReconciliation,
    PaymentNotice,
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


# ── eClaims serializers ───────────────────────────────────────────────────────

import random
from django.utils import timezone as tz


def _rand_id(prefix: str, n: int = 9) -> str:
    return f"{prefix}-{''.join(str(random.randint(0, 9)) for _ in range(n))}"


class ClaimDiagnosisSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClaimDiagnosis
        exclude = ['claim']


class ClaimProcedureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClaimProcedure
        exclude = ['claim']


class ClaimCareTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClaimCareTeam
        exclude = ['claim']


class ClaimItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClaimItem
        exclude = ['claim']


class EClaimSerializer(serializers.ModelSerializer):
    diagnoses  = ClaimDiagnosisSerializer(many=True, required=False)
    procedures = ClaimProcedureSerializer(many=True, required=False)
    care_team  = ClaimCareTeamSerializer(many=True, required=False)
    items      = ClaimItemSerializer(many=True, required=False)
    patient_summary = serializers.SerializerMethodField()

    class Meta:
        model = Claim
        fields = '__all__'
        read_only_fields = ['claim_id', 'identifier', 'created_at', 'updated_at', 'patient_summary']

    def get_patient_summary(self, obj):
        try:
            from patients.models import Patient
            p = Patient.objects.get(id=obj.subject_id)
            return {
                'id': p.id,
                'patient_id': p.patient_id,
                'full_name': f"{p.first_name} {p.last_name}".strip(),
                'philhealth_id': p.philhealth_id,
            }
        except Exception:
            return None

    @transaction.atomic
    def create(self, validated_data):
        diagnoses_data  = validated_data.pop('diagnoses', [])
        procedures_data = validated_data.pop('procedures', [])
        care_team_data  = validated_data.pop('care_team', [])
        items_data      = validated_data.pop('items', [])

        if not validated_data.get('identifier'):
            validated_data['identifier'] = _rand_id('CLM')
        if not validated_data.get('status'):
            validated_data['status'] = 'draft'
        if not validated_data.get('created'):
            validated_data['created'] = tz.now()

        claim = Claim.objects.create(**validated_data)
        for seq, d in enumerate(diagnoses_data, 1):
            d.setdefault('sequence', str(seq))
            ClaimDiagnosis.objects.create(claim=claim, **d)
        for seq, p in enumerate(procedures_data, 1):
            p.setdefault('sequence', str(seq))
            ClaimProcedure.objects.create(claim=claim, **p)
        for seq, ct in enumerate(care_team_data, 1):
            ct.setdefault('sequence', str(seq))
            ClaimCareTeam.objects.create(claim=claim, **ct)
        for seq, i in enumerate(items_data, 1):
            i.setdefault('sequence', str(seq))
            ClaimItem.objects.create(claim=claim, **i)
        return claim

    @transaction.atomic
    def update(self, instance, validated_data):
        diagnoses_data  = validated_data.pop('diagnoses', None)
        procedures_data = validated_data.pop('procedures', None)
        care_team_data  = validated_data.pop('care_team', None)
        items_data      = validated_data.pop('items', None)

        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        if diagnoses_data is not None:
            instance.diagnoses.all().delete()
            for seq, d in enumerate(diagnoses_data, 1):
                d.setdefault('sequence', str(seq))
                ClaimDiagnosis.objects.create(claim=instance, **d)
        if procedures_data is not None:
            instance.procedures.all().delete()
            for seq, p in enumerate(procedures_data, 1):
                p.setdefault('sequence', str(seq))
                ClaimProcedure.objects.create(claim=instance, **p)
        if care_team_data is not None:
            instance.care_team.all().delete()
            for seq, ct in enumerate(care_team_data, 1):
                ct.setdefault('sequence', str(seq))
                ClaimCareTeam.objects.create(claim=instance, **ct)
        if items_data is not None:
            instance.items.all().delete()
            for seq, i in enumerate(items_data, 1):
                i.setdefault('sequence', str(seq))
                ClaimItem.objects.create(claim=instance, **i)
        return instance


class ClaimResponseTotalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClaimResponseTotal
        exclude = ['claim_response']


class ClaimResponseItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClaimResponseItem
        exclude = ['claim_response']


class ClaimResponseSerializer(serializers.ModelSerializer):
    totals = ClaimResponseTotalSerializer(many=True, required=False)
    items  = ClaimResponseItemSerializer(many=True, required=False)
    claim_summary = serializers.SerializerMethodField()

    class Meta:
        model = ClaimResponse
        fields = '__all__'
        read_only_fields = ['claimResponse_id', 'identifier', 'created_at', 'updated_at', 'claim_summary']

    def get_claim_summary(self, obj):
        if not obj.request_id:
            return None
        try:
            c = Claim.objects.get(claim_id=obj.request_id)
            return {'claim_id': c.claim_id, 'identifier': c.identifier, 'status': c.status}
        except Claim.DoesNotExist:
            return None

    @transaction.atomic
    def create(self, validated_data):
        totals_data = validated_data.pop('totals', [])
        items_data  = validated_data.pop('items', [])

        if not validated_data.get('identifier'):
            validated_data['identifier'] = _rand_id('CRS')
        if not validated_data.get('status'):
            validated_data['status'] = 'active'

        cr = ClaimResponse.objects.create(**validated_data)
        for t in totals_data:
            ClaimResponseTotal.objects.create(claim_response=cr, **t)
        for i in items_data:
            ClaimResponseItem.objects.create(claim_response=cr, **i)
        return cr


class CoverageSerializer(serializers.ModelSerializer):
    patient_summary = serializers.SerializerMethodField()

    class Meta:
        model = Coverage
        fields = '__all__'
        read_only_fields = ['coverage_id', 'identifier', 'created_at', 'updated_at', 'patient_summary']

    def get_patient_summary(self, obj):
        try:
            from patients.models import Patient
            p = Patient.objects.get(id=obj.beneficiary_id)
            return {
                'id': p.id,
                'patient_id': p.patient_id,
                'full_name': f"{p.first_name} {p.last_name}".strip(),
                'philhealth_id': p.philhealth_id,
                'gender': p.gender,
            }
        except Exception:
            return None

    def create(self, validated_data):
        if not validated_data.get('identifier'):
            validated_data['identifier'] = _rand_id('COV')
        if not validated_data.get('status'):
            validated_data['status'] = 'active'
        return Coverage.objects.create(**validated_data)
