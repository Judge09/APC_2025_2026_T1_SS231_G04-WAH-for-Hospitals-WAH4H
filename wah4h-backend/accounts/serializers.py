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

from .models import Organization, Practitioner, PractitionerRole

User = get_user_model()


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['organization_id', 'name']


class PractitionerSerializer(serializers.ModelSerializer):
    """Serializer for listing/practitioner dropdowns."""
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
        ]

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
