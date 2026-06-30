"""
laboratory/management/commands/seed_lab_prices.py

Django management command to seed hardcoded prices for all lab tests
available in the Monitoring module's lab request form.

Usage:
    python manage.py seed_lab_prices
    python manage.py seed_lab_prices --clear   # Remove unlisted tests first
"""

from django.core.management.base import BaseCommand
from laboratory.models import LabTestDefinition


# ============================================================
# CANONICAL LAB TEST PRICE LIST
# Matches exactly the tests in the Monitoring tab (LaboratoryTab.tsx)
# ============================================================
LAB_TESTS = [
    # Hematology
    {
        "code": "cbc",
        "name": "Complete Blood Count (CBC)",
        "category": "Hematology",
        "price": 180.00,
    },
    {
        "code": "blood_typing",
        "name": "Blood Typing",
        "category": "Hematology",
        "price": 100.00,
    },
    # Clinical Microscopy
    {
        "code": "urinalysis",
        "name": "Urinalysis",
        "category": "Clinical Microscopy",
        "price": 60.00,
    },
    {
        "code": "fecalysis",
        "name": "Fecalysis",
        "category": "Clinical Microscopy",
        "price": 60.00,
    },
    # Clinical Chemistry
    {
        "code": "fbs",
        "name": "Fasting Blood Sugar (FBS)",
        "category": "Clinical Chemistry",
        "price": 100.00,
    },
    {
        "code": "rbs",
        "name": "Random Blood Sugar (RBS)",
        "category": "Clinical Chemistry",
        "price": 100.00,
    },
]


class Command(BaseCommand):
    help = "Seed hardcoded prices for all lab tests available in the Monitoring module."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete any LabTestDefinition records not in the canonical list before seeding.",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING(
            "=== Seeding Lab Test Prices ==="
        ))

        canonical_codes = [t["code"] for t in LAB_TESTS]

        # Optional: remove orphaned/non-standard definitions
        if options["clear"]:
            orphans = LabTestDefinition.objects.exclude(code__in=canonical_codes)
            count = orphans.count()
            if count:
                orphans.delete()
                self.stdout.write(self.style.WARNING(
                    f"  Removed {count} non-standard lab test definition(s)."
                ))

        # Upsert each test
        for test in LAB_TESTS:
            obj, created = LabTestDefinition.objects.update_or_create(
                code=test["code"],
                defaults={
                    "identifier": f"DEF-{test['code'].upper()}",
                    "name": test["name"],
                    "base_price": test["price"],
                    "category": test["category"],
                    "status": "active",
                },
            )
            action = self.style.SUCCESS("CREATED") if created else self.style.NOTICE("UPDATED")
            self.stdout.write(
                f"  [{action}] {obj.name} ({obj.code}) → ₱{obj.base_price}"
            )

        self.stdout.write(self.style.SUCCESS(
            f"\n✓ Done. {len(LAB_TESTS)} lab test price(s) seeded."
        ))
