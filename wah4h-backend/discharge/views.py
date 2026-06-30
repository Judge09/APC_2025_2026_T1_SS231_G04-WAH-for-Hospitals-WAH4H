from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.utils.dateparse import parse_datetime
from datetime import datetime
import logging

from .models import Discharge
from .serializers import DischargeSerializer
from admission.models import Encounter
from patients.models import Patient
from accounts.models import Practitioner, Location
from billing.models import Invoice

logger = logging.getLogger(__name__)

class DischargeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing the Discharge workflow.
    Optimized for MVP with pre-fetched related objects for O(1) serialization lookups.
    """
    queryset = Discharge.objects.all().order_by('-created_at')
    serializer_class = DischargeSerializer

    def _attach_related_objects(self, queryset):
        """Helper to attach related objects in bulk to avoid N+1 queries during serialization."""
        instances = list(queryset)
        patient_ids = set()
        encounter_ids = set()
        
        for instance in instances:
            if instance.patient_id: patient_ids.add(instance.patient_id)
            if instance.encounter_id: encounter_ids.add(instance.encounter_id)
        
        patients = {p.id: p for p in Patient.objects.filter(id__in=patient_ids)}
        encounters = {e.encounter_id: e for e in Encounter.objects.filter(encounter_id__in=encounter_ids)}
        
        practitioner_ids = set()
        location_ids = set()
        
        for enc in encounters.values():
            if enc.participant_individual_id: practitioner_ids.add(enc.participant_individual_id)
            if enc.location_id: location_ids.add(enc.location_id)
                
        practitioners = {p.practitioner_id: p for p in Practitioner.objects.filter(practitioner_id__in=practitioner_ids)}
        locations = {l.location_id: l for l in Location.objects.filter(location_id__in=location_ids)}
        
        for instance in instances:
            instance.patient_obj = patients.get(instance.patient_id)
            instance.encounter_obj = encounters.get(instance.encounter_id)
            if instance.encounter_obj:
                instance.encounter_obj.practitioner_obj = practitioners.get(instance.encounter_obj.participant_individual_id)
                instance.encounter_obj.location_obj = locations.get(instance.encounter_obj.location_id)
            
        return instances

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        instances = self._attach_related_objects(queryset)
        serializer = self.get_serializer(instances, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Enrich instance manually for single retrieve
        try:
            instance.patient_obj = Patient.objects.get(id=instance.patient_id)
        except Patient.DoesNotExist:
            instance.patient_obj = None
            
        try:
            enc = Encounter.objects.get(encounter_id=instance.encounter_id)
            if enc.participant_individual_id:
                try: enc.practitioner_obj = Practitioner.objects.get(practitioner_id=enc.participant_individual_id)
                except Practitioner.DoesNotExist: enc.practitioner_obj = None
            
            if enc.location_id:
                try: enc.location_obj = Location.objects.get(location_id=enc.location_id)
                except Location.DoesNotExist: enc.location_obj = None
            instance.encounter_obj = enc
        except Encounter.DoesNotExist:
            instance.encounter_obj = None
            
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Returns patients in the discharge workflow (pending or ready)."""
        queryset = Discharge.objects.filter(workflow_status__in=['pending', 'ready']).order_by('-created_at')
        instances = self._attach_related_objects(queryset)
        serializer = self.get_serializer(instances, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def discharged(self, request):
        """Returns patients who have completed the discharge workflow."""
        queryset = Discharge.objects.filter(workflow_status='discharged').order_by('-discharge_datetime')
        instances = self._attach_related_objects(queryset)
        serializer = self.get_serializer(instances, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='pdf')
    def generate_pdf(self, request, pk=None):
        """Generate PDF discharge packet for a discharge record."""
        from .pdf_generator import DischargePDFView
        from django.http import HttpResponse

        instance = self.get_object()

        # Only allow PDF for discharged patients
        if instance.workflow_status != 'discharged':
            return Response(
                {"error": "Only discharged patients can have a discharge packet printed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        pdf_buffer = DischargePDFView.generate_pdf(instance)

        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        filename = f"DischargePacket_{instance.discharge_id}.pdf"
        response['Content-Disposition'] = f'inline; filename="{filename}"'

        return response

    @action(detail=True, methods=['post'])
    def process_discharge(self, request, pk=None):
        """Finalizes the discharge process and updates encounter status."""
        instance = self.get_object()
        data = request.data
        
        with transaction.atomic():
            diagnosis = data.get('finalDiagnosis', '')
            summary = data.get('hospitalStaySummary', '')
            meds = data.get('dischargeMedications', '')
            instructions = data.get('dischargeInstructions', '')
            
            # Formatting summary and instructions
            if diagnosis:
                instance.summary_of_stay = f"Diagnosis: {diagnosis}\n\nSummary: {summary}"
            else:
                instance.summary_of_stay = summary
            
            full_instructions = instructions
            if meds:
                full_instructions = f"{instructions}\n\nMedications: {meds}"
            instance.discharge_instructions = full_instructions
            
            instance.follow_up_plan = data.get('followUpPlan', instance.follow_up_plan)
            instance.pending_items = data.get('pendingItems', instance.pending_items)
            
            instance.workflow_status = 'discharged'
            instance.discharge_datetime = timezone.now()
            instance.save()
            
            # Update associated encounter
            if instance.encounter_id:
                try:
                    encounter = Encounter.objects.get(encounter_id=instance.encounter_id)
                    encounter.status = 'finished'
                    encounter.period_end = timezone.now().date()
                    # encounter.location_status = 'discharged'  <-- REMOVED to preserve last location for reports
                    encounter.save()
                except Encounter.DoesNotExist:
                    logger.warning(f"Encounter {instance.encounter_id} not found during discharge processing.")
        
        # Re-fetch or manually attach patient for response enrichment
        try:
            instance.patient_obj = Patient.objects.get(id=instance.patient_id)
        except Patient.DoesNotExist:
            instance.patient_obj = None
            
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def update_requirements(self, request, pk=None):
        """Updates the discharge requirements checklist."""
        instance = self.get_object()
        reqs = request.data.get('requirements', {})
        
        # Business logic: automagically update fields based on checklist
        if reqs.get('dischargeSummary'): 
            if not instance.summary_of_stay:
                instance.summary_of_stay = "Completed via checklist"
        if reqs.get('billingClearance'): 
            instance.billing_cleared_datetime = timezone.now()
        
        # Store raw requirements JSON for persistence
        import json
        instance.pending_items = json.dumps(reqs)
        instance.save()
        return Response(status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def sync_from_admissions(self, request):
        """Automated sync to pull admitted patients into the discharge workflow."""
        try:
            active_encounters = Encounter.objects.filter(
                class_field__in=['IMP', 'inpatient'],
                status__in=['in-progress', 'arrived']
            )
            
            created_count = 0
            for encounter in active_encounters:
                if not Discharge.objects.filter(encounter_id=encounter.encounter_id).exists():
                    Discharge.objects.create(
                        encounter_id=encounter.encounter_id,
                        patient_id=encounter.subject_id,
                        physician_id=encounter.participant_individual_id if hasattr(encounter, 'participant_individual_id') else None,
                        workflow_status='pending',
                        created_by='SYSTEM (Sync)'
                    )
                    created_count += 1
            
            return Response({'success': True, 'created': created_count})
        except Exception as e:
            logger.error(f"Sync error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get', 'post'])
    def from_billing(self, request):
        """Integration with Billing module to identify patients ready for discharge."""
        if request.method == 'GET':
            eligible_invoices = Invoice.objects.filter(status__in=['issued', 'balanced'])
            # Exclude patients already in discharge queue
            active_ids = Discharge.objects.all().values_list('patient_id', flat=True)
            eligible_invoices = eligible_invoices.exclude(subject_id__in=active_ids)
            
            invoices = list(eligible_invoices[:50])
            patient_ids = [inv.subject_id for inv in invoices]
            patients = {p.id: p for p in Patient.objects.filter(id__in=patient_ids)}
            
            results = []
            for inv in invoices:
                pat = patients.get(inv.subject_id)
                if not pat: continue
                
                # Get latest encounter for metadata
                enc = Encounter.objects.filter(subject_id=pat.id).order_by('-encounter_id').first()
                
                # Logic to extract Room from Admission location_status
                room_display = "N/A"
                if enc:
                    if enc.location_status:
                        parts = enc.location_status.split('|')
                        if len(parts) >= 2 and parts[1]:
                            room_code = parts[1].strip()
                            # Try to resolve code to name
                            try:
                                loc = Location.objects.filter(identifier=room_code).first()
                                room_display = loc.name if loc else room_code
                            except Exception:
                                room_display = room_code
                    elif enc.location_id:
                        room_display = f"Room {enc.location_id}"

                results.append({
                    "billing_id": inv.invoice_id,
                    "patient_name": f"{pat.first_name} {pat.last_name}",
                    "hospital_id": pat.patient_id,
                    "room": room_display,
                    "age": pat.age if pat.age is not None else "N/A",
                    "department": enc.service_type if enc else "General",
                    "admission_date": inv.invoice_datetime.strftime("%Y-%m-%d") if inv.invoice_datetime else "N/A",
                })
            return Response({"patients": results})
            
        elif request.method == 'POST':
            billing_ids = request.data.get('billing_ids', [])
            created_count = 0
            invoices = Invoice.objects.filter(invoice_id__in=billing_ids)
            for inv in invoices:
                if not Discharge.objects.filter(patient_id=inv.subject_id).exists():
                    latest_enc = Encounter.objects.filter(subject_id=inv.subject_id).order_by('-encounter_id').first()
                    Discharge.objects.create(
                        patient_id=inv.subject_id,
                        encounter_id=latest_enc.encounter_id if latest_enc else 0,
                        workflow_status='pending',
                        notice_datetime=timezone.now(),
                        billing_cleared_datetime=timezone.now()
                    )
                    created_count += 1
            return Response({"created": created_count})
