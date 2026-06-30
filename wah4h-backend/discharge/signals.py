# discharge/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from admission.models import Encounter
from .models import Discharge
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Encounter)
def auto_create_discharge_record(sender, instance, created, **kwargs):
    """
    Automatically creates a Discharge summary record when an Inpatient Encounter is created.
    """
    if created:
        # Check if it's an inpatient encounter (IMP or inpatient)
        is_inpatient = (
            instance.class_field in ['IMP', 'inpatient'] or 
            instance.type == 'inpatient'
        )
        
        if is_inpatient:
            # Check for existing discharge record to prevent duplicates
            if not Discharge.objects.filter(encounter_id=instance.encounter_id).exists():
                try:
                    Discharge.objects.create(
                        encounter_id=instance.encounter_id,
                        patient_id=instance.subject_id,
                        workflow_status='pending',
                        created_by='SYSTEM (Auto-Admission)'
                    )
                    logger.info(f"Auto-created discharge record for Encounter {instance.encounter_id}")
                except Exception as e:
                    logger.error(f"Failed to auto-create discharge record: {str(e)}")
