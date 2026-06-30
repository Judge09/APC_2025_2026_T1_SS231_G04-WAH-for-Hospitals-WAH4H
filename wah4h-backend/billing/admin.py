from django.contrib import admin
from .models import (
    Account,
    Claim,
    ClaimResponse,
    Invoice,
    PaymentReconciliation,
    PaymentNotice
)


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'name', 'status', 'type', 'subject_id')
    search_fields = ('identifier', 'name')
    list_filter = ('status', 'type')
    readonly_fields = ('account_id', 'created_at', 'updated_at')


@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'status', 'type', 'subject_id', 'created')
    search_fields = ('identifier', 'status')
    list_filter = ('status', 'type', 'created')
    readonly_fields = ('claim_id', 'created', 'created_at', 'updated_at')


@admin.register(ClaimResponse)
class ClaimResponseAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'status', 'subject_id', 'outcome', 'created')
    search_fields = ('identifier', 'status')
    list_filter = ('status', 'outcome')
    readonly_fields = ('claimResponse_id', 'created', 'created_at', 'updated_at')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'status', 'subject_id', 'total_gross_value', 'invoice_datetime')
    search_fields = ('identifier', 'status')
    list_filter = ('status', 'invoice_datetime')
    readonly_fields = ('invoice_id', 'invoice_datetime', 'created_at', 'updated_at')


@admin.register(PaymentReconciliation)
class PaymentReconciliationAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'status', 'payment_date', 'payment_amount_value')
    list_filter = ('status', 'payment_date')
    readonly_fields = ('payment_reconciliation_id', 'created_datetime', 'created_at', 'updated_at')


@admin.register(PaymentNotice)
class PaymentNoticeAdmin(admin.ModelAdmin):
    list_display = ('identifier', 'status', 'payment_status', 'payment_date')
    list_filter = ('status', 'payment_status')
    readonly_fields = ('payment_notice_id', 'created_datetime', 'created_at', 'updated_at')