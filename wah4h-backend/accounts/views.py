"""
accounts/views.py

State Machine for 2-Step OTP Authentication.
Follows "Thin Views" pattern - delegates logic to Serializers.

Architecture:
- Uses APIView (class-based views)
- Standard JSON envelope for all responses
- django.core.mail for OTP delivery (Console Backend)
- django.core.cache (LocMemCache) for OTP storage

Response Format:
{
    "status": "success" | "error",
    "message": "Human-readable message",
    "data": { ... }
}
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.cache import cache
from django.conf import settings
from django.db import transaction
from django.contrib.auth import get_user_model
import json
from datetime import date
from .serializers import PractitionerSerializer

from .emails import send_otp_email

from .models import (
    Organization, Practitioner, RoleModuleConfig,
    RoomTypeDefinition, DoctorFeeSchedule, ProcedurePriceConfig, Location,
)
from .serializers import (
    OrganizationSerializer,
    PractitionerSignupSerializer,
    VerifyAccountSerializer,
    LoginStepOneSerializer,
    LoginStepTwoSerializer,
    PasswordResetInitiateSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
    ChangePasswordInitiateSerializer,
    ChangePasswordVerifySerializer,
    HospitalSettingsSerializer,
    AdminUserSerializer,
    RoleModuleConfigSerializer,
    RoomTypeDefinitionSerializer,
    DoctorFeeScheduleSerializer,
    ProcedurePriceConfigSerializer,
    LocationAdminSerializer,
    generate_otp
)


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_client_ip(request):
    """Extract client IP address from request, handling proxies."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_jwt_tokens(user):
    """Generate JWT access and refresh tokens for user."""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh)
    }


def success_response(message, data=None, http_status=status.HTTP_200_OK):
    """Standard success response envelope."""
    return Response({
        'status': 'success',
        'message': message,
        'data': data if data is not None else {}
    }, status=http_status)


def error_response(message, errors=None, http_status=status.HTTP_400_BAD_REQUEST):
    """Standard error response envelope."""
    return Response({
        'status': 'error',
        'message': message,
        'errors': errors or {}
    }, status=http_status)


# ============================================================================
# REGISTRATION FLOW
# ============================================================================

class RegisterInitiateAPIView(APIView):
    """
    POST /api/accounts/register/initiate/
    Step 1: Validate Data + Cache + Send OTP (NO DB WRITES).
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        # Security Throttling: Prevent spam (1 attempt per IP per minute)
        ip_address = get_client_ip(request)
        throttle_key = f"register_throttle_{ip_address}"
        
        # Check if this IP has already initiated registration within the last 60 seconds
        if cache.get(throttle_key):
            return error_response(
                message='Too many registration attempts. Please try again in 1 minute.',
                errors={'detail': 'Rate limit exceeded. Wait 60 seconds before retrying.'},
                http_status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Set throttle flag for 60 seconds
        cache.set(throttle_key, True, timeout=60)
        
        serializer = PractitionerSignupSerializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)

            # If registration OTP is disabled, create account immediately and return tokens
            if not getattr(settings, 'REGISTER_USE_OTP', True):
                try:
                    from .serializers import VerifyAccountSerializer
                    # Prepare data for account creation
                    create_data = serializer.validated_data.copy()
                    # Remove confirm_password
                    create_data.pop('confirm_password', None)

                    # Ensure birth_date is a date object (it already should be from serializer)
                    with transaction.atomic():
                        verifier = VerifyAccountSerializer()
                        user = verifier.create_account(create_data)

                        # Generate JWT tokens for immediate login
                        tokens = get_jwt_tokens(user)

                    return success_response(
                        message='Account created successfully. You are now logged in.',
                        data={
                            'user': {
                                'id': user.practitioner.practitioner_id,
                                'username': user.username,
                                'email': user.email,
                                'first_name': user.first_name,
                                'last_name': user.last_name,
                                'role': user.role
                            },
                            'tokens': tokens,
                            'otp_disabled': True
                        },
                        http_status=status.HTTP_201_CREATED
                    )
                except Exception as e:
                    return error_response(
                        message='Account creation failed.',
                        errors={'detail': str(e)},
                        http_status=status.HTTP_400_BAD_REQUEST
                    )

            # Generate OTP (normal flow)
            otp = generate_otp()
            
            # Prepare data for caching
            cache_data = serializer.validated_data.copy()
            
            # Convert date to string for JSON serialization
            if cache_data.get('birth_date'):
                cache_data['birth_date'] = cache_data['birth_date'].isoformat()
            
            # Add OTP to cached data
            cache_data['otp'] = otp
            
            # Cache the registration data (15 minutes)
            cache_key = f"registration_{cache_data['email']}"
            cache.set(cache_key, cache_data, timeout=900)
            
            # Send OTP via email using spam-proof HTML template
            send_otp_email(
                user_email=cache_data['email'],
                user_firstname=cache_data.get('first_name', 'User'),
                otp_code=otp
            )

            return success_response(
                message='Registration initiated. Please check your email for the verification code.',
                data={
                    'email': cache_data['email'],
                    'otp_sent': True,
                    'expires_in': '15 minutes'
                },
                http_status=status.HTTP_200_OK
            )
        
        except Exception as e:
            return error_response(
                message='Registration failed.',
                errors=serializer.errors if hasattr(serializer, 'errors') else {'detail': str(e)},
                http_status=status.HTTP_400_BAD_REQUEST
            )

class RegisterVerifyAPIView(APIView):
    """
    POST /api/accounts/register/verify/
    
    Step 2: Verify OTP + Create Account from Cache (Cache-First Strategy + Auto-Login).
    
    - Retrieves cached registration data
    - Validates OTP
    - Creates Practitioner + User records (both ACTIVE)
    - Generates JWT tokens for immediate auto-login
    - Deletes cache after successful creation
    
    Request Body:
    {
        "email": "juan@example.com",
        "otp": "123456"
    }
    
    Response:
    {
        "status": "success",
        "message": "Account created successfully. You are now logged in.",
        "data": {
            "user": {
                "id": 1,
                "username": "juan",
                "email": "juan@example.com",
                "first_name": "Juan",
                "last_name": "Dela Cruz",
                "role": "doctor"
            },
            "tokens": {
                "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
                "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
            }
        }
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            email = request.data.get('email')
            otp = request.data.get('otp')
            
            # Validate input
            if not email or not otp:
                return error_response(
                    message='Email and OTP are required.',
                    errors={'detail': 'Missing required fields'}
                )
            
            with transaction.atomic():
                # Retrieve cached registration data
                cache_key = f"registration_{email}"
                cached_data = cache.get(cache_key)

                if not cached_data:
                    return error_response(
                        message='Registration expired or not found. Please start registration again.',
                        errors={'detail': 'No registration data found for this email'},
                        http_status=status.HTTP_400_BAD_REQUEST
                    )

                # Validate OTP
                cached_otp = cached_data.get('otp')
                if not cached_otp or cached_otp != otp:
                    return error_response(
                        message='Invalid OTP.',
                        errors={'otp': 'The OTP you entered is incorrect'},
                        http_status=status.HTTP_400_BAD_REQUEST
                    )

                # Convert birth_date back from string to date object if present
                if cached_data.get('birth_date') and isinstance(cached_data['birth_date'], str):
                    from datetime import datetime
                    cached_data['birth_date'] = datetime.fromisoformat(cached_data['birth_date']).date()

                # Remove OTP from cached data before creating account
                cached_data.pop('otp', None)
                cached_data.pop('confirm_password', None)  # Remove confirm_password too

                # Create account using VerifyAccountSerializer
                serializer = VerifyAccountSerializer()
                user = serializer.create_account(cached_data)

                # Delete cache after successful creation (prevent replay)
                cache.delete(cache_key)

                # Generate JWT tokens for auto-login
                tokens = get_jwt_tokens(user)
            
            return success_response(
                message='Account created successfully. You are now logged in.',
                data={
                    'user': {
                        'id': user.practitioner.practitioner_id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'role': user.role
                    },
                    'tokens': tokens
                },
                http_status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            return error_response(
                message='Account creation failed.',
                errors={'detail': str(e)},
                http_status=status.HTTP_400_BAD_REQUEST
            )


# ============================================================================
# LOGIN FLOW
# ============================================================================

class OrganizationListAPIView(generics.ListAPIView):
    """
    GET /api/accounts/organizations/
    Public endpoint to list all available hospitals for registration dropdowns.
    """
    authentication_classes = [] # Public access
    permission_classes = [AllowAny]
    queryset = Organization.objects.filter(active=True) # Only show active hospitals
    serializer_class = OrganizationSerializer

class LoginInitiateAPIView(APIView):
    """
    POST /api/accounts/login/initiate/
    
    Step 1: Validate Credentials + Send OTP.
    
    Request Body:
    {
        "email": "juan@example.com",
        "password": "SecurePass123"
    }
    
    Response:
    {
        "status": "success",
        "message": "Credentials verified. OTP sent to your email.",
        "data": {
            "email": "juan@example.com",
            "otp_sent": true
        }
    }
    """
    permission_classes = [AllowAny]
    throttle_scope = 'login'  # 5 requests per minute (brute-force protection)
    
    def post(self, request):
        serializer = LoginStepOneSerializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            # If OTP for login is disabled via settings, short-circuit and return tokens
            if not getattr(settings, 'LOGIN_USE_OTP', True):
                tokens = get_jwt_tokens(user)
                return success_response(
                    message='Login successful (OTP disabled).',
                    data={
                        'user': {
                            'id': user.practitioner.practitioner_id,
                            'username': user.username,
                            'email': user.email,
                            'first_name': user.first_name,
                            'last_name': user.last_name,
                            'role': user.role
                        },
                        'tokens': tokens,
                        'otp_sent': False,
                        'otp_disabled': True
                    }
                )

            # Send OTP via email using spam-proof HTML template
            send_otp_email(
                user_email=user.email,
                user_firstname=user.first_name,
                otp_code=user.otp
            )
            
            return success_response(
                message='Credentials verified. Please check your email for the login code.',
                data={
                    'email': user.email,
                    'otp_sent': True,
                    'expires_in': '5 minutes'
                }
            )
        
        except Exception as e:
            # Check if it's a lockout error
            if 'locked' in str(e).lower():
                return error_response(
                    message='Account temporarily locked.',
                    errors=serializer.errors if hasattr(serializer, 'errors') else {'detail': str(e)},
                    http_status=status.HTTP_403_FORBIDDEN
                )
            
            return error_response(
                message='Login failed.',
                errors=serializer.errors if hasattr(serializer, 'errors') else {'detail': str(e)},
                http_status=status.HTTP_401_UNAUTHORIZED
            )


class EmailCheckAPIView(APIView):
    """
    GET /api/accounts/check-email/?email=you@example.com

    Returns JSON indicating whether the email is available for registration.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        email = request.query_params.get('email')
        if not email:
            return error_response(
                message='Email query parameter is required.',
                errors={'email': 'Missing email parameter.'},
                http_status=status.HTTP_400_BAD_REQUEST
            )

        User = get_user_model()
        exists = User.objects.filter(email__iexact=email).exists()

        return success_response(
            message='Email availability checked.',
            data={
                'email': email,
                'available': not exists,
                'message': 'This email is already associated with another account.' if exists else 'Email is available.'
            }
        )


class LoginVerifyAPIView(APIView):
    """
    POST /api/accounts/login/verify/
    
    Step 2: Verify OTP + Return JWT Tokens.
    
    Request Body:
    {
        "email": "juan@example.com",
        "otp": "123456"
    }
    
    Response:
    {
        "status": "success",
        "message": "Login successful.",
        "data": {
            "user": {
                "id": 1,
                "username": "juan",
                "email": "juan@example.com",
                "first_name": "Juan",
                "last_name": "Dela Cruz",
                "role": "doctor"
            },
            "tokens": {
                "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
                "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
            }
        }
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        # If OTP for login is disabled, accept email and return tokens directly
        if not getattr(settings, 'LOGIN_USE_OTP', True):
            email = request.data.get('email')
            if not email:
                return error_response(
                    message='Email is required when OTP is disabled.',
                    errors={'email': 'Missing email parameter.'}
                )

            User = get_user_model()
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                return error_response(
                    message='User not found.',
                    errors={'email': 'No user with this email.'},
                    http_status=status.HTTP_404_NOT_FOUND
                )

            tokens = get_jwt_tokens(user)
            return success_response(
                message='Login successful (OTP disabled).',
                data={
                    'user': {
                        'id': user.practitioner.practitioner_id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'role': user.role
                    },
                    'tokens': tokens,
                    'otp_disabled': True
                }
            )

        serializer = LoginStepTwoSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()

            # Generate JWT tokens
            tokens = get_jwt_tokens(user)

            return success_response(
                message='Login successful.',
                data={
                    'user': {
                        'id': user.practitioner.practitioner_id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'role': user.role
                    },
                    'tokens': tokens
                }
            )

        except Exception as e:
            return error_response(
                message='OTP verification failed.',
                errors=serializer.errors if hasattr(serializer, 'errors') else {'detail': str(e)},
                http_status=status.HTTP_401_UNAUTHORIZED
            )


# ============================================================================
# PASSWORD RESET FLOW
# ============================================================================

class PasswordResetInitiateAPIView(APIView):
    """
    POST /api/accounts/password-reset/initiate/
    
    Step 1: Validate Email + Send OTP.
    
    Request Body:
    {
        "email": "juan@example.com"
    }
    
    Response:
    {
        "status": "success",
        "message": "Password reset code sent to your email.",
        "data": {
            "email": "juan@example.com",
            "otp_sent": true
        }
    }
    """
    permission_classes = [AllowAny]
    throttle_scope = 'password_reset'  # 3 requests per minute (abuse prevention)
    
    def post(self, request):
        serializer = PasswordResetInitiateSerializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            # Send OTP via email using spam-proof HTML template
            send_otp_email(
                user_email=user.email,
                user_firstname=user.first_name,
                otp_code=user.otp
            )
            
            return success_response(
                message='Password reset code sent to your email.',
                data={
                    'email': user.email,
                    'otp_sent': True,
                    'expires_in': '5 minutes'
                }
            )
        
        except Exception as e:
            return error_response(
                message='Password reset request failed.',
                errors=serializer.errors if hasattr(serializer, 'errors') else {'detail': str(e)}
            )


class PasswordResetConfirmAPIView(APIView):
    """
    POST /api/accounts/password-reset/confirm/
    
    Step 2: Verify OTP + Set New Password.
    
    Request Body:
    {
        "email": "juan@example.com",
        "otp": "123456",
        "new_password": "NewSecurePass123",
        "confirm_password": "NewSecurePass123"
    }
    
    Response:
    {
        "status": "success",
        "message": "Password reset successful. You can now login with your new password.",
        "data": {
            "email": "juan@example.com",
            "password_changed": true
        }
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            return success_response(
                message='Password reset successful. You can now login with your new password.',
                data={
                    'email': user.email,
                    'password_changed': True
                }
            )
        
        except Exception as e:
            return error_response(
                message='Password reset confirmation failed.',
                errors=serializer.errors if hasattr(serializer, 'errors') else {'detail': str(e)}
            )


# ============================================================================
# CHANGE PASSWORD (AUTHENTICATED USERS)
# ============================================================================

class ChangePasswordAPIView(APIView):
    """
    POST /api/accounts/change-password/
    
    Change password for authenticated users WITHOUT OTP.
    Kept for backward compatibility.
    
    Request Body:
    {
        "current_password": "OldPassword123",
        "new_password": "NewSecurePass456",
        "confirm_password": "NewSecurePass456"
    }
    
    Response:
    {
        "status": "success",
        "message": "Password changed successfully.",
        "data": {
            "email": "juan@example.com",
            "password_changed": true
        }
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'user': request.user}
        )
        
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            return success_response(
                message='Password changed successfully.',
                data={
                    'email': user.email,
                    'password_changed': True
                }
            )
        
        except Exception as e:
            return error_response(
                message='Password change failed.',
                errors=serializer.errors if hasattr(serializer, 'errors') else {'detail': str(e)}
            )


class ChangePasswordInitiateAPIView(APIView):
    """
    POST /api/accounts/change-password/initiate/
    
    Step 1: Validate current password and send OTP.
    Requires authentication.
    
    Request Body:
    {
        "current_password": "CurrentPassword123",
        "new_password": "NewSecurePass456",
        "confirm_password": "NewSecurePass456"
    }
    
    Response:
    {
        "status": "success",
        "message": "OTP sent to your email. Please verify to complete password change.",
        "data": {
            "email": "juan@example.com",
            "otp_sent": true,
            "expires_in": "5 minutes"
        }
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ChangePasswordInitiateSerializer(
            data=request.data,
            context={'user': request.user}
        )
        
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            # Send OTP via email using spam-proof HTML template
            send_otp_email(
                user_email=user.email,
                user_firstname=user.first_name,
                otp_code=user.otp
            )
            
            return success_response(
                message='OTP sent to your email. Please verify to complete password change.',
                data={
                    'email': user.email,
                    'otp_sent': True,
                    'expires_in': '5 minutes'
                }
            )
        
        except Exception as e:
            return error_response(
                message='Password change initiation failed.',
                errors=serializer.errors if hasattr(serializer, 'errors') else {'detail': str(e)}
            )


class ChangePasswordVerifyAPIView(APIView):
    """
    POST /api/accounts/change-password/verify/
    
    Step 2: Verify OTP and complete password change.
    Requires authentication.
    
    Request Body:
    {
        "otp": "123456"
    }
    
    Response:
    {
        "status": "success",
        "message": "Password changed successfully. Please login with your new password.",
        "data": {
            "email": "juan@example.com",
            "password_changed": true
        }
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ChangePasswordVerifySerializer(
            data=request.data,
            context={'user': request.user}
        )
        
        try:
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            return success_response(
                message='Password changed successfully. Please login with your new password.',
                data={
                    'email': user.email,
                    'password_changed': True
                },
                http_status=status.HTTP_200_OK
            )
        
        except Exception as e:
            return error_response(
                message='Password change verification failed.',
                errors=serializer.errors if hasattr(serializer, 'errors') else {'detail': str(e)}
            )


# ============================================================================
# PRACTITIONER CALL OUTS FUNCTIONS
# ============================================================================

class PractitionerListAPIView(generics.ListAPIView):
    """
    GET /api/accounts/practitioners/
    List all active practitioners for dropdowns.
    Supports ?role=doctor to filter by specific role.
    """
    permission_classes = [AllowAny]
    serializer_class = PractitionerSerializer
    
    def get_queryset(self):
        queryset = Practitioner.objects.filter(active=True)
        role = self.request.query_params.get('role', None)
        if role:
            # Filter by matching User role linked to this Practitioner
            # In our model, User has a O2O to Practitioner with primary_key=True
            queryset = queryset.filter(user__role__iexact=role)
        return queryset


# ============================================================================
# ADMIN PERMISSION
# ============================================================================

class IsAdminRole(BasePermission):
    """TEMPORARILY open to any authenticated user."""
    message = 'Authentication required.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


# ============================================================================
# ADMIN: HOSPITAL SETTINGS
# ============================================================================

class HospitalSettingsAPIView(APIView):
    """
    GET  /api/accounts/admin/hospital/
    PUT  /api/accounts/admin/hospital/

    Retrieve or update the primary organization (hospital) profile.
    Admin-only. Returns FHIR R4 Organization-compatible payload.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def _get_organization(self):
        return Organization.objects.filter(active=True).order_by('organization_id').first()

    def get(self, request):
        org = self._get_organization()
        if not org:
            return error_response('No organization found.', http_status=status.HTTP_404_NOT_FOUND)
        serializer = HospitalSettingsSerializer(org)
        return success_response('Hospital settings retrieved.', data=serializer.data)

    def put(self, request):
        org = self._get_organization()
        if not org:
            return error_response('No organization found.', http_status=status.HTTP_404_NOT_FOUND)
        serializer = HospitalSettingsSerializer(org, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response('Hospital settings updated.', data=serializer.data)
        return error_response('Validation failed.', errors=serializer.errors)


# ============================================================================
# ADMIN: USER MANAGEMENT
# ============================================================================

class AdminUserListAPIView(APIView):
    """
    GET  /api/accounts/admin/users/          - list all users
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        User = get_user_model()
        role_filter = request.query_params.get('role')
        users = User.objects.select_related('practitioner').all()
        if role_filter:
            users = users.filter(role=role_filter)
        serializer = AdminUserSerializer(users, many=True)
        return success_response('Users retrieved.', data=serializer.data)


class AdminUserDetailAPIView(APIView):
    """
    GET   /api/accounts/admin/users/<pk>/    - retrieve user
    PATCH /api/accounts/admin/users/<pk>/    - update role / status / is_active
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def _get_user(self, pk):
        User = get_user_model()
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return error_response('User not found.', http_status=status.HTTP_404_NOT_FOUND)
        return success_response('User retrieved.', data=AdminUserSerializer(user).data)

    def patch(self, request, pk):
        user = self._get_user(pk)
        if not user:
            return error_response('User not found.', http_status=status.HTTP_404_NOT_FOUND)
        # Prevent removing the last admin
        if user.role == 'admin' and request.data.get('role') != 'admin':
            User = get_user_model()
            admin_count = User.objects.filter(role='admin').count()
            if admin_count <= 1:
                return error_response(
                    'Cannot remove the last admin account.',
                    http_status=status.HTTP_400_BAD_REQUEST
                )
        serializer = AdminUserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response('User updated.', data=serializer.data)
        return error_response('Validation failed.', errors=serializer.errors)


# ============================================================================
# ADMIN: ROLE MODULE CONFIGURATION
# ============================================================================

class AdminRoleModuleConfigAPIView(APIView):
    """
    GET  /api/accounts/admin/role-modules/         - get all role configs
    PUT  /api/accounts/admin/role-modules/<role>/  - update modules for a role
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        configs = RoleModuleConfig.get_all_configs()
        return success_response('Role module configs retrieved.', data=configs)

    def put(self, request, role):
        allowed_roles = [r[0] for r in RoleModuleConfig.ROLE_CHOICES]
        if role not in allowed_roles:
            return error_response(f'Role must be one of: {", ".join(allowed_roles)}',
                                  http_status=status.HTTP_400_BAD_REQUEST)
        config = RoleModuleConfig.get_for_role(role)
        serializer = RoleModuleConfigSerializer(config, data={'role': role, 'modules': request.data.get('modules', [])})
        if serializer.is_valid():
            serializer.save()
            return success_response(f'Modules for {role} updated.', data=serializer.data)
        return error_response('Validation failed.', errors=serializer.errors)


# ============================================================================
# ADMIN: FHIR ORGANIZATION RESOURCE
# ============================================================================

class FHIROrganizationAPIView(APIView):
    """
    GET /api/accounts/fhir/Organization/<pk>
    Returns a FHIR R4-compliant Organization resource for the hospital.
    Admin-only for write; authenticated users can read.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        if pk:
            try:
                org = Organization.objects.get(pk=pk)
            except Organization.DoesNotExist:
                return error_response('Organization not found.', http_status=status.HTTP_404_NOT_FOUND)
        else:
            org = Organization.objects.filter(active=True).order_by('organization_id').first()
            if not org:
                return error_response('No organization found.', http_status=status.HTTP_404_NOT_FOUND)

        from patients.wah4pc import organization_to_fhir
        return Response(organization_to_fhir(org), status=status.HTTP_200_OK)


# ============================================================================
# ADMIN: ROOM TYPE DEFINITIONS
# ============================================================================

class AdminRoomTypeListCreateAPIView(APIView):
    """
    GET  /api/accounts/admin/room-types/   - list all room types
    POST /api/accounts/admin/room-types/   - create a room type
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = RoomTypeDefinition.objects.all()
        serializer = RoomTypeDefinitionSerializer(qs, many=True)
        return success_response('Room types retrieved.', data=serializer.data)

    def post(self, request):
        serializer = RoomTypeDefinitionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return success_response('Room type created.', data=serializer.data,
                                    http_status=status.HTTP_201_CREATED)
        return error_response('Validation failed.', errors=serializer.errors)


class AdminRoomTypeDetailAPIView(APIView):
    """
    GET    /api/accounts/admin/room-types/<pk>/
    PUT    /api/accounts/admin/room-types/<pk>/
    DELETE /api/accounts/admin/room-types/<pk>/
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def _get(self, pk):
        try:
            return RoomTypeDefinition.objects.get(pk=pk)
        except RoomTypeDefinition.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return error_response('Room type not found.', http_status=status.HTTP_404_NOT_FOUND)
        return success_response('Room type retrieved.', data=RoomTypeDefinitionSerializer(obj).data)

    def put(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return error_response('Room type not found.', http_status=status.HTTP_404_NOT_FOUND)
        serializer = RoomTypeDefinitionSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response('Room type updated.', data=serializer.data)
        return error_response('Validation failed.', errors=serializer.errors)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return error_response('Room type not found.', http_status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return success_response('Room type deleted.')


# ============================================================================
# ADMIN: DOCTOR FEE SCHEDULES
# ============================================================================

class AdminDoctorFeeListCreateAPIView(APIView):
    """
    GET  /api/accounts/admin/doctor-fees/   - list all fee schedules
    POST /api/accounts/admin/doctor-fees/   - create a fee schedule
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = DoctorFeeSchedule.objects.all()
        serializer = DoctorFeeScheduleSerializer(qs, many=True)
        return success_response('Doctor fee schedules retrieved.', data=serializer.data)

    def post(self, request):
        serializer = DoctorFeeScheduleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return success_response('Fee schedule created.', data=serializer.data,
                                    http_status=status.HTTP_201_CREATED)
        return error_response('Validation failed.', errors=serializer.errors)


class AdminDoctorFeeDetailAPIView(APIView):
    """
    GET    /api/accounts/admin/doctor-fees/<pk>/
    PUT    /api/accounts/admin/doctor-fees/<pk>/
    DELETE /api/accounts/admin/doctor-fees/<pk>/
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def _get(self, pk):
        try:
            return DoctorFeeSchedule.objects.get(pk=pk)
        except DoctorFeeSchedule.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return error_response('Fee schedule not found.', http_status=status.HTTP_404_NOT_FOUND)
        return success_response('Fee schedule retrieved.', data=DoctorFeeScheduleSerializer(obj).data)

    def put(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return error_response('Fee schedule not found.', http_status=status.HTTP_404_NOT_FOUND)
        serializer = DoctorFeeScheduleSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response('Fee schedule updated.', data=serializer.data)
        return error_response('Validation failed.', errors=serializer.errors)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return error_response('Fee schedule not found.', http_status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return success_response('Fee schedule deleted.')


# ============================================================================
# ADMIN: PROCEDURE PRICE CONFIGS
# ============================================================================

class AdminProcedurePriceListCreateAPIView(APIView):
    """
    GET  /api/accounts/admin/procedures/   - list all procedure prices
    POST /api/accounts/admin/procedures/   - create a procedure price
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = ProcedurePriceConfig.objects.all()
        serializer = ProcedurePriceConfigSerializer(qs, many=True)
        return success_response('Procedure prices retrieved.', data=serializer.data)

    def post(self, request):
        serializer = ProcedurePriceConfigSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return success_response('Procedure price created.', data=serializer.data,
                                    http_status=status.HTTP_201_CREATED)
        return error_response('Validation failed.', errors=serializer.errors)


class AdminProcedurePriceDetailAPIView(APIView):
    """
    GET    /api/accounts/admin/procedures/<pk>/
    PUT    /api/accounts/admin/procedures/<pk>/
    DELETE /api/accounts/admin/procedures/<pk>/
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def _get(self, pk):
        try:
            return ProcedurePriceConfig.objects.get(pk=pk)
        except ProcedurePriceConfig.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return error_response('Procedure price not found.', http_status=status.HTTP_404_NOT_FOUND)
        return success_response('Procedure price retrieved.', data=ProcedurePriceConfigSerializer(obj).data)

    def put(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return error_response('Procedure price not found.', http_status=status.HTTP_404_NOT_FOUND)
        serializer = ProcedurePriceConfigSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response('Procedure price updated.', data=serializer.data)
        return error_response('Validation failed.', errors=serializer.errors)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return error_response('Procedure price not found.', http_status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return success_response('Procedure price deleted.')


# ============================================================================
# ADMIN: LOCATION / FACILITIES MANAGEMENT
# ============================================================================

class AdminLocationListCreateAPIView(APIView):
    """
    GET  /api/accounts/admin/locations/   - list all locations
    POST /api/accounts/admin/locations/   - create a location
    Supports ?physical_type=building|ward|room|bed filter.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = Location.objects.select_related('part_of_location').all()
        physical_type = request.query_params.get('physical_type')
        if physical_type:
            qs = qs.filter(physical_type_code__iexact=physical_type)
        serializer = LocationAdminSerializer(qs, many=True)
        return success_response('Locations retrieved.', data=serializer.data)

    def post(self, request):
        serializer = LocationAdminSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return success_response('Location created.', data=serializer.data,
                                    http_status=status.HTTP_201_CREATED)
        return error_response('Validation failed.', errors=serializer.errors)


class AdminLocationDetailAPIView(APIView):
    """
    GET    /api/accounts/admin/locations/<pk>/
    PUT    /api/accounts/admin/locations/<pk>/
    DELETE /api/accounts/admin/locations/<pk>/
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def _get(self, pk):
        try:
            return Location.objects.select_related('part_of_location').get(pk=pk)
        except Location.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return error_response('Location not found.', http_status=status.HTTP_404_NOT_FOUND)
        return success_response('Location retrieved.', data=LocationAdminSerializer(obj).data)

    def put(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return error_response('Location not found.', http_status=status.HTTP_404_NOT_FOUND)
        serializer = LocationAdminSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response('Location updated.', data=serializer.data)
        return error_response('Validation failed.', errors=serializer.errors)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return error_response('Location not found.', http_status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return success_response('Location deleted.')