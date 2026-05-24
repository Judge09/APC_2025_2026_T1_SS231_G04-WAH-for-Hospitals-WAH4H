"""
Admission Views
===============
Trinity Architecture: Standard ModelViewSets with Direct ORM Access

Thin Views - business logic is in serializers.
All database queries use direct ORM - no service layers.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.db import transaction

from admission.models import Encounter, EncounterParticipant, Procedure, Schedule, Slot, Appointment
from accounts.models import Location
from patients.models import Patient

# Serializer Imports
from admission.serializers import (
    EncounterSerializer,
    EncounterDischargeSerializer,
    ProcedureSerializer,
    ScheduleSerializer,
    SlotSerializer,
    AppointmentSerializer,
)
from patients.wah4pc import (
    encounter_to_fhir, encounters_to_bundle,
    procedure_to_fhir, procedures_to_bundle,
    appointment_to_fhir, appointments_to_bundle,
    request_appointment,
)
from patients.models import WAH4PCTransaction

class EncounterViewSet(viewsets.ModelViewSet):
    """
    Standard ModelViewSet for Encounter (Admission) operations.
    Trinity Pattern: Thin view, fat serializer, direct ORM.
    
    Endpoints:
        GET /api/admission/encounters/ - List all encounters
        POST /api/admission/encounters/ - Create new encounter
        GET /api/admission/encounters/{identifier}/ - Retrieve encounter
        PUT /api/admission/encounters/{identifier}/ - Update encounter
        PATCH /api/admission/encounters/{identifier}/ - Partial update
        DELETE /api/admission/encounters/{identifier}/ - Delete encounter
        POST /api/admission/encounters/{identifier}/discharge/ - Discharge patient
        GET /api/admission/encounters/locations/ - Get location hierarchy
        GET /api/admission/encounters/search_patients/?q=term - Search patients
    """
    queryset = Encounter.objects.all().select_related().order_by('-period_start')
    serializer_class = EncounterSerializer
    lookup_field = 'identifier'
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['subject_id', 'status', 'class_field', 'location_id', 'participant_individual_id']
    search_fields = ['identifier', 'patient__first_name', 'patient__last_name']
    ordering_fields = ['period_start', 'period_end', 'created_at']
    ordering = ['-period_start']

    def get_queryset(self):
        qs = super().get_queryset()
        # Optional: ?mine=1 — used by the Monitoring page so doctors/nurses
        # see only their own patients. Never auto-applied; admission module
        # always sees all encounters regardless of role.
        if self.request.query_params.get('mine') == '1':
            user = self.request.user
            care_team_enc_ids = EncounterParticipant.objects.filter(
                practitioner_id=user.pk
            ).values_list('encounter_id', flat=True)
            qs = qs.filter(
                Q(participant_individual_id=user.pk) | Q(encounter_id__in=care_team_enc_ids)
            )
        return qs

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'discharge':
            return EncounterDischargeSerializer
        return EncounterSerializer

    @action(detail=False, methods=['get'], url_path='fhir')
    def fhir_list(self, request):
        """Return all encounters as a FHIR Bundle (for external FHIR consumers)."""
        queryset = self.filter_queryset(self.get_queryset())
        return Response(encounters_to_bundle(queryset))

    @action(detail=True, methods=['get'], url_path='fhir')
    def fhir_detail(self, request, identifier=None):
        """Return a single encounter as a FHIR Encounter resource."""
        return Response(encounter_to_fhir(self.get_object()))

    @action(detail=True, methods=['post'])
    def discharge(self, request, identifier=None):
        """
        Discharge a patient from encounter.
        Updates status to 'finished' and sets discharge details.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Return full encounter details after discharge
        return Response(
            EncounterSerializer(instance).data,
            status=status.HTTP_200_OK
        )

    # ------------------------------------------------------------------ #
    # Care team — assign nurses / doctors to an admitted encounter        #
    # ------------------------------------------------------------------ #

    @action(detail=True, methods=['get', 'post'], url_path='care_team')
    def care_team(self, request, identifier=None):
        """
        GET  /api/admission/encounters/{identifier}/care_team/  — list members
        POST /api/admission/encounters/{identifier}/care_team/  — add member
            Body: { "practitioner_id": <int>, "role_type": "ATND|PPRF|PART|NURSE|CONS|REF" }
        """
        encounter = self.get_object()

        if request.method == 'GET':
            members = EncounterParticipant.objects.filter(encounter=encounter)
            from accounts.models import Practitioner
            result = []
            for m in members:
                try:
                    p = Practitioner.objects.get(practitioner_id=m.practitioner_id)
                    full_name = f"{p.first_name} {p.last_name}".strip()
                    qualification = getattr(p, 'qualification_code', None) or ''
                except Exception:
                    full_name = f"Practitioner #{m.practitioner_id}"
                    qualification = ''
                result.append({
                    'id': m.pk,
                    'practitioner_id': m.practitioner_id,
                    'full_name': full_name,
                    'qualification': qualification,
                    'role_type': m.role_type,
                    'role_display': dict(EncounterParticipant.ROLE_CHOICES).get(m.role_type, m.role_type),
                    'added_at': m.added_at,
                })
            return Response(result, status=status.HTTP_200_OK)

        # POST — add member
        practitioner_id = request.data.get('practitioner_id')
        role_type = request.data.get('role_type', 'PART')

        if not practitioner_id:
            return Response({'error': 'practitioner_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_roles = [c[0] for c in EncounterParticipant.ROLE_CHOICES]
        if role_type not in valid_roles:
            return Response(
                {'error': f'role_type must be one of: {", ".join(valid_roles)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from accounts.models import Practitioner
        try:
            p = Practitioner.objects.get(practitioner_id=practitioner_id)
        except Practitioner.DoesNotExist:
            return Response({'error': 'Practitioner not found.'}, status=status.HTTP_404_NOT_FOUND)

        member, created = EncounterParticipant.objects.get_or_create(
            encounter=encounter,
            practitioner_id=practitioner_id,
            defaults={'role_type': role_type},
        )
        if not created:
            member.role_type = role_type
            member.save(update_fields=['role_type'])

        return Response({
            'id': member.pk,
            'practitioner_id': member.practitioner_id,
            'full_name': f"{p.first_name} {p.last_name}".strip(),
            'qualification': getattr(p, 'qualification_code', '') or '',
            'role_type': member.role_type,
            'role_display': dict(EncounterParticipant.ROLE_CHOICES).get(member.role_type, member.role_type),
            'added_at': member.added_at,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path=r'care_team/(?P<member_pk>\d+)')
    def care_team_remove(self, request, identifier=None, member_pk=None):
        """
        DELETE /api/admission/encounters/{identifier}/care_team/{id}/  — remove member
        """
        encounter = self.get_object()
        try:
            member = EncounterParticipant.objects.get(pk=member_pk, encounter=encounter)
        except EncounterParticipant.DoesNotExist:
            return Response({'error': 'Care team member not found.'}, status=status.HTTP_404_NOT_FOUND)
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def locations(self, request):
        """
        Get location hierarchy as {buildings, wards, rooms}.

        Handles any DB depth by recursively skipping intermediate nodes
        (wings, corridors) that sit between buildings→wards and wards→rooms.
        physical_type_code is used as a hint only; the algorithm stays robust
        when codes are missing or non-standard.
        """
        # Occupancy: count active encounters per location code
        occupancy = {}
        for enc in Encounter.objects.filter(status='in-progress'):
            if enc.location_ids:
                for code in enc.location_ids:
                    if code:
                        occupancy[code] = occupancy.get(code, 0) + 1

        all_locations = list(Location.objects.all())

        # Group by parent for O(1) child lookup
        loc_by_parent: dict[str | None, list] = {}
        for l in all_locations:
            key = str(l.part_of_location_id) if l.part_of_location_id else None
            loc_by_parent.setdefault(key, []).append(l)

        # Types treated as intermediate pass-through nodes (not wards or rooms)
        # physical_type codes that are never a top-level building
        ROOM_LEAF_TYPES  = frozenset({'ro', 'bd', 'co', 'ha'})
        PASS_THROUGH     = frozenset({'wi', 'si', 'bu', 'co', 'ha'})
        BED_TYPES        = frozenset({'bd'})

        def collect_wards(parent_id_str):
            """Return ward-level children, recursing through intermediate (pass-through) nodes."""
            result = []
            for child in loc_by_parent.get(parent_id_str, []):
                ptype = (child.physical_type_code or '').lower()
                if ptype in BED_TYPES:
                    continue
                if ptype in PASS_THROUGH:
                    result.extend(collect_wards(str(child.location_id)))
                else:
                    cid = str(child.location_id)
                    result.append({
                        "code": cid,
                        "name": child.name or f"Ward {cid}",
                        "type": ptype or "wa",
                        "capacity": 20,
                        "occupied": occupancy.get(cid, 0),
                    })
            return result

        def collect_rooms(ward_id_str):
            """Return room-level children, recursing through pass-through nodes."""
            result = []
            for child in loc_by_parent.get(ward_id_str, []):
                ptype = (child.physical_type_code or '').lower()
                if ptype in BED_TYPES:
                    continue
                if ptype in PASS_THROUGH:
                    result.extend(collect_rooms(str(child.location_id)))
                else:
                    cid = str(child.location_id)
                    bed_children = [c for c in loc_by_parent.get(cid, [])
                                    if (c.physical_type_code or '').lower() in BED_TYPES]
                    bed_count = len(bed_children) or 4
                    result.append({
                        "code": cid,
                        "name": child.name or f"Room {cid}",
                        "beds": bed_count,
                        "occupied": occupancy.get(cid, 0),
                    })
            return result

        data: dict = {"buildings": [], "wards": {}, "rooms": {}}

        for b in loc_by_parent.get(None, []):
            # Skip room/bed/corridor nodes that ended up at the top level — they are
            # not buildings and would break the cascade if treated as one.
            if (b.physical_type_code or '').lower() in ROOM_LEAF_TYPES:
                continue

            b_id = str(b.location_id)
            data["buildings"].append({"code": b_id, "name": b.name or f"Building {b_id}"})

            wards = collect_wards(b_id)
            data["wards"][b_id] = wards

            for ward in wards:
                wa_id = ward["code"]
                data["rooms"][wa_id] = collect_rooms(wa_id)

        # FALLBACK: If database has no buildings, return static data
        if not data["buildings"]:
            data = {
                "buildings": [
                    {"code": "MAIN",  "name": "Main Building"},
                    {"code": "ANNEX", "name": "Annex Building"},
                ],
                "wards": {
                    "MAIN": [
                        {"code": "GEN-WARD", "name": "General Ward",          "type": "wa", "capacity": 20, "occupied": occupancy.get("GEN-WARD", 0)},
                        {"code": "ICU",      "name": "Intensive Care Unit",   "type": "su", "capacity": 10, "occupied": occupancy.get("ICU", 0)},
                        {"code": "PEDIA",    "name": "Pediatrics Ward",       "type": "su", "capacity": 15, "occupied": occupancy.get("PEDIA", 0)},
                    ],
                    "ANNEX": [
                        {"code": "ISO",     "name": "Isolation Ward",        "type": "su", "capacity": 8,  "occupied": occupancy.get("ISO", 0)},
                        {"code": "ID-WARD", "name": "Infectious Disease",    "type": "su", "capacity": 10, "occupied": occupancy.get("ID-WARD", 0)},
                    ],
                },
                "rooms": {
                    "GEN-WARD": [
                        {"code": "GEN-101", "name": "Room 101", "beds": 4, "occupied": occupancy.get("GEN-101", 0)},
                        {"code": "GEN-102", "name": "Room 102", "beds": 4, "occupied": occupancy.get("GEN-102", 0)},
                        {"code": "GEN-103", "name": "Room 103", "beds": 4, "occupied": occupancy.get("GEN-103", 0)},
                        {"code": "GEN-104", "name": "Room 104", "beds": 4, "occupied": occupancy.get("GEN-104", 0)},
                        {"code": "GEN-105", "name": "Room 105", "beds": 4, "occupied": occupancy.get("GEN-105", 0)},
                    ],
                    "ICU": [
                        {"code": "ICU-01", "name": "ICU Bay 1", "beds": 1, "occupied": occupancy.get("ICU-01", 0)},
                        {"code": "ICU-02", "name": "ICU Bay 2", "beds": 1, "occupied": occupancy.get("ICU-02", 0)},
                        {"code": "ICU-03", "name": "ICU Bay 3", "beds": 1, "occupied": occupancy.get("ICU-03", 0)},
                    ],
                    "PEDIA": [
                        {"code": "PED-201", "name": "Room 201", "beds": 2, "occupied": occupancy.get("PED-201", 0)},
                        {"code": "PED-202", "name": "Room 202", "beds": 2, "occupied": occupancy.get("PED-202", 0)},
                    ],
                    "ISO": [
                        {"code": "ISO-01", "name": "Isolation 1", "beds": 1, "occupied": occupancy.get("ISO-01", 0)},
                        {"code": "ISO-02", "name": "Isolation 2", "beds": 1, "occupied": occupancy.get("ISO-02", 0)},
                    ],
                    "ID-WARD": [
                        {"code": "ID-01", "name": "Infect. Disease 01", "beds": 1, "occupied": occupancy.get("ID-01", 0)},
                        {"code": "ID-02", "name": "Infect. Disease 02", "beds": 1, "occupied": occupancy.get("ID-02", 0)},
                    ],
                },
            }

        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def search_patients(self, request):
        """
        Search for patients by name or patient ID.
        Uses direct ORM query with Q objects for flexible search.
        """
        query = request.query_params.get('q', '').strip()

        # Direct ORM query - no service layer
        if not query:
            patients = Patient.objects.filter(active=True).order_by('-id')[:10]
        else:
            patients = Patient.objects.filter(
                Q(first_name__icontains=query) | 
                Q(last_name__icontains=query) | 
                Q(patient_id__icontains=query),
                active=True
            ).order_by('-id')[:10]
        
        # Build response with patient summaries
        results = []
        for p in patients:
            results.append({
                'id': p.id,
                'patientId': p.patient_id,
                'name': f"{p.first_name} {p.last_name}",
                'firstName': p.first_name,
                'lastName': p.last_name,
                'dob': p.birthdate.isoformat() if p.birthdate else None,
                'age': p.age,
                'gender': p.gender,
                'contact': p.mobile_number,
                'philhealth': p.philhealth_id
            })
            
        return Response(results, status=status.HTTP_200_OK)


class ProcedureViewSet(viewsets.ModelViewSet):
    """
    Standard ModelViewSet for Procedure operations.
    Trinity Pattern: Thin view, fat serializer, direct ORM.
    
    Endpoints:
        GET /api/admission/procedures/ - List all procedures
        POST /api/admission/procedures/ - Create new procedure
        GET /api/admission/procedures/{identifier}/ - Retrieve procedure
        PUT /api/admission/procedures/{identifier}/ - Update procedure
        PATCH /api/admission/procedures/{identifier}/ - Partial update
        DELETE /api/admission/procedures/{identifier}/ - Delete procedure
    """
    queryset = Procedure.objects.all().select_related('encounter').order_by('-performed_datetime')
    serializer_class = ProcedureSerializer
    lookup_field = 'identifier'
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['encounter', 'subject_id', 'status', 'code_code', 'category_code']
    search_fields = ['identifier', 'code_display', 'note']
    ordering_fields = ['performed_datetime', 'performed_period_start', 'created_at']
    ordering = ['-performed_datetime']

    def get_queryset(self):
        """
        Optionally filter by encounter_id query parameter.
        Allows frontend to fetch all procedures for a specific encounter.
        """
        queryset = super().get_queryset()
        encounter_id = self.request.query_params.get('encounter_id', None)
        
        if encounter_id:
            queryset = queryset.filter(encounter__encounter_id=encounter_id)

        return queryset

    @action(detail=False, methods=['get'], url_path='fhir')
    def fhir_list(self, request):
        """Return all procedures as a FHIR Bundle (for external FHIR consumers)."""
        queryset = self.filter_queryset(self.get_queryset())
        return Response(procedures_to_bundle(queryset))

    @action(detail=True, methods=['get'], url_path='fhir')
    def fhir_detail(self, request, identifier=None):
        """Return a single procedure as a FHIR Procedure resource."""
        return Response(procedure_to_fhir(self.get_object()))

    def perform_create(self, serializer):
        """
        Override to pass request context for recorder_id assignment.
        """
        serializer.save()

    def perform_update(self, serializer):
        """
        Override to ensure atomic updates.
        """
        with transaction.atomic():
            serializer.save()


class ScheduleViewSet(viewsets.ModelViewSet):
    """
    FHIR Schedule — practitioner / location availability windows.

    Endpoints:
        GET    /api/admission/schedules/                    - List schedules
        POST   /api/admission/schedules/                    - Create schedule
        GET    /api/admission/schedules/{identifier}/       - Retrieve
        PUT    /api/admission/schedules/{identifier}/       - Full update
        PATCH  /api/admission/schedules/{identifier}/       - Partial update
        DELETE /api/admission/schedules/{identifier}/       - Delete
        GET    /api/admission/schedules/{identifier}/slots/ - List slots for this schedule
    """
    queryset = Schedule.objects.all().order_by('-planning_horizon_start')
    serializer_class = ScheduleSerializer
    lookup_field = 'identifier'
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'actor_practitioner_id', 'actor_location_id',
        'actor_organization_id', 'status',
    ]
    search_fields = ['identifier', 'service_type_display', 'specialty_display', 'comment']
    ordering_fields = ['planning_horizon_start', 'planning_horizon_end', 'created_at']
    ordering = ['-planning_horizon_start']

    def get_queryset(self):
        qs = super().get_queryset()
        # ?date_from=YYYY-MM-DD  &date_to=YYYY-MM-DD  narrow by horizon overlap
        date_from = self.request.query_params.get('date_from')
        date_to   = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(planning_horizon_end__gte=date_from)
        if date_to:
            qs = qs.filter(planning_horizon_start__lte=date_to)
        return qs

    @action(detail=True, methods=['get'])
    def slots(self, request, identifier=None):
        """Return all Slots belonging to this Schedule."""
        schedule = self.get_object()
        slot_qs = Slot.objects.filter(schedule=schedule).order_by('start')

        slot_status = request.query_params.get('status')
        if slot_status:
            slot_qs = slot_qs.filter(status=slot_status)

        serializer = SlotSerializer(slot_qs, many=True, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_200_OK)


class SlotViewSet(viewsets.ModelViewSet):
    """
    FHIR Slot — individual bookable time blocks within a Schedule.

    Endpoints:
        GET    /api/admission/slots/              - List slots (filter: schedule, status, date range)
        POST   /api/admission/slots/              - Create slot
        GET    /api/admission/slots/{identifier}/ - Retrieve slot
        PUT    /api/admission/slots/{identifier}/ - Full update
        PATCH  /api/admission/slots/{identifier}/ - Partial update
        DELETE /api/admission/slots/{identifier}/ - Delete slot
        GET    /api/admission/slots/available/    - Free slots (supports ?practitioner_id, ?date_from, ?date_to)
    """
    queryset = Slot.objects.select_related('schedule').order_by('start')
    serializer_class = SlotSerializer
    lookup_field = 'identifier'
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['schedule', 'status', 'service_type_code', 'specialty_code']
    search_fields = ['identifier', 'comment', 'service_type_display']
    ordering_fields = ['start', 'end', 'created_at']
    ordering = ['start']

    def get_queryset(self):
        qs = super().get_queryset()
        date_from = self.request.query_params.get('date_from')
        date_to   = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(start__gte=date_from)
        if date_to:
            qs = qs.filter(end__lte=date_to)
        return qs

    @action(detail=False, methods=['get'])
    def available(self, request):
        """
        List only free slots.
        Optional query params: practitioner_id, location_id, date_from, date_to
        """
        qs = Slot.objects.select_related('schedule').filter(status='free').order_by('start')

        practitioner_id = request.query_params.get('practitioner_id')
        location_id     = request.query_params.get('location_id')
        date_from       = request.query_params.get('date_from')
        date_to         = request.query_params.get('date_to')

        if practitioner_id:
            qs = qs.filter(schedule__actor_practitioner_id=practitioner_id)
        if location_id:
            qs = qs.filter(schedule__actor_location_id=location_id)
        if date_from:
            qs = qs.filter(start__gte=date_from)
        if date_to:
            qs = qs.filter(end__lte=date_to)

        serializer = SlotSerializer(qs, many=True, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_200_OK)


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    FHIR Appointment — patient booking lifecycle management.

    Endpoints:
        GET    /api/admission/appointments/                        - List appointments
        POST   /api/admission/appointments/                        - Book appointment
        GET    /api/admission/appointments/{identifier}/           - Retrieve
        PUT    /api/admission/appointments/{identifier}/           - Full update
        PATCH  /api/admission/appointments/{identifier}/           - Partial update
        DELETE /api/admission/appointments/{identifier}/           - Delete
        POST   /api/admission/appointments/{identifier}/cancel/    - Cancel appointment
        POST   /api/admission/appointments/{identifier}/arrive/    - Mark patient as arrived
        POST   /api/admission/appointments/{identifier}/fulfill/   - Mark fulfilled (links Encounter)
        GET    /api/admission/appointments/search_patients/        - Search patients for booking
    """
    queryset = Appointment.objects.all().order_by('start')
    serializer_class = AppointmentSerializer
    lookup_field = 'identifier'
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'patient_id', 'practitioner_id', 'status',
        'slot_id', 'service_type_code', 'specialty_code',
    ]
    search_fields = ['identifier', 'description', 'comment', 'reason_code']
    ordering_fields = ['start', 'end', 'created_at']
    ordering = ['start']

    def get_queryset(self):
        qs = super().get_queryset()
        date_from = self.request.query_params.get('date_from')
        date_to   = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(start__gte=date_from)
        if date_to:
            qs = qs.filter(end__lte=date_to)
        # Role-based filtering: doctor/nurse see only their own appointments
        user = self.request.user
        role = getattr(user, 'role', None)
        if role in ('doctor', 'nurse'):
            qs = qs.filter(practitioner_id=user.pk)
        return qs

    @action(detail=False, methods=['get'], url_path='fhir')
    def fhir_list(self, request):
        """Return all appointments as a FHIR Bundle (for external FHIR consumers)."""
        queryset = self.filter_queryset(self.get_queryset())
        return Response(appointments_to_bundle(queryset))

    @action(detail=True, methods=['get'], url_path='fhir')
    def fhir_detail(self, request, identifier=None):
        """Return a single appointment as a FHIR Appointment resource."""
        return Response(appointment_to_fhir(self.get_object()))

    # ------------------------------------------------------------------ #
    # Status-transition actions                                            #
    # ------------------------------------------------------------------ #

    @action(detail=True, methods=['post'])
    def cancel(self, request, identifier=None):
        """
        Cancel an appointment.
        Body (optional): { "cancellation_reason_code": "...", "cancellation_reason_display": "..." }
        """
        instance = self.get_object()
        if instance.status in ('fulfilled', 'entered-in-error'):
            return Response(
                {"detail": f"Cannot cancel an appointment with status '{instance.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = {
            'status': 'cancelled',
            **{k: v for k, v in request.data.items()
               if k in ('cancellation_reason_code', 'cancellation_reason_display')},
        }
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def arrive(self, request, identifier=None):
        """Mark the patient as arrived; moves status from booked → arrived."""
        instance = self.get_object()
        if instance.status != 'booked':
            return Response(
                {"detail": f"Expected status 'booked', got '{instance.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(
            instance,
            data={
                'status': 'arrived',
                'patient_participation_status': 'accepted',
            },
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def fulfill(self, request, identifier=None):
        """
        Mark appointment as fulfilled and optionally link to resulting Encounter.
        Body (optional): { "resulting_encounter_id": <int> }
        """
        instance = self.get_object()
        if instance.status not in ('booked', 'arrived', 'checked-in'):
            return Response(
                {"detail": f"Cannot fulfill an appointment with status '{instance.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = {'status': 'fulfilled'}
        if 'resulting_encounter_id' in request.data:
            data['resulting_encounter_id'] = request.data['resulting_encounter_id']

        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------ #
    # Patient search (mirrors EncounterViewSet.search_patients)           #
    # ------------------------------------------------------------------ #

    @action(detail=False, methods=['get'])
    def search_patients(self, request):
        """Search patients by name or ID for the appointment booking form."""
        query = request.query_params.get('q', '').strip()

        if not query:
            patients = Patient.objects.filter(active=True).order_by('-id')[:10]
        else:
            patients = Patient.objects.filter(
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(patient_id__icontains=query),
                active=True,
            ).order_by('-id')[:10]

        results = []
        for p in patients:
            results.append({
                'id': p.id,
                'patient_id': p.patient_id,
                'full_name': f"{p.first_name} {p.last_name}".strip(),
                'first_name': p.first_name,
                'last_name': p.last_name,
                'dob': p.birthdate.isoformat() if p.birthdate else None,
                'age': p.age,
                'gender': p.gender,
                'contact': p.mobile_number,
                'philhealth': p.philhealth_id,
            })
        return Response(results, status=status.HTTP_200_OK)

    # ------------------------------------------------------------------ #
    # WAH4PC gateway — fetch appointments from WAH4Patient mobile app     #
    # ------------------------------------------------------------------ #

    @action(detail=False, methods=['post'], url_path='wah4pc/fetch')
    def wah4pc_fetch(self, request):
        """
        Request appointment data for a patient from the WAH4PC gateway
        (i.e. appointments booked via the WAH4Patient mobile app).

        Body:
            targetProviderId  — UUID of the provider / gateway node to query
            philHealthId      — Patient's PhilHealth ID to look up
            reason            — (optional) human-readable reason string
            notes             — (optional) extra notes

        Returns 202 with { transactionId, ... } on success.
        The gateway delivers the FHIR Appointment Bundle asynchronously via
        the webhook at /api/patients/wah4pc/webhook/receive-push/, which will
        import the appointments into the local database automatically.
        """
        target_id = request.data.get('targetProviderId')
        philhealth_id = request.data.get('philHealthId')
        if not target_id or not philhealth_id:
            return Response(
                {'error': 'targetProviderId and philHealthId are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get('reason', 'Appointment sync from WAH4Patient')
        notes = request.data.get('notes')
        result = request_appointment(target_id, philhealth_id, reason=reason, notes=notes)

        if 'error' in result:
            return Response(
                {'error': result['error']},
                status=result.get('status_code', 500),
            )

        _data = result.get('data') or {}
        txn_id = (
            result.get('transactionId') or
            result.get('id') or
            _data.get('transactionId') or
            _data.get('id')
        )
        idempotency_key = result.get('idempotency_key')

        if not txn_id:
            return Response(
                {'error': 'Gateway did not return a transaction ID. Check credentials or try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        WAH4PCTransaction.objects.get_or_create(
            transaction_id=txn_id,
            defaults={
                'type':               'fetch',
                'status':             'PENDING',
                'target_provider_id': target_id,
                'idempotency_key':    idempotency_key,
            },
        )

        return Response({**result, 'transactionId': txn_id}, status=status.HTTP_202_ACCEPTED)
