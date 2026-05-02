"""
accounts/urls.py

URL Configuration for 2-Step OTP Authentication System.

Routes:
- Registration: /register/initiate/, /register/verify/
- Login: /login/initiate/, /login/verify/
- Password Reset: /password-reset/initiate/, /password-reset/confirm/
- Token Refresh: /token/refresh/
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterInitiateAPIView,
    RegisterVerifyAPIView,
    LoginInitiateAPIView,
    LoginVerifyAPIView,
    PasswordResetInitiateAPIView,
    PasswordResetConfirmAPIView,
    ChangePasswordAPIView,
    ChangePasswordInitiateAPIView,
    ChangePasswordVerifyAPIView,
    EmailCheckAPIView,
    OrganizationListAPIView,
    PractitionerListAPIView,
    HospitalSettingsAPIView,
    AdminUserListAPIView,
    AdminUserDetailAPIView,
    AdminRoleModuleConfigAPIView,
    FHIROrganizationAPIView,
)

urlpatterns = [
    # ========================================================================
    # REGISTRATION FLOW
    # ========================================================================
    path(
        'register/initiate/',
        RegisterInitiateAPIView.as_view(),
        name='register-initiate'
    ),
    path(
        'register/verify/',
        RegisterVerifyAPIView.as_view(),
        name='register-verify'
    ),
    
    # ========================================================================
    # LOGIN FLOW
    # ========================================================================
    path(
        'login/initiate/',
        LoginInitiateAPIView.as_view(),
        name='login-initiate'
    ),
    path(
        'login/verify/',
        LoginVerifyAPIView.as_view(),
        name='login-verify'
    ),
    
    # ========================================================================
    # PASSWORD RESET FLOW
    # ========================================================================
    path(
        'password-reset/initiate/',
        PasswordResetInitiateAPIView.as_view(),
        name='password-reset-initiate'
    ),
    path(
        'password-reset/confirm/',
        PasswordResetConfirmAPIView.as_view(),
        name='password-reset-confirm'
    ),
    
    # ========================================================================
    # CHANGE PASSWORD (AUTHENTICATED)
    # ========================================================================
    path(
        'change-password/',
        ChangePasswordAPIView.as_view(),
        name='change-password'
    ),
    path(
        'change-password/initiate/',
        ChangePasswordInitiateAPIView.as_view(),
        name='change-password-initiate'
    ),
    path(
        'change-password/verify/',
        ChangePasswordVerifyAPIView.as_view(),
        name='change-password-verify'
    ),
    
    # ========================================================================
    # JWT TOKEN REFRESH
    # ========================================================================
    path(
        'token/refresh/',
        TokenRefreshView.as_view(),
        name='token-refresh'
    ),


    path('organizations/', OrganizationListAPIView.as_view(), name='organization-list'),

    path('practitioners/', PractitionerListAPIView.as_view(), name='practitioner-list'),
    path('check-email/', EmailCheckAPIView.as_view(), name='check-email'),

    # ========================================================================
    # ADMIN ENDPOINTS
    # ========================================================================
    path('admin/hospital/', HospitalSettingsAPIView.as_view(), name='admin-hospital-settings'),
    path('admin/users/', AdminUserListAPIView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/', AdminUserDetailAPIView.as_view(), name='admin-user-detail'),
    path('admin/role-modules/', AdminRoleModuleConfigAPIView.as_view(), name='admin-role-modules-list'),
    path('admin/role-modules/<str:role>/', AdminRoleModuleConfigAPIView.as_view(), name='admin-role-modules-update'),

    # ========================================================================
    # FHIR ORGANIZATION RESOURCE
    # ========================================================================
    path('fhir/Organization/', FHIROrganizationAPIView.as_view(), name='fhir-organization'),
    path('fhir/Organization/<int:pk>/', FHIROrganizationAPIView.as_view(), name='fhir-organization-detail'),
]

