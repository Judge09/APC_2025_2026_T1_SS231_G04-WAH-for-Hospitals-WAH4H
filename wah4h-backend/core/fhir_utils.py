# core/fhir_utils.py
"""
FHIR R4 / PHCore R4 utility functions and constants for WAH4H.

Code system URNs use the urn://example.com/... scheme required by the
external PHCore validation service (wah4pc.echosphere.cfd).
"""

# ── Base URIs (must match wah4pc.py) ──────────────────────────────────────────
PHC_EXT_BASE = "urn://example.com/ph-core/fhir/StructureDefinition"
PHC_CS_BASE  = "urn://example.com/ph-core/fhir/CodeSystem"

# ── WAH4H internal identifier systems ────────────────────────────────────────
WAH4H_SYSTEM_BASE             = "https://wah4h.echosphere.cfd/fhir/identifier"
WAH4H_CLAIM_SYSTEM            = f"{WAH4H_SYSTEM_BASE}/claim"
WAH4H_CLAIM_RESPONSE_SYSTEM   = f"{WAH4H_SYSTEM_BASE}/claim-response"
WAH4H_COVERAGE_SYSTEM         = f"{WAH4H_SYSTEM_BASE}/coverage"
WAH4H_SCHEDULE_SYSTEM         = f"{WAH4H_SYSTEM_BASE}/schedule"
WAH4H_SLOT_SYSTEM             = f"{WAH4H_SYSTEM_BASE}/slot"
WAH4H_APPOINTMENT_SYSTEM      = f"{WAH4H_SYSTEM_BASE}/appointment"
WAH4H_PRACTITIONER_SYSTEM     = f"{WAH4H_SYSTEM_BASE}/practitioner"
WAH4H_SERVICE_REQUEST_SYSTEM  = f"{WAH4H_SYSTEM_BASE}/service-request"
WAH4H_INVOICE_SYSTEM          = f"{WAH4H_SYSTEM_BASE}/invoice"
WAH4H_PAYMENT_RECON_SYSTEM    = f"{WAH4H_SYSTEM_BASE}/payment-reconciliation"
WAH4H_ACCOUNT_SYSTEM          = f"{WAH4H_SYSTEM_BASE}/account"
WAH4H_PRACTITIONER_ROLE_SYSTEM = f"{WAH4H_SYSTEM_BASE}/practitioner-role"

# ── HL7 / FHIR standard code systems ─────────────────────────────────────────
HL7_CLAIM_TYPE       = "http://terminology.hl7.org/CodeSystem/claim-type"
HL7_CLAIM_USE        = "http://terminology.hl7.org/CodeSystem/claim-use"
HL7_SUBSCRIBER_REL   = "http://terminology.hl7.org/CodeSystem/subscriber-relationship"
HL7_ACT_CODE         = "http://terminology.hl7.org/CodeSystem/v3-ActCode"
HL7_MARITAL          = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus"
HL7_PRIORITY         = "http://terminology.hl7.org/CodeSystem/processpriority"
HL7_DIAGNOSIS_TYPE   = "http://terminology.hl7.org/CodeSystem/ex-diagnosistype"
HL7_PROCEDURE_TYPE   = "http://terminology.hl7.org/CodeSystem/ex-procedure-type"
HL7_ROLE_CODE        = "http://terminology.hl7.org/CodeSystem/v3-RoleCode"
HL7_APPT_STATUS      = "http://hl7.org/fhir/appointmentstatus"
HL7_SLOT_STATUS      = "http://hl7.org/fhir/slotstatus"
HL7_SERVICE_TYPE     = "http://terminology.hl7.org/CodeSystem/service-type"
HL7_SERVICE_CATEGORY = "http://terminology.hl7.org/CodeSystem/service-category"
HL7_PRACTICE_CODE    = "http://snomed.info/sct"
HL7_PARTICIPANT_TYPE = "http://terminology.hl7.org/CodeSystem/v3-ParticipationType"
HL7_PAYMENT_TYPE     = "http://terminology.hl7.org/CodeSystem/ex-paymenttype"
HL7_ADJUDICATION     = "http://terminology.hl7.org/CodeSystem/adjudication"
HL7_PAYMENT_ADJ      = "http://terminology.hl7.org/CodeSystem/payment-adjustment-reason"
HL7_PAYMENT_TYPE_CS  = "http://terminology.hl7.org/CodeSystem/ex-paymenttype"
ICD10_SYSTEM         = "http://hl7.org/fhir/sid/icd-10"
SNOMED_SYSTEM        = "http://snomed.info/sct"

# PhilHealth-specific
PHIC_IDENTIFIER_SYSTEM = "http://philhealth.gov.ph/fhir/Identifier/philhealth-id"
NHFR_IDENTIFIER_SYSTEM = "https://nhfr.doh.gov.ph"

# ── PHCore code systems ───────────────────────────────────────────────────────
PHC_COVERAGE_TYPE_CS   = f"{PHC_CS_BASE}/ph-core-coverage-type"
PHC_COVERAGE_CLASS_CS  = f"{PHC_CS_BASE}/ph-core-coverage-class"
PHC_CLAIM_TYPE_CS      = f"{PHC_CS_BASE}/ph-core-claim-type"
PHC_SERVICE_TYPE_CS    = f"{PHC_CS_BASE}/ph-core-service-type"
PHC_APPT_TYPE_CS       = f"{PHC_CS_BASE}/ph-core-appointment-type"
PHC_SPECIALTY_CS       = f"{PHC_CS_BASE}/ph-core-specialty"
PHC_FACILITY_TYPE_CS   = f"{PHC_CS_BASE}/ph-core-facility-type"

# ── PHCore extension URIs ─────────────────────────────────────────────────────
PHC_EXT_INDIGENOUS     = f"{PHC_EXT_BASE}/ph-core-patient-indigenous"
PHC_EXT_INDIGENOUS_GRP = f"{PHC_EXT_BASE}/ph-core-patient-indigenous-group"
PHC_EXT_DISABILITY     = f"{PHC_EXT_BASE}/ph-core-patient-disability-type"
PHC_EXT_PRC_LICENSE    = f"{PHC_EXT_BASE}/ph-core-practitioner-license-number"
PHC_EXT_NHFR           = f"{PHC_EXT_BASE}/ph-core-organization-nhfr-code"
PHC_EXT_PHIC_ACCRED    = f"{PHC_EXT_BASE}/ph-core-organization-philhealth-accreditation"
PHC_EXT_NATIONALITY    = f"{PHC_EXT_BASE}/ph-core-patient-nationality"

# ── PHCore profile URLs ───────────────────────────────────────────────────────
PHC_PROFILE = {
    "Patient":               f"{PHC_EXT_BASE}/ph-core-patient",
    "Practitioner":          f"{PHC_EXT_BASE}/ph-core-practitioner",
    "PractitionerRole":      f"{PHC_EXT_BASE}/ph-core-practitioner-role",
    "Organization":          f"{PHC_EXT_BASE}/ph-core-organization",
    "Coverage":              f"{PHC_EXT_BASE}/ph-core-coverage",
    "Claim":                 f"{PHC_EXT_BASE}/ph-core-claim",
    "ClaimResponse":         f"{PHC_EXT_BASE}/ph-core-claim-response",
    "Schedule":              f"{PHC_EXT_BASE}/ph-core-schedule",
    "Slot":                  f"{PHC_EXT_BASE}/ph-core-slot",
    "Appointment":           f"{PHC_EXT_BASE}/ph-core-appointment",
    "Location":              f"{PHC_EXT_BASE}/ph-core-location",
    "Invoice":               f"{PHC_EXT_BASE}/ph-core-invoice",
    "Account":               f"{PHC_EXT_BASE}/ph-core-account",
    "PaymentReconciliation": f"{PHC_EXT_BASE}/ph-core-payment-reconciliation",
    "ServiceRequest":        f"{PHC_EXT_BASE}/ph-core-service-request",
}

# ── Subscriber relationship mapping ───────────────────────────────────────────
SUBSCRIBER_REL_MAP = {
    "self":    ("self",    "Self"),
    "spouse":  ("spouse",  "Spouse"),
    "child":   ("child",   "Child"),
    "parent":  ("parent",  "Parent"),
    "other":   ("other",   "Other"),
}

# ── Helper functions ──────────────────────────────────────────────────────────

def codeable_concept(system: str, code: str, display: str | None = None) -> dict:
    """Build a FHIR CodeableConcept."""
    coding: dict = {"system": system, "code": code}
    if display:
        coding["display"] = display
    return {"coding": [coding]}


def fhir_extension(url: str, value_type: str, value) -> dict:
    """Build a FHIR Extension element.
    value_type: 'String', 'Boolean', 'Code', 'Coding', 'CodeableConcept', etc.
    """
    return {"url": url, f"value{value_type}": value}


def money(value, currency: str = "PHP") -> dict | None:
    """Build a FHIR Money type."""
    if value is None:
        return None
    return {"value": float(value), "currency": currency}


def fhir_period(start, end=None) -> dict | None:
    """Build a FHIR Period type."""
    p: dict = {}
    if start:
        p["start"] = str(start)
    if end:
        p["end"] = str(end)
    return p if p else None


def fhir_reference(resource_type: str, resource_id, display: str | None = None) -> dict:
    """Build a FHIR Reference."""
    ref: dict = {"reference": f"{resource_type}/{resource_id}"}
    if display:
        ref["display"] = display
    return ref


def fhir_identifier(system: str, value: str, use: str | None = None) -> dict:
    """Build a FHIR Identifier."""
    obj: dict = {"system": system, "value": value}
    if use:
        obj["use"] = use
    return obj


def fhir_meta(resource_type: str, updated_at=None) -> dict:
    """Build a FHIR meta element with PHCore profile and optional lastUpdated."""
    profile = PHC_PROFILE.get(resource_type)
    meta: dict = {"profile": [profile]} if profile else {}
    if updated_at:
        meta["lastUpdated"] = updated_at.isoformat()
    return meta


def fhir_quantity(value, unit: str = "1", system: str = "http://unitsofmeasure.org", code: str = "1") -> dict | None:
    """Build a FHIR Quantity."""
    if value is None:
        return None
    return {"value": float(value), "unit": unit, "system": system, "code": code}
