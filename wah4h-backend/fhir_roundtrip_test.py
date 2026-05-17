#!/usr/bin/env python
"""
FHIR Round-Trip Test & Sample Generator
========================================
Generates sample FHIR JSON for every PHCore resource type, saves them under
samples/fhir/, then feeds them back through every import_*_from_fhir() function
to verify the system can *receive* as well as *emit* FHIR data.

Run from the wah4h-backend directory:
    python fhir_roundtrip_test.py
"""

import json
import os
import sys
import pathlib
from datetime import date, datetime, timezone
from types import SimpleNamespace

# ── Django setup ──────────────────────────────────────────────────────────────
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wah4h.settings")
import django
django.setup()

import patients.wah4pc as wah4pc

SAMPLES_DIR = pathlib.Path(__file__).parent / "samples" / "fhir"
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

PASS = "\033[32m✓\033[0m"
FAIL = "\033[31m✗\033[0m"
INFO = "\033[36m→\033[0m"

results = []


def save(name: str, data: dict) -> pathlib.Path:
    p = SAMPLES_DIR / f"{name}.json"
    p.write_text(json.dumps(data, indent=2, default=str))
    return p


def check(label: str, condition: bool, detail: str = ""):
    status = PASS if condition else FAIL
    print(f"  {status}  {label}" + (f": {detail}" if detail else ""))
    results.append((label, condition))


# =============================================================================
# MOCK MODEL HELPERS
# =============================================================================

def mock(**kwargs) -> SimpleNamespace:
    """Return a SimpleNamespace with sensible defaults for common FHIR fields."""
    defaults = dict(
        id=None, pk=None, updated_at=None, created_at=None,
        status="active", identifier=None,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


# =============================================================================
# 1. PATIENT
# =============================================================================
print(f"\n{INFO} Patient")

patient_model = mock(
    id=1, pk=1,
    patient_id="TST-P-001",
    first_name="Juan", middle_name="Dela", last_name="Cruz", suffix_name="Jr.",
    gender="male",
    birthdate=date(1990, 3, 15),
    civil_status="Married",
    nationality="Filipino",
    race="Tagalog",
    religion="Roman Catholic",
    philhealth_id="12-345678901-2",
    philsys_id="1234-5678-9012-3456",
    blood_type="O+",
    pwd_type="Visual Impairment",
    pwd_id="PWD-2024-001",
    pwd_expiry_date=date(2026, 12, 31),
    pwd_issuing_lgu="City of Manila",
    occupation="Healthcare Professional",
    education="College Graduate",
    mobile_number="+639171234567",
    email="juan.cruz@example.com",
    address_line="123 Rizal Street",
    address_city="1380600000",  # Quezon City PSGC
    address_district="Metro Manila",
    address_state="NCR",
    address_postal_code="1100",
    address_country="PH",
    contact_first_name="Maria", contact_last_name="Cruz",
    contact_mobile_number="+639189876543",
    contact_relationship="Spouse",
    indigenous_flag=False, indigenous_group=None,
    consent_flag=True, image_url=None,
    active=True,
)

patient_fhir = wah4pc.patient_to_fhir(patient_model)
path = save("Patient-sample", patient_fhir)
check("resourceType == Patient", patient_fhir["resourceType"] == "Patient")
check("meta.profile is canonical PH Core URL",
      any("fhir-ph-core.wah.ph" in p for p in patient_fhir["meta"]["profile"]))
check("PhilHealth identifier present",
      any(i.get("system") == "http://philhealth.gov.ph/fhir/Identifier/philhealth-id"
          for i in patient_fhir.get("identifier", [])))
check("PhilSys identifier present",
      any(i.get("system") == "http://philsys.gov.ph/fhir/Identifier/philsys-id"
          for i in patient_fhir.get("identifier", [])))
check("nationality extension present",
      any(e.get("url", "").endswith("/nationality") for e in patient_fhir.get("extension", [])))
check("race extension present",
      any(e.get("url", "").endswith("/race") for e in patient_fhir.get("extension", [])))
check("pwd extension present",
      any(e.get("url", "").endswith("/ph-core-pwd-disability") for e in patient_fhir.get("extension", [])))
print(f"     Saved → {path.relative_to(pathlib.Path(__file__).parent)}")

# =============================================================================
# 2. PRACTITIONER
# =============================================================================
print(f"\n{INFO} Practitioner")

pract_model = mock(
    practitioner_id=1, pk=1,
    identifier="PRACT-001",
    active=True,
    first_name="Dr. Maria", middle_name="Santos", last_name="Reyes", suffix_name="MD",
    gender="female",
    birth_date=date(1985, 7, 20),
    telecom="+63298765432",
    communication_language="fil",
    address_line="456 Bonifacio Avenue",
    address_city="Makati City",
    address_district="Metro Manila",
    address_state="NCR",
    address_country="PH",
    address_postal_code="1200",
    address_district_code=None,
    qualification_code="MD",
    qualification_identifier="PRC-2024-MD-12345",
    qualification_issuer_id=None,
    qualification_period_start=date(2012, 6, 1),
    qualification_period_end=date(2027, 6, 1),
    prc_license_number="PRC-0123456",
)

pract_fhir = wah4pc.practitioner_to_fhir(pract_model)
path = save("Practitioner-sample", pract_fhir)
check("resourceType == Practitioner", pract_fhir["resourceType"] == "Practitioner")
check("meta.profile is canonical PH Core URL",
      any("fhir-ph-core.wah.ph" in p for p in pract_fhir["meta"]["profile"]))
check("PRC license identifier present",
      any(i.get("system") == "http://prc.gov.ph/fhir/Identifier/prc-license"
          for i in pract_fhir.get("identifier", [])))
check("name.family present", pract_fhir["name"][0].get("family") == "Reyes")
check("qualification present", len(pract_fhir.get("qualification", [])) > 0)
print(f"     Saved → {path.relative_to(pathlib.Path(__file__).parent)}")

# ── Receive (import) ──────────────────────────────────────────────────────────
try:
    imported_pract = wah4pc.import_practitioner_from_fhir(pract_fhir)
    check("import_practitioner_from_fhir → DB upsert succeeded", imported_pract is not None)
    check("imported PRC license matches",
          imported_pract.prc_license_number == "PRC-0123456")
    check("imported last_name matches", imported_pract.last_name == "Reyes")
except Exception as e:
    check("import_practitioner_from_fhir", False, str(e))

# =============================================================================
# 3. ORGANIZATION
# =============================================================================
print(f"\n{INFO} Organization")

org_model = mock(
    organization_id=1, pk=1,
    nhfr_code="NHFR-MNL-001",
    type_code="hospital",
    name="WAH4H General Hospital",
    alias="WAH4H",
    telecom="+6328123456",
    active=True,
    address_line="1 Hospital Drive",
    address_city="1380600000",
    address_district="Metro Manila",
    address_state="NCR",
    address_country="PH",
    address_postal_code="1100",
    contact_purpose="ADMIN",
    contact_first_name="Roberto",
    contact_last_name="Villanueva",
    contact_telecom="+6328654321",
    contact_address_line="1 Hospital Drive",
    contact_address_city="Quezon City",
    contact_address_state="NCR",
    contact_address_country="PH",
    contact_postal_code="1100",
)

org_fhir = wah4pc.organization_to_fhir(org_model)
path = save("Organization-sample", org_fhir)
check("resourceType == Organization", org_fhir["resourceType"] == "Organization")
check("NHFR identifier present",
      any(i.get("system") == "https://nhfr.doh.gov.ph/facility"
          for i in org_fhir.get("identifier", [])))
check("type CodeableConcept present", len(org_fhir.get("type", [])) > 0)
print(f"     Saved → {path.relative_to(pathlib.Path(__file__).parent)}")

# ── Receive ───────────────────────────────────────────────────────────────────
try:
    imported_org = wah4pc.import_organization_from_fhir(org_fhir)
    check("import_organization_from_fhir → DB upsert succeeded", imported_org is not None)
    check("imported name matches", imported_org.name == "WAH4H General Hospital")
except Exception as e:
    check("import_organization_from_fhir", False, str(e))

# =============================================================================
# 4. LOCATION
# =============================================================================
print(f"\n{INFO} Location")

loc_model = mock(
    location_id=1, pk=1,
    identifier="LOC-WARD-A1",
    status="active",
    name="Ward A — Bed 1",
    alias="A1",
    description="General ward, first floor",
    mode="instance",
    type_code="HOSP",
    physical_type_code="ro",  # room
    telecom="+6328123456",
    address_line="1 Hospital Drive",
    address_city="Quezon City",
    address_district="Metro Manila",
    address_state="NCR",
    address_country="PH",
    address_postal_code="1100",
    latitude=14.6760,
    longitude=121.0437,
    altitude=None,
    managing_organization_id=None,
    part_of_location_id=None,
    hours_of_operation_days="mon,tue,wed,thu,fri",
    hours_of_operation_all_day="false",
    opening_time="07:00:00",
    closing_time="19:00:00",
    availability_exceptions="Closed on public holidays",
)

loc_fhir = wah4pc.location_to_fhir(loc_model)
path = save("Location-sample", loc_fhir)
check("resourceType == Location", loc_fhir["resourceType"] == "Location")
check("meta.profile is canonical PH Core URL",
      any("fhir-ph-core.wah.ph" in p for p in loc_fhir["meta"]["profile"]))
check("position (lat/lon) present",
      "latitude" in loc_fhir.get("position", {}) and "longitude" in loc_fhir.get("position", {}))
check("physicalType present", "physicalType" in loc_fhir)
check("hoursOfOperation present", len(loc_fhir.get("hoursOfOperation", [])) > 0)
print(f"     Saved → {path.relative_to(pathlib.Path(__file__).parent)}")

# ── Receive ───────────────────────────────────────────────────────────────────
try:
    imported_loc = wah4pc.import_location_from_fhir(loc_fhir)
    check("import_location_from_fhir → DB upsert succeeded", imported_loc is not None)
    check("imported name matches", imported_loc.name == "Ward A — Bed 1")
    check("imported latitude matches", float(imported_loc.latitude) == 14.676)
except Exception as e:
    check("import_location_from_fhir", False, str(e))

# =============================================================================
# 5. ENCOUNTER  (uses a real DB Patient)
# =============================================================================
print(f"\n{INFO} Encounter")

from patients.models import Patient as PatientModel

# Ensure a test patient exists
test_patient, _ = PatientModel.objects.get_or_create(
    patient_id="TST-P-FHIR-001",
    defaults={
        "first_name": "FHIR", "last_name": "TestPatient",
        "gender": "male", "birthdate": date(1990, 1, 1),
    }
)

enc_model = mock(
    encounter_id=1, pk=1,
    identifier="TST-ENC-001",
    status="finished",
    class_field="IMP",
    type="Inpatient Admission",
    service_type="General Medicine",
    priority="R",
    subject_id=test_patient.id,
    participant_individual_id=None,
    location_id=None,
    diagnosis_condition_id=None,
    diagnosis_use=None,
    diagnosis_rank=None,
    reason_code="Z00.0",
    service_provider_id=None,
    period_start=date(2026, 5, 1),
    period_end=date(2026, 5, 5),
    admit_source="emd",
    re_admission=False,
    diet_preference="Low sodium",
    special_courtesy=None,
    special_arrangement="wheel",
    discharge_disposition="home",
    pre_admission_identifier="PRE-001",
)

enc_fhir = wah4pc.encounter_to_fhir(enc_model)
path = save("Encounter-sample", enc_fhir)
check("resourceType == Encounter", enc_fhir["resourceType"] == "Encounter")
check("subject.reference present", "reference" in enc_fhir.get("subject", {}))
check("hospitalization.admitSource present",
      "admitSource" in enc_fhir.get("hospitalization", {}))
check("hospitalization.dischargeDisposition present",
      "dischargeDisposition" in enc_fhir.get("hospitalization", {}))
check("priority present", "priority" in enc_fhir)
print(f"     Saved → {path.relative_to(pathlib.Path(__file__).parent)}")

# =============================================================================
# 6. CONDITION
# =============================================================================
print(f"\n{INFO} Condition")

from patients.models import Condition

cond_model = mock(
    condition_id=1, pk=1,
    identifier="TST-COND-001",
    patient_id=test_patient.id,
    clinical_status="active",
    verification_status="confirmed",
    category="encounter-diagnosis",
    severity="Moderate",
    code="J06.9",
    body_site="Upper Respiratory Tract",
    encounter_id=1,
    onset_datetime=datetime(2026, 5, 1, 8, 0, tzinfo=timezone.utc),
    abatement_datetime=None,
    recorded_date=date(2026, 5, 1),
    stage_summary="Early Stage", stage_type="clinical",
    note="Acute URI with fever",
)

cond_fhir = wah4pc.condition_to_fhir(cond_model)
path = save("Condition-sample", cond_fhir)
check("resourceType == Condition", cond_fhir["resourceType"] == "Condition")
check("code.coding[0].system is ICD-10",
      "icd-10" in ((cond_fhir.get("code", {}).get("coding") or [{}])[0].get("system") or ""))
check("clinicalStatus present", "clinicalStatus" in cond_fhir)
print(f"     Saved → {path.relative_to(pathlib.Path(__file__).parent)}")

try:
    imp_cond = wah4pc.import_condition_from_fhir(cond_fhir, test_patient)
    check("import_condition_from_fhir → DB upsert succeeded", imp_cond is not None)
    check("imported code matches", imp_cond.code == "J06.9")
    check("imported clinical_status matches", imp_cond.clinical_status == "active")
except Exception as e:
    check("import_condition_from_fhir", False, str(e))

# =============================================================================
# 7. ALLERGYINTOLERANCE
# =============================================================================
print(f"\n{INFO} AllergyIntolerance")

allergy_model = mock(
    allergy_id=1, pk=1,
    identifier="TST-ALLERGY-001",
    patient_id=test_patient.id,
    clinical_status="active",
    verification_status="confirmed",
    type="allergy",
    category="medication",
    criticality="high",
    code="372687004",
    encounter_id=1,
    onset_datetime=datetime(2020, 3, 10, tzinfo=timezone.utc),
    recorded_date=date(2020, 3, 10),
    reaction_manifestation="Anaphylaxis",
    reaction_manifestation_code="39579001",
    reaction_severity="severe",
    reaction_description="Severe anaphylactic reaction after penicillin administration",
    reaction_onset=None,
    reaction_exposure_route=None,
    reaction_note=None,
    reaction_substance=None,
    last_occurrence=None,
    onset_period_start=None, onset_period_end=None,
    onset_age=None, onset_range_low=None, onset_range_high=None,
    recorder_id=None, asserter_id=None,
    note="Patient carries epinephrine auto-injector",
)

allergy_fhir = wah4pc.allergy_to_fhir(allergy_model)
path = save("AllergyIntolerance-sample", allergy_fhir)
check("resourceType == AllergyIntolerance", allergy_fhir["resourceType"] == "AllergyIntolerance")
check("clinicalStatus present", "clinicalStatus" in allergy_fhir)
check("reaction present", len(allergy_fhir.get("reaction", [])) > 0)
print(f"     Saved → {path.relative_to(pathlib.Path(__file__).parent)}")

try:
    imp_allergy = wah4pc.import_allergy_from_fhir(allergy_fhir, test_patient)
    check("import_allergy_from_fhir → DB upsert succeeded", imp_allergy is not None)
    check("imported code matches", imp_allergy.code == "372687004")
    check("imported criticality matches", imp_allergy.criticality == "high")
except Exception as e:
    check("import_allergy_from_fhir", False, str(e))

# =============================================================================
# 8. IMMUNIZATION
# =============================================================================
print(f"\n{INFO} Immunization")

imm_model = mock(
    immunization_id=1, pk=1,
    identifier="TST-IMM-001",
    patient_id=test_patient.id,
    status="completed",
    status_reason_code=None, status_reason_display=None,
    vaccine_code="08", vaccine_display="Hep B, adolescent or pediatric",
    encounter_id=1,
    occurrence_datetime=datetime(2026, 4, 15, 9, 0, tzinfo=timezone.utc),
    occurrence_string=None,
    recorded_datetime=datetime(2026, 4, 15, 9, 30, tzinfo=timezone.utc),
    primary_source=True,
    report_origin_code=None, report_origin_display=None,
    location_id=None, manufacturer_id=None,
    lot_number="LOT-2024-HB-001",
    expiration_date=date(2027, 1, 31),
    site_code="LA", site_display="Left Arm",
    route_code="IM", route_display="Intramuscular",
    dose_quantity_value=1.0, dose_quantity_unit="mL",
    performer_id=None, performer_function_code="AP",
    performer_function_display="Administering Provider",
    actor_id=None, performer_name="Nurse Dela Cruz",
    note="Administered without adverse events",
    reason_code="429060002", reason_display="Procedure to meet occupational requirement",
    reason_reference_id=None,
    is_subpotent=False, subpotent_reason_code=None, subpotent_reason_display=None,
    education_document_type=None, education_reference=None,
    education_publication_date=None, education_presentation_date=None,
    program_eligibility_code="ineligible", program_eligibility_display="Not Eligible",
    funding_source_code="private", funding_source_display="Private",
    reaction_id=None, reaction_date=None, reaction_detail_id=None, reaction_reported=None,
    protocol_applied_id=None, protocol_series="2-dose series",
    protocol_authority_id=None,
    protocol_target_disease_code="66071002",
    protocol_target_disease_display="Viral hepatitis type B",
    dose_number_value=1, dose_number_unit=None,
    series_doses_value=2, series_doses_unit=None,
)

imm_fhir = wah4pc.immunization_to_fhir(imm_model)
path = save("Immunization-sample", imm_fhir)
check("resourceType == Immunization", imm_fhir["resourceType"] == "Immunization")
check("vaccineCode present", "vaccineCode" in imm_fhir)
check("lotNumber present", imm_fhir.get("lotNumber") == "LOT-2024-HB-001")
check("protocolApplied present", len(imm_fhir.get("protocolApplied", [])) > 0)
print(f"     Saved → {path.relative_to(pathlib.Path(__file__).parent)}")

try:
    imp_imm = wah4pc.import_immunization_from_fhir(imm_fhir)
    check("import_immunization_from_fhir → DB upsert succeeded", imp_imm is not None)
    check("imported vaccine_code matches", imp_imm.vaccine_code == "08")
    check("imported lot_number matches", imp_imm.lot_number == "LOT-2024-HB-001")
except Exception as e:
    check("import_immunization_from_fhir", False, str(e))

# =============================================================================
# 9. OBSERVATION
# =============================================================================
print(f"\n{INFO} Observation")

obs_model = mock(
    observation_id=1, pk=1,
    identifier="TST-OBS-001",
    subject_id=test_patient.id,
    encounter_id=1,
    performer_id=None,
    status="final",
    code="8480-6",
    category="vital-signs",
    body_site=None, method=None,
    interpretation="N",
    data_absent_reason=None,
    note="BP measured sitting",
    value_quantity=120.0,
    value_quantity_unit="mmHg",
    value_string=None, value_boolean=None, value_integer=None,
    value_codeableconcept=None, value_datetime=None, value_time=None,
    value_period_start=None, value_period_end=None,
    value_ratio=None, value_sampled_data=None,
    value_range_low=None, value_range_high=None,
    reference_range_low="90", reference_range_high="120",
    reference_range_type="normal", reference_range_applies_to=None,
    reference_range_age_low=None, reference_range_age_high=None,
    reference_range_text="Normal adult systolic BP",
    effective_datetime=datetime(2026, 5, 1, 8, 30, tzinfo=timezone.utc),
    effective_period_start=None, effective_period_end=None,
    effective_timing=None, effective_instant=None,
    issued=datetime(2026, 5, 1, 8, 35, tzinfo=timezone.utc),
)

obs_fhir = wah4pc.observation_to_fhir(obs_model)
path = save("Observation-sample", obs_fhir)
check("resourceType == Observation", obs_fhir["resourceType"] == "Observation")
check("valueQuantity present", "valueQuantity" in obs_fhir)
check("referenceRange present", len(obs_fhir.get("referenceRange", [])) > 0)
check("interpretation present", "interpretation" in obs_fhir)
print(f"     Saved → {path.relative_to(pathlib.Path(__file__).parent)}")

try:
    imp_obs = wah4pc.import_observation_from_fhir(obs_fhir, test_patient)
    check("import_observation_from_fhir → DB upsert succeeded", imp_obs is not None)
    check("imported code matches", imp_obs.code == "8480-6")
    check("imported value_quantity matches", float(imp_obs.value_quantity) == 120.0)
except Exception as e:
    check("import_observation_from_fhir", False, str(e))

# =============================================================================
# 10. MEDICATION
# =============================================================================
print(f"\n{INFO} Medication")

med_model = mock(
    medication_id=1, pk=1,
    identifier="MED-AMOX-500",
    status="active",
    code_code="FDA-PH-AMOX-500",
    code_display="Amoxicillin 500mg Capsule",
    code_system="https://verification.fda.gov.ph",
    code_version="2024",
    implicit_rules=None,
)

med_fhir = wah4pc.medication_to_fhir(med_model)
path = save("Medication-sample", med_fhir)
check("resourceType == Medication", med_fhir["resourceType"] == "Medication")
check("meta.profile is canonical PH Core URL",
      any("fhir-ph-core.wah.ph" in p for p in med_fhir["meta"]["profile"]))
check("code.text present", med_fhir.get("code", {}).get("text") == "Amoxicillin 500mg Capsule")
check("code.coding[0].system is FDA registry",
      (med_fhir.get("code", {}).get("coding") or [{}])[0].get("system") == "https://verification.fda.gov.ph")
print(f"     Saved → {path.relative_to(pathlib.Path(__file__).parent)}")

try:
    imp_med = wah4pc.import_medication_from_fhir(med_fhir)
    check("import_medication_from_fhir → DB upsert succeeded", imp_med is not None)
    check("imported code_display matches", imp_med.code_display == "Amoxicillin 500mg Capsule")
    check("imported code_system matches", imp_med.code_system == "https://verification.fda.gov.ph")
except Exception as e:
    check("import_medication_from_fhir", False, str(e))

# =============================================================================
# 11. MEDICATIONREQUEST
# =============================================================================
print(f"\n{INFO} MedicationRequest")

mr_model = mock(
    medication_request_id=1, pk=1,
    identifier="TST-MR-001",
    subject_id=test_patient.id,
    encounter_id=1,
    requester_id=None,
    status="active",
    intent="order",
    category="inpatient",
    priority="routine",
    medication_code="FDA-PH-AMOX-500",
    medication_display="Amoxicillin 500mg",
    medication_system="https://verification.fda.gov.ph",
    medication_reference=None,
    authored_on=datetime(2026, 5, 1, 10, 0, tzinfo=timezone.utc),
    reason_code="J06.9",
    note="Take with food. Complete the full course.",
    dispense_quantity=21,
    dispense_repeats_allowed="0",
    dispense_validity_period_start="2026-05-01",
    dispense_validity_period_end="2026-05-08",
    status_reason=None, course_of_therapy_type=None, performer_type=None,
    do_not_perform=None, reported_boolean=None,
    billing_reference=None, group_identifier=None,
    instantiates_canonical=None, instantiates_uri=None,
    reason_reference_id=None, insurance_id=None,
    reported_reference_id=None, based_on_id=None,
    recorder_id=None, performer_id=None,
)

mr_fhir = wah4pc.medicationrequest_to_fhir(mr_model)
path = save("MedicationRequest-sample", mr_fhir)
check("resourceType == MedicationRequest", mr_fhir["resourceType"] == "MedicationRequest")
check("medicationCodeableConcept present", "medicationCodeableConcept" in mr_fhir)
check("subject present", "subject" in mr_fhir)
check("dispenseRequest present", "dispenseRequest" in mr_fhir)
print(f"     Saved → {path.relative_to(pathlib.Path(__file__).parent)}")

try:
    imp_mr = wah4pc.import_medicationrequest_from_fhir(mr_fhir, test_patient)
    check("import_medicationrequest_from_fhir → DB upsert succeeded", imp_mr is not None)
    check("imported medication_code matches", imp_mr.medication_code == "FDA-PH-AMOX-500")
    check("imported intent matches", imp_mr.intent == "order")
except Exception as e:
    check("import_medicationrequest_from_fhir", False, str(e))

# =============================================================================
# 12. PROCEDURE
# =============================================================================
print(f"\n{INFO} Procedure")

proc_model = mock(
    procedure_id=1, pk=1,
    identifier="TST-PROC-001",
    status="completed",
    subject_id=test_patient.id,
    encounter_id=1,
    category_code="387713003", category_display="Surgical procedure",
    code_code="80146002", code_display="Appendectomy",
    performed_datetime=datetime(2026, 5, 2, 14, 0, tzinfo=timezone.utc),
    performer_actor_id=None,
    performer_on_behalf_of_id=None,
    performer_function_code="PR", performer_function_display="Performer",
    recorder_id=None,
    location_id=None,
    reason_code_code="K35.9", reason_code_display="Acute appendicitis",
    body_site_code="66754008", body_site_display="Appendix",
    outcome_code="385669000", outcome_display="Successful",
    complication_code=None, complication_display=None,
    follow_up_code="185389009", follow_up_display="Follow-up visit",
    note="Laparoscopic appendectomy performed under general anesthesia",
    focal_device_action_code=None, focal_device_action_display=None,
    used_code_code=None, used_code_display=None,
    encounter=mock(encounter_id=1),
    status_reason_code=None, status_reason_display=None,
    asserter_id=None, based_on_id=None, part_of_id=None,
    instantiates_canonical=None, instantiates_uri=None,
    complication_detail_id=None, report_id=None,
    focal_device_manipulated_id=None, used_reference_id=None,
    performed_period_start=None, performed_period_end=None,
    performed_string=None, performed_age_value=None, performed_age_unit=None,
    performed_range_low=None, performed_range_high=None,
    reason_reference_id=None,
)

proc_fhir = wah4pc.procedure_to_fhir(proc_model)
path = save("Procedure-sample", proc_fhir)
check("resourceType == Procedure", proc_fhir["resourceType"] == "Procedure")
check("code.coding[0].system is SNOMED",
      (proc_fhir.get("code", {}).get("coding") or [{}])[0].get("system") == "http://snomed.info/sct")
check("outcome present", "outcome" in proc_fhir)
check("bodySite present", "bodySite" in proc_fhir)
print(f"     Saved → {path.relative_to(pathlib.Path(__file__).parent)}")

# =============================================================================
# SUMMARY
# =============================================================================
passed = sum(1 for _, ok in results if ok)
failed = sum(1 for _, ok in results if not ok)

print(f"\n{'='*60}")
print(f"  Results: {PASS} {passed} passed  |  {FAIL} {failed} failed  |  {len(results)} total")
print(f"  Samples written to: {SAMPLES_DIR.relative_to(pathlib.Path(__file__).parent)}/")
print(f"{'='*60}\n")

if failed:
    print("Failed checks:")
    for label, ok in results:
        if not ok:
            print(f"  {FAIL}  {label}")
    sys.exit(1)
