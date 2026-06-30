import logging
from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver
from .models import Invoice

logger = logging.getLogger(__name__)

@receiver(pre_delete, sender=Invoice)
def cleanup_invoice_references(sender, instance, **kwargs):
    """
    When an Invoice is deleted, we must release the 'billing_reference' 
    on the associated DiagnosticReports and MedicationRequests 
    so they can be billed again.
    """
    try:
        from laboratory.models import DiagnosticReport
        from pharmacy.models import MedicationRequest
        
        # 1. Release DiagnosticReports
        DiagnosticReport.objects.filter(
            billing_reference=str(instance.identifier)
        ).update(billing_reference=None)
        
        # 2. Release MedicationRequests
        MedicationRequest.objects.filter(
            billing_reference=str(instance.identifier)
        ).update(billing_reference=None)
        
        logger.info(f"Released billing references for Invoice #{instance.identifier}")
        
    except Exception as e:
        logger.error(f"Error cleaning up invoice references: {e}")

@receiver(post_save, sender=Invoice)
def handle_invoice_cancellation(sender, instance, created, **kwargs):
    """
    When an Invoice is cancelled, we must release the 'billing_reference'
    so items can be re-billed in a new Invoice.
    """
    if not created and instance.status == 'cancelled':
        # Reuse cleanup logic
        cleanup_invoice_references(sender, instance, **kwargs)
