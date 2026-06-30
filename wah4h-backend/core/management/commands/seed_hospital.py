from django.core.management.base import BaseCommand
from django.db import IntegrityError
from accounts.models import Organization

class Command(BaseCommand):
    help = 'Seeds the database with major Philippine hospitals (Auto-Incremental)'

    def handle(self, *args, **options):
        # Data payload
        hospitals = [
            {
                'identifier': 'DOH-001',
                'name': 'Philippine General Hospital',
                'type_code': 'hospital',
                'status': 'active',
                'active': True,
                'address_line': 'Taft Avenue',
                'address_city': 'Manila',
                'address_state': 'Metro Manila',
                'address_country': 'Philippines',
                'address_postal_code': '1000',
                'telecom': '+63-2-554-8400',
            },
            {
                'identifier': 'DOH-002',
                'name': "St. Luke's Medical Center - Global City",
                'type_code': 'hospital',
                'status': 'active',
                'active': True,
                'address_line': 'Rizal Drive, Bonifacio Global City',
                'address_city': 'Taguig',
                'address_state': 'Metro Manila',
                'address_country': 'Philippines',
                'address_postal_code': '1634',
                'telecom': '+63-2-7789-7700',
            },
            {
                'identifier': 'DOH-003',
                'name': 'The Medical City',
                'type_code': 'hospital',
                'status': 'active',
                'active': True,
                'address_line': 'Ortigas Avenue',
                'address_city': 'Pasig',
                'address_state': 'Metro Manila',
                'address_country': 'Philippines',
                'address_postal_code': '1605',
                'telecom': '+63-2-8988-1000',
            },
            {
                'identifier': 'DOH-004',
                'name': 'Lung Center of the Philippines',
                'type_code': 'hospital',
                'status': 'active',
                'active': True,
                'address_line': 'Quezon Avenue',
                'address_city': 'Quezon City',
                'address_state': 'Metro Manila',
                'address_country': 'Philippines',
                'address_postal_code': '1100',
                'telecom': '+63-2-8924-6101',
            },
            {
                'identifier': 'DOH-005',
                'name': 'Makati Medical Center',
                'type_code': 'hospital',
                'status': 'active',
                'active': True,
                'address_line': '2 Amorsolo Street',
                'address_city': 'Makati',
                'address_state': 'Metro Manila',
                'address_country': 'Philippines',
                'address_postal_code': '1229',
                'telecom': '+63-2-8888-8999',
            },
        ]

        created_count = 0
        updated_count = 0
        skipped_count = 0

        self.stdout.write("Starting hospital seed...")

        for hospital_data in hospitals:
            # 1. Isolate the unique identifier for the lookup
            identifier = hospital_data.pop('identifier')

            try:
                # 2. Try to Update or Create based on Identifier
                organization, created = Organization.objects.update_or_create(
                    identifier=identifier,
                    defaults=hospital_data
                )

                if created:
                    created_count += 1
                    self.stdout.write(self.style.SUCCESS(f' + Created: {organization.name}'))
                else:
                    updated_count += 1
                    self.stdout.write(self.style.WARNING(f' . Updated: {organization.name}'))

            except IntegrityError as e:
                # 3. Catch the Postal Code conflict (or any other unique constraint)
                skipped_count += 1
                error_msg = str(e)
                if 'address_postal_code' in error_msg:
                    self.stdout.write(self.style.ERROR(
                        f' x Skipped: {hospital_data["name"]} (Postal Code {hospital_data["address_postal_code"]} is already taken)'
                    ))
                else:
                    self.stdout.write(self.style.ERROR(f' x Error seeding {hospital_data["name"]}: {e}'))

        # Summary
        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Created: {created_count}, Updated: {updated_count}, Skipped: {skipped_count}'
        ))