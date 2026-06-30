from django.core.management.base import BaseCommand
from billing.models import Invoice, PaymentReconciliation, PaymentNotice, Account, Claim
from django.db import transaction

class Command(BaseCommand):
    help = 'Cleans mock billing data from the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Delete all records instead of just mock patterns',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting cleanup of billing data...'))
        
        with transaction.atomic():
            if options['all']:
                self.stdout.write(self.style.NOTICE('Purging ALL records...'))
                inv_count, _ = Invoice.objects.all().delete()
                pay_count, _ = PaymentReconciliation.objects.all().delete()
                notice_count, _ = PaymentNotice.objects.all().delete()
                claim_count, _ = Claim.objects.all().delete()
                acc_count, _ = Account.objects.all().delete()
            else:
                self.stdout.write(self.style.NOTICE('Purging records with mock prefixes (INV-, PAY-)...'))
                inv_count, _ = Invoice.objects.filter(identifier__startswith='INV-').delete()
                pay_count, _ = PaymentReconciliation.objects.filter(identifier__startswith='PAY-').delete()
                # Pattern match others if possible, or just purge these main ones
                notice_count, _ = PaymentNotice.objects.filter(identifier__startswith='PAY-').delete()
                claim_count = 0
                acc_count = 0

            self.stdout.write(self.style.SUCCESS(f'Deleted {inv_count} Invoices'))
            self.stdout.write(self.style.SUCCESS(f'Deleted {pay_count} PaymentReconciliations'))
            self.stdout.write(self.style.SUCCESS(f'Deleted {notice_count} PaymentNotices'))
            self.stdout.write(self.style.SUCCESS('Cleanup complete.'))
