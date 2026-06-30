"""
Patient API Serializers
=======================
CQRS-Lite Pattern: Separate Input/Output serializers with Service delegation.

Input Serializers: Validation only (ModelSerializer for field rules)
Output Serializers: Pure DTO mapping (Serializer for ACL data)
"""

from rest_framework import serializers
from patients.models import Patient, Condition, AllergyIntolerance, Immunization
from datetime import date


# ============================================================================
# PATIENT SERIALIZERS (CQRS-Lite)
# ============================================================================

class PatientInputSerializer(serializers.ModelSerializer):
    """
    Patient Input Serializer (Write Operations)
    
    Used for: POST, PUT, PATCH
    Purpose: Validation only - enforces business rules
    Delegates to: PatientRegistrationService
    
    Validation Rules:
    - birthdate cannot be in the future
    - mobile_number must be valid format
    - required fields enforced
    """
    
    class Meta:
        model = Patient
        fields = [
            'patient_id', 'first_name', 'last_name', 'middle_name', 'suffix_name',
            'gender', 'birthdate', 'civil_status', 'nationality', 'religion',
            'philhealth_id', 'blood_type', 'pwd_type',
            'occupation', 'education', 'mobile_number',
            'address_line', 'address_city', 'address_district',
            'address_state', 'address_postal_code', 'address_country',
            'contact_first_name', 'contact_last_name',
            'contact_mobile_number', 'contact_relationship',
            'indigenous_flag', 'indigenous_group',
            'consent_flag', 'image_url',
            'active', 'status'
        ]
        extra_kwargs = {
            'patient_id': {'required': False},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'birthdate': {'required': True},
            'gender': {'required': True},
            'active': {'required': False, 'default': True},
            'status': {'required': False, 'default': 'active'},
        }
    
    def validate_birthdate(self, value):
        """
        Validate birthdate is not in the future.
        """
        if value > date.today():
            raise serializers.ValidationError("Birthdate cannot be in the future.")
        return value
    
    def validate_mobile_number(self, value):
        """
        Validate mobile number format (if provided).
        """
        if value:
            # Remove common separators
            cleaned = value.replace('-', '').replace(' ', '').replace('+', '')
            if not cleaned.isdigit():
                raise serializers.ValidationError("Mobile number must contain only digits and optional separators.")
            if len(cleaned) < 10 or len(cleaned) > 15:
                raise serializers.ValidationError("Mobile number must be between 10 and 15 digits.")
        return value


class PatientOutputSerializer(serializers.Serializer):
    """
    Patient Output Serializer (Read Operations)
    
    Used for: GET (list, retrieve)
    Purpose: Pure DTO mapping - formats ACL data
    Source: PatientACL.get_patient_details() or get_patient_summary()
    
    This is a pure Serializer (not ModelSerializer) because:
    - Data comes from ACL, not direct model access
    - Matches ACL DTO structure exactly
    - No database binding needed
    """
    
    # Identity
    id = serializers.IntegerField()
    patient_id = serializers.CharField()
    
    # Name
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    middle_name = serializers.CharField(required=False, allow_null=True)
    suffix_name = serializers.CharField(required=False, allow_null=True)
    full_name = serializers.CharField(required=False)
    
    # Demographics
    gender = serializers.CharField()
    birthdate = serializers.DateField()
    age = serializers.IntegerField(required=False)
    civil_status = serializers.CharField(required=False, allow_null=True)
    nationality = serializers.CharField(required=False, allow_null=True)
    religion = serializers.CharField(required=False, allow_null=True)
    
    # Health Identifiers
    philhealth_id = serializers.CharField(required=False, allow_null=True)
    blood_type = serializers.CharField(required=False, allow_null=True)
    pwd_type = serializers.CharField(required=False, allow_null=True)
    
    # Occupation and Education
    occupation = serializers.CharField(required=False, allow_null=True)
    education = serializers.CharField(required=False, allow_null=True)
    
    # Contact
    mobile_number = serializers.CharField(required=False, allow_null=True)
    
    # Address
    address_line = serializers.CharField(required=False, allow_null=True)
    address_city = serializers.CharField(required=False, allow_null=True)
    address_district = serializers.CharField(required=False, allow_null=True)
    address_state = serializers.CharField(required=False, allow_null=True)
    address_postal_code = serializers.CharField(required=False, allow_null=True)
    address_country = serializers.CharField(required=False, allow_null=True)
    full_address = serializers.CharField(required=False)
    
    # Emergency Contact
    contact_first_name = serializers.CharField(required=False, allow_null=True)
    contact_last_name = serializers.CharField(required=False, allow_null=True)
    contact_mobile_number = serializers.CharField(required=False, allow_null=True)
    contact_relationship = serializers.CharField(required=False, allow_null=True)
    
    # Indigenous and PWD
    indigenous_flag = serializers.BooleanField(required=False, allow_null=True)
    indigenous_group = serializers.CharField(required=False, allow_null=True)
    
    # Consent and Media
    consent_flag = serializers.BooleanField(required=False, allow_null=True)
    image_url = serializers.URLField(required=False, allow_null=True)

    # Status
    active = serializers.BooleanField(required=False)
    status = serializers.CharField(required=False, allow_null=True)

    # Timestamps
    created_at = serializers.DateTimeField(required=False)
    updated_at = serializers.DateTimeField(required=False)


# ============================================================================
# CONDITION SERIALIZERS
# ============================================================================

class ConditionSerializer(serializers.ModelSerializer):
    """
    Condition Serializer
    
    Standard FHIR Condition resource serialization.
    """
    
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)
    patient_identifier = serializers.CharField(source='patient.patient_id', read_only=True)
    
    class Meta:
        model = Condition
        fields = [
            'condition_id', 'identifier',
            'clinical_status', 'verification_status',
            'category', 'severity', 'code',
            'patient_id', 'patient_identifier', 'encounter_id',
            'body_site',
            'onset_datetime', 'onset_age', 'onset_period_start', 'onset_period_end',
            'abatement_datetime', 'abatement_age', 'abatement_period_start', 'abatement_period_end',
            'recorded_date', 'recorder_id', 'asserter_id',
            'stage_summary', 'stage_type', 'stage_assessment_id',
            'evidence_code', 'evidence_detail_id',
            'note',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['condition_id', 'created_at', 'updated_at']


class ConditionCreateSerializer(serializers.ModelSerializer):
    """
    Condition Create Serializer
    
    Handles condition creation with required field validation.
    """
    
    class Meta:
        model = Condition
        fields = [
            'identifier', 'clinical_status', 'verification_status',
            'category', 'severity', 'code',
            'patient', 'encounter_id', 'body_site',
            'onset_datetime', 'recorded_date', 'note'
        ]
        extra_kwargs = {
            'identifier': {'required': True},
            'code': {'required': True},
            'patient': {'required': True},
            # encounter_id is optional: conditions can be recorded from the
            # patient profile view where no encounter context exists.
            'encounter_id': {'required': False, 'allow_null': True},
        }


# ============================================================================
# ALLERGY SERIALIZERS
# ============================================================================

class AllergySerializer(serializers.ModelSerializer):
    """
    Allergy Intolerance Serializer
    
    Standard FHIR AllergyIntolerance resource serialization.
    """
    
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)
    patient_identifier = serializers.CharField(source='patient.patient_id', read_only=True)
    
    class Meta:
        model = AllergyIntolerance
        fields = [
            'allergy_id', 'identifier',
            'clinical_status', 'verification_status',
            'type', 'category', 'criticality', 'code',
            'patient_id', 'patient_identifier', 'encounter_id',
            'onset_datetime', 'onset_age', 'onset_period_start', 'onset_period_end',
            'onset_range_low', 'onset_range_high',
            'recorded_date', 'recorder_id', 'asserter_id',
            'last_occurrence',
            'reaction_description', 'reaction_onset', 'reaction_severity',
            'reaction_exposure_route', 'reaction_note', 'reaction_manifestation',
            'reaction_substance',
            'note',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['allergy_id', 'created_at', 'updated_at']


class AllergyCreateSerializer(serializers.ModelSerializer):
    """
    Allergy Create Serializer
    
    Handles allergy creation with required field validation.
    """
    
    class Meta:
        model = AllergyIntolerance
        fields = [
            'identifier', 'clinical_status', 'verification_status',
            'type', 'category', 'criticality', 'code',
            'patient', 'encounter_id',
            'onset_datetime', 'recorded_date',
            'reaction_description', 'reaction_severity', 'note'
        ]
        extra_kwargs = {
            'identifier': {'required': True},
            'code': {'required': True},
            'patient': {'required': True},
            # encounter_id is optional: allergies can be recorded from the
            # patient profile view where no encounter context exists.
            'encounter_id': {'required': False, 'allow_null': True},
        }


# ============================================================================
# IMMUNIZATION SERIALIZERS
# ============================================================================

class ImmunizationSerializer(serializers.ModelSerializer):
    """
    Immunization Serializer
    
    Standard PHCORE Immunization resource serialization.
    """
    
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)
    patient_identifier = serializers.CharField(source='patient.patient_id', read_only=True)
    
    class Meta:
        model = Immunization
        fields = [
            'immunization_id', 'identifier', 'status',
            'status_reason_code', 'status_reason_display',
            'vaccine_code', 'vaccine_display',
            'patient_id', 'patient_identifier', 'encounter_id',
            'occurrence_datetime', 'occurrence_string',
            'recorded_datetime', 'primary_source',
            'report_origin_code', 'report_origin_display',
            'location_id', 'manufacturer_id',
            'lot_number', 'expiration_date',
            'site_code', 'site_display',
            'route_code', 'route_display',
            'dose_quantity_value', 'dose_quantity_unit',
            'performer_id', 'performer_function_code', 'performer_function_display',
            'actor_id', 'note',
            'reason_code', 'reason_display', 'reason_reference_id',
            'is_subpotent', 'subpotent_reason_code', 'subpotent_reason_display',
            'dose_number_value', 'series_doses_value',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['immunization_id', 'created_at', 'updated_at']


class ImmunizationCreateSerializer(serializers.ModelSerializer):
    """
    Immunization Create Serializer

    Handles immunization creation with required field validation.
    """

    class Meta:
        model = Immunization
        fields = [
            'identifier', 'status', 'vaccine_code', 'vaccine_display',
            'patient', 'encounter_id',
            'occurrence_datetime', 'recorded_datetime',
            'lot_number', 'expiration_date',
            'site_code', 'site_display',
            'route_code', 'route_display',
            'dose_quantity_value', 'dose_quantity_unit',
            'performer_name',
            'note',
        ]
        extra_kwargs = {
            'identifier': {'required': True},
            'status': {'required': True},
            'patient': {'required': True},
            'encounter_id': {'required': True},
        }
