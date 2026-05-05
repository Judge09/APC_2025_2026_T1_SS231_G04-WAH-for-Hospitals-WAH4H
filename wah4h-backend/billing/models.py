from django.db import models
from core.models import FHIRResourceModel
from django.core.validators import MinValueValidator
from decimal import Decimal


# ============================================================================
# FHIR BILLING RESOURCES - NORMALIZED SCHEMA
# ============================================================================


class Account(FHIRResourceModel):
    """
    FHIR Account Resource - Billing account for healthcare services
    Inherits: identifier, status, created_at, updated_at from FHIRResourceModel
    """
    account_id = models.AutoField(primary_key=True)
    type = models.CharField(max_length=100, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    subject_id = models.BigIntegerField()  # Patient or Organization
    servicePeriod_start = models.DateField(null=True, blank=True)
    servicePeriod_end = models.DateField(null=True, blank=True)
    coverage_reference_id = models.BigIntegerField(null=True, blank=True)
    coverage_priority = models.CharField(max_length=255, null=True, blank=True)
    owner_id = models.BigIntegerField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    guarantor_party_id = models.BigIntegerField(null=True, blank=True)
    guarantor_onHold = models.CharField(max_length=255, null=True, blank=True)
    guarantor_period_start = models.DateField(null=True, blank=True)
    guarantor_period_end = models.DateField(null=True, blank=True)
    partOf_id = models.BigIntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'account'
        indexes = [
            models.Index(fields=['subject_id']),
            models.Index(fields=['status']),
        ]


class Claim(FHIRResourceModel):
    """
    FHIR Claim Resource - HEADER LEVEL (Normalized)
    Inherits: identifier, status, created_at, updated_at from FHIRResourceModel
    Note: 'created' is a distinct FHIR field, separate from inherited 'created_at' audit field
    
    Related Line Items: ClaimItem, ClaimDiagnosis, ClaimProcedure, ClaimCareTeam, ClaimSupportingInfo
    """
    claim_id = models.AutoField(primary_key=True)
    type = models.CharField(max_length=100, null=True, blank=True)
    subType = models.CharField(max_length=100, null=True, blank=True)
    use = models.CharField(max_length=255, null=True, blank=True)
    
    # Fortress Pattern: Cross-app references
    subject_id = models.BigIntegerField()
    enterer_id = models.BigIntegerField(null=True, blank=True)
    insurer_id = models.BigIntegerField(null=True, blank=True)
    provider_id = models.BigIntegerField(null=True, blank=True)
    coverage_id = models.BigIntegerField(null=True, blank=True)  # FHIR Claim.insurance[].coverage (1..*)
    facility_id = models.BigIntegerField(null=True, blank=True)
    prescription_id = models.BigIntegerField(null=True, blank=True)
    originalPrescription_id = models.BigIntegerField(null=True, blank=True)
    referral_id = models.BigIntegerField(null=True, blank=True)
    
    # Billable period
    billablePeriod_start = models.DateField(null=True, blank=True)
    billablePeriod_end = models.DateField(null=True, blank=True)
    created = models.DateTimeField(null=True, blank=True)  # FHIR creation datetime
    
    # Claim metadata
    priority = models.CharField(max_length=255, null=True, blank=True)
    fundsReserve = models.CharField(max_length=255, null=True, blank=True)
    
    # Related claim
    related_claim_id = models.BigIntegerField(null=True, blank=True)
    related_reference = models.CharField(max_length=255, null=True, blank=True)
    related_relationship = models.CharField(max_length=255, null=True, blank=True)
    
    # Payee
    payee_type = models.CharField(max_length=100, null=True, blank=True)
    payee_party_id = models.BigIntegerField(null=True, blank=True)
    
    # Accident information
    accident_date = models.DateField(null=True, blank=True)
    accident_type = models.CharField(max_length=100, null=True, blank=True)
    accident_location_address = models.CharField(max_length=255, null=True, blank=True)
    accident_location_reference = models.CharField(max_length=255, null=True, blank=True)
    
    # Totals
    total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_currency = models.CharField(max_length=10, null=True, blank=True, default='PHP')

    class Meta:
        db_table = 'billing_claim'
        indexes = [
            models.Index(fields=['subject_id']),
            models.Index(fields=['status']),
            models.Index(fields=['created']),
        ]


class ClaimCareTeam(models.Model):
    """
    Claim CareTeam members - Normalized relationship
    """
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='care_team')
    sequence = models.CharField(max_length=255, null=True, blank=True)
    provider_id = models.BigIntegerField(null=True, blank=True)
    responsible = models.CharField(max_length=255, null=True, blank=True)
    role = models.CharField(max_length=255, null=True, blank=True)
    qualification = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_care_team'
        indexes = [
            models.Index(fields=['claim']),
        ]


class ClaimSupportingInfo(models.Model):
    """
    Claim Supporting Information - Normalized relationship
    """
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='supporting_info')
    sequence = models.CharField(max_length=255, null=True, blank=True)
    category = models.CharField(max_length=255, null=True, blank=True)
    code = models.CharField(max_length=100, null=True, blank=True)
    timing_date = models.DateField(null=True, blank=True)
    timing_period_start = models.DateField(null=True, blank=True)
    timing_period_end = models.DateField(null=True, blank=True)
    value_boolean = models.BooleanField(null=True, blank=True)
    value_string = models.CharField(max_length=255, null=True, blank=True)
    value_quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    value_attachment = models.CharField(max_length=255, null=True, blank=True)
    value_reference = models.CharField(max_length=255, null=True, blank=True)
    reason = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_supporting_info'
        indexes = [
            models.Index(fields=['claim']),
        ]


class ClaimDiagnosis(models.Model):
    """
    Claim Diagnosis - Normalized relationship
    """
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='diagnoses')
    sequence = models.CharField(max_length=255, null=True, blank=True)
    diagnosisCodeableConcept = models.CharField(max_length=100, null=True, blank=True)
    diagnosisReference = models.CharField(max_length=255, null=True, blank=True)
    type = models.CharField(max_length=100, null=True, blank=True)
    onAdmission = models.CharField(max_length=255, null=True, blank=True)
    packageCode = models.CharField(max_length=100, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_diagnosis'
        indexes = [
            models.Index(fields=['claim']),
        ]


class ClaimProcedure(models.Model):
    """
    Claim Procedure - Normalized relationship
    """
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='procedures')
    sequence = models.CharField(max_length=255, null=True, blank=True)
    type = models.CharField(max_length=100, null=True, blank=True)
    procedureCodeableConcept = models.CharField(max_length=100, null=True, blank=True)
    procedureReference = models.CharField(max_length=255, null=True, blank=True)
    udi = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_procedure'
        indexes = [
            models.Index(fields=['claim']),
        ]


class ClaimItem(models.Model):
    """
    Claim Line Item - Normalized relationship (replaces flattened item_* fields)
    """
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='items')
    sequence = models.CharField(max_length=255, null=True, blank=True)
    careTeamSequence = models.CharField(max_length=255, null=True, blank=True)
    diagnosisSequence = models.CharField(max_length=255, null=True, blank=True)
    procedureSequence = models.CharField(max_length=255, null=True, blank=True)
    informationSequence = models.CharField(max_length=255, null=True, blank=True)
    revenue = models.CharField(max_length=255, null=True, blank=True)
    category = models.CharField(max_length=255, null=True, blank=True)
    productOrService = models.CharField(max_length=255, null=True, blank=True)
    modifier = models.CharField(max_length=255, null=True, blank=True)
    programCode = models.CharField(max_length=100, null=True, blank=True)
    
    # Service date/period
    servicedDate = models.CharField(max_length=255, null=True, blank=True)
    servicedPeriod_start = models.DateField(null=True, blank=True)
    servicedPeriod_end = models.DateField(null=True, blank=True)
    
    # Location
    locationCodeableConcept = models.CharField(max_length=100, null=True, blank=True)
    locationAddress = models.CharField(max_length=255, null=True, blank=True)
    locationReference = models.CharField(max_length=255, null=True, blank=True)
    
    # Pricing
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unitPrice = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    factor = models.CharField(max_length=255, null=True, blank=True)
    net = models.CharField(max_length=255, null=True, blank=True)
    
    # Body site
    bodySite = models.CharField(max_length=255, null=True, blank=True)
    subSite = models.CharField(max_length=255, null=True, blank=True)
    udi = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_item'
        indexes = [
            models.Index(fields=['claim']),
        ]


class ClaimItemDetail(models.Model):
    """
    Claim Item Detail - Normalized sub-line item
    """
    claim_item = models.ForeignKey(ClaimItem, on_delete=models.CASCADE, related_name='details')
    sequence = models.CharField(max_length=255, null=True, blank=True)
    revenue = models.CharField(max_length=255, null=True, blank=True)
    category = models.CharField(max_length=255, null=True, blank=True)
    productOrService = models.CharField(max_length=255, null=True, blank=True)
    modifier = models.CharField(max_length=255, null=True, blank=True)
    programCode = models.CharField(max_length=100, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unitPrice = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    factor = models.CharField(max_length=255, null=True, blank=True)
    net = models.CharField(max_length=255, null=True, blank=True)
    udi = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_item_detail'
        indexes = [
            models.Index(fields=['claim_item']),
        ]


class ClaimItemDetailSubDetail(models.Model):
    """
    Claim Item Detail SubDetail - Normalized sub-sub-line item
    """
    detail = models.ForeignKey(ClaimItemDetail, on_delete=models.CASCADE, related_name='sub_details')
    sequence = models.CharField(max_length=255, null=True, blank=True)
    revenue = models.CharField(max_length=255, null=True, blank=True)
    category = models.CharField(max_length=255, null=True, blank=True)
    productOrService = models.CharField(max_length=255, null=True, blank=True)
    modifier = models.CharField(max_length=255, null=True, blank=True)
    programCode = models.CharField(max_length=100, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unitPrice = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    factor = models.CharField(max_length=255, null=True, blank=True)
    net = models.CharField(max_length=255, null=True, blank=True)
    udi = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'claim_item_detail_sub_detail'
        indexes = [
            models.Index(fields=['detail']),
        ]


class ClaimResponse(FHIRResourceModel):
    """
    FHIR ClaimResponse Resource - HEADER LEVEL (Normalized)
    Inherits: identifier, status, created_at, updated_at from FHIRResourceModel
    Note: 'created' is a distinct FHIR field, separate from inherited 'created_at' audit field
    
    Related Line Items: ClaimResponseItem, ClaimResponseAddItem, ClaimResponseError
    """
    claimResponse_id = models.AutoField(primary_key=True)
    type = models.CharField(max_length=100, null=True, blank=True)
    subType = models.CharField(max_length=100, null=True, blank=True)
    use = models.CharField(max_length=255, null=True, blank=True)
    
    # Fortress Pattern: Cross-app references
    subject_id = models.BigIntegerField()
    insurer_id = models.BigIntegerField(null=True, blank=True)
    requestor_id = models.BigIntegerField(null=True, blank=True)
    request_id = models.BigIntegerField(null=True, blank=True)
    
    created = models.DateTimeField(null=True, blank=True)  # FHIR creation datetime
    outcome = models.CharField(max_length=255, null=True, blank=True)
    disposition = models.TextField(null=True, blank=True)
    
    # Pre-authorization
    preAuthRef = models.CharField(max_length=255, null=True, blank=True)
    preAuthPeriod_start = models.DateField(null=True, blank=True)
    preAuthPeriod_end = models.DateField(null=True, blank=True)
    
    payeeType = models.CharField(max_length=100, null=True, blank=True)
    
    # Payment information
    payment_type = models.CharField(max_length=100, null=True, blank=True)
    payment_adjustment = models.CharField(max_length=255, null=True, blank=True)
    payment_adjustmentReason = models.CharField(max_length=255, null=True, blank=True)
    payment_date = models.DateTimeField(null=True, blank=True)
    payment_amount_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    payment_amount_currency = models.CharField(max_length=10, null=True, blank=True, default='PHP')
    
    # Other
    fundsReserve = models.CharField(max_length=255, null=True, blank=True)
    formCode = models.CharField(max_length=100, null=True, blank=True)
    form = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_response'
        indexes = [
            models.Index(fields=['subject_id']),
            models.Index(fields=['status']),
            models.Index(fields=['request_id']),
        ]


class ClaimResponseItem(models.Model):
    """
    ClaimResponse Item Adjudication - Normalized relationship
    """
    claim_response = models.ForeignKey(ClaimResponse, on_delete=models.CASCADE, related_name='items')
    sequence = models.CharField(max_length=255, null=True, blank=True)
    noteNumbers = models.TextField(null=True, blank=True)
    adjudication_category = models.CharField(max_length=255, null=True, blank=True)
    adjudication_reason = models.CharField(max_length=255, null=True, blank=True)
    adjudication_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    adjudication_value = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_response_item'
        indexes = [
            models.Index(fields=['claim_response']),
        ]


class ClaimResponseItemDetail(models.Model):
    """
    ClaimResponse Item Detail Adjudication - Normalized relationship
    """
    claim_response_item = models.ForeignKey(ClaimResponseItem, on_delete=models.CASCADE, related_name='details')
    sequence = models.CharField(max_length=255, null=True, blank=True)
    noteNumbers = models.TextField(null=True, blank=True)
    adjudication_category = models.CharField(max_length=255, null=True, blank=True)
    adjudication_reason = models.CharField(max_length=255, null=True, blank=True)
    adjudication_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    adjudication_value = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_response_item_detail'
        indexes = [
            models.Index(fields=['claim_response_item']),
        ]


class ClaimResponseItemSubDetail(models.Model):
    """
    ClaimResponse Item SubDetail Adjudication - Normalized relationship
    """
    detail = models.ForeignKey(ClaimResponseItemDetail, on_delete=models.CASCADE, related_name='sub_details')
    sequence = models.CharField(max_length=255, null=True, blank=True)
    noteNumbers = models.TextField(null=True, blank=True)
    adjudication_category = models.CharField(max_length=255, null=True, blank=True)
    adjudication_reason = models.CharField(max_length=255, null=True, blank=True)
    adjudication_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    adjudication_value = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_response_item_sub_detail'
        indexes = [
            models.Index(fields=['detail']),
        ]


class ClaimResponseAddItem(models.Model):
    """
    ClaimResponse Additional Item - Normalized relationship
    """
    claim_response = models.ForeignKey(ClaimResponse, on_delete=models.CASCADE, related_name='add_items')
    itemSequence = models.CharField(max_length=255, null=True, blank=True)
    detailSequence = models.CharField(max_length=255, null=True, blank=True)
    subDetailSequence = models.CharField(max_length=255, null=True, blank=True)
    provider = models.CharField(max_length=255, null=True, blank=True)
    productOrService = models.CharField(max_length=255, null=True, blank=True)
    modifier = models.CharField(max_length=255, null=True, blank=True)
    programCode = models.CharField(max_length=100, null=True, blank=True)
    servicedDate = models.CharField(max_length=255, null=True, blank=True)
    servicedPeriod_start = models.DateField(null=True, blank=True)
    servicedPeriod_end = models.DateField(null=True, blank=True)
    location_codeableConcept = models.CharField(max_length=100, null=True, blank=True)
    location_address = models.CharField(max_length=255, null=True, blank=True)
    location_reference = models.CharField(max_length=255, null=True, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unitPrice = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    factor = models.CharField(max_length=255, null=True, blank=True)
    net = models.CharField(max_length=255, null=True, blank=True)
    bodySite = models.CharField(max_length=255, null=True, blank=True)
    subSite = models.CharField(max_length=255, null=True, blank=True)
    detail_productOrService = models.CharField(max_length=255, null=True, blank=True)
    detail_modifier = models.CharField(max_length=255, null=True, blank=True)
    detail_subDetail_productOrService = models.CharField(max_length=255, null=True, blank=True)
    detail_subDetail_modifier = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_response_add_item'
        indexes = [
            models.Index(fields=['claim_response']),
        ]


class ClaimResponseTotal(models.Model):
    """
    ClaimResponse Total - Normalized relationship
    """
    claim_response = models.ForeignKey(ClaimResponse, on_delete=models.CASCADE, related_name='totals')
    category = models.CharField(max_length=255, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_response_total'
        indexes = [
            models.Index(fields=['claim_response']),
        ]


class ClaimResponseProcessNote(models.Model):
    """
    ClaimResponse Process Note - Normalized relationship
    """
    claim_response = models.ForeignKey(ClaimResponse, on_delete=models.CASCADE, related_name='process_notes')
    number = models.TextField(null=True, blank=True)
    type = models.TextField(null=True, blank=True)
    text = models.TextField(null=True, blank=True)
    language = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_response_process_note'
        indexes = [
            models.Index(fields=['claim_response']),
        ]


class ClaimResponseError(models.Model):
    """
    ClaimResponse Error - Normalized relationship
    """
    claim_response = models.ForeignKey(ClaimResponse, on_delete=models.CASCADE, related_name='errors')
    itemSequence = models.CharField(max_length=255, null=True, blank=True)
    detailSequence = models.CharField(max_length=255, null=True, blank=True)
    subDetailSequence = models.CharField(max_length=255, null=True, blank=True)
    code = models.CharField(max_length=100, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_claim_response_error'
        indexes = [
            models.Index(fields=['claim_response']),
        ]


class InvoiceManager(models.Manager):
    def _get_lab_pricing(self, lab_items):
        """
        Helper to batch fetch Lab Pricing.
        Returns a dictionary: { code: LabTestDefinition }
        """
        from laboratory.models import LabTestDefinition
        codes = [item.code_code for item in lab_items if item.code_code]
        return {
            t.code: t 
            for t in LabTestDefinition.objects.filter(code__in=codes)
        }

    def _get_med_pricing(self, med_items):
        """
        Helper to batch fetch Pharmacy Pricing.
        Returns a dictionary: { item_code: Inventory }
        """
        from pharmacy.models import Inventory
        codes = [item.medication_code for item in med_items if item.medication_code]
        return {
            i.item_code: i 
            for i in Inventory.objects.filter(item_code__in=codes)
        }

    def get_pending_totals(self, subject_id):
        """
        Calculates the total potential cost of unbilled items WITHOUT creating an invoice.
        Returns: { 'lab_total': decimal, 'pharmacy_total': decimal, 'grand_total': decimal }
        """
        from laboratory.models import DiagnosticReport
        from pharmacy.models import MedicationRequest
        
        # 1. Fetch pending items
        pending_lab = DiagnosticReport.objects.filter(
            subject_id=subject_id, 
            billing_reference__isnull=True
        ).exclude(status='cancelled')
        
        pending_meds = MedicationRequest.objects.filter(
            subject_id=subject_id,
            billing_reference__isnull=True
        ).exclude(status='cancelled')
        
        lab_total = 0
        pharmacy_total = 0
        
        # 2. Calculate Lab Totals
        if pending_lab.exists():
            lab_prices = self._get_lab_pricing(pending_lab)
            for report in pending_lab:
                test_def = lab_prices.get(report.code_code)
                price = test_def.base_price if test_def else 0
                lab_total += price

        # 3. Calculate Pharmacy Totals
        if pending_meds.exists():
            med_prices = self._get_med_pricing(pending_meds)
            for request in pending_meds:
                inventory_item = med_prices.get(request.medication_code)
                price = inventory_item.unit_cost if inventory_item else 0
                quantity = request.dispense_quantity or 1
                pharmacy_total += (price * quantity)
                
        return {
            'lab_total': lab_total,
            'pharmacy_total': pharmacy_total,
            'grand_total': lab_total + pharmacy_total
        }

    def generate_from_pending_orders(self, subject_id, identifier_prefix="INV-"):
        """
        Generates an invoice for a patient by aggregating unbilled:
        1. DiagnosticReports (Laboratory)
        2. MedicationRequests (Pharmacy)
        
        Returns the created Invoice or None if no items found.
        """
        from laboratory.models import DiagnosticReport
        from pharmacy.models import MedicationRequest
        from django.db import transaction
        from django.utils import timezone
        
        with transaction.atomic():
            # 1. Fetch pending items with lock to prevent race conditions
            pending_lab = list(DiagnosticReport.objects.select_for_update().filter(
                subject_id=subject_id, 
                billing_reference__isnull=True
            ).exclude(status='cancelled'))
            
            pending_meds = list(MedicationRequest.objects.select_for_update().filter(
                subject_id=subject_id,
                billing_reference__isnull=True
            ).exclude(status='cancelled'))

            if not pending_lab and not pending_meds:
                return None

            # Create Invoice Header
            invoice = self.create(
                identifier=f"{identifier_prefix}{timezone.now().strftime('%Y%m%d%H%M%S')}",
                subject_id=subject_id,
                status='draft',
                type='clinical',
                invoice_datetime=timezone.now()
            )
            
            # --- Process Laboratory Items ---
            lab_prices = self._get_lab_pricing(pending_lab)
            new_line_items = []
            reports_to_update = []
            
            for report in pending_lab:
                # Lookup Price from Cache
                test_def = lab_prices.get(report.code_code)
                if test_def:
                    price = test_def.base_price
                    details = test_def.name
                else:
                    price = 0
                    details = f"Unknown Test: {report.code_display or report.code_code}"
                
                # Prepare Line Item
                new_line_items.append(InvoiceLineItem(
                    invoice=invoice,
                    chargeitem_reference_id=report.diagnostic_report_id, # Link back ID
                    chargeitem_code=report.code_code,
                    description=details, # Store snapshot
                    sequence='LAB',
                    quantity=1,
                    unit_price=price,
                    net_value=price,
                    gross_value=price
                ))
                
                # Prepare Source Reference Update
                report.billing_reference = str(invoice.identifier)
                reports_to_update.append(report)

            # --- Process Pharmacy Items ---
            med_prices = self._get_med_pricing(pending_meds)
            med_requests_to_update = []
            
            for request in pending_meds:
                # Lookup Price from Cache
                inventory_item = med_prices.get(request.medication_code)
                if inventory_item:
                    price = inventory_item.unit_cost or 0
                    details = inventory_item.item_name
                else:
                    price = 0
                    details = f"Unknown Med: {request.medication_display or request.medication_code}"
                
                # Calculate based on dispense quantity
                quantity = request.dispense_quantity or 1
                total_line = price * quantity
                
                # Prepare Line Item
                new_line_items.append(InvoiceLineItem(
                    invoice=invoice,
                    chargeitem_reference_id=request.medication_request_id, # Link back ID
                    chargeitem_code=request.medication_code,
                    description=details, # Store snapshot
                    sequence='PHARMACY',
                    quantity=quantity,
                    unit_price=price,
                    net_value=total_line,
                    gross_value=total_line
                ))
                
                # Prepare Source Reference Update
                request.billing_reference = str(invoice.identifier)
                med_requests_to_update.append(request)

            # BULK OPERATIONS
            if new_line_items:
                InvoiceLineItem.objects.bulk_create(new_line_items)
            
            if reports_to_update:
                DiagnosticReport.objects.bulk_update(reports_to_update, ['billing_reference'])
                
            if med_requests_to_update:
                MedicationRequest.objects.bulk_update(med_requests_to_update, ['billing_reference'])
            
            # Final Calculation
            invoice.calculate_totals()
            
        return invoice

    def create_empty_invoice(self, subject_id, identifier_prefix="INV-"):
        """
        Creates an empty 'draft' invoice for a patient.
        Used when billing Professional Fees or other manual items without Lab/Meds.
        """
        from django.utils import timezone
        
        invoice = self.create(
            identifier=f"{identifier_prefix}{timezone.now().strftime('%Y%m%d%H%M%S')}",
            subject_id=subject_id,
            status='draft',
            type='clinical',
            invoice_datetime=timezone.now(),
            total_net_value=0,
            total_gross_value=0
        )
        return invoice


class Invoice(FHIRResourceModel):
    """
    FHIR Invoice Resource - HEADER LEVEL (Normalized)
    Inherits: identifier, status, created_at, updated_at from FHIRResourceModel
    Note: 'invoice_datetime' is a distinct FHIR field, separate from inherited 'created_at' audit field
    
    Related Line Items: InvoiceLineItem
    """
    invoice_id = models.AutoField(primary_key=True)
    
    objects = InvoiceManager()
    cancelled_reason = models.CharField(max_length=255, null=True, blank=True)
    type = models.CharField(max_length=100, null=True, blank=True)
    
    # Fortress Pattern: Cross-app references
    subject_id = models.BigIntegerField()  # Patient
    recipient_id = models.BigIntegerField(null=True, blank=True)
    issuer_id = models.BigIntegerField(null=True, blank=True)
    account_id = models.BigIntegerField(null=True, blank=True)
    participant_actor_id = models.BigIntegerField(null=True, blank=True)
    
    invoice_datetime = models.DateTimeField(null=True, blank=True)  # FHIR invoice datetime
    participant_role = models.CharField(max_length=255, null=True, blank=True)
    
    # Totals - Corrected currency fields
    total_net_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_net_currency = models.CharField(max_length=3, null=True, blank=True)  # ISO 4217: PHP, USD
    total_gross_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_gross_currency = models.CharField(max_length=3, null=True, blank=True)  # ISO 4217: PHP, USD
    
    payment_terms = models.CharField(max_length=255, null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'billing_invoice'
        indexes = [
            models.Index(fields=['subject_id']),
            models.Index(fields=['status']),
            models.Index(fields=['invoice_datetime']),
        ]

    def calculate_totals(self):
        """
        Calculates and updates the total net and gross values based on line items.
        """
        from django.db.models import Sum, F
        
        # Calculate total from line items (quantity * unitPrice)
        # We use aggregate to force calculation in DB
        # Note: We assume unitPrice is the definitive price per item
        total = self.line_items.aggregate(
            total_value=Sum(F('quantity') * F('unit_price'))
        )['total_value'] or 0
        
        self.total_net_value = total
        self.total_gross_value = total # For now, gross = net until tax logic is added
        
        # Ensure currency is consistent
        if not self.total_net_currency:
            self.total_net_currency = 'PHP'
        if not self.total_gross_currency:
            self.total_gross_currency = 'PHP'
            
        self.save(update_fields=['total_net_value', 'total_gross_value', 'total_net_currency', 'total_gross_currency'])
        return total


class InvoiceLineItem(models.Model):
    """
    Invoice Line Item - Normalized relationship
    """
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    sequence = models.CharField(max_length=255, null=True, blank=True)
    chargeitem_reference_id = models.BigIntegerField(null=True, blank=True)
    chargeitem_code = models.CharField(max_length=100, null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True) # Snapshot of item name
    
    # Billing Details
    quantity = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    unit_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    net_value = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    gross_value = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    def save(self, *args, **kwargs):
        # Auto-calculate totals if not provided
        if self.unit_price is not None and self.quantity is not None:
            from decimal import Decimal
            # Ensure we are working with Decimals
            try:
                q_val = Decimal(str(self.quantity))
                p_val = Decimal(str(self.unit_price))
                calculated = q_val * p_val
                
                if self.net_value is None:
                    self.net_value = calculated
                if self.gross_value is None:
                    self.gross_value = calculated # Default to net until tax logic
            except (ValueError, TypeError, ArithmeticError):
                pass  # Non-numeric quantity/price — skip auto-calculation
                
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'billing_invoice_line_item'
        indexes = [
            models.Index(fields=['invoice']),
        ]


class InvoiceLineItemPriceComponent(models.Model):
    """
    Invoice Line Item Price Component - Normalized relationship
    """
    line_item = models.ForeignKey(InvoiceLineItem, on_delete=models.CASCADE, related_name='price_components')
    type = models.CharField(max_length=100, null=True, blank=True)
    code = models.CharField(max_length=100, null=True, blank=True)
    factor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    amount_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    amount_currency = models.CharField(max_length=3, null=True, blank=True)  # ISO 4217: PHP, USD
    
    class Meta:
        db_table = 'billing_invoice_line_item_price_component'
        indexes = [
            models.Index(fields=['line_item']),
        ]


class InvoiceTotalPriceComponent(models.Model):
    """
    Invoice Total Price Component - Normalized relationship
    """
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='total_price_components')
    type = models.CharField(max_length=100, null=True, blank=True)
    code = models.CharField(max_length=100, null=True, blank=True)
    factor = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    amount_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    amount_currency = models.CharField(max_length=3, null=True, blank=True)  # ISO 4217: PHP, USD
    
    class Meta:
        db_table = 'billing_invoice_total_price_component'
        indexes = [
            models.Index(fields=['invoice']),
        ]


class PaymentReconciliation(FHIRResourceModel):
    """
    FHIR PaymentReconciliation Resource - HEADER LEVEL (Normalized)
    Inherits: identifier, status, created_at, updated_at from FHIRResourceModel
    Note: 'created_datetime' is a distinct FHIR field, separate from inherited 'created_at' audit field
    
    Related Line Items: PaymentReconciliationDetail
    """
    payment_reconciliation_id = models.AutoField(primary_key=True)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    created_datetime = models.DateTimeField(null=True, blank=True)  # FHIR creation datetime
    
    # Fortress Pattern: Cross-app references
    payment_issuer_id = models.BigIntegerField(null=True, blank=True)
    request_task_id = models.BigIntegerField(null=True, blank=True)
    requestor_id = models.BigIntegerField(null=True, blank=True)
    
    outcome = models.CharField(max_length=255, null=True, blank=True)
    disposition = models.TextField(null=True, blank=True)
    
    # Payment information - Corrected currency field
    payment_date = models.DateTimeField(null=True, blank=True)
    payment_amount_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_amount_currency = models.CharField(max_length=3, null=True, blank=True)  # ISO 4217: PHP, USD
    payment_identifier = models.CharField(max_length=100, null=True, blank=True)
    
    # Direct Link to Invoice (Fortress Extension)
    invoice = models.ForeignKey(
        'Invoice', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='payments'
    )
    
    form_code = models.CharField(max_length=100, null=True, blank=True)
    
    class Meta:
        db_table = 'billing_payment_reconciliation'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['payment_date']),
        ]


class PaymentReconciliationDetail(models.Model):
    """
    PaymentReconciliation Detail - Normalized relationship
    """
    payment_reconciliation = models.ForeignKey(
        PaymentReconciliation, 
        on_delete=models.CASCADE, 
        related_name='details'
    )
    identifier = models.CharField(max_length=100, null=True, blank=True)
    predecessor_identifier = models.CharField(max_length=100, null=True, blank=True)
    type = models.CharField(max_length=100, null=True, blank=True)
    
    # Fortress Pattern: Cross-app references
    request_id = models.BigIntegerField(null=True, blank=True)
    submitter_id = models.BigIntegerField(null=True, blank=True)
    response_id = models.BigIntegerField(null=True, blank=True)
    responsible_id = models.BigIntegerField(null=True, blank=True)
    payee_id = models.BigIntegerField(null=True, blank=True)
    
    date = models.DateField(null=True, blank=True)
    
    # Amount - Corrected currency field
    amount_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    amount_currency = models.CharField(max_length=3, null=True, blank=True)  # ISO 4217: PHP, USD
    
    class Meta:
        db_table = 'billing_payment_reconciliation_detail'
        indexes = [
            models.Index(fields=['payment_reconciliation']),
        ]


class PaymentReconciliationProcessNote(models.Model):
    """
    PaymentReconciliation Process Note - Normalized relationship
    """
    payment_reconciliation = models.ForeignKey(
        PaymentReconciliation, 
        on_delete=models.CASCADE, 
        related_name='process_notes'
    )
    type = models.TextField(null=True, blank=True)
    text = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'billing_payment_reconciliation_process_note'
        indexes = [
            models.Index(fields=['payment_reconciliation']),
        ]


class PaymentNotice(FHIRResourceModel):
    """
    FHIR PaymentNotice Resource
    Inherits: identifier, status, created_at, updated_at from FHIRResourceModel
    """
    payment_notice_id = models.AutoField(primary_key=True)
    created_datetime = models.DateTimeField(null=True, blank=True)
    
    # Fortress Pattern: Cross-app references
    request_reference_id = models.BigIntegerField(null=True, blank=True)
    response_reference_id = models.BigIntegerField(null=True, blank=True)
    provider_id = models.BigIntegerField(null=True, blank=True)
    payment_reconciliation_id = models.BigIntegerField(null=True, blank=True)
    payee_id = models.BigIntegerField(null=True, blank=True)
    recipient_id = models.BigIntegerField(null=True, blank=True)
    
    payment_date = models.DateTimeField(null=True, blank=True)
    payment_status = models.CharField(max_length=100, null=True, blank=True)
    
    # Amount - Corrected currency field
    amount_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    amount_currency = models.CharField(max_length=3, null=True, blank=True)  # ISO 4217: PHP, USD
    
    class Meta:
        db_table = 'billing_payment_notice'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['payment_date']),
        ]


class Coverage(FHIRResourceModel):
    """
    FHIR Coverage Resource — PhilHealth insurance/membership record.
    Inherits: identifier, status, created_at, updated_at from FHIRResourceModel.

    Maps a patient (beneficiary) to their PhilHealth policy. Required by Claim
    to link a claim submission to the insurer (PhilHealth).
    """
    coverage_id = models.AutoField(primary_key=True)

    # Policy type — e.g. "PHIC" for PhilHealth Individual Contributor
    type_code = models.CharField(max_length=100, null=True, blank=True)
    type_display = models.CharField(max_length=255, null=True, blank=True)

    # Fortress Pattern: external references
    policy_holder_id = models.BigIntegerField(null=True, blank=True, db_index=True)   # Organization or Patient
    subscriber_id = models.BigIntegerField(null=True, blank=True, db_index=True)       # Patient (member)
    beneficiary_id = models.BigIntegerField(null=False, blank=False, db_index=True)    # Patient
    payor_id = models.BigIntegerField(null=True, blank=True, db_index=True)            # Organization (PhilHealth)

    # PhilHealth PIN stored as subscriber identifier
    subscriber_pin = models.CharField(
        max_length=14, null=True, blank=True,
        help_text="PhilHealth member PIN (XX-XXXXXXXXX-X format)"
    )

    # Membership category — Individual, Employed, Indigent, Senior Citizen, etc.
    class_code = models.CharField(max_length=100, null=True, blank=True)
    class_name = models.CharField(max_length=255, null=True, blank=True)

    # Coverage period
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)

    # Dependent order (0 = principal member, 1+ = dependents)
    dependent = models.CharField(max_length=10, null=True, blank=True)
    relationship_code = models.CharField(max_length=100, null=True, blank=True)
    relationship_display = models.CharField(max_length=255, null=True, blank=True)

    # Order of benefit application
    order = models.PositiveSmallIntegerField(null=True, blank=True)

    # Network — e.g. "Z-Benefit", "Konsulta Package"
    network = models.CharField(max_length=255, null=True, blank=True)

    # Cost-to-beneficiary (co-pay / deductible summary text)
    cost_to_beneficiary = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'billing_coverage'
        indexes = [
            models.Index(fields=['beneficiary_id']),
            models.Index(fields=['subscriber_pin']),
            models.Index(fields=['status']),
            models.Index(fields=['payor_id']),
        ]

    def __str__(self):
        return f"Coverage {self.coverage_id} — {self.subscriber_pin or self.identifier}"
