import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import DiagnosticReport, LabTestDefinition
from billing.models import Claim, ClaimItem
from django.utils import timezone

logger = logging.getLogger(__name__)

# @receiver(post_save, sender=DiagnosticReport)
def create_lab_charge(sender, instance, created, **kwargs):
    """
    Automated Billing Trigger:
    When a DiagnosticReport is marked as 'final' or 'completed',
    create a corresponding Claim in the Billing module.
    """
    if instance.status in ['final', 'completed'] and not instance.billing_reference:
        # Check if charge already exists (idempotency)
        # In a real system, we'd check if a Claim exists for this report
        
        try:
            # 1. Fetch Price
            test_def = LabTestDefinition.objects.filter(code=instance.code_code).first()
            price = test_def.base_price if test_def else 0
            
            # 2. Create Claim Header (Bill)
            claim = Claim.objects.create(
                patient_id=instance.subject_id,
                status='active',
                type='institutional',
                subType='laboratory',
                use='claim',
                created=timezone.now(),
                total=str(price),
                priority=instance.priority,
                request_id=instance.diagnostic_report_id # Traceability
            )
            
            # 3. Create Line Item
            ClaimItem.objects.create(
                claim=claim,
                sequence="1",
                productOrService=instance.code_code,
                unitPrice=price,
                quantity=1,
                net=str(price),
                servicedDate=str(instance.issued_datetime.date()) if instance.issued_datetime else str(timezone.now().date())
            )
            
            # 4. Link back (to prevent duplicate billing)
            instance.billing_reference = str(claim.claim_id)
            instance.save(update_fields=['billing_reference'])
            
            logger.info(f"Billing Claim #{claim.claim_id} created for Lab Report #{instance.diagnostic_report_id}")
            
        except Exception as e:
            logger.error(f"Error creating billing claim: {e}")
