"""
billing/urls.py

URL Configuration for Billing Module.
Registers ViewSets for billing accounts, invoices, insurance claims, and payment reconciliation.

Routes:
- /api/billing/accounts/
- /api/billing/invoices/
- /api/billing/claims/
- /api/billing/payments/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from billing.views import (
    AccountViewSet,
    InvoiceViewSet,
    ClaimViewSet,
    PaymentReconciliationViewSet,
    PaymentNoticeViewSet,
)

# Initialize router
router = DefaultRouter()

# Register ViewSets with specific route prefixes
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'claims', ClaimViewSet, basename='claim')
router.register(r'payments', PaymentReconciliationViewSet, basename='payment')
router.register(r'payment-notices', PaymentNoticeViewSet, basename='payment-notice')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]