"""
patients/services/patients_services.py

Patient Write-Only Service Layer - State Change Operations
===========================================================

Purpose:
    Handles all state-changing operations (CREATE, UPDATE) for the patients app.
    Responsible for data integrity, deduplication, and sequential hospital ID generation.

Architecture Pattern: Fortress Pattern (Write-Only Service)
    - IMPORTS: Only from patients.models (NO external app imports)
    - TRANSACTIONS: All write operations use @transaction.atomic
    - VALIDATION: Strict deduplication and referential integrity checks
    - ID GENERATION: Sequential hospital IDs with year-based partitioning

Service Classes:
    - PatientRegistrationService: Patient creation with deduplication and ID generation
    - ClinicalDataService: Clinical data recording (Condition, Allergy, Immunization)

Context: Philippine LGU Hospital System
Author: Senior Python Backend Architect
Date: 2026-02-04
"""

from typing import Dict, Any, Optional
from datetime import datetime
from django.db import transaction
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.db.models import Q

# FORTRESS PATTERN: Import ONLY from patients.models
from patients.models import (
    Patient,
    Condition,
    AllergyIntolerance,
    Immunization,
)


class PatientRegistrationService:
    """
    Patient Registration Service - Handles Patient Creation with Deduplication.
    
    Responsibilities:
        - Deduplication: Prevents duplicate patient records
        - ID Generation: Generates sequential hospital IDs (WAH-YYYY-XXXXX)
        - Transaction Safety: All operations are atomic
    
    Hospital ID Format:
        WAH-{YEAR}-{SEQUENCE}
        Examples:
            - WAH-2026-00001 (First patient in 2026)
            - WAH-2026-00123 (123rd patient in 2026)
            - WAH-2027-00001 (First patient in 2027, resets sequence)
    """
    
    @staticmethod
    @transaction.atomic
    def register_patient(data: Dict[str, Any]) -> Patient:
        """
        Register a new patient with deduplication and automatic ID generation.
        
        Workflow:
            1. Deduplication check (first_name + last_name + birthdate)
            2. Generate hospital ID if not provided (WAH-YYYY-XXXXX format)
            3. Create patient record
            4. Return created patient
        
        Args:
            data: Dictionary containing patient registration data
                Required fields (for deduplication):
                    - first_name: str
                    - last_name: str
                    - birthdate: date or str (YYYY-MM-DD)
                Optional fields:
                    - patient_id: str (if not provided, will be auto-generated)
                    - All other Patient model fields
        
        Returns:
            Patient: Created patient instance
        
        Raises:
            ValidationError: If duplicate patient found or validation fails
        
        Transaction Safety:
            - Operation is atomic (all-or-nothing)
            - Rollback on any error
            - Prevents race conditions in ID generation
        """
        
        # ====================================================================
        # STEP 1: DEDUPLICATION CHECK
        # ====================================================================
        
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        birthdate = data.get('birthdate')
        
        # Validate required fields for deduplication
        if not first_name or not last_name or not birthdate:
            raise ValidationError(
                "first_name, last_name, and birthdate are required for patient registration"
            )
        
        # Check for existing patient (case-insensitive name match)
        existing_patient = Patient.objects.filter(
            Q(first_name__iexact=first_name) &
            Q(last_name__iexact=last_name) &
            Q(birthdate=birthdate)
        ).first()
        
        if existing_patient:
            raise ValidationError(
                f"Patient with name '{first_name} {last_name}' and birthdate '{birthdate}' "
                f"already exists (ID: {existing_patient.patient_id or existing_patient.id})"
            )
        
        # ====================================================================
        # STEP 2: HOSPITAL ID GENERATION (if not provided)
        # ====================================================================
        
        if not data.get('patient_id'):
            data['patient_id'] = PatientRegistrationService._generate_hospital_id()
        
        # ====================================================================
        # STEP 3: CREATE PATIENT RECORD
        # ====================================================================
        
        patient = Patient.objects.create(**data)
        
        return patient
    
    @staticmethod
    def _generate_hospital_id() -> str:
        """
        Generate sequential hospital ID with year-based partitioning.

        Format: WAH-{YYYY}-{XXXXX}

        Algorithm:
            1. Get current year
            2. Lock all existing rows that share the current year prefix
               using SELECT FOR UPDATE so no other concurrent transaction
               can read or insert until this transaction commits.
            3. Parse the highest sequence number and increment it.
            4. Default to 00001 if no patients exist for the year yet.

        Returns:
            str: Generated hospital ID (e.g., "WAH-2026-00001")

        Concurrency:
            Must be called inside @transaction.atomic (enforced by the
            calling method).  select_for_update() acquires a row-level
            lock on every existing patient with this year's prefix.
            A second concurrent transaction attempting the same query
            will block until the first one commits, guaranteeing that
            each transaction sees the latest committed sequence number
            before generating the next one.

            Edge case – first patient of the year:
            When no rows exist yet there is nothing to lock, so two
            perfectly simultaneous first-registrations of the year could
            still race and both compute sequence 1.  The UNIQUE constraint
            on patient_id will reject one of them with an IntegrityError,
            which propagates out of register_patient() and is caught by
            the view as a 500.  This is an extremely rare scenario (one
            registration per calendar-year-boundary) and is handled
            safely by the database constraint.
        """
        current_year = datetime.now().year
        prefix = f"WAH-{current_year}-"

        # Lock all rows with this year's prefix for the duration of the
        # transaction.  Any concurrent writer will block here until we
        # commit, guaranteeing a consistent read of the latest sequence.
        latest_patient = (
            Patient.objects
            .filter(patient_id__startswith=prefix)
            .select_for_update()          # row-level write lock
            .order_by('-patient_id')
            .first()
        )

        if latest_patient and latest_patient.patient_id:
            # Extract sequence: "WAH-2026-00123" → 123
            try:
                last_sequence = int(latest_patient.patient_id.split('-')[-1])
                new_sequence = last_sequence + 1
            except (ValueError, IndexError):
                new_sequence = 1
        else:
            # First patient registered this calendar year
            new_sequence = 1

        return f"{prefix}{new_sequence:05d}"


class ClinicalDataService:
    """
    Clinical Data Recording Service - Handles Condition, Allergy, and Immunization Records.
    
    Responsibilities:
        - Validate patient existence before recording clinical data
        - Create clinical records linked to patients
        - Maintain referential integrity
    
    Transaction Safety:
        - Each method is atomic
        - Rollback on validation failures
    """
    
    @staticmethod
    @transaction.atomic
    def record_condition(patient_id: int, data: Dict[str, Any]) -> Condition:
        """
        Record a new medical condition for a patient.
        
        Args:
            patient_id: Patient ID (primary key, not patient_id string)
            data: Dictionary containing condition data
                Required fields:
                    - identifier: str (unique)
                    - code: str
                    - encounter_id: int
                Optional fields:
                    - All other Condition model fields
        
        Returns:
            Condition: Created condition instance
        
        Raises:
            ValidationError: If patient does not exist or validation fails
        """
        
        # Validate patient exists
        try:
            patient = Patient.objects.get(id=patient_id)
        except ObjectDoesNotExist:
            raise ValidationError(f"Patient with id={patient_id} does not exist")
        
        # Link condition to patient
        data['patient'] = patient
        
        # Create condition record
        condition = Condition.objects.create(**data)
        
        return condition
    
    @staticmethod
    @transaction.atomic
    def record_allergy(patient_id: int, data: Dict[str, Any]) -> AllergyIntolerance:
        """
        Record a new allergy/intolerance for a patient.
        
        Args:
            patient_id: Patient ID (primary key, not patient_id string)
            data: Dictionary containing allergy data
                Required fields:
                    - identifier: str (unique)
                    - code: str
                    - encounter_id: int
                Optional fields:
                    - All other AllergyIntolerance model fields
        
        Returns:
            AllergyIntolerance: Created allergy instance
        
        Raises:
            ValidationError: If patient does not exist or validation fails
        """
        
        # Validate patient exists
        try:
            patient = Patient.objects.get(id=patient_id)
        except ObjectDoesNotExist:
            raise ValidationError(f"Patient with id={patient_id} does not exist")
        
        # Link allergy to patient
        data['patient'] = patient
        
        # Create allergy record
        allergy = AllergyIntolerance.objects.create(**data)
        
        return allergy
    
    @staticmethod
    @transaction.atomic
    def record_immunization(patient_id: int, data: Dict[str, Any]) -> Immunization:
        """
        Record a new immunization for a patient.
        
        Args:
            patient_id: Patient ID (primary key, not patient_id string)
            data: Dictionary containing immunization data
                Required fields:
                    - identifier: str (unique)
                    - status: str
                    - encounter_id: int
                Optional fields:
                    - All other Immunization model fields
        
        Returns:
            Immunization: Created immunization instance
        
        Raises:
            ValidationError: If patient does not exist or validation fails
        """
        
        # Validate patient exists
        try:
            patient = Patient.objects.get(id=patient_id)
        except ObjectDoesNotExist:
            raise ValidationError(f"Patient with id={patient_id} does not exist")
        
        # Link immunization to patient
        data['patient'] = patient
        
        # Create immunization record
        immunization = Immunization.objects.create(**data)
        
        return immunization


# ============================================================================
# ADDITIONAL PATIENT MANAGEMENT SERVICES
# ============================================================================

class PatientUpdateService:
    """
    Patient Update Service - Handles Patient Data Updates.
    
    Note: Future implementation for patient updates, demographic changes, etc.
    """
    
    @staticmethod
    @transaction.atomic
    def update_patient(patient_id: int, data: Dict[str, Any]) -> Patient:
        """
        Update existing patient information.
        
        Args:
            patient_id: Patient ID (primary key)
            data: Dictionary containing fields to update
        
        Returns:
            Patient: Updated patient instance
        
        Raises:
            ValidationError: If patient does not exist
        """
        try:
            patient = Patient.objects.get(id=patient_id)
        except ObjectDoesNotExist:
            raise ValidationError(f"Patient with id={patient_id} does not exist")
        
        # Update fields (exclude patient_id and id from updates)
        protected_fields = {'id', 'patient_id', 'created_at'}
        for key, value in data.items():
            if key not in protected_fields and hasattr(patient, key):
                setattr(patient, key, value)
        
        patient.save()
        return patient


__all__ = [
    'PatientRegistrationService',
    'ClinicalDataService',
    'PatientUpdateService',
]
