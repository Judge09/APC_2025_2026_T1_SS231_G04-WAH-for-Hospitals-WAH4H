from django.core.management.base import BaseCommand
from django.db import transaction
from laboratory.models import DiagnosticReport, Specimen, ImagingStudy
from monitoring.models import Observation, ChargeItem
# Assuming admission app has Encounter model - checking import path might be needed.
# Based on usage in monitoring models, encounter_id is just an integer field, 
# but if there's an actual Encounter model it's likely in 'admission'.
# verified: 'admission' app exists.
from admission.models import Encounter

class Command(BaseCommand):
    help = 'Removes currently admitted patients data including monitoring and laboratory records.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate deletion without committing changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        self.stdout.write(self.style.WARNING(f"Starting data cleanup... Dry Run: {dry_run}"))

        try:
            with transaction.atomic():
                # Laboratory
                lab_reports = DiagnosticReport.objects.all()
                lab_count = lab_reports.count()
                if not dry_run:
                    lab_reports.delete()
                self.stdout.write(f"Laboratory: {lab_count} DiagnosticReports {'would be' if dry_run else ''} deleted.")

                specimens = Specimen.objects.all()
                specimen_count = specimens.count()
                if not dry_run:
                    specimens.delete()
                self.stdout.write(f"Laboratory: {specimen_count} Specimens {'would be' if dry_run else ''} deleted.")

                imaging = ImagingStudy.objects.all()
                imaging_count = imaging.count()
                if not dry_run:
                    imaging.delete()
                self.stdout.write(f"Laboratory: {imaging_count} ImagingStudies {'would be' if dry_run else ''} deleted.")

                # Monitoring
                # Note: ObservationComponent cascades from Observation
                observations = Observation.objects.all()
                obs_count = observations.count()
                if not dry_run:
                    observations.delete()
                self.stdout.write(f"Monitoring: {obs_count} Observations {'would be' if dry_run else ''} deleted.")

                charges = ChargeItem.objects.all()
                charge_count = charges.count()
                if not dry_run:
                    charges.delete()
                self.stdout.write(f"Monitoring: {charge_count} ChargeItems {'would be' if dry_run else ''} deleted.")

                # Admission / Encounter
                encounters = Encounter.objects.all()
                enc_count = encounters.count()
                if not dry_run:
                    encounters.delete()
                self.stdout.write(f"Admission: {enc_count} Encounters {'would be' if dry_run else ''} deleted.")

                if dry_run:
                    self.stdout.write(self.style.SUCCESS("Dry run complete. No data was modified."))
                    # Rollback just in case, though we didn't call delete if using if checks, 
                    # but atomic block is good practice. Use transaction.set_rollback(True) if we strictly rely on rollback.
                else:
                    self.stdout.write(self.style.SUCCESS("Successfully deleted all specified data."))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error during cleanup: {str(e)}"))
