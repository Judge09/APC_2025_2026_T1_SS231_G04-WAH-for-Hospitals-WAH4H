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
from core.fhir_utils import (
    codeable_concept,
    fhir_extension,
    money,
    fhir_period,
    fhir_reference,
    fhir_identifier,
    fhir_meta,
    fhir_quantity,
    PHC_COVERAGE_TYPE_CS,
    PHC_COVERAGE_CLASS_CS,
    HL7_CLAIM_TYPE,
    HL7_SUBSCRIBER_REL,
    HL7_PRIORITY,
    HL7_PARTICIPANT_TYPE,
    HL7_ACT_CODE,
    HL7_ADJUDICATION,
    HL7_PAYMENT_TYPE_CS,
    HL7_PAYMENT_ADJ,
    ICD10_SYSTEM,
    SNOMED_SYSTEM,
    PHC_SERVICE_TYPE_CS,
    PHC_EXT_BASE,
    HL7_DIAGNOSIS_TYPE,
    HL7_PROCEDURE_TYPE,
    HL7_ROLE_CODE,
    PHC_CS_BASE,
    WAH4H_CLAIM_SYSTEM,
    WAH4H_CLAIM_RESPONSE_SYSTEM,
    WAH4H_COVERAGE_SYSTEM,
    WAH4H_INVOICE_SYSTEM,
    WAH4H_PAYMENT_RECON_SYSTEM,
    WAH4H_ACCOUNT_SYSTEM,
)


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

    def to_representation(self, obj):
        rep = super().to_representation(obj)
        try:
            rep['fhir'] = {
                "resourceType": "Invoice",
                "id": obj.identifier,
                "meta": fhir_meta("Invoice", obj.updated_at),
                "identifier": [fhir_identifier(WAH4H_INVOICE_SYSTEM, obj.identifier, use="official")],
                "status": obj.status,
                "type": codeable_concept(HL7_ACT_CODE, obj.type) if obj.type else None,
                "subject": fhir_reference("Patient", obj.subject_id),
                "recipient": fhir_reference("Patient", obj.recipient_id) if obj.recipient_id else None,
                "date": obj.invoice_datetime.isoformat() if obj.invoice_datetime else None,
                "participant": [
                    {
                        "role": codeable_concept(HL7_PARTICIPANT_TYPE, obj.participant_role) if obj.participant_role else None,
                        "actor": fhir_reference("Practitioner", obj.participant_actor_id),
                    }
                ] if obj.participant_actor_id else [],
                "issuer": fhir_reference("Organization", obj.issuer_id) if obj.issuer_id else None,
                "account": fhir_reference("Account", obj.account_id) if obj.account_id else None,
                "lineItem": [
                    {
                        "sequence": int(li.sequence) if li.sequence and str(li.sequence).isdigit() else idx + 1,
                        "chargeItemCodeableConcept": codeable_concept(PHC_SERVICE_TYPE_CS, li.chargeitem_code) if li.chargeitem_code else None,
                        "priceComponent": [
                            {
                                "type": pc.type or "base",
                                "code": codeable_concept(HL7_ACT_CODE, pc.code) if pc.code else None,
                                "factor": float(pc.factor) if pc.factor is not None else None,
                                "amount": money(pc.amount_value, pc.amount_currency or "PHP"),
                            }
                            for pc in li.price_components.all()
                        ],
                    }
                    for idx, li in enumerate(obj.line_items.all())
                ],
                "totalNet": money(obj.total_net_value, obj.total_net_currency or "PHP"),
                "totalGross": money(obj.total_gross_value, obj.total_gross_currency or "PHP"),
                "paymentTerms": obj.payment_terms,
                "note": [{"text": obj.note}] if obj.note else [],
            }
        except Exception:
            rep['fhir'] = None
        return rep


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = '__all__'

    def to_representation(self, obj):
        rep = super().to_representation(obj)
        try:
            rep['fhir'] = {
                "resourceType": "Account",
                "id": obj.identifier,
                "meta": fhir_meta("Account", obj.updated_at),
                "identifier": [fhir_identifier(WAH4H_ACCOUNT_SYSTEM, obj.identifier, use="official")],
                "status": obj.status,
                "type": codeable_concept(HL7_ACT_CODE, obj.type) if obj.type else None,
                "name": obj.name,
                "subject": [fhir_reference("Patient", obj.subject_id)],
                "servicePeriod": fhir_period(obj.servicePeriod_start, obj.servicePeriod_end),
                "coverage": [
                    {
                        "coverage": fhir_reference("Coverage", obj.coverage_reference_id),
                        "priority": int(obj.coverage_priority) if obj.coverage_priority and str(obj.coverage_priority).isdigit() else None,
                    }
                ] if obj.coverage_reference_id else [],
                "owner": fhir_reference("Organization", obj.owner_id) if obj.owner_id else None,
                "description": obj.description,
                "guarantor": [
                    {
                        "party": fhir_reference("Patient", obj.guarantor_party_id),
                        "onHold": obj.guarantor_onHold == "true" if obj.guarantor_onHold else False,
                        "period": fhir_period(obj.guarantor_period_start, obj.guarantor_period_end),
                    }
                ] if obj.guarantor_party_id else [],
                "partOf": fhir_reference("Account", obj.partOf_id) if obj.partOf_id else None,
            }
        except Exception:
            rep['fhir'] = None
        return rep


class ClaimSerializer(serializers.ModelSerializer):
    class Meta:
        model = Claim
        fields = '__all__'


class PaymentReconciliationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentReconciliation
        fields = '__all__'

    def to_representation(self, obj):
        rep = super().to_representation(obj)
        try:
            rep['fhir'] = {
                "resourceType": "PaymentReconciliation",
                "id": obj.identifier,
                "meta": fhir_meta("PaymentReconciliation", obj.updated_at),
                "identifier": [fhir_identifier(WAH4H_PAYMENT_RECON_SYSTEM, obj.identifier, use="official")],
                "status": obj.status,
                "period": fhir_period(obj.period_start, obj.period_end),
                "created": obj.created_datetime.isoformat() if obj.created_datetime else None,
                "paymentIssuer": fhir_reference("Organization", obj.payment_issuer_id) if obj.payment_issuer_id else None,
                "request": fhir_reference("Task", obj.request_task_id) if obj.request_task_id else None,
                "requestor": fhir_reference("Practitioner", obj.requestor_id) if obj.requestor_id else None,
                "outcome": obj.outcome,
                "disposition": obj.disposition,
                "paymentDate": str(obj.payment_date.date()) if obj.payment_date else None,
                "paymentAmount": money(obj.payment_amount_value, obj.payment_amount_currency or "PHP"),
                "paymentIdentifier": fhir_identifier(WAH4H_PAYMENT_RECON_SYSTEM + "/payment", obj.payment_identifier) if obj.payment_identifier else None,
                "detail": [
                    {
                        "identifier": fhir_identifier(WAH4H_PAYMENT_RECON_SYSTEM + "/detail", d.identifier) if d.identifier else None,
                        "predecessor": fhir_identifier(WAH4H_PAYMENT_RECON_SYSTEM + "/detail", d.predecessor_identifier) if d.predecessor_identifier else None,
                        "type": codeable_concept(HL7_PAYMENT_TYPE_CS, d.type) if d.type else None,
                        "request": fhir_reference("Claim", d.request_id) if d.request_id else None,
                        "submitter": fhir_reference("Organization", d.submitter_id) if d.submitter_id else None,
                        "response": fhir_reference("ClaimResponse", d.response_id) if d.response_id else None,
                        "date": str(d.date) if d.date else None,
                        "responsible": fhir_reference("Practitioner", d.responsible_id) if d.responsible_id else None,
                        "payee": fhir_reference("Organization", d.payee_id) if d.payee_id else None,
                        "amount": money(d.amount_value, d.amount_currency or "PHP"),
                    }
                    for d in obj.details.all()
                ],
                "formCode": codeable_concept("http://terminology.hl7.org/CodeSystem/forms-codes", obj.form_code) if obj.form_code else None,
            }
        except Exception:
            rep['fhir'] = None
        return rep


class PaymentNoticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentNotice
        fields = '__all__'


# ── eClaims serializers ───────────────────────────────────────────────────────

import random
import re
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
        extra_kwargs = {
            'insurer_id': {'required': True, 'allow_null': False},
            # FHIR R4 Claim.provider is 1..1
            'provider_id': {'required': True, 'allow_null': False},
        }

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

    def validate(self, data):
        """Validate ICD-10 format for diagnoses codes."""
        diagnoses = data.get('diagnoses', [])
        icd10_pattern = re.compile(r'^[A-Z][0-9A-Z]{1,6}(\.[0-9A-Z]{1,4})?$', re.IGNORECASE)
        for idx, diag in enumerate(diagnoses):
            code = diag.get('diagnosisCodeableConcept')
            if code and not icd10_pattern.match(code):
                raise serializers.ValidationError(
                    {f"diagnoses[{idx}].diagnosisCodeableConcept": (
                        f"'{code}' is not a valid ICD-10 code format. "
                        "Expected alphanumeric code (e.g. J00, K35, A09.0)."
                    )}
                )
        return data

    def to_representation(self, obj):
        rep = super().to_representation(obj)
        try:
            rep['fhir'] = {
                "resourceType": "Claim",
                "id": obj.identifier,
                "meta": fhir_meta("Claim", obj.updated_at),
                "identifier": [fhir_identifier(WAH4H_CLAIM_SYSTEM, obj.identifier, use="official")],
                "status": obj.status,
                "type": codeable_concept(HL7_CLAIM_TYPE, obj.type or "professional") if obj.type else None,
                "use": obj.use or "claim",
                "patient": fhir_reference("Patient", obj.subject_id),
                "billablePeriod": fhir_period(obj.billablePeriod_start, obj.billablePeriod_end),
                "created": obj.created.isoformat() if obj.created else None,
                "insurer": fhir_reference("Organization", obj.insurer_id) if obj.insurer_id else None,
                "provider": fhir_reference("Practitioner", obj.provider_id) if obj.provider_id else None,
                "priority": codeable_concept(HL7_PRIORITY, obj.priority or "normal"),
                "diagnosis": [
                    {
                        "sequence": int(d.sequence) if d.sequence and d.sequence.isdigit() else idx + 1,
                        "diagnosisCodeableConcept": codeable_concept(ICD10_SYSTEM, d.diagnosisCodeableConcept) if d.diagnosisCodeableConcept else None,
                        "type": [codeable_concept(HL7_DIAGNOSIS_TYPE, d.type)] if d.type else [],
                        "onAdmission": codeable_concept("http://terminology.hl7.org/CodeSystem/ex-coverage-financial-exception", d.onAdmission) if d.onAdmission else None,
                    }
                    for idx, d in enumerate(obj.diagnoses.all())
                ],
                "procedure": [
                    {
                        "sequence": int(p.sequence) if p.sequence and p.sequence.isdigit() else idx + 1,
                        "procedureCodeableConcept": codeable_concept(SNOMED_SYSTEM, p.procedureCodeableConcept) if p.procedureCodeableConcept else None,
                        "type": [codeable_concept(HL7_PROCEDURE_TYPE, p.type)] if p.type else [],
                    }
                    for idx, p in enumerate(obj.procedures.all())
                ],
                "careTeam": [
                    {
                        "sequence": int(ct.sequence) if ct.sequence and ct.sequence.isdigit() else idx + 1,
                        "provider": fhir_reference("Practitioner", ct.provider_id) if ct.provider_id else None,
                        "responsible": ct.responsible == "true" or ct.responsible is True,
                        "role": codeable_concept(HL7_ROLE_CODE, ct.role) if ct.role else None,
                    }
                    for idx, ct in enumerate(obj.care_team.all())
                ],
                "item": [
                    {
                        "sequence": int(it.sequence) if it.sequence and it.sequence.isdigit() else idx + 1,
                        "productOrService": codeable_concept(PHC_SERVICE_TYPE_CS, it.productOrService) if it.productOrService else None,
                        "quantity": fhir_quantity(it.quantity),
                        "unitPrice": money(it.unitPrice),
                        "net": money(it.net if it.net else (float(it.quantity or 1) * float(it.unitPrice or 0) if it.unitPrice else None)),
                    }
                    for idx, it in enumerate(obj.items.all())
                ],
                "total": money(obj.total, obj.total_currency or "PHP"),
            }
        except Exception:
            rep['fhir'] = None
        return rep


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

    def to_representation(self, obj):
        rep = super().to_representation(obj)
        try:
            rep['fhir'] = {
                "resourceType": "ClaimResponse",
                "id": obj.identifier,
                "meta": fhir_meta("ClaimResponse", obj.updated_at),
                "identifier": [fhir_identifier(WAH4H_CLAIM_RESPONSE_SYSTEM, obj.identifier, use="official")],
                "status": obj.status,
                "type": codeable_concept(HL7_CLAIM_TYPE, obj.type or "professional"),
                "use": obj.use or "claim",
                "patient": fhir_reference("Patient", obj.subject_id),
                "created": obj.created.isoformat() if obj.created else None,
                "insurer": fhir_reference("Organization", obj.insurer_id) if obj.insurer_id else None,
                "request": fhir_reference("Claim", obj.request_id) if obj.request_id else None,
                "outcome": obj.outcome or "queued",
                "disposition": obj.disposition,
                "preAuthRef": [obj.preAuthRef] if obj.preAuthRef else [],
                "preAuthPeriod": fhir_period(obj.preAuthPeriod_start, obj.preAuthPeriod_end),
                "payment": (
                    {
                        "type": codeable_concept("http://terminology.hl7.org/CodeSystem/ex-paymenttype", obj.payment_type) if obj.payment_type else None,
                        "adjustment": money(obj.payment_adjustment),
                        "adjustmentReason": codeable_concept("http://terminology.hl7.org/CodeSystem/payment-adjustment-reason", obj.payment_adjustmentReason) if obj.payment_adjustmentReason else None,
                        "date": str(obj.payment_date.date()) if obj.payment_date else None,
                    }
                    if obj.payment_type or obj.payment_date else None
                ),
                "total": [
                    {
                        "category": codeable_concept("http://terminology.hl7.org/CodeSystem/adjudication", t.category or "benefit"),
                        "amount": money(t.amount),
                    }
                    for t in obj.totals.all()
                ],
            }
        except Exception:
            rep['fhir'] = None
        return rep


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

    def validate(self, data):
        """Validate period order and FHIR R4 required fields."""
        if not data.get('payor_id'):
            raise serializers.ValidationError(
                {"payor_id": "Payor is required — FHIR R4 Coverage.payor is 1..*"}
            )
        period_start = data.get('period_start')
        period_end = data.get('period_end')
        if period_start and period_end and period_end < period_start:
            raise serializers.ValidationError(
                {"period_end": "Coverage period_end must be on or after period_start."}
            )
        return data

    def create(self, validated_data):
        if not validated_data.get('identifier'):
            validated_data['identifier'] = _rand_id('COV')
        if not validated_data.get('status'):
            validated_data['status'] = 'active'
        return Coverage.objects.create(**validated_data)

    def to_representation(self, obj):
        rep = super().to_representation(obj)
        try:
            rep['fhir'] = {
                "resourceType": "Coverage",
                "id": obj.identifier,
                "meta": fhir_meta("Coverage", obj.updated_at),
                "identifier": [fhir_identifier(WAH4H_COVERAGE_SYSTEM, obj.identifier, use="official")],
                "status": obj.status,
                "type": codeable_concept(PHC_COVERAGE_TYPE_CS, obj.type_code, obj.type_display) if obj.type_code else None,
                "subscriber": fhir_reference("Patient", obj.subscriber_id) if obj.subscriber_id else None,
                "subscriberId": obj.subscriber_pin,
                "beneficiary": fhir_reference("Patient", obj.beneficiary_id),
                "relationship": codeable_concept(HL7_SUBSCRIBER_REL, obj.relationship_code, obj.relationship_display) if obj.relationship_code else None,
                "period": fhir_period(obj.period_start, obj.period_end),
                "payor": [fhir_reference("Organization", obj.payor_id)] if obj.payor_id else [],
                "class": [
                    {
                        "type": codeable_concept(PHC_COVERAGE_CLASS_CS, obj.class_code, obj.class_name),
                        "value": obj.class_code,
                        "name": obj.class_name,
                    }
                ] if obj.class_code else [],
                "network": obj.network,
                "order": obj.order,
                "extension": [
                    ext for ext in [
                        fhir_extension(PHC_EXT_BASE + "/ph-core-coverage-philhealth-pin", "String", obj.subscriber_pin) if obj.subscriber_pin else None,
                    ] if ext
                ],
            }
        except Exception:
            rep['fhir'] = None
        return rep
