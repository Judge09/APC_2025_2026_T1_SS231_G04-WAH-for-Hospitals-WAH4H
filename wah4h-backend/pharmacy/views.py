import logging
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Inventory, Medication, MedicationRequest, MedicationAdministration
from .serializers import (
    InventorySerializer,
    InventoryListSerializer,
    MedicationSerializer,
    MedicationRequestSerializer,
    MedicationRequestListSerializer,
    MedicationAdministrationSerializer,
)
from django_filters.rest_framework import DjangoFilterBackend
from patients.wah4pc import medicationrequest_to_fhir, medicationrequests_to_bundle

logger = logging.getLogger(__name__)


class InventoryViewSet(viewsets.ModelViewSet):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return InventoryListSerializer
        return InventorySerializer

class MedicationViewSet(viewsets.ModelViewSet):
    queryset = Medication.objects.all()
    serializer_class = MedicationSerializer

class MedicationRequestViewSet(viewsets.ModelViewSet):
    queryset = MedicationRequest.objects.all()
    serializer_class = MedicationRequestSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'encounter_id']

    def get_serializer_class(self):
        if self.action in ('list', 'by_encounter'):
            return MedicationRequestListSerializer
        return MedicationRequestSerializer

    @action(detail=False, methods=['get'], url_path='by-encounter')
    def by_encounter(self, request):
        encounter_id = request.query_params.get('encounter_id')
        if not encounter_id:
            return Response({"error": "encounter_id parameter is required"}, status=400)
            
        requests = self.queryset.filter(encounter_id=encounter_id)
        serializer = self.get_serializer(requests, many=True, context=self._get_prefetch_context(requests))
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        return Response(medicationrequests_to_bundle(queryset))

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response(medicationrequest_to_fhir(instance))

    def _get_prefetch_context(self, queryset):
        """
        Helper to fetch related entities in bulk.
        """
        subject_ids = set()
        practitioner_ids = set()

        for req in queryset:
            if req.subject_id:
                subject_ids.add(req.subject_id)
            if req.requester_id:
                practitioner_ids.add(req.requester_id)
        
        patients_map = {}
        if subject_ids:
            from patients.models import Patient
            patients = Patient.objects.filter(id__in=subject_ids)
            patients_map = {p.id: p for p in patients}

        practitioners_map = {}
        if practitioner_ids:
            from accounts.models import Practitioner
            practitioners = Practitioner.objects.filter(practitioner_id__in=practitioner_ids)
            practitioners_map = {p.practitioner_id: p for p in practitioners}

        return {
            'patients_map': patients_map,
            'practitioners_map': practitioners_map
        }

    @action(detail=True, methods=['post', 'patch'], url_path='update-status')
    def update_status(self, request, pk=None):
        from django.db import transaction
        
        medication_request = self.get_object()
        status = request.data.get('status')
        note = request.data.get('note')
        
        if not status:
            return Response({"error": "status is required"}, status=400)
            
        try:
            with transaction.atomic():
                # Inventory Deduction Logic
                if status == 'completed' and medication_request.status != 'completed':
                    dispense_qty = float(request.data.get('quantity') or medication_request.dispense_quantity or 0)
                    
                    # Find associated inventory item
                    inventory_item = Inventory.objects.filter(item_code=medication_request.medication_code).first()
                    if not inventory_item and medication_request.medication_display:
                        inventory_item = Inventory.objects.filter(item_name__iexact=medication_request.medication_display).first()
                    
                    if inventory_item:
                        if inventory_item.current_stock < dispense_qty:
                            return Response({"error": f"Insufficient stock. Available: {inventory_item.current_stock}"}, status=400)
                        
                        # Use update fields to ensure minimal footprint, though simpler -= is fine inside atomic
                        inventory_item.current_stock -= int(dispense_qty)
                        inventory_item.save()
                        
                        # Update dispense quantity in request record if provided
                        if request.data.get('quantity'):
                            medication_request.dispense_quantity = dispense_qty
                    else:
                        logger.warning(f"No inventory item found for {medication_request.medication_display}")
    
                medication_request.status = status
                if note:
                   medication_request.note = note
                   
                medication_request.save()
                
            return Response(self.get_serializer(medication_request).data)
            
        except Exception as e:
            logger.error(f"Error updating medication request: {e}")
            return Response({"error": str(e)}, status=500)

class MedicationAdministrationViewSet(viewsets.ModelViewSet):
    queryset = MedicationAdministration.objects.all()
    serializer_class = MedicationAdministrationSerializer