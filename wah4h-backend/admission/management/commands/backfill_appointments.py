"""
Management command: backfill_appointments

Re-processes raw_payload from existing WAH4PCTransaction (receive_push, Appointment)
records and patches only the fields that are currently NULL on the local Appointment.

Safe rules:
  - Never overwrites status, patient_id, practitioner_id, or any non-null field.
  - Only fills in: start, end, comment, description, reason_code,
    service_category_code, service_category_display, patient_participation_status.
  - Dry-run by default; pass --apply to commit changes.

Usage:
    python manage.py backfill_appointments          # dry run
    python manage.py backfill_appointments --apply  # commit
"""

from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_datetime
from django.utils.timezone import make_aware, UTC

from patients.models import WAH4PCTransaction
from admission.models import Appointment


def _parse_dt(val):
    if not val:
        return None
    try:
        normalized = val[:-1] + '+00:00' if val.endswith('Z') else val
        dt = parse_datetime(normalized)
        if dt is not None and dt.tzinfo is None:
            dt = make_aware(dt, UTC)
        return dt
    except Exception:
        return None


def _extract_fields(fhir_data):
    """Pull only the fields we want to backfill from a FHIR Appointment dict."""
    svc_categories = fhir_data.get('serviceCategory') or []
    svc_cat_coding = ((svc_categories[0].get('coding') or [{}])[0]) if svc_categories else {}

    reason_codes = fhir_data.get('reasonCode') or []
    reason_text = None
    if reason_codes:
        rc = reason_codes[0]
        rc_coding = (rc.get('coding') or [{}])[0]
        reason_text = rc_coding.get('code') or rc.get('text')

    patient_part_status = next(
        (p.get('status') for p in (fhir_data.get('participant') or [])
         if (
             (p.get('actor') or {}).get('reference', '').startswith('Patient/')
             or (p.get('actor') or {}).get('type') == 'Patient'
         )),
        None,
    )

    note_text = (
        fhir_data.get('comment')
        or next((n.get('text') for n in (fhir_data.get('note') or []) if n.get('text')), None)
    )

    return {
        'start':                    _parse_dt(fhir_data.get('start')),
        'end':                      _parse_dt(fhir_data.get('end')),
        'comment':                  note_text,
        'description':              fhir_data.get('description'),
        'reason_code':              reason_text,
        'service_category_code':    svc_cat_coding.get('code'),
        'service_category_display': svc_cat_coding.get('display'),
        'patient_participation_status': patient_part_status,
    }


class Command(BaseCommand):
    help = 'Backfill null fields on Appointments from stored WAH4PC receive_push payloads.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Commit changes to the database (default is dry run).',
        )

    def handle(self, *args, **options):
        apply = options['apply']
        mode  = 'APPLY' if apply else 'DRY RUN'
        self.stdout.write(f'[backfill_appointments] Mode: {mode}\n')

        txns = WAH4PCTransaction.objects.filter(
            type='receive_push',
            status='COMPLETED',
        ).exclude(raw_payload=None).order_by('created_at')

        total = patched = skipped = errors = 0

        for txn in txns:
            payload = txn.raw_payload or {}
            data = payload.get('data') or payload.get('resource') or {}

            if data.get('resourceType') != 'Appointment':
                continue

            total += 1

            ids = data.get('identifier') or []
            identifier = ids[0].get('value') if ids else None
            if not identifier:
                self.stdout.write(f'  [SKIP] txn {txn.transaction_id}: no identifier in payload')
                skipped += 1
                continue

            try:
                appt = Appointment.objects.get(identifier=identifier)
            except Appointment.DoesNotExist:
                self.stdout.write(f'  [SKIP] txn {txn.transaction_id}: appointment {identifier} not in DB')
                skipped += 1
                continue

            candidate = _extract_fields(data)

            # Only patch fields that are currently null — never overwrite existing data
            updates = {
                field: value
                for field, value in candidate.items()
                if value is not None and getattr(appt, field) is None
            }

            if not updates:
                skipped += 1
                continue

            self.stdout.write(
                f'  [{"PATCH" if apply else "WOULD PATCH"}] {identifier}: {list(updates.keys())}'
            )

            if apply:
                try:
                    Appointment.objects.filter(pk=appt.pk).update(**updates)
                    patched += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  [ERROR] {identifier}: {e}'))
                    errors += 1
            else:
                patched += 1

        self.stdout.write(
            f'\n[backfill_appointments] Done — '
            f'scanned {total} | {"patched" if apply else "would patch"} {patched} | '
            f'skipped {skipped} | errors {errors}\n'
        )
        if not apply:
            self.stdout.write('Run with --apply to commit.\n')
