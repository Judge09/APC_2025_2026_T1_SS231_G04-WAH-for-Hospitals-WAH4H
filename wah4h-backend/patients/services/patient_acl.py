"""
Patient Service Layer (Anti-Corruption Layer)
==============================================
Fortress Pattern Entry Point for Patient Module

This is the ONLY file allowed to import Patient models.
All other apps (admission, billing, etc.) MUST use this ACL.

Returns: Dictionaries (DTOs) only - NO Django model objects.

CRITICAL: All lookup methods use INTEGER primary key (id), NOT string patient_id.
This aligns with foreign key references from other apps (e.g., Encounter.subject_id).

Refactored: 2026-02-04 to support Admission/Encounter integration
- Enriched summary DTO with granular name fields
- Added encounter_id filtering to conditions and allergies
"""

import logging
from typing import Optional, List, Dict, Any
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q

# FORTRESS BOUNDARY: Only this file imports patient models
from patients.models import Patient, Condition, AllergyIntolerance, Immunization

logger = logging.getLogger(__name__)


# ============================================================================
# PATIENT VALIDATION
# ============================================================================

def validate_patient_exists(patient_id: int) -> bool:
    """Lightweight check if patient exists by integer primary key."""
    try:
        return Patient.objects.filter(id=patient_id).exists()
    except Exception:
        return False


# ============================================================================
# PATIENT RETRIEVAL
# ============================================================================

def get_patient_summary(patient_id: int) -> Optional[Dict[str, Any]]:
    """Get patient summary by integer primary key. Returns None if not found."""
    try:
        return _patient_to_dict(Patient.objects.get(id=patient_id))
    except ObjectDoesNotExist:
        return None
    except Exception:
        logger.exception("Unexpected error in get_patient_summary for id=%s", patient_id)
        return None


def get_patient_details(patient_id: int) -> Optional[Dict[str, Any]]:
    """Get full patient details by integer primary key. Returns None if not found."""
    try:
        return _patient_to_dict(Patient.objects.get(id=patient_id))
    except ObjectDoesNotExist:
        return None
    except Exception:
        logger.exception("Unexpected error in get_patient_details for id=%s", patient_id)
        return None


# ============================================================================
# PATIENT SEARCH
# ============================================================================

def search_patients(query: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Search active patients by name or patient ID string.
    Returns all active patients (ordered by name) when query is empty.
    """
    base_qs = Patient.objects.filter(status='active').order_by('last_name', 'first_name')

    if not query:
        return [_patient_to_dict(p) for p in base_qs[:limit]]

    if len(query.strip()) < 2:
        return []

    try:
        q = query.strip()
        words = q.split()
        if len(words) > 1:
            # Multi-word: every word must appear in at least one name field
            combined = Q()
            for word in words:
                combined &= (
                    Q(patient_id__icontains=word) |
                    Q(first_name__icontains=word) |
                    Q(last_name__icontains=word) |
                    Q(middle_name__icontains=word) |
                    Q(suffix_name__icontains=word)
                )
            patients = base_qs.filter(combined)[:limit]
        else:
            patients = base_qs.filter(
                Q(patient_id__icontains=q) |
                Q(first_name__icontains=q) |
                Q(last_name__icontains=q) |
                Q(middle_name__icontains=q) |
                Q(suffix_name__icontains=q)
            )[:limit]
        return [_patient_to_dict(p) for p in patients]
    except Exception:
        logger.exception("Unexpected error in search_patients for query=%r", query)
        return []


# ============================================================================
# PATIENT CONDITIONS
# ============================================================================

def get_patient_conditions(patient_id: int, encounter_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Get all conditions for a patient, optionally filtered by encounter."""
    return _fetch_related(patient_id, Condition, _condition_to_dict, encounter_id)


def get_active_patient_conditions(patient_id: int, encounter_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Get active conditions for a patient, optionally filtered by encounter."""
    return _fetch_related(patient_id, Condition, _condition_to_dict, encounter_id, clinical_status='active')


# ============================================================================
# PATIENT ALLERGIES
# ============================================================================

def get_patient_allergies(patient_id: int, encounter_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Get all allergies for a patient, optionally filtered by encounter."""
    return _fetch_related(patient_id, AllergyIntolerance, _allergy_to_dict, encounter_id)


def get_active_patient_allergies(patient_id: int, encounter_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Get active allergies for a patient, optionally filtered by encounter."""
    return _fetch_related(patient_id, AllergyIntolerance, _allergy_to_dict, encounter_id, clinical_status='active')


# ============================================================================
# PATIENT IMMUNIZATIONS
# ============================================================================

def get_patient_immunizations(patient_id: int, encounter_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Get all immunizations for a patient, optionally filtered by encounter."""
    return _fetch_related(patient_id, Immunization, _immunization_to_dict, encounter_id)


# ============================================================================
# INTERNAL HELPERS (Private - Do not export)
# ============================================================================

def _fetch_related(patient_id: int, model, serializer, encounter_id: Optional[int], **filters) -> List[Dict[str, Any]]:
    """
    Generic helper: fetch related records for a patient, with optional
    encounter filter and arbitrary extra filters (e.g. clinical_status='active').
    """
    try:
        patient = Patient.objects.get(id=patient_id)
        qs = model.objects.filter(patient=patient, **filters)
        if encounter_id is not None:
            qs = qs.filter(encounter_id=encounter_id)
        return [serializer(obj) for obj in qs.order_by('-created_at')]
    except ObjectDoesNotExist:
        return []
    except Exception:
        logger.exception("Unexpected error fetching %s for patient_id=%s", model.__name__, patient_id)
        return []


def _compute_full_name(patient: Patient) -> str:
    parts = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix_name]
    return " ".join(p for p in parts if p) or "Unknown"


def _patient_to_dict(patient: Patient) -> Dict[str, Any]:
    """Convert Patient model to DTO dictionary."""
    return {
        'id': patient.id,
        'patient_id': patient.patient_id or "",
        'full_name': _compute_full_name(patient),
        'first_name': patient.first_name or "",
        'last_name': patient.last_name or "",
        'middle_name': patient.middle_name or "",
        'suffix_name': patient.suffix_name or "",
        'gender': patient.gender or "",
        'birthdate': patient.birthdate.isoformat() if patient.birthdate else None,
        'age': patient.age,
        'civil_status': patient.civil_status or "",
        'nationality': patient.nationality or "",
        'religion': patient.religion or "",
        'philhealth_id': patient.philhealth_id or "",
        'blood_type': patient.blood_type or "",
        'pwd_type': patient.pwd_type or "",
        'occupation': patient.occupation or "",
        'education': patient.education or "",
        'mobile_number': patient.mobile_number or "",
        'address_line': patient.address_line or "",
        'address_city': patient.address_city or "",
        'address_district': patient.address_district or "",
        'address_state': patient.address_state or "",
        'address_postal_code': patient.address_postal_code or "",
        'address_country': patient.address_country or "",
        'contact_first_name': patient.contact_first_name or "",
        'contact_last_name': patient.contact_last_name or "",
        'contact_mobile_number': patient.contact_mobile_number or "",
        'contact_relationship': patient.contact_relationship or "",
        'indigenous_flag': patient.indigenous_flag,
        'indigenous_group': patient.indigenous_group or "",
        'consent_flag': patient.consent_flag,
        'image_url': patient.image_url or "",
        'active': patient.active,
        'status': patient.status or 'active',
        'created_at': patient.created_at.isoformat(),
        'updated_at': patient.updated_at.isoformat(),
    }


def _condition_to_dict(condition: Condition) -> Dict[str, Any]:
    return {
        'condition_id': condition.condition_id,
        'identifier': condition.identifier,
        'code': condition.code,
        'clinical_status': condition.clinical_status or "",
        'verification_status': condition.verification_status or "",
        'category': condition.category or "",
        'severity': condition.severity or "",
        'body_site': condition.body_site or "",
        'onset_datetime': condition.onset_datetime.isoformat() if condition.onset_datetime else None,
        'recorded_date': condition.recorded_date.isoformat() if condition.recorded_date else None,
        'note': condition.note or "",
        'encounter_id': condition.encounter_id,
        'patient_id': condition.patient.patient_id if condition.patient else None,
    }


def _allergy_to_dict(allergy: AllergyIntolerance) -> Dict[str, Any]:
    return {
        'allergy_id': allergy.allergy_id,
        'identifier': allergy.identifier,
        'code': allergy.code,
        'clinical_status': allergy.clinical_status or "",
        'verification_status': allergy.verification_status or "",
        'type': allergy.type or "",
        'category': allergy.category or "",
        'criticality': allergy.criticality or "",
        'onset_datetime': allergy.onset_datetime.isoformat() if allergy.onset_datetime else None,
        'recorded_date': allergy.recorded_date.isoformat() if allergy.recorded_date else None,
        'last_occurrence': allergy.last_occurrence or "",
        'reaction_description': allergy.reaction_description or "",
        'reaction_severity': allergy.reaction_severity or "",
        'reaction_manifestation': allergy.reaction_manifestation or "",
        'note': allergy.note or "",
        'encounter_id': allergy.encounter_id,
        'patient_id': allergy.patient.patient_id if allergy.patient else None,
    }


def _immunization_to_dict(immunization: Immunization) -> Dict[str, Any]:
    return {
        'immunization_id': immunization.immunization_id,
        'identifier': immunization.identifier,
        'status': immunization.status,
        'vaccine_code': immunization.vaccine_code or "",
        'vaccine_display': immunization.vaccine_display or "",
        'occurrence_datetime': immunization.occurrence_datetime.isoformat() if immunization.occurrence_datetime else None,
        'lot_number': immunization.lot_number or "",
        'dose_quantity_value': immunization.dose_quantity_value or "",
        'dose_quantity_unit': immunization.dose_quantity_unit or "",
        'note': immunization.note or "",
        'encounter_id': immunization.encounter_id,
        'patient_id': immunization.patient.patient_id if immunization.patient else None,
    }
