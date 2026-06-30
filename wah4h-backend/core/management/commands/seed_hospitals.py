from django.core.management.base import BaseCommand
from accounts.models import Organization


class Command(BaseCommand):
    help = 'Seeds the database with major Philippine hospitals'

    def handle(self, *args, **options):
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
        existing_count = 0

        for hospital_data in hospitals:
            organization, created = Organization.objects.get_or_create(
                name=hospital_data['name'],
                defaults=hospital_data
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created: {organization.name}')
                )
            else:
                existing_count += 1
                self.stdout.write(
                    self.style.WARNING(f'⚠ Already exists: {organization.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Successfully seeded {created_count} hospitals '
                f'({existing_count} already existed)'
            )
        )
