"""
billing/urls.py

URL Configuration for Billing Module.

Routes:
- /api/billing/accounts/
- /api/billing/invoices/
- /api/billing/claims/
- /api/billing/eclaims/          ← PhilHealth eClaims
- /api/billing/claim-responses/  ← Adjudication results
- /api/billing/coverage/         ← PhilHealth membership records
- /api/billing/payments/
- /api/billing/payment-notices/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from billing.views import (
    AccountViewSet,
    InvoiceViewSet,
    ClaimViewSet,
    EClaimViewSet,
    ClaimResponseViewSet,
    CoverageViewSet,
    PaymentReconciliationViewSet,
    PaymentNoticeViewSet,
)

# Initialize router
router = DefaultRouter()

router.register(r'accounts',        AccountViewSet,              basename='account')
router.register(r'invoices',        InvoiceViewSet,              basename='invoice')
router.register(r'claims',          ClaimViewSet,                basename='claim')
router.register(r'eclaims',         EClaimViewSet,               basename='eclaim')
router.register(r'claim-responses', ClaimResponseViewSet,        basename='claim-response')
router.register(r'coverage',        CoverageViewSet,             basename='coverage')
router.register(r'payments',        PaymentReconciliationViewSet, basename='payment')
router.register(r'payment-notices', PaymentNoticeViewSet,        basename='payment-notice')

urlpatterns = [
    path('', include(router.urls)),
]
