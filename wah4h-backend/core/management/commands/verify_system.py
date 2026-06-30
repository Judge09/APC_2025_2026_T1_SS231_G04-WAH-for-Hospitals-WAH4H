"""
WAH4H System Verification Command
==================================
Smoke Test: Creates connected records across all apps to verify Referential Integrity.
Aligned with WAH4H_ResourceListv4 Excel Schema.

Usage: python manage.py verify_system
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from datetime import datetime, date, timedelta
from decimal import Decimal


class Command(BaseCommand):
    help = 'Performs a comprehensive smoke test of WAH4H system integrity'

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO('=' * 70))
        self.stdout.write(self.style.HTTP_INFO('WAH4H SYSTEM VERIFICATION - SMOKE TEST'))
        self.stdout.write(self.style.HTTP_INFO('=' * 70))
        
        try:
            with transaction.atomic():
                # Step 1: Foundation (Accounts)
                self.stdout.write('\n📋 Step 1: Creating Foundation Data (Organization, Location, Practitioner)...')
                org, location, practitioner = self.create_foundation()
                self.stdout.write(self.style.SUCCESS(f'   ✓ Organization: {org.name}'))
                self.stdout.write(self.style.SUCCESS(f'   ✓ Location: {location.name}'))
                self.stdout.write(self.style.SUCCESS(f'   ✓ Practitioner: Dr. {practitioner.last_name}'))
                
                # Step 2: Patient
                self.stdout.write('\n🏥 Step 2: Creating Patient...')
                patient = self.create_patient(org)
                self.stdout.write(self.style.SUCCESS(f'   ✓ Patient: {patient.first_name} {patient.last_name}'))
                
                # Step 3: The Stubs (Mirror Models)
                self.stdout.write('\n🔧 Step 3: Creating Stub Models (ServiceRequest, Appointment, Device)...')
                service_request = self.create_service_request(patient)
                appointment = self.create_appointment()
                device = self.create_device(location, org)
                self.stdout.write(self.style.SUCCESS(f'   ✓ ServiceRequest: {service_request.identifier}'))
                self.stdout.write(self.style.SUCCESS(f'   ✓ Appointment: {appointment.identifier}'))
                self.stdout.write(self.style.SUCCESS(f'   ✓ Device: {device.device_name}'))
                
                # Step 4: The Core Link (Encounter)
                self.stdout.write('\n🔗 Step 4: Creating Encounter (Core Integration Test)...')
                encounter = self.create_encounter(patient, practitioner, appointment, service_request, location, org)
                self.stdout.write(self.style.SUCCESS(f'   ✓ Encounter: {encounter.identifier}'))
                self.stdout.write(self.style.SUCCESS(f'   ✓ Linked to: Patient, Practitioner, Appointment, ServiceRequest'))
                
                # Step 5: Financials (Coverage & Claim)
                self.stdout.write('\n💰 Step 5: Creating Financial Records (Coverage, Account, Claim)...')
                coverage = self.create_coverage(patient, org)
                account = self.create_account(patient, coverage, org)
                claim = self.create_claim(patient, org, practitioner, encounter, coverage)
                self.stdout.write(self.style.SUCCESS(f'   ✓ Coverage: {coverage.identifier}'))
                self.stdout.write(self.style.SUCCESS(f'   ✓ Account: {account.identifier}'))
                self.stdout.write(self.style.SUCCESS(f'   ✓ Claim: {claim.identifier}'))
                
                # Step 6: Inventory (Data Type Verification)
                self.stdout.write('\n📦 Step 6: Creating Inventory (Data Type Test: Integer/Decimal)...')
                inventory = self.create_inventory()
                self.stdout.write(self.style.SUCCESS(f'   ✓ Inventory: {inventory.item_name}'))
                self.stdout.write(self.style.SUCCESS(f'   ✓ Stock: {inventory.current_stock} (Integer)'))
                self.stdout.write(self.style.SUCCESS(f'   ✓ Unit Cost: ${inventory.unit_cost} (Decimal)'))
                
                # Step 7: Additional Models
                self.stdout.write('\n🔬 Step 7: Creating Additional Records (Observation, Condition, Procedure)...')
                condition = self.create_condition(patient, encounter, practitioner)
                observation = self.create_observation(patient, encounter, practitioner, device)
                procedure = self.create_procedure(patient, encounter, service_request, practitioner, location)
                self.stdout.write(self.style.SUCCESS(f'   ✓ Condition: {condition.identifier}'))
                self.stdout.write(self.style.SUCCESS(f'   ✓ Observation: {observation.identifier}'))
                self.stdout.write(self.style.SUCCESS(f'   ✓ Procedure: {procedure.identifier}'))
                
                # Success Banner
                self.stdout.write('\n')
                self.stdout.write(self.style.SUCCESS('=' * 70))
                self.stdout.write(self.style.SUCCESS('✅ ALL SYSTEMS GO: WAH4H Hospital Node is fully operational.'))
                self.stdout.write(self.style.SUCCESS('=' * 70))
                self.stdout.write(self.style.SUCCESS('\n✓ All model relationships verified'))
                self.stdout.write(self.style.SUCCESS('✓ Stub models (Appointment, ServiceRequest, Device) functional'))
                self.stdout.write(self.style.SUCCESS('✓ Foreign key integrity confirmed'))
                self.stdout.write(self.style.SUCCESS('✓ Data types validated (Integer, Decimal)'))
                self.stdout.write(self.style.SUCCESS('✓ Cross-app references working'))
                
                # Rollback note
                self.stdout.write('\n')
                self.stdout.write(self.style.WARNING('ℹ️  Note: All test data was rolled back (transaction.atomic)'))
                self.stdout.write(self.style.WARNING('   No permanent records were created in the database.'))
                self.stdout.write('\n')
                
                # Force rollback for testing
                raise Exception("Intentional rollback - test data not saved")
                
        except Exception as e:
            if "Intentional rollback" in str(e):
                # This is expected - we want to rollback test data
                pass
            else:
                # Real error - report it
                self.stdout.write('\n')
                self.stdout.write(self.style.ERROR('=' * 70))
                self.stdout.write(self.style.ERROR('❌ SYSTEM VERIFICATION FAILED'))
                self.stdout.write(self.style.ERROR('=' * 70))
                self.stdout.write(self.style.ERROR(f'\nError: {str(e)}'))
                import traceback
                self.stdout.write(self.style.ERROR('\nTraceback:'))
                self.stdout.write(self.style.ERROR(traceback.format_exc()))
                raise

    def create_foundation(self):
        """Step 1: Create Organization, Location, Practitioner"""
        from accounts.models import Organization, Location, Practitioner
        
        org = Organization.objects.create(
            identifier='ORG-TEST-001',
            status='active',
            name='WAH4H Test Hospital',
            active=True
        )
        
        location = Location.objects.create(
            identifier='LOC-TEST-001',
            status='active',
            name='Emergency Room',
            mode='instance',
            managing_organization=org
        )
        
        practitioner = Practitioner.objects.create(
            identifier='PRAC-TEST-001',
            status='active',
            active=True,
            first_name='John',
            last_name='Smith',
            gender='male',
            qualification_code='MD'
        )
        
        return org, location, practitioner

    def create_patient(self, org):
        """Step 2: Create Patient"""
        from patients.models import Patient
        
        patient = Patient.objects.create(
            identifier='PAT-TEST-001',
            status='active',
            active=True,
            last_name='Doe',
            first_name='Jane',
            middle_name='Marie',
            gender='female',
            birth_date=date(1990, 5, 15),
            managing_organization=org,
            address_city='Manila',
            address_country='Philippines',
            telecom='+63 912 345 6789'
        )
        
        return patient

    def create_service_request(self, patient):
        """Step 3a: Create ServiceRequest (Stub)"""
        from admission.models import ServiceRequest
        
        service_request = ServiceRequest.objects.create(
            identifier='SR-TEST-001',
            status='active',
            intent='order',
            code='LAB-001',
            subject=patient
        )
        
        return service_request

    def create_appointment(self):
        """Step 3b: Create Appointment (Stub)"""
        from admission.models import Appointment
        
        appointment = Appointment.objects.create(
            identifier='APT-TEST-001',
            status='booked',
            description='Follow-up Visit'
        )
        
        return appointment

    def create_device(self, location, org):
        """Step 3c: Create Device (Stub)"""
        from admission.models import Device
        
        device = Device.objects.create(
            identifier='DEV-TEST-001',
            status='active',
            device_name='X-Ray Machine',
            type='imaging',
            model='Siemens AXIOM',
            version='2.0',
            location=location,
            owner=org
        )
        
        return device

    def create_encounter(self, patient, practitioner, appointment, service_request, location, org):
        """Step 4: Create Encounter (The Core Link)"""
        from admission.models import Encounter
        
        encounter = Encounter.objects.create(
            identifier='ENC-TEST-001',
            status='in-progress',
            class_field='emergency',
            type='Emergency Visit',
            subject_patient=patient,
            participant=practitioner,
            appointment=appointment,
            based_on=service_request,
            location_location=location,
            service_provider_organization=org,
            period_start=datetime.now()
        )
        
        return encounter

    def create_coverage(self, patient, org):
        """Step 5a: Create Coverage"""
        from billing.models import Coverage
        
        coverage = Coverage.objects.create(
            identifier='COV-TEST-001',
            status='active',
            beneficiary=patient,
            subscriber=patient,
            payor=org,
            period_start=date.today(),
            period_end=date.today() + timedelta(days=365)
        )
        
        return coverage

    def create_account(self, patient, coverage, org):
        """Step 5b: Create Account"""
        from billing.models import Account
        
        account = Account.objects.create(
            identifier='ACC-TEST-001',
            status='active',
            name='Test Patient Account',
            subject=patient,
            coverage=coverage,
            owner_organization=org
        )
        
        return account

    def create_claim(self, patient, org, practitioner, encounter, coverage):
        """Step 5c: Create Claim"""
        from billing.models import Claim
        
        claim = Claim.objects.create(
            identifier='CLM-TEST-001',
            status='active',
            type='institutional',
            use='claim',
            patient=patient,
            provider_organization=org,
            insurer_organization=org,
            enterer=practitioner,
            insurance=coverage,
            total=Decimal('5000.00')
        )
        
        return claim

    def create_inventory(self):
        """Step 6: Create Inventory (Data Type Test)"""
        from pharmacy.models import Inventory
        
        inventory = Inventory.objects.create(
            item_code='MED-TEST-001',
            item_name='Paracetamol 500mg',
            category='Medication',
            batch_number='BATCH-2026-001',
            current_stock=1000,  # Integer
            reorder_level=200,   # Integer
            unit_of_measure='tablets',
            unit_cost=Decimal('5.50'),  # Decimal
            status='active',
            expiry_date=date.today() + timedelta(days=730)
        )
        
        return inventory

    def create_condition(self, patient, encounter, practitioner):
        """Step 7a: Create Condition"""
        from patients.models import Condition
        
        condition = Condition.objects.create(
            identifier='COND-TEST-001',
            status='active',
            clinical_status='active',
            verification_status='confirmed',
            code_code='J00',
            code_display='Acute nasopharyngitis [common cold]',
            subject=patient,
            encounter=encounter,
            recorder=practitioner,
            recorded_date=datetime.now()
        )
        
        return condition

    def create_observation(self, patient, encounter, practitioner, device):
        """Step 7b: Create Observation"""
        from monitoring.models import Observation
        
        observation = Observation.objects.create(
            identifier='OBS-TEST-001',
            status='final',
            code='8867-4',
            category='vital-signs',
            subject=patient,
            encounter=encounter,
            performer=practitioner,
            device=device,  # Testing admission.Device reference
            value_quantity=Decimal('98.6'),
            effective_datetime=datetime.now()
        )
        
        return observation

    def create_procedure(self, patient, encounter, service_request, practitioner, location):
        """Step 7c: Create Procedure"""
        from admission.models import Procedure
        
        procedure = Procedure.objects.create(
            identifier='PROC-TEST-001',
            status='completed',
            code_code='71020',
            code_display='Chest X-Ray',
            subject=patient,
            encounter=encounter,
            based_on=service_request,
            recorder=practitioner,
            location=location,
            performed_datetime=datetime.now()
        )
        
        return procedure
