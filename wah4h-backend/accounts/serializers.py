"""
accounts/serializers.py

Transaction Layer for 2-Step OTP Authentication System.
Follows "Fat Serializers" pattern - all business logic lives here.

Architecture:
- Each serializer handles ONE transaction boundary
- Uses @transaction.atomic for data consistency
- Validates before saving (fail-fast principle)
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
import secrets
import string

from .models import (
    Organization, Practitioner, PractitionerRole, RoleModuleConfig,
    RoomTypeDefinition, DoctorFeeSchedule, ProcedurePriceConfig, Location,
)
from core.fhir_utils import (
    codeable_concept, fhir_extension, fhir_period, fhir_reference,
    fhir_identifier, fhir_meta,
    PHC_EXT_PRC_LICENSE, PHC_EXT_NHFR,
    NHFR_IDENTIFIER_SYSTEM,
    PHC_FACILITY_TYPE_CS, PHC_CS_BASE, PHC_SPECIALTY_CS,
    WAH4H_PRACTITIONER_SYSTEM, WAH4H_PRACTITIONER_ROLE_SYSTEM,
    HL7_ROLE_CODE,
)

User = get_user_model()


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['organization_id', 'name']


# ============================================================================
# ADMIN SERIALIZERS
# ============================================================================

class HospitalSettingsSerializer(serializers.ModelSerializer):
    """Full Organization serializer for admin hospital profile editing."""
    fhir_resource_type = serializers.SerializerMethodField()
    fhir_identifier = serializers.SerializerMethodField()
    fhir = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'organization_id',
            'name',
            'alias',
            'nhfr_code',
            'type_code',
            'active',
            'telecom',
            'logo_url',
            'description',
            'address_line',
            'address_city',
            'address_district',
            'address_state',
            'address_country',
            'address_postal_code',
            'contact_purpose',
            'contact_first_name',
            'contact_last_name',
            'contact_telecom',
            'contact_address_line',
            'contact_address_city',
            'contact_address_state',
            'contact_address_country',
            'contact_postal_code',
            'fhir_resource_type',
            'fhir_identifier',
            'fhir',
        ]
        read_only_fields = ['organization_id', 'fhir_resource_type', 'fhir_identifier', 'fhir']

    def get_fhir_resource_type(self, obj):
        return 'Organization'

    def get_fhir_identifier(self, obj):
        if obj.nhfr_code:
            return {
                'system': NHFR_IDENTIFIER_SYSTEM,
                'value': obj.nhfr_code,
            }
        return None

    def get_fhir(self, obj):
        try:
            identifiers = []
            if obj.nhfr_code:
                identifiers.append(fhir_identifier(NHFR_IDENTIFIER_SYSTEM, obj.nhfr_code, use="official"))

            extensions = []
            if obj.nhfr_code:
                extensions.append(fhir_extension(PHC_EXT_NHFR, "String", obj.nhfr_code))

            address = None
            if obj.address_line or obj.address_city:
                address = [{
                    "use": "work",
                    "type": "physical",
                    "line": [obj.address_line] if obj.address_line else [],
                    "city": obj.address_city,
                    "district": obj.address_district,
                    "state": obj.address_state,
                    "postalCode": obj.address_postal_code,
                    "country": obj.address_country or "PH",
                }]

            telecom = []
            if obj.telecom:
                telecom.append({"system": "phone", "value": str(obj.telecom), "use": "work"})

            resource = {
                "resourceType": "Organization",
                "id": str(obj.organization_id),
                "meta": fhir_meta("Organization", obj.updated_at),
                "identifier": identifiers,
                "active": bool(obj.active),
                "type": [codeable_concept(PHC_FACILITY_TYPE_CS, obj.type_code)] if obj.type_code else [],
                "name": obj.name,
                "alias": [obj.alias] if obj.alias else [],
                "telecom": telecom,
                "extension": extensions,
            }
            if address:
                resource["address"] = address
            return resource
        except Exception:
            return {}


class AdminUserSerializer(serializers.ModelSerializer):
    """User serializer for admin user management."""
    practitioner_id = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'practitioner_id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'status',
            'is_active',
        ]
        read_only_fields = ['practitioner_id', 'username', 'email', 'full_name']

    def get_practitioner_id(self, obj):
        return obj.pk

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

    def validate_role(self, value):
        allowed = [r[0] for r in User.ROLE_CHOICES]
        if value not in allowed:
            raise serializers.ValidationError(f"Role must be one of: {', '.join(allowed)}")
        return value


class RoleModuleConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleModuleConfig
        fields = ['role', 'modules', 'updated_at']
        read_only_fields = ['updated_at']

    def validate_modules(self, value):
        allowed = [
            'dashboard', 'patients', 'admission', 'pharmacy', 'laboratory',
            'monitoring', 'discharge', 'inventory', 'compliance', 'statistics',
            'billing', 'settings',
        ]
        invalid = [m for m in value if m not in allowed]
        if invalid:
            raise serializers.ValidationError(f"Unknown modules: {invalid}. Allowed: {allowed}")
        return value


class PractitionerSerializer(serializers.ModelSerializer):
    """Serializer for listing/practitioner dropdowns."""
    fhir = serializers.SerializerMethodField()

    class Meta:
        model = Practitioner
        fields = [
            'practitioner_id',
            'identifier',
            'first_name',
            'middle_name',
            'last_name',
            'suffix_name',
            'active',
            'birth_date',
            'telecom',
            'fhir',
        ]

    def get_fhir(self, obj):
        try:
            extensions = []
            if obj.qualification_identifier:
                extensions.append(fhir_extension(
                    PHC_EXT_PRC_LICENSE, "String", obj.qualification_identifier
                ))

            qualification = []
            if obj.qualification_code or obj.qualification_identifier:
                q: dict = {
                    "code": codeable_concept(
                        f"{PHC_CS_BASE}/ph-core-qualification",
                        obj.qualification_code or "unknown",
                    ),
                }
                if obj.qualification_identifier:
                    q["identifier"] = [fhir_identifier(
                        "https://prc.gov.ph/fhir/Identifier/license",
                        obj.qualification_identifier,
                        use="official",
                    )]
                if obj.qualification_period_start or obj.qualification_period_end:
                    q["period"] = fhir_period(obj.qualification_period_start, obj.qualification_period_end)
                if obj.qualification_issuer_id:
                    q["issuer"] = fhir_reference("Organization", obj.qualification_issuer_id)
                qualification.append(q)

            given = obj.first_name.split() if obj.first_name else []
            if obj.middle_name:
                given.append(obj.middle_name)

            return {
                "resourceType": "Practitioner",
                "id": obj.identifier,
                "meta": fhir_meta("Practitioner", obj.updated_at),
                "identifier": [fhir_identifier(WAH4H_PRACTITIONER_SYSTEM, obj.identifier, use="official")],
                "active": bool(obj.active),
                "name": [{
                    "use": "official",
                    "family": obj.last_name,
                    "given": given,
                    "suffix": [obj.suffix_name] if obj.suffix_name else [],
                }],
                "birthDate": str(obj.birth_date) if obj.birth_date else None,
                "qualification": qualification,
                "extension": extensions,
            }
        except Exception:
            return {}

class PractitionerRoleSerializer(serializers.ModelSerializer):
    """PractitionerRole — links a Practitioner to an Organization with a role."""

    class Meta:
        model = PractitionerRole
        fields = '__all__'
        read_only_fields = ['practitioner_role_id', 'created_at', 'updated_at']

    def to_representation(self, obj):
        rep = super().to_representation(obj)
        try:
            telecom = []
            if obj.telecom:
                telecom.append({"system": "phone", "value": str(obj.telecom), "use": "work"})

            available_time = []
            if obj.available_days_of_week or obj.available_start_time:
                days = [d.strip() for d in obj.available_days_of_week.split(",")] if obj.available_days_of_week else []
                available_time.append({
                    "daysOfWeek": days,
                    "allDay": bool(obj.available_all_day_flag),
                    "availableStartTime": obj.available_start_time,
                    "availableEndTime": obj.available_end_time,
                })

            not_available = []
            if obj.not_available_description:
                not_available.append({
                    "description": obj.not_available_description,
                    "during": fhir_period(obj.not_available_period_start, obj.not_available_period_end),
                })

            rep['fhir'] = {
                "resourceType": "PractitionerRole",
                "id": obj.identifier,
                "meta": fhir_meta("PractitionerRole", obj.updated_at),
                "identifier": [fhir_identifier(WAH4H_PRACTITIONER_ROLE_SYSTEM, obj.identifier, use="official")],
                "active": bool(obj.active) if obj.active is not None else True,
                "period": fhir_period(obj.period_start, obj.period_end),
                "practitioner": fhir_reference("Practitioner", obj.practitioner_id),
                "organization": fhir_reference("Organization", obj.organization_id),
                "location": [fhir_reference("Location", obj.location_id)] if obj.location_id else [],
                "code": [codeable_concept(HL7_ROLE_CODE, obj.role_code)] if obj.role_code else [],
                "specialty": [codeable_concept(PHC_SPECIALTY_CS, obj.specialty_code)] if obj.specialty_code else [],
                "telecom": telecom,
                "availableTime": available_time,
                "notAvailable": not_available,
                "availabilityExceptions": obj.availability_exceptions,
            }
        except Exception:
            rep['fhir'] = None
        return rep


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def generate_otp(length=6):
    """Generate a secure numeric OTP."""
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def generate_username(email):
    """Generate unique username from email."""
    base_username = email.split('@')[0]
    username = base_username
    counter = 1
    
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1
    
    return username


# ============================================================================
# REGISTRATION FLOW SERIALIZERS
# ============================================================================

class PractitionerSignupSerializer(serializers.Serializer):
    """
    Step 1 of Registration: Validate Registration Data (NO DB WRITES).
    
    Cache-First Strategy:
    - Validates email uniqueness
    - Validates identifier uniqueness
    - Validates password match
    - Does NOT create any database records
    - Data is cached for 5 minutes until OTP verification
    
    Business Rules:
    - Passwords must match
    - Email must be unique
    - Identifier must be unique
    """
    # Practitioner fields
    identifier = serializers.CharField(max_length=100)
    first_name = serializers.CharField(max_length=255)
    middle_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=255)
    suffix_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    gender = serializers.CharField(max_length=100, required=False, allow_blank=True)
    birth_date = serializers.DateField(required=False, allow_null=True)
    telecom = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    # User fields
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.CharField(max_length=255, required=False, default='practitioner')
    
    def validate_email(self, value):
        """Ensure email is unique."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "This email is already associated with another account. Please use a different email."
            )
        return value
    
    def validate_identifier(self, value):
        """Ensure practitioner identifier is unique."""
        if Practitioner.objects.filter(identifier=value).exists():
            raise serializers.ValidationError("Practitioner identifier already exists.")
        return value
    
    def validate(self, attrs):
        """Validate password match."""
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs
    
    # NO create() method - Registration data is cached, not saved to DB yet


class VerifyAccountSerializer(serializers.Serializer):
    """
    Step 2 of Registration: Verify OTP and Create Account (Cache-First Strategy).
    
    Business Rules:
    - Retrieves cached registration data
    - Validates OTP
    - Creates Practitioner + User ONLY after successful OTP verification
    - Both Practitioner and User start ACTIVE (no zombie records)
    """
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)
    
    @transaction.atomic
    def create_account(self, cached_data):
        """
        Atomic transaction: Create Practitioner → Create Active User.
        
        Args:
            cached_data: Dictionary containing validated registration data from cache
        
        Returns:
            User instance with practitioner linked
        """
        # Extract data
        email = cached_data['email']
        password = cached_data['password']
        role = cached_data.get('role', 'practitioner')
        
        # Step 1: Create Practitioner (ACTIVE by default)
        practitioner = Practitioner.objects.create(
            identifier=cached_data['identifier'],
            first_name=cached_data['first_name'],
            middle_name=cached_data.get('middle_name', ''),
            last_name=cached_data['last_name'],
            suffix_name=cached_data.get('suffix_name', ''),
            gender=cached_data.get('gender', ''),
            birth_date=cached_data.get('birth_date'),
            telecom=cached_data.get('telecom', ''),
            active=True,
            status='active'  # FHIR status field
        )
        
        # Step 2: Create User (ACTIVE - OTP already verified)
        username = generate_username(email)
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=cached_data['first_name'],
            last_name=cached_data['last_name'],
            role=role,
            status='active',  # User is active immediately after OTP verification
            is_active=True,   # User can login immediately
            practitioner=practitioner
        )
        # Note: created_at and updated_at are automatically set by TimeStampedModel
        # on object creation via auto_now_add and auto_now
        
        return user


# ============================================================================
# LOGIN FLOW SERIALIZERS
# ============================================================================

class LoginStepOneSerializer(serializers.Serializer):
    """
    Step 1 of Login: Validate Credentials + Generate OTP.
    
    Business Rules:
    - Checks username/email + password
    - Checks lockout counter (>5 attempts = 403)
    - Generates OTP on success
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validate credentials and check lockout."""
        email = attrs['email']
        password = attrs['password']
        
        # Check lockout counter
        lockout_key = f"login_attempts_{email}"
        attempts = cache.get(lockout_key, 0)
        
        if attempts >= 5:
            raise serializers.ValidationError(
                {"email": "Account locked due to too many failed attempts. Try again in 15 minutes."}
            )
        
        # Validate user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Increment lockout counter
            cache.set(lockout_key, attempts + 1, timeout=900)  # 15 min
            raise serializers.ValidationError({"email": "Invalid credentials."})
        
        # Validate password
        # Accounts created before the create_user fix have plain-text passwords.
        # Detect and re-hash them on the fly so they recover automatically.
        if user.password == password:
            user.set_password(password)
            user.save(update_fields=['password'])
        if not user.check_password(password):
            # Increment lockout counter
            cache.set(lockout_key, attempts + 1, timeout=900)
            raise serializers.ValidationError({"password": "Invalid credentials."})
        
        # Check if user is active
        if not user.is_active:
            raise serializers.ValidationError({"email": "Account not activated. Please verify your email first."})
        
        # Reset lockout counter on success
        cache.delete(lockout_key)
        
        attrs['user'] = user
        return attrs
    
    def save(self):
        """Generate and cache OTP for step 2."""
        user = self.validated_data['user']
        
        # Generate OTP
        otp = generate_otp()
        cache_key = f"otp_login_{user.email}"
        cache.set(cache_key, otp, timeout=300)  # 5 minutes
        
        # Attach OTP for email sending
        user.otp = otp
        return user


class LoginStepTwoSerializer(serializers.Serializer):
    """
    Step 2 of Login: Verify OTP + Return JWT Tokens.
    
    Business Rules:
    - OTP must match cached value
    - Returns access + refresh tokens on success
    """
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)
    
    def validate(self, attrs):
        """Validate OTP."""
        email = attrs['email']
        otp = attrs['otp']
        
        # Get user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "User not found."})
        
        # Validate OTP
        cache_key = f"otp_login_{email}"
        cached_otp = cache.get(cache_key)
        
        if not cached_otp:
            raise serializers.ValidationError({"otp": "OTP expired. Please login again."})
        
        if cached_otp != otp:
            raise serializers.ValidationError({"otp": "Invalid OTP."})
        
        attrs['user'] = user
        return attrs
    
    def save(self):
        """Delete OTP and return user for token generation."""
        user = self.validated_data['user']
        
        # Delete OTP (one-time use)
        cache_key = f"otp_login_{user.email}"
        cache.delete(cache_key)
        
        return user


# ============================================================================
# PASSWORD RESET FLOW SERIALIZERS
# ============================================================================

class PasswordResetInitiateSerializer(serializers.Serializer):
    """
    Step 1 of Password Reset: Validate Email + Generate OTP.
    """
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Check if user exists."""
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("No account found with this email.")
        
        if not user.is_active:
            raise serializers.ValidationError("Account is not active.")
        
        return value
    
    def save(self):
        """Generate and cache OTP."""
        email = self.validated_data['email']
        user = User.objects.get(email=email)
        
        # Generate OTP
        otp = generate_otp()
        cache_key = f"otp_reset_{email}"
        cache.set(cache_key, otp, timeout=300)  # 5 minutes
        
        # Attach OTP for email sending
        user.otp = otp
        return user


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Step 2 of Password Reset: Verify OTP + Set New Password.
    """
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    
    def validate(self, attrs):
        """Validate OTP and password match."""
        email = attrs['email']
        otp = attrs['otp']
        
        # Check passwords match
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        # Get user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "User not found."})
        
        # Validate OTP
        cache_key = f"otp_reset_{email}"
        cached_otp = cache.get(cache_key)
        
        if not cached_otp:
            raise serializers.ValidationError({"otp": "OTP expired. Please request a new reset link."})
        
        if cached_otp != otp:
            raise serializers.ValidationError({"otp": "Invalid OTP."})
        
        attrs['user'] = user
        return attrs
    
    @transaction.atomic
    def save(self):
        """Update password and delete OTP."""
        user = self.validated_data['user']
        new_password = self.validated_data['new_password']
        
        # Validate new password is not the same as current password
        if user.check_password(new_password):
            raise serializers.ValidationError({"new_password": "New password must be different from your current password."})
        
        # Set new password (uses Django's set_password for hashing)
        user.set_password(new_password)
        # Save with both password and updated_at for proper audit trail
        user.save(update_fields=['password', 'updated_at'])
        
        # Update the related Practitioner's updated_at timestamp for audit trail
        if hasattr(user, 'practitioner'):
            user.practitioner.save(update_fields=['updated_at'])
        
        # Delete OTP
        cache_key = f"otp_reset_{user.email}"
        cache.delete(cache_key)
        
        return user


# ============================================================================
# CHANGE PASSWORD (AUTHENTICATED USERS)
# ============================================================================

class ChangePasswordSerializer(serializers.Serializer):
    """
    Change password for authenticated users.
    Requires current password verification.
    """
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    
    def validate(self, attrs):
        """Validate passwords."""
        user = self.context.get('user')
        
        if not user:
            raise serializers.ValidationError({"detail": "User not authenticated."})
        
        # Verify current password
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        
        # Check new passwords match
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        
        # Ensure new password is different from current password
        if user.check_password(attrs['new_password']):
            raise serializers.ValidationError({"new_password": "New password must be different from your current password."})
        
        return attrs
    
    @transaction.atomic
    def save(self):
        """Update password for authenticated user."""
        user = self.context.get('user')
        new_password = self.validated_data['new_password']
        
        # Set new password (uses Django's set_password for hashing)
        user.set_password(new_password)
        # Save with both password and updated_at for proper audit trail
        user.save(update_fields=['password', 'updated_at'])
        
        # Update the related Practitioner's updated_at timestamp for audit trail
        if hasattr(user, 'practitioner'):
            user.practitioner.save(update_fields=['updated_at'])
        
        return user


class ChangePasswordInitiateSerializer(serializers.Serializer):
    """
    Step 1: Validate current password and initiate OTP-based password change.
    Caches password data and sends OTP to user's email.
    """
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    
    def validate(self, attrs):
        """Validate passwords before sending OTP."""
        user = self.context.get('user')
        
        if not user:
            raise serializers.ValidationError({"detail": "User not authenticated."})
        
        # Verify current password
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        
        # Check new passwords match
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        
        # Ensure new password is different from current password
        if user.check_password(attrs['new_password']):
            raise serializers.ValidationError({"new_password": "New password must be different from your current password."})
        
        return attrs
    
    def save(self):
        """Generate OTP and cache password change data."""
        user = self.context.get('user')
        otp = generate_otp()
        
        # Cache the password change data (5 minutes)
        cache_key = f"change_password_{user.email}"
        cache_data = {
            'user_id': user.pk,
            'new_password': self.validated_data['new_password'],
            'otp': otp
        }
        cache.set(cache_key, cache_data, timeout=300)
        
        # Attach OTP to user object for email sending
        user.otp = otp
        return user


class ChangePasswordVerifySerializer(serializers.Serializer):
    """
    Step 2: Verify OTP and complete password change.
    Retrieves cached data and updates password.
    """
    otp = serializers.CharField(max_length=6, min_length=6)
    
    def validate(self, attrs):
        """Validate OTP against cached data."""
        user = self.context.get('user')
        
        if not user:
            raise serializers.ValidationError({"detail": "User not authenticated."})
        
        # Retrieve cached password change data
        cache_key = f"change_password_{user.email}"
        cached_data = cache.get(cache_key)
        
        if not cached_data:
            raise serializers.ValidationError({"otp": "OTP expired or invalid. Please request a new one."})
        
        # Verify OTP
        if cached_data.get('otp') != attrs['otp']:
            raise serializers.ValidationError({"otp": "Invalid OTP. Please try again."})
        
        # Verify user identity
        if cached_data.get('user_id') != user.pk:
            raise serializers.ValidationError({"detail": "User mismatch. Please try again."})
        
        # Attach cached password to attrs for saving
        attrs['new_password'] = cached_data['new_password']
        attrs['cache_key'] = cache_key
        
        return attrs
    
    @transaction.atomic
    def save(self):
        """Update password after OTP verification."""
        user = self.context.get('user')
        new_password = self.validated_data['new_password']
        cache_key = self.validated_data['cache_key']
        
        # Set new password
        user.set_password(new_password)
        user.save(update_fields=['password', 'updated_at'])
        
        # Update practitioner audit trail
        if hasattr(user, 'practitioner'):
            user.practitioner.save(update_fields=['updated_at'])
        
        # Delete cache after successful password change
        cache.delete(cache_key)

        return user


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN PERSONALIZATION SERIALIZERS
# ─────────────────────────────────────────────────────────────────────────────

class RoomTypeDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomTypeDefinition
        fields = [
            'room_type_id', 'code', 'name', 'description',
            'daily_rate', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['room_type_id', 'created_at', 'updated_at']

    def validate_daily_rate(self, value):
        if value < 0:
            raise serializers.ValidationError("Daily rate cannot be negative.")
        return value


class DoctorFeeScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorFeeSchedule
        fields = [
            'fee_id', 'practitioner_id', 'practitioner_name',
            'specialty_code', 'specialty_display',
            'consultation_fee', 'professional_fee',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['fee_id', 'created_at', 'updated_at']

    def validate(self, attrs):
        # Skip cross-field validation on partial updates — the existing record
        # already satisfies the constraint; we only need to check on full creates.
        if self.partial:
            return attrs
        pid = attrs.get('practitioner_id')
        sc = attrs.get('specialty_code', '').strip() if attrs.get('specialty_code') else ''
        if pid is None and not sc:
            raise serializers.ValidationError(
                "Either practitioner_id or specialty_code must be provided."
            )
        return attrs

    def validate_consultation_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("Consultation fee cannot be negative.")
        return value

    def validate_professional_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("Professional fee cannot be negative.")
        return value


class ProcedurePriceConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedurePriceConfig
        fields = [
            'price_id', 'code', 'name', 'category',
            'base_price', 'description', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['price_id', 'created_at', 'updated_at']

    def validate_base_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Base price cannot be negative.")
        return value


class LocationAdminSerializer(serializers.ModelSerializer):
    part_of_name = serializers.SerializerMethodField()
    # Explicitly declared so DRF generates a writable IntegerField, not a
    # read-only property field (which is what it falls back to for FK attnames).
    part_of_location_id = serializers.IntegerField(allow_null=True, required=False)

    class Meta:
        model = Location
        fields = [
            'location_id', 'name', 'alias', 'description',
            'physical_type_code', 'type_code', 'status', 'operational_status',
            'telecom', 'address_line', 'address_city', 'address_state',
            'address_country', 'address_postal_code',
            'hours_of_operation_days', 'opening_time', 'closing_time',
            'part_of_location_id', 'part_of_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['location_id', 'created_at', 'updated_at', 'part_of_name']

    def get_part_of_name(self, obj):
        if obj.part_of_location:
            return obj.part_of_location.name
        return None

    def create(self, validated_data):
        # Location.identifier is unique but nullable — auto-generate to avoid
        # empty-string collisions when admin doesn't supply an explicit code.
        if not validated_data.get('identifier'):
            import uuid
            validated_data['identifier'] = f"loc-{uuid.uuid4().hex[:12]}"
        return super().create(validated_data)
