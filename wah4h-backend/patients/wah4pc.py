import logging
import os
import re
import time
import uuid
import zlib
from datetime import datetime, timezone, date, timedelta

import requests

logger = logging.getLogger(__name__)

URL = "https://wah4pc.echosphere.cfd"

# ---------------------------------------------------------------------------
# Extension / CodeSystem base URIs.
# External providers require the urn://example.com/... scheme exactly.
# ---------------------------------------------------------------------------
_URN_EXT = "urn://example.com/ph-core/fhir/StructureDefinition"
_URN_CS  = "urn://example.com/ph-core/fhir/CodeSystem"

# Aliases kept so _get_extension / fhir_to_dict continue to work unchanged.
_EXT_BASE = _URN_EXT
_CS_BASE  = _URN_CS

# ---------------------------------------------------------------------------
# Marital status
# DB stores single-letter HL7 codes. The Working-Version sample sends only
# code + system — no display — so we store just the code here.
# ---------------------------------------------------------------------------
_HL7_MARITAL_STATUS: dict[str, str] = {
    # Single-letter HL7 codes (stored directly in DB after first normalisation)
    "S": "S",
    "M": "M",
    "D": "D",
    "W": "W",
    "L": "L",
    "A": "A",
    # Display-value aliases — .upper() is applied before the lookup so these
    # cover both title-case ("Single") and all-caps ("SINGLE") DB entries.
    "SINGLE":             "S",
    "MARRIED":            "M",
    "DIVORCED":           "D",
    "WIDOWED":            "W",
    "LEGALLY SEPARATED":  "L",
    "SEPARATED":          "L",
    "ANNULLED":           "A",
    "LIVE-IN":            "T",  # HL7 T = Domestic partner (closest mapping)
    "LIVE IN":            "T",
    "COHABITING":         "T",
}

# ---------------------------------------------------------------------------
# PSGC lookup tables
# ---------------------------------------------------------------------------

# City / municipality  — DB stores the 10-digit codes from addressData.json.
# Display names use the national-registry "Name City" format (not "City of Name").
_PSGC_CITY: dict[str, str] = {
    "1380100000": "Caloocan City",
    "1380200000": "Las Piñas City",
    "1380300000": "Makati City",
    "1380400000": "Malabon City",
    "1380500000": "Mandaluyong City",
    "1380600000": "Manila",           # Manila does not append "City" per PSA
    "1380700000": "Marikina City",
    "1380800000": "Muntinlupa City",
    "1380900000": "Navotas City",
    "1381000000": "Parañaque City",
    "1381100000": "Pasay City",
    "1381200000": "Pasig City",
    "1381300000": "Quezon City",
    "1381400000": "San Juan City",
    "1381500000": "Taguig City",
    "1381600000": "Valenzuela City",
    "1381701000": "Pateros",          # municipality — no "City" suffix
    # Central Luzon samples
    "0310600000": "San Fernando City",
    "0318200000": "Angeles City",
    "0307400000": "Mabalacat City",
}

# Province / district codes
_PSGC_PROVINCE: dict[str, str] = {
    "NCR, All District": "NCR, All District",
    "PAMP": "Pampanga",
    "BUL":  "Bulacan",
    "ZMB":  "Zambales",
}

# Region display names keyed on the short alphabetic code stored in the DB.
_PSGC_REGION: dict[str, str] = {
    "NCR":   "National Capital Region",
    "CAR":   "Cordillera Administrative Region",
    "I":     "Ilocos Region",
    "II":    "Cagayan Valley",
    "III":   "Central Luzon",
    "IVA":   "CALABARZON",
    "IVB":   "MIMAROPA",
    "V":     "Bicol Region",
    "VI":    "Western Visayas",
    "VII":   "Central Visayas",
    "VIII":  "Eastern Visayas",
    "IX":    "Zamboanga Peninsula",
    "X":     "Northern Mindanao",
    "XI":    "Davao Region",
    "XII":   "SOCCSKSARGEN",
    "XIII":  "Caraga",
    "BARMM": "Bangsamoro Autonomous Region in Muslim Mindanao",
}

# ---------------------------------------------------------------------------
# 10-digit frontend code → 9-digit PSA PSGC code for city/municipality.
# The addressData.json uses a 10-digit numbering system; the WAH4PC gateway
# requires the official PSA 9-digit PSGC codes.
# Source: PSA PSGC 2023 publication.
# Codes annotated "confirmed" were verified against the Working-Version JSON.
# All others should be cross-checked against the PSA PSGC release if errors
# are encountered on the target system.
# ---------------------------------------------------------------------------
_PSGC_CITY_9: dict[str, str] = {
    # NCR ─────────────────────────────────────────────────────────────────
    "1380100000": "133701000",  # City of Caloocan
    "1380200000": "137602000",  # City of Las Piñas
    "1380300000": "137603000",  # City of Makati
    "1380400000": "137604000",  # City of Malabon
    "1380500000": "133800000",  # City of Mandaluyong
    "1380600000": "133900000",  # City of Manila
    "1380700000": "137607000",  # City of Marikina
    "1380800000": "137608000",  # City of Muntinlupa
    "1380900000": "137609000",  # City of Navotas
    "1381000000": "137610000",  # City of Parañaque
    "1381100000": "137605000",  # Pasay City — CONFIRMED (Working-Version JSON)
    "1381200000": "137611000",  # City of Pasig
    "1381300000": "133700000",  # Quezon City
    "1381400000": "137612000",  # City of San Juan
    "1381500000": "137613000",  # City of Taguig
    "1381600000": "137614000",  # City of Valenzuela
    "1381701000": "137615000",  # Pateros
    # Central Luzon ────────────────────────────────────────────────────────
    "0310600000": "035403000",  # City of San Fernando (Pampanga)
    "0318200000": "035401000",  # City of Angeles
    "0307400000": "035404000",  # Mabalacat City
}

# PSA 9-digit PSGC numeric codes for each region (used in valueCoding.code).
_PSGC_REGION_CODE: dict[str, str] = {
    "NCR":   "130000000",
    "CAR":   "140000000",
    "I":     "010000000",
    "II":    "020000000",
    "III":   "030000000",
    "IVA":   "040000000",
    "IVB":   "170000000",
    "V":     "050000000",
    "VI":    "060000000",
    "VII":   "070000000",
    "VIII":  "080000000",
    "IX":    "090000000",
    "X":     "100000000",
    "XI":    "110000000",
    "XII":   "120000000",
    "XIII":  "160000000",
    "BARMM": "190000000",
}

# ---------------------------------------------------------------------------
# CodeableConcept code tables
# The DB stores the display string. These maps give the canonical code that
# the PH-Core CodeSystem expects in coding[].code.
# ---------------------------------------------------------------------------

_RELIGION_CODE: dict[str, str] = {
    "Roman Catholic":        "1013",
    "Islam":                 "1012",
    "Iglesia ni Cristo":     "1018",
    "Protestant":            "1022",
    "Born Again Christian":  "1028",
    "Baptist":               "1027",
    "Seventh-day Adventist": "1024",
    "Aglipayan":             "1011",
    "Buddhism":              "1026",
    "Hinduism":              "1025",
    "None":                  "1000",
    "Other":                 "1099",
}

# Educational attainment — slug codes matching the PH-Core CodeSystem
_EDUCATION_CODE: dict[str, str] = {
    "No Formal Education":            "no-formal-education",
    "No formal education":            "no-formal-education",
    "Elementary":                     "elementary",
    "Elementary (incomplete)":        "elementary",
    "Elementary (complete)":          "elementary",
    "High School":                    "high-school",
    "Junior High School":             "junior-high-school",
    "Junior High School (incomplete)":"junior-high-school",
    "Junior High School (complete)":  "junior-high-school",
    "Senior High School":             "senior-high-school",
    "Senior High School (K-12)":      "senior-high-school",
    "Vocational/Technical":           "vocational-technical",
    "Vocational":                     "vocational-technical",
    "Vocational / Technical / TESDA": "vocational-technical",
    "College Undergraduate":          "college-undergraduate",
    "College (incomplete)":           "college-undergraduate",
    "College Graduate":               "college-graduate",
    "College (complete)":             "college-graduate",
    "Post Graduate":                  "post-graduate",
    "Post-Graduate":                  "post-graduate",
    "Post-Graduate (Master)":         "post-graduate",
    "Masteral":                       "masteral",
    "Doctorate":                      "doctorate",
    "Post-Graduate (Doctorate)":      "doctorate",
}

# Occupation — Philippine Standard Occupational Classification (PSOC)
_OCCUPATION_CODE: dict[str, str] = {
    "Managers":                                             "1",
    "Professionals":                                        "2",
    "Technicians and Associate Professionals":              "3",
    "Clerical Support Workers":                             "4",
    "Service and Sales Workers":                            "5",
    "Skilled Agricultural, Forestry and Fishery Workers":  "6",
    "Craft and Related Trades Workers":                     "7",
    "Plant and Machine Operators and Assemblers":           "8",
    "Elementary Occupations":                               "9",
    "Armed Forces Occupations":                             "0",
    # Frontend-label aliases → nearest PSOC major group
    "Healthcare Professional":  "2",
    "Engineer/Architect":       "2",
    "Teacher/Educator":         "2",
    "Lawyer/Legal Professional":"2",
    "Accountant/Finance":       "2",
    "Farmer/Fisherman":         "6",
    "Laborer/Worker":           "9",
    "Sales/Service Worker":     "5",
    "Technician":               "3",
    "Driver/Transport":         "8",
    "Office/Clerical Worker":   "4",
    "Business Owner":           "1",
    "Government Employee":      "2",
    "OFW":                      "2",
    "Military/Police":          "0",
}

# ---------------------------------------------------------------------------
# FHIR R4 Encounter class code → human-readable display name.
# Source: HL7 v3 ActCode CodeSystem.
# ---------------------------------------------------------------------------
ENCOUNTER_CLASS_MAP: dict[str, str] = {
    "AMB":    "ambulatory",
    "EMER":   "emergency",
    "FLD":    "field",
    "HH":     "home health",
    "IMP":    "inpatient encounter",
    "ACUTE":  "inpatient acute",
    "NONAC":  "inpatient non-acute",
    "OBSENC": "observation encounter",
    "PRENC":  "pre-admission",
    "SS":     "short stay",
    "VR":     "virtual",
}

# Philippine Standard Time — fixed UTC+08:00 offset used for FHIR date-times.
_PHT = timezone(timedelta(hours=8))


def _slug(text: str) -> str:
    """Normalise a display string to a lowercase slug (fallback code)."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _barangay_psgc_code(city_psgc_10: str | None, barangay_name: str | None) -> str | None:
    """Return a 9-digit code for a barangay, or None if the city is unknown.

    Strategy (in priority order):
    1. "Barangay N" — exact derivation: city_9[:6] + N.zfill(3)
       e.g. city "137605000" + "Barangay 17"  →  "137605017"
    2. Named barangay — deterministic 3-digit suffix via CRC32 of the name:
       city_9[:6] + (crc32(name) % 1000).zfill(3)
       e.g. city "137613000" + "Palingon"  →  "137613NNN"
       This keeps the extension structurally valid and 9 digits.
       NOTE: the suffix is NOT an official PSA code; update _PSGC_CITY_9 or
       add a named barangay lookup dict when the PSA PSGC file is available.
    """
    if not city_psgc_10 or not barangay_name:
        return None
    city_9 = _PSGC_CITY_9.get(city_psgc_10)
    if not city_9:
        return None
    # Numbered barangay — exact
    m = re.fullmatch(r"Barangay (\d+)", barangay_name)
    if m:
        return city_9[:6] + str(int(m.group(1))).zfill(3)
    # Named barangay — deterministic (zlib.adler32 is stable across processes)
    suffix = zlib.adler32(barangay_name.encode("utf-8")) % 1000
    return city_9[:6] + str(suffix).zfill(3)


def _clean(d: dict) -> dict:
    """Strip None and empty-string values from a flat dict."""
    return {k: v for k, v in d.items() if v is not None and v != ""}


def _meta_last_updated(dt) -> str:
    """Format a Django DateTimeField value as a FHIR meta.lastUpdated string.

    Output format: "YYYY-MM-DDTHH:MM:SS.mmmZ"  (UTC, millisecond precision)
    Falls back to the current UTC instant when dt is None.
    """
    if dt is None:
        return datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    dt_utc = dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    ms = dt_utc.microsecond // 1000
    return dt_utc.strftime(f"%Y-%m-%dT%H:%M:%S.{ms:03d}Z")


def format_fhir_datetime(value) -> str:
    """Format a date or datetime to a FHIR datetime string in PHT (+08:00).

    DateTimeField values (timezone-aware UTC) are converted to PHT and formatted
    as "YYYY-MM-DDTHH:MM:SS+08:00".

    DateField values (date-only) are padded with midnight PHT time, producing
    "YYYY-MM-DDT00:00:00+08:00".  This is the known fidelity tradeoff for
    Encounter.period_start / period_end which are stored as DateField.

    Returns None for falsy input.
    """
    if not value:
        return None
    if isinstance(value, datetime):
        dt_pht = (
            value.astimezone(_PHT)
            if value.tzinfo
            else value.replace(tzinfo=timezone.utc).astimezone(_PHT)
        )
        return dt_pht.strftime("%Y-%m-%dT%H:%M:%S+08:00")
    # date-only (DateField) — pad with midnight PHT
    return f"{value.isoformat()}T00:00:00+08:00"


# ---------------------------------------------------------------------------
# Retry configuration
# ---------------------------------------------------------------------------
# 409 Conflict  — gateway already has an identical request in flight.
# 429 Too Many  — rate limit hit.
# Both are transient; a short back-off and re-send is the correct response.
# ---------------------------------------------------------------------------
_RETRY_STATUSES = {409, 429}
_MAX_ATTEMPTS = 3
_BACKOFF_SECONDS = [1, 2]  # sleep before attempt 2, then before attempt 3


def request_patient(target_id, philhealth_id, idempotency_key=None):
    """Request patient data from another provider via WAH4PC gateway.

    Args:
        target_id: Target provider UUID
        philhealth_id: PhilHealth ID to search for
        idempotency_key: Optional idempotency key for retry safety (generated if not provided)

    Returns:
        dict: Response with 'data' key on success, or 'error' and 'status_code' on failure.
              Retries up to _MAX_ATTEMPTS times on 409/429 before giving up.
    """
    # Read credentials at call time so key rotation takes effect without a restart
    api_key = os.getenv("WAH4PC_API_KEY")
    provider_id = os.getenv("WAH4PC_PROVIDER_ID")

    if not idempotency_key:
        idempotency_key = str(uuid.uuid4())

    last_retryable_result = None

    for attempt in range(_MAX_ATTEMPTS):
        if attempt > 0:
            # Exponential-ish back-off: 1 s, then 2 s
            time.sleep(_BACKOFF_SECONDS[min(attempt - 1, len(_BACKOFF_SECONDS) - 1)])

        try:
            response = requests.post(
                f"{URL}/api/v1/fhir/request/Patient",
                headers={
                    "X-API-Key": api_key,
                    "X-Provider-ID": provider_id,
                    "Idempotency-Key": idempotency_key,
                },
                json={
                    "requesterId": provider_id,
                    "targetId": target_id,
                    "identifiers": [
                        {"system": "http://philhealth.gov.ph/fhir/Identifier/philhealth-id", "value": philhealth_id}
                    ],
                },
                timeout=30,
            )

            if response.status_code in _RETRY_STATUSES:
                last_retryable_result = {
                    "error": (
                        "Request already in progress — retrying"
                        if response.status_code == 409
                        else "Rate limit exceeded — retrying"
                    ),
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
                continue  # wait (top of loop) then retry

            if response.status_code >= 400:
                error_msg = (
                    response.json().get("error", "Unknown error")
                    if response.text
                    else "Unknown error"
                )
                return {
                    "error": error_msg,
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }

            result = response.json()
            result["idempotency_key"] = idempotency_key
            return result

        except requests.RequestException as e:
            return {
                "error": f"Network error: {str(e)}",
                "status_code": 500,
                "idempotency_key": idempotency_key,
            }

    # All _MAX_ATTEMPTS exhausted on a retryable status
    return last_retryable_result


def patient_to_fhir(patient):
    """Convert a local Patient model instance to a PH Core FHIR Patient resource.

    Output structure precisely matches the Working-Version JSON reference:
    - urn://example.com/... URIs on all custom extensions and profiles.
    - Address object carries a nested extension[] with valueCoding PSGC entries
      for region, city-municipality, and barangay.
    - Religion, race, educational-attainment, and occupation extensions each
      include both code and display inside their coding[] array.
    - Identifier has use="official" and the SB type coding.
    - Marital status sends code + system only (no display), per the sample.
    - meta.lastUpdated reflects the current UTC timestamp.
    - Null / empty fields are omitted entirely — never sent as null or "".
    """

    # ------------------------------------------------------------------
    # 1. Root-level extension array
    #    Order mirrors the Working-Version sample exactly.
    # ------------------------------------------------------------------
    extensions = []

    # 1a. Religion
    # Only emit when the value maps to a recognised PH terminology code.
    # Sending an unknown slug (e.g. "born-again-christian") causes mismatches
    # on the receiving system's terminology validation.
    if patient.religion:
        rel_code = _RELIGION_CODE.get(patient.religion)
        if rel_code:
            extensions.append({
                "url": f"{_URN_EXT}/religion",
                "valueCodeableConcept": {
                    "coding": [{
                        "system": f"{_URN_CS}/religion",
                        "code":    rel_code,
                        "display": patient.religion,
                    }]
                },
            })

    # 1b. Race  (falls back to nationality when race is not separately recorded)
    race = patient.race or patient.nationality
    if race:
        extensions.append({
            "url": f"{_URN_EXT}/race",
            "valueCodeableConcept": {
                "coding": [{
                    "system": f"{_URN_CS}/race",
                    "code":    _slug(race),
                    "display": race,
                }]
            },
        })

    # 1c. Educational attainment
    # Only emit when the value maps to a recognised canonical code.
    # Sending an unknown slug causes a 500/Save error on receiving systems.
    if patient.education:
        edu_code = _EDUCATION_CODE.get(patient.education)
        if edu_code:
            extensions.append({
                "url": f"{_URN_EXT}/educational-attainment",
                "valueCodeableConcept": {
                    "coding": [{
                        "system": f"{_URN_CS}/educational-attainment",
                        "code":    edu_code,
                        "display": patient.education,
                    }]
                },
            })

    # 1d. Occupation  (system is PSOC, not the generic PH-Core CS)
    # Only emit when the value maps to a recognised numeric PSOC code.
    # Sending a slug like "cybersecurity-analysts" causes validation errors.
    if patient.occupation:
        occ_code = _OCCUPATION_CODE.get(patient.occupation)
        if occ_code:
            extensions.append({
                "url": f"{_URN_EXT}/occupation",
                "valueCodeableConcept": {
                    "coding": [{
                        "system": f"{_URN_CS}/PSOC",
                        "code":    occ_code,
                        "display": patient.occupation,
                    }]
                },
            })

    # 1e. Indigenous people (boolean — always present)
    extensions.append({
        "url": f"{_URN_EXT}/indigenous-people",
        "valueBoolean": bool(patient.indigenous_flag),
    })

    # 1f. Indigenous group name — only when patient is indigenous
    indigenous_group = getattr(patient, "indigenous_group", None)
    if patient.indigenous_flag and indigenous_group:
        extensions.append({
            "url": f"{_URN_EXT}/indigenous-group",
            "valueString": indigenous_group,
        })

    # 1g. PWD (Persons with Disability) type
    pwd_type = getattr(patient, "pwd_type", None)
    if pwd_type:
        extensions.append({
            "url": f"{_URN_EXT}/disability-type",
            "valueCodeableConcept": {
                "coding": [{
                    "system":  f"{_URN_CS}/disability-type",
                    "code":    _slug(pwd_type),
                    "display": pwd_type,
                }]
            },
        })

    # ------------------------------------------------------------------
    # 2. Core skeleton
    # ------------------------------------------------------------------
    # Split first_name by whitespace so compound names like "Juan Dela Cruz"
    # become ["Juan", "Dela", "Cruz"] — required by clinical matching logic.
    given_names = patient.first_name.split() if patient.first_name else []
    if patient.middle_name:
        given_names.append(patient.middle_name)

    # Stable UUID: deterministic from the local PK so the same patient always
    # gets the same FHIR resource id (enables deduplication on target systems).
    # Falls back to uuid4 for unsaved objects that have no PK yet.
    pk = getattr(patient, "id", None) or getattr(patient, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"patient:{pk}"))
        if pk is not None
        else str(uuid.uuid4())
    )

    fhir: dict = {
        "resourceType": "Patient",
        "id": resource_id,
        "meta": {
            "lastUpdated": _meta_last_updated(patient.updated_at),
            "profile": [f"{_URN_EXT}/ph-core-patient"],
        },
        "extension": extensions,
        "active": True,
    }

    # ------------------------------------------------------------------
    # 3. Identifiers — WAH4H internal ID always present; PhilHealth ID when set.
    # Every patient must have at least one FHIR identifier for external routing.
    # ------------------------------------------------------------------
    identifiers = [{
        "use":    "secondary",
        "system": "https://wah4h.echosphere.cfd/fhir/identifier/patient",
        "value":  patient.patient_id,
    }]
    if patient.philhealth_id:
        identifiers.append({
            "use":  "official",
            "type": {
                "coding": [{
                    "system":  "http://terminology.hl7.org/CodeSystem/v2-0203",
                    "code":    "SB",
                    "display": "Social Beneficiary Identifier",
                }]
            },
            "system": "http://philhealth.gov.ph/fhir/Identifier/philhealth-id",
            "value":  patient.philhealth_id,
        })
    fhir["identifier"] = identifiers

    # ------------------------------------------------------------------
    # 4. Name — use="official"
    # ------------------------------------------------------------------
    fhir["name"] = [{
        "use":    "official",
        "family": patient.last_name,
        "given":  given_names,
    }]

    # ------------------------------------------------------------------
    # 5. Demographics
    # ------------------------------------------------------------------
    if patient.gender:
        fhir["gender"] = patient.gender.lower()

    # Birthdate: must be YYYY-MM-DD and not in the future.
    # A timezone offset on the server could otherwise push a newborn's date
    # into "tomorrow" — clamp to today's UTC date instead of omitting it.
    if patient.birthdate:
        bd_str = str(patient.birthdate)[:10]   # truncate to YYYY-MM-DD
        today = datetime.now(tz=timezone.utc).date().isoformat()
        if bd_str <= today:
            fhir["birthDate"] = bd_str

    # ------------------------------------------------------------------
    # 6. Telecom — phone (rank 1) and optional email
    # ------------------------------------------------------------------
    telecom = []
    if patient.mobile_number:
        telecom.append({
            "system": "phone",
            "value":  patient.mobile_number,
            "use":    "mobile",
            "rank":   1,
        })
    email = patient.email
    if email:
        telecom.append({
            "system": "email",
            "value":  email,
            "use":    "home",
        })
    if telecom:
        fhir["telecom"] = telecom

    # ------------------------------------------------------------------
    # 7. Marital status — code + system only (no display per Working Version)
    # ------------------------------------------------------------------
    if patient.civil_status:
        hl7_code = _HL7_MARITAL_STATUS.get(patient.civil_status.upper())
        if hl7_code:
            fhir["maritalStatus"] = {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                    "code":   hl7_code,
                }]
            }

    # ------------------------------------------------------------------
    # 8. Address — top-level city as display name + PSGC extension array
    # ------------------------------------------------------------------
    if patient.address_line or patient.address_city:
        city_display = _PSGC_CITY.get(patient.address_city, patient.address_city) \
                       if patient.address_city else None

        # Build the PSGC extension array
        addr_extensions = []

        # 8a. Region — only emit when a proper 9-digit PSA numeric code is known.
        # Falling back to the raw short code ("NCR") in the code field would
        # cause a validation error on the receiving system.
        if patient.address_state:
            region_code = _PSGC_REGION_CODE.get(patient.address_state)
            if region_code:
                region_display = _PSGC_REGION.get(patient.address_state, patient.address_state)
                addr_extensions.append({
                    "url": f"{_URN_EXT}/region",
                    "valueCoding": {
                        "system":  f"{_URN_CS}/PSGC",
                        "code":    region_code,
                        "display": region_display,
                    },
                })

        # 8b. City-municipality — emit 9-digit PSA code only.
        # The DB stores a 10-digit frontend code; _PSGC_CITY_9 converts it.
        # If no 9-digit code is known, omit the extension (never send a
        # 10-digit code — it fails length/constraint checks on target systems).
        if patient.address_city:
            city_9 = _PSGC_CITY_9.get(patient.address_city)
            if city_9:
                addr_extensions.append({
                    "url": f"{_URN_EXT}/city-municipality",
                    "valueCoding": {
                        "system":  f"{_URN_CS}/PSGC",
                        "code":    city_9,
                        "display": city_display or patient.address_city,
                    },
                })

        # 8c. Barangay — only emit when a real numeric PSGC code is available.
        # "Barangay N" names → code derived as city_prefix[:7] + N.zfill(3).
        # Named barangays (e.g. "Almanza Uno") have no derivable code and are
        # excluded entirely; sending an invented slug causes 500/Save errors.
        if patient.address_line:
            bgy_code = _barangay_psgc_code(patient.address_city, patient.address_line)
            if bgy_code:
                addr_extensions.append({
                    "url": f"{_URN_EXT}/barangay",
                    "valueCoding": {
                        "system":  f"{_URN_CS}/PSGC",
                        "code":    bgy_code,
                        "display": patient.address_line,
                    },
                })

        addr = _clean({
            "use":        "home",
            "type":       "physical",
            "line":       [patient.address_line] if patient.address_line else None,
            "city":       city_display,
            "postalCode": patient.address_postal_code,
            "country":    "PH",    # ISO 3166-1 alpha-2 — never free-text
        })
        if "line" not in addr:
            addr["line"] = []
        if addr_extensions:
            addr["extension"] = addr_extensions

        fhir["address"] = [addr]

    # ------------------------------------------------------------------
    # 9. Emergency contact
    # ------------------------------------------------------------------
    if patient.contact_first_name or patient.contact_last_name:
        contact_name = {}
        if patient.contact_last_name:
            contact_name["family"] = patient.contact_last_name
        if patient.contact_first_name:
            # Split compound given name into individual tokens —
            # same logic as the patient name array.
            contact_name["given"] = patient.contact_first_name.split()

        contact: dict = {
            "relationship": [{
                "coding": [{
                    "system":  "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
                    "display": patient.contact_relationship or "Emergency Contact",
                }]
            }],
            "name": contact_name,
        }
        if patient.contact_mobile_number:
            contact["telecom"] = [{"system": "phone", "value": patient.contact_mobile_number}]

        fhir["contact"] = [contact]

    # ------------------------------------------------------------------
    # 10. Final pass — strip any remaining top-level None / empty values
    # ------------------------------------------------------------------
    return {k: v for k, v in fhir.items() if v is not None and v != ""}


def push_patient(target_id, patient, idempotency_key=None):
    """Push patient data to another provider via WAH4PC gateway.

    Args:
        target_id: Target provider UUID
        patient: Patient model instance
        idempotency_key: Optional idempotency key for retry safety (generated if not provided)

    Returns:
        dict: Response with transaction data on success, or 'error' and 'status_code' on failure.
              Retries up to _MAX_ATTEMPTS times on 409/429 before giving up.
    """
    # Read credentials at call time so key rotation takes effect without a restart
    api_key = os.getenv("WAH4PC_API_KEY")
    provider_id = os.getenv("WAH4PC_PROVIDER_ID")

    if not idempotency_key:
        idempotency_key = str(uuid.uuid4())

    last_retryable_result = None

    for attempt in range(_MAX_ATTEMPTS):
        if attempt > 0:
            time.sleep(_BACKOFF_SECONDS[min(attempt - 1, len(_BACKOFF_SECONDS) - 1)])

        try:
            response = requests.post(
                f"{URL}/api/v1/fhir/push/Patient",
                headers={
                    "X-API-Key": api_key,
                    "X-Provider-ID": provider_id,
                    "Idempotency-Key": idempotency_key,
                },
                json={
                    "senderId": provider_id,
                    "targetId": target_id,
                    "resourceType": "Patient",
                    "data": patient_to_fhir(patient),
                },
                timeout=30,
            )

            if response.status_code in _RETRY_STATUSES:
                last_retryable_result = {
                    "error": (
                        "Request already in progress — retrying"
                        if response.status_code == 409
                        else "Rate limit exceeded — retrying"
                    ),
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
                continue  # wait (top of loop) then retry

            if response.status_code >= 400:
                error_msg = (
                    response.json().get("error", "Unknown error")
                    if response.text
                    else "Unknown error"
                )
                return {
                    "error": error_msg,
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }

            result = response.json()
            result["idempotency_key"] = idempotency_key
            return result

        except requests.RequestException as e:
            return {
                "error": f"Network error: {str(e)}",
                "status_code": 500,
                "idempotency_key": idempotency_key,
            }

    # All _MAX_ATTEMPTS exhausted on a retryable status
    return last_retryable_result


def _get_extension(extensions, url):
    """Extract value from a FHIR extension by URL.

    Matches both the legacy ``urn://example.com/ph-core/fhir/`` prefix and
    the current ``https://example.com/ph-core/fhir/`` prefix so inbound
    records from providers that have not yet updated their serialiser are
    still parsed correctly.
    """
    # Build a set of candidate URLs to check (handles scheme migration)
    candidates = {url}
    if url.startswith("urn://example.com/ph-core/fhir/"):
        candidates.add(url.replace("urn://example.com/ph-core/fhir/", "https://example.com/ph-core/fhir/", 1))
    elif url.startswith("https://example.com/ph-core/fhir/"):
        candidates.add(url.replace("https://example.com/ph-core/fhir/", "urn://example.com/ph-core/fhir/", 1))

    for ext in extensions:
        if ext.get("url") in candidates:
            for key, val in ext.items():
                if key.startswith("value"):
                    return val
            if "extension" in ext:
                return ext["extension"]
    return None


def get_providers():
    """Fetch all registered providers from WAH4PC gateway (public endpoint).

    Returns:
        list: List of active provider dictionaries with id, name, type, isActive fields
    """
    try:
        response = requests.get(f"{URL}/api/v1/providers", timeout=10)

        if response.status_code == 200:
            result = response.json()
            # Handle both wrapped {"data": [...]} and flat array formats
            providers = result.get("data", result) if isinstance(result, dict) else result
            # Filter to only return active providers
            return [p for p in providers if p.get("isActive", True)]

        return []

    except requests.RequestException as e:
        logger.error(f"[WAH4PC] Error fetching providers: {str(e)}")
        return []


def gateway_list_transactions(status_filter=None, limit=50):
    """List transactions from WAH4PC gateway.

    Args:
        status_filter: Optional status filter (PENDING, COMPLETED, FAILED)
        limit: Maximum number of transactions to return (default: 50)

    Returns:
        dict: Response with 'data' key containing transaction list, or 'error' and 'status_code' on failure
    """
    # Read credentials at call time so key rotation takes effect without a restart
    api_key = os.getenv("WAH4PC_API_KEY")
    provider_id = os.getenv("WAH4PC_PROVIDER_ID")

    try:
        params = {"limit": limit}
        if status_filter:
            params["status"] = status_filter

        response = requests.get(
            f"{URL}/api/v1/transactions",
            headers={
                "X-API-Key": api_key,
                "X-Provider-ID": provider_id,
            },
            params=params,
        )

        if response.status_code >= 400:
            error_msg = (
                response.json().get("error", "Unknown error")
                if response.text
                else "Unknown error"
            )
            return {"error": error_msg, "status_code": response.status_code}

        return response.json()

    except requests.RequestException as e:
        return {"error": f"Network error: {str(e)}", "status_code": 500}


def gateway_get_transaction(transaction_id):
    """Get transaction details from WAH4PC gateway.

    Args:
        transaction_id: Transaction ID to retrieve

    Returns:
        dict: Response with transaction details, or 'error' and 'status_code' on failure
    """
    # Read credentials at call time so key rotation takes effect without a restart
    api_key = os.getenv("WAH4PC_API_KEY")
    provider_id = os.getenv("WAH4PC_PROVIDER_ID")

    try:
        response = requests.get(
            f"{URL}/api/v1/transactions/{transaction_id}",
            headers={
                "X-API-Key": api_key,
                "X-Provider-ID": provider_id,
            },
        )

        if response.status_code >= 400:
            error_msg = (
                response.json().get("error", "Unknown error")
                if response.text
                else "Unknown error"
            )
            return {"error": error_msg, "status_code": response.status_code}

        return response.json()

    except requests.RequestException as e:
        return {"error": f"Network error: {str(e)}", "status_code": 500}


def fhir_to_dict(fhir):
    """Convert PH Core FHIR Patient resource to local dict.

    Accepts both the legacy ``urn://example.com/ph-core/fhir/`` extension URLs
    and the current ``https://example.com/ph-core/fhir/`` URLs via the
    dual-scheme _get_extension helper, so records from external providers that
    have not yet migrated their serialiser are still parsed correctly.

    civil_status is stored in the DB as the single-letter HL7 code ('S','M',…).
    We read the code from maritalStatus.coding[0].code (not the display) so the
    roundtrip format stays consistent.
    """
    name = fhir.get("name", [{}])[0]
    ids = fhir.get("identifier", [])
    extensions = fhir.get("extension", [])
    addresses = fhir.get("address", [{}])
    addr = addresses[0] if addresses else {}
    telecoms = fhir.get("telecom", [])
    contacts = fhir.get("contact", [])

    ph_id = next(
        (i["value"] for i in ids if "philhealth" in i.get("system", "")), None
    )
    phone = next(
        (t["value"] for t in telecoms if t.get("system") == "phone"), None
    )
    given = name.get("given", [])

    # Extract extensions — _get_extension handles both URL schemes
    indigenous_val    = _get_extension(extensions, f"{_EXT_BASE}/indigenous-people")
    indigenous_grp    = _get_extension(extensions, f"{_EXT_BASE}/indigenous-group")
    nationality_ext   = _get_extension(extensions, "http://hl7.org/fhir/StructureDefinition/patient-nationality")
    race_val          = _get_extension(extensions, f"{_EXT_BASE}/race")
    religion_val      = _get_extension(extensions, f"{_EXT_BASE}/religion")
    occupation_val    = _get_extension(extensions, f"{_EXT_BASE}/occupation")
    education_val     = _get_extension(extensions, f"{_EXT_BASE}/educational-attainment")

    # Nested nationality extension (HL7 standard fallback)
    nationality = None
    if isinstance(nationality_ext, list):
        for sub in nationality_ext:
            if sub.get("url") == "code":
                concept = sub.get("valueCodeableConcept", {})
                codings = concept.get("coding", [{}])
                nationality = codings[0].get("display") or codings[0].get("code")
    # PH Core stores nationality as a flat race/valueCodeableConcept extension
    if not nationality and isinstance(race_val, dict):
        race_codings = race_val.get("coding", [{}])
        if race_codings:
            nationality = race_codings[0].get("display") or race_codings[0].get("code")

    def _display(val):
        if isinstance(val, dict):
            codings = val.get("coding", [{}])
            return codings[0].get("display") if codings else None
        return None

    # civil_status: read the code so it matches what the DB stores ('S','M',…)
    civil_status = None
    if fhir.get("maritalStatus"):
        codings = fhir["maritalStatus"].get("coding", [{}])
        civil_status = codings[0].get("code") or codings[0].get("display")

    # Parse contact
    contact = contacts[0] if contacts else {}
    contact_name = contact.get("name", {})
    contact_telecoms = contact.get("telecom", [])
    contact_rels = contact.get("relationship", [{}])
    contact_rel = contact_rels[0] if contact_rels else {}

    result = {
        "first_name":            given[0].strip() if given else "",
        "middle_name":           given[1].strip() if len(given) > 1 else "",
        "last_name":             name.get("family", ""),
        "gender":                fhir.get("gender", "").lower() or None,
        "birthdate":             fhir.get("birthDate"),
        "philhealth_id":         ph_id,
        "mobile_number":         phone,
        "email":                 next((t["value"] for t in telecoms if t.get("system") == "email"), None),
        "nationality":           nationality,
        "race":                  _display(race_val),
        "religion":              _display(religion_val),
        "occupation":            _display(occupation_val),
        "education":             _display(education_val),
        "indigenous_flag":       indigenous_val if isinstance(indigenous_val, bool) else None,
        "indigenous_group":      _display(indigenous_grp),
        "civil_status":          civil_status,
        "address_line":          addr.get("line", [None])[0] if addr.get("line") else None,
        "address_city":          addr.get("city"),
        "address_district":      addr.get("district"),
        "address_state":         addr.get("state"),
        "address_postal_code":   addr.get("postalCode"),
        "address_country":       addr.get("country"),
        "contact_first_name":    contact_name.get("given", [None])[0] if contact_name.get("given") else None,
        "contact_last_name":     contact_name.get("family"),
        "contact_mobile_number": next(
            (t["value"] for t in contact_telecoms if t.get("system") == "phone"), None
        ),
        "contact_relationship":  (
            contact_rel.get("coding", [{}])[0].get("display")
            if contact_rel.get("coding") else None
        ),
    }
    # Strip None and empty strings so callers don't need to handle them
    return {k: v for k, v in result.items() if v is not None and v != ""}


# ---------------------------------------------------------------------------
# Immunization Maps
# ---------------------------------------------------------------------------
# CVX codes → display names.  Keys are the values stored in vaccine_code.
# Standard CVX codes: https://www2a.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx
# Non-standard codes ("COVID-19", "JC") kept for backward compatibility.
_VACCINE_CODE_MAP = {
    # --- DOH EPI Schedule (Expanded Program on Immunization) ---
    "19":  "BCG (Bacillus Calmette-Guérin)",
    "08":  "Hepatitis B",
    "02":  "Oral Polio Vaccine (OPV)",
    "10":  "Inactivated Polio Vaccine (IPV)",
    "146": "Pentavalent (DTP-HepB-Hib)",
    "110": "DTaP-Hib (Quadrivalent)",
    "20":  "DTP (Diphtheria-Tetanus-Pertussis)",
    "28":  "DT (Diphtheria-Tetanus, pediatric)",
    "09":  "Td (Tetanus-Diphtheria, adult)",
    "35":  "Tetanus Toxoid (TT)",
    "03":  "MMR (Measles-Mumps-Rubella)",
    "04":  "Measles-Rubella (MR)",
    "05":  "Measles",
    "94":  "Measles-Containing Vaccine",
    "133": "PCV13 (Pneumococcal Conjugate Vaccine, 13-valent)",
    "33":  "PPV23 (Pneumococcal Polysaccharide Vaccine, 23-valent)",
    "100": "Pneumococcal Conjugate NOS",
    "119": "Rotavirus (monovalent, RV1)",
    "116": "Rotavirus (pentavalent, RV5)",
    "62":  "HPV (Bivalent, Cervarix)",
    "137": "HPV (9-valent, Gardasil 9)",
    "165": "HPV (4-valent, Gardasil)",
    "88":  "Influenza (seasonal, injectable)",
    "141": "Influenza (seasonal, high-dose)",
    "21":  "Varicella (Chickenpox)",
    "52":  "Hepatitis A (pediatric)",
    "83":  "Hepatitis A + Hepatitis B (combination)",
    "25":  "Typhoid (Vi polysaccharide, injectable)",
    "101": "Typhoid (oral, Ty21a)",
    "56":  "Dengue (Dengvaxia, CYD-TDV)",
    "18":  "Rabies",
    "39":  "Japanese Encephalitis (inactivated)",
    "38":  "Japanese Encephalitis (live)",
    "37":  "Yellow Fever",
    "136": "Meningococcal ACWY",
    "114": "Meningococcal B",
    "26":  "Cholera (oral)",
    # --- COVID-19 ---
    "207": "COVID-19 mRNA (Moderna Spikevax)",
    "208": "COVID-19 mRNA (Pfizer-BioNTech Comirnaty)",
    "210": "COVID-19 Viral Vector (AstraZeneca Vaxzevria)",
    "212": "COVID-19 Viral Vector (Janssen / J&J)",
    "217": "COVID-19 mRNA (Moderna Bivalent Booster)",
    "218": "COVID-19 mRNA (Pfizer Bivalent Booster)",
    "211": "COVID-19 Inactivated (Sinovac CoronaVac)",
    "510": "COVID-19 Inactivated (Sinopharm BIBP)",
    "511": "COVID-19 Protein Subunit (Novavax Nuvaxovid)",
    # --- Legacy / non-standard codes kept for backward compatibility ---
    "COVID-19": "COVID-19 mRNA",
    "JC":       "Japanese Encephalitis",
}
_SITE_CODE_MAP = {
    "LA":  "Left Arm",
    "RA":  "Right Arm",
    "LL":  "Left Leg",
    "RL":  "Right Leg",
    "LT":  "Left Thigh",
    "RT":  "Right Thigh",
    "LVL": "Left Vastus Lateralis",
    "RVL": "Right Vastus Lateralis",
}
_ROUTE_CODE_MAP = {
    "IM":    "Intramuscular",
    "PO":    "Oral",
    "IDINJ": "Intradermal",
    "SQ":    "Subcutaneous",
    "NASINH": "Nasal Inhalation",
    "IV":    "Intravenous",
}


def immunization_to_fhir(model):
    """Convert a local Immunization model instance to a PH Core FHIR Immunization resource.

    Follows the Manual Dict Construction pattern used by patient_to_fhir:
    - All URIs use the urn://example.com/... scheme.
    - Null / empty fields are omitted entirely.
    - doseQuantity units are hardcoded to "ml" per the Working JSON spec.
    - performer.function is hardcoded to Administering Provider (AP).
    """
    pk = getattr(model, "immunization_id", None) or getattr(model, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"immunization:{pk}"))
        if pk is not None
        else str(uuid.uuid4())
    )

    # Patient reference uses the same deterministic UUID strategy as patient_to_fhir
    patient_pk = model.patient_id
    patient_fhir_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"patient:{patient_pk}"))

    # Patient display name (patient is select_related on the queryset)
    patient_obj = model.patient if hasattr(model, '_state') else None
    try:
        patient_display = f"{model.patient.first_name or ''} {model.patient.last_name or ''}".strip()
    except Exception:
        patient_display = ""

    vaccine_display = _VACCINE_CODE_MAP.get(
        model.vaccine_code,
        model.vaccine_display or model.vaccine_code or "",
    )

    fhir: dict = {
        "resourceType": "Immunization",
        "id": resource_id,
        "meta": {
            "lastUpdated": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "profile": [f"{_URN_EXT}/ph-core-immunization"],
        },
        "status": model.status,
        "vaccineCode": {
            "text": vaccine_display,
            "coding": [{
                "system":  "http://hl7.org/fhir/sid/cvx",
                "code":    model.vaccine_code,
                "display": vaccine_display,
            }]
        },
        "patient": {
            "display": patient_display,
            "reference": f"Patient/{patient_fhir_id}",
        },
    }

    # Identifier — include the local DB PK so the frontend can resolve edits/deletes
    if model.identifier or pk is not None:
        fhir["identifier"] = [
            *([ {"value": model.identifier} ] if model.identifier else []),
            {"system": "local-db-pk", "value": str(pk)},
        ]

    # Occurrence — prefer datetime, fall back to string
    if model.occurrence_datetime:
        fhir["occurrenceDateTime"] = model.occurrence_datetime.strftime(
            "%Y-%m-%dT%H:%M:%S.000Z"
        )
    elif model.occurrence_string:
        fhir["occurrenceString"] = model.occurrence_string

    # Recorded
    if model.recorded_datetime:
        fhir["recorded"] = model.recorded_datetime.strftime("%Y-%m-%dT%H:%M:%S.000Z")

    # Primary source
    if model.primary_source is not None:
        fhir["primarySource"] = model.primary_source

    # Lot / expiration
    if model.lot_number:
        fhir["lotNumber"] = model.lot_number
    if model.expiration_date:
        fhir["expirationDate"] = str(model.expiration_date)

    # Site
    if model.site_code:
        fhir["site"] = {
            "coding": [{
                "system":  "http://terminology.hl7.org/CodeSystem/v3-ActSite",
                "code":    model.site_code,
                "display": _SITE_CODE_MAP.get(
                    model.site_code, model.site_display or model.site_code
                ),
            }]
        }

    # Route
    if model.route_code:
        fhir["route"] = {
            "coding": [{
                "system":  "http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration",
                "code":    model.route_code,
                "display": _ROUTE_CODE_MAP.get(
                    model.route_code, model.route_display or model.route_code
                ),
            }]
        }

    # Dose quantity — hardcoded units per Working JSON spec
    if model.dose_quantity_value is not None:
        fhir["doseQuantity"] = {
            "value":  float(model.dose_quantity_value),
            "unit":   "ml",
            "system": "http://unitsofmeasure.org",
            "code":   "ml",
        }

    # Performer — function hardcoded to Administering Provider; actor display from performer_name
    performer_name = getattr(model, "performer_name", None)
    actor = {"display": performer_name or "Unknown"}
    if model.actor_id and not performer_name:
        actor["reference"] = f"Practitioner/{model.actor_id}"
    fhir["performer"] = [{
        "function": {
            "coding": [{
                "system":  "http://terminology.hl7.org/CodeSystem/v2-0443",
                "code":    "AP",
                "display": "Administering Provider",
            }]
        },
        "actor": actor,
    }]

    # Note
    if model.note:
        fhir["note"] = [{"text": model.note}]

    return {k: v for k, v in fhir.items() if v is not None}


def immunizations_to_bundle(queryset):
    """Wrap an iterable of Immunization model instances as a FHIR Bundle (collection).

    Returns:
        dict: { "resourceType": "Bundle", "type": "collection", "entry": [...] }
    """
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [{"resource": immunization_to_fhir(imm)} for imm in queryset],
    }


# ---------------------------------------------------------------------------
# FHIR Procedure conversion (reads from Admission module — source of truth)
# ---------------------------------------------------------------------------

def _practitioner_ref(practitioner_id):
    """Look up a Practitioner by its integer PK and return a FHIR reference dict.

    Returns None when the record does not exist.
    """
    if not practitioner_id:
        return None
    from accounts.models import Practitioner
    try:
        pract = Practitioner.objects.get(practitioner_id=practitioner_id)
        full_name = " ".join(p for p in [pract.first_name, pract.middle_name, pract.last_name] if p)
        return {
            "display":   full_name,
            "reference": f"Practitioner/{pract.identifier}",
        }
    except Practitioner.DoesNotExist:
        return None


def _patient_ref(subject_id):
    """Look up a Patient by its integer PK and return (fhir_id, display_name).

    Returns a pair of empty strings when the record does not exist.
    """
    if not subject_id:
        return str(uuid.uuid4()), ""
    from patients.models import Patient
    try:
        patient = Patient.objects.get(id=subject_id)
        fhir_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"patient:{patient.id}"))
        full_name = " ".join(
            p for p in [patient.first_name, patient.middle_name, patient.last_name] if p
        )
        return fhir_id, full_name
    except Patient.DoesNotExist:
        return str(uuid.uuid4()), ""


def procedure_to_fhir(model):
    """Convert an Admission Procedure instance to a PH Core FHIR Procedure resource.

    Reads from the Admission module as the source of truth (read-only).
    Resolves Patient, Practitioner, and Location via Fortress Pattern IDs.

    Notable spec rules applied:
    - subject does NOT include a "type" field (FHIR Procedure spec).
    - SNOMED system hardcoded for code and category.
    - outcome / reasonCode emit only "text" (free-text from outcome_display /
      reason_code_display) — no coding array required by this profile.
    """
    from accounts.models import Location

    patient_fhir_id, patient_display = _patient_ref(model.subject_id)
    recorder   = _practitioner_ref(model.recorder_id)
    performer  = _practitioner_ref(model.performer_actor_id)

    location_display = None
    if model.location_id:
        try:
            loc = Location.objects.get(location_id=model.location_id)
            location_display = loc.name
        except Location.DoesNotExist:
            pass

    fhir: dict = {
        "resourceType": "Procedure",
        "id":           model.identifier,
        "meta": {
            "profile":     [f"{_URN_EXT}/ph-core-procedure"],
            "lastUpdated": _meta_last_updated(model.updated_at),
        },
        "status": model.status,
        "subject": {
            "display":   patient_display,
            "reference": f"Patient/{patient_fhir_id}",
        },
    }

    # code (SNOMED)
    if model.code_code or model.code_display:
        fhir["code"] = {
            "text": model.code_display or model.code_code,
            "coding": [{
                "code":    model.code_code   or "",
                "system":  "http://snomed.info/sct",
                "display": model.code_display or model.code_code or "",
            }],
        }

    # category (SNOMED)
    if model.category_code or model.category_display:
        fhir["category"] = {
            "text": model.category_display or model.category_code,
            "coding": [{
                "code":    model.category_code   or "",
                "system":  "http://snomed.info/sct",
                "display": model.category_display or model.category_code or "",
            }],
        }

    # performedDateTime
    if model.performed_datetime:
        fhir["performedDateTime"] = format_fhir_datetime(model.performed_datetime)

    # note
    if model.note:
        fhir["note"] = [{"text": model.note}]

    # outcome — free text only (outcome_display preferred, falls back to code)
    outcome_text = model.outcome_display or model.outcome_code
    if outcome_text:
        fhir["outcome"] = {"text": outcome_text}

    # reasonCode — free text only
    reason_text = model.reason_code_display or model.reason_code_code
    if reason_text:
        fhir["reasonCode"] = [{"text": reason_text}]

    # location
    if location_display:
        fhir["location"] = {"display": location_display}

    # bodySite (SNOMED)
    if model.body_site_code or model.body_site_display:
        fhir["bodySite"] = [{
            "text": model.body_site_display or model.body_site_code,
            "coding": [{
                "system":  "http://snomed.info/sct",
                "code":    model.body_site_code   or "",
                "display": model.body_site_display or model.body_site_code or "",
            }],
        }]

    # complication — free text (mirrors outcome pattern)
    complication_text = model.complication_display or model.complication_code
    if complication_text:
        fhir["complication"] = [{"text": complication_text}]

    # recorder
    if recorder:
        fhir["recorder"] = recorder

    # performer — FHIR Procedure.performer is an array of actor objects
    if performer:
        fhir["performer"] = [{"actor": performer}]

    return fhir


def procedures_to_bundle(queryset):
    """Wrap an iterable of Admission Procedure instances as a FHIR Bundle (collection).

    Returns:
        dict: { "resourceType": "Bundle", "type": "collection", "entry": [...] }
    """
    return {
        "resourceType": "Bundle",
        "type":         "collection",
        "entry":        [{"resource": procedure_to_fhir(proc)} for proc in queryset],
    }


# ---------------------------------------------------------------------------
# FHIR Encounter conversion (reads from Admission module — source of truth)
# ---------------------------------------------------------------------------

def encounter_to_fhir(model):
    """Convert an Admission Encounter instance to a PH Core FHIR Encounter resource.

    Reads from the Admission module as the source of truth (read-only).
    Resolves Patient, Practitioner, and Location via Fortress Pattern IDs.

    Notable spec rules applied:
    - subject DOES include "type": "Patient" (FHIR Encounter spec).
    - class is a single Coding (not CodeableConcept) per FHIR R4.
    - period uses format_fhir_datetime which handles the DateField→datetime gap
      by padding date-only values with midnight PHT (T00:00:00+08:00).
    - participant hardcoded to PPRF (primary performer) type.
    """
    from accounts.models import Location

    patient_fhir_id, patient_display = _patient_ref(model.subject_id)

    # Participant (practitioner)
    participant_fhir = None
    if model.participant_individual_id:
        from accounts.models import Practitioner
        try:
            pract = Practitioner.objects.get(
                practitioner_id=model.participant_individual_id
            )
            full_name = " ".join(
                p for p in [pract.first_name, pract.middle_name, pract.last_name] if p
            )
            participant_fhir = {
                "type": [{
                    "coding": [{
                        "code":    "PPRF",
                        "system":  "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                        "display": "primary performer",
                    }]
                }],
                "individual": {
                    "type":      "Practitioner",
                    "display":   full_name,
                    "reference": f"Practitioner/{pract.identifier}",
                },
            }
        except Practitioner.DoesNotExist:
            pass

    # Location
    location_fhir = None
    if model.location_id:
        try:
            loc = Location.objects.get(location_id=model.location_id)
            location_fhir = [{"location": {"display": loc.name}}]
        except Location.DoesNotExist:
            pass

    # class code → display via map
    class_code    = model.class_field or ""
    class_display = ENCOUNTER_CLASS_MAP.get(class_code, class_code.lower())

    fhir: dict = {
        "resourceType": "Encounter",
        "id":           model.identifier,
        "meta": {
            "profile":     [f"{_URN_EXT}/ph-core-encounter"],
            "lastUpdated": _meta_last_updated(model.updated_at),
        },
        "status": model.status,
        "subject": {
            "type":      "Patient",
            "display":   patient_display,
            "reference": f"Patient/{patient_fhir_id}",
        },
    }

    # class — single Coding per FHIR R4 (not a CodeableConcept)
    if class_code:
        fhir["class"] = {
            "code":    class_code,
            "system":  "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "display": class_display,
        }

    # type
    if model.type:
        fhir["type"] = [{"text": model.type}]

    # period — handles DateField (date-only) gap via format_fhir_datetime
    period = {}
    if model.period_start:
        period["start"] = format_fhir_datetime(model.period_start)
    if model.period_end:
        period["end"] = format_fhir_datetime(model.period_end)
    if period:
        fhir["period"] = period

    # reasonCode
    if model.reason_code:
        fhir["reasonCode"] = [{"text": model.reason_code}]

    # location
    if location_fhir:
        fhir["location"] = location_fhir

    # participant
    if participant_fhir:
        fhir["participant"] = [participant_fhir]

    # serviceType — free text
    if model.service_type:
        fhir["serviceType"] = {"text": model.service_type}

    # diagnosis — condition reference, use, and rank
    if model.diagnosis_condition_id:
        diag: dict = {
            "condition": {
                "reference": f"Condition/{model.diagnosis_condition_id}",
            }
        }
        if model.diagnosis_use:
            diag["use"] = {"text": model.diagnosis_use}
        if model.diagnosis_rank:
            try:
                diag["rank"] = int(model.diagnosis_rank)
            except (ValueError, TypeError):
                pass
        fhir["diagnosis"] = [diag]

    return fhir


def encounters_to_bundle(queryset):
    """Wrap an iterable of Admission Encounter instances as a FHIR Bundle (collection).

    Returns:
        dict: { "resourceType": "Bundle", "type": "collection", "entry": [...] }
    """
    return {
        "resourceType": "Bundle",
        "type":         "collection",
        "entry":        [{"resource": encounter_to_fhir(enc)} for enc in queryset],
    }


def import_immunization_from_fhir(fhir_data):
    """Parse a FHIR Immunization resource and upsert into the local Immunization model.

    Resolution order for the patient FK:
    1. Try the reference value as a plain integer local PK.
    2. Scan Patient rows matching the deterministic uuid5 used by immunization_to_fhir.

    Upsert key priority:
    1. identifier value (unique in DB) — if present.
    2. (patient, vaccine_code, occurrence_datetime) composite — if deterministic enough.
    3. Blind create with a fresh UUID identifier as a last resort.

    Returns the upserted Immunization instance, or None if the patient cannot be resolved.
    """
    from patients.models import Patient, Immunization as ImmunizationModel

    # ------------------------------------------------------------------
    # 1. Resolve patient reference → local Patient instance
    # ------------------------------------------------------------------
    patient = None
    patient_ref = (fhir_data.get("patient") or {}).get("reference", "")
    if patient_ref.startswith("Patient/"):
        ref_value = patient_ref.split("/", 1)[1]
        try:
            patient = Patient.objects.get(id=int(ref_value))
        except (ValueError, Patient.DoesNotExist):
            # Reverse the deterministic uuid5 by scanning (small table assumption)
            for p in Patient.objects.all():
                if str(uuid.uuid5(uuid.NAMESPACE_OID, f"patient:{p.id}")) == ref_value:
                    patient = p
                    break

    if patient is None:
        return None

    # ------------------------------------------------------------------
    # 2. Parse vaccine code
    # ------------------------------------------------------------------
    vc_codings = (fhir_data.get("vaccineCode") or {}).get("coding", [{}])
    vc_coding  = vc_codings[0] if vc_codings else {}
    vaccine_code    = vc_coding.get("code")
    vaccine_display = vc_coding.get("display") or _VACCINE_CODE_MAP.get(vaccine_code, "")

    # ------------------------------------------------------------------
    # 3. Parse occurrence
    # ------------------------------------------------------------------
    occ_dt_str      = fhir_data.get("occurrenceDateTime")
    occurrence_string = fhir_data.get("occurrenceString")
    occurrence_datetime = None
    if occ_dt_str:
        try:
            occurrence_datetime = datetime.fromisoformat(occ_dt_str.replace("Z", "+00:00"))
        except ValueError:
            pass

    # ------------------------------------------------------------------
    # 4. Identifier
    # ------------------------------------------------------------------
    raw_identifiers  = fhir_data.get("identifier", [])
    identifier_value = raw_identifiers[0].get("value") if raw_identifiers else None

    # ------------------------------------------------------------------
    # 5. Status / site / route / dose
    # ------------------------------------------------------------------
    imm_status = fhir_data.get("status", "completed")

    site_codings  = (fhir_data.get("site")  or {}).get("coding", [{}])
    site_coding   = site_codings[0] if site_codings else {}
    site_code     = site_coding.get("code")
    site_display  = site_coding.get("display") or _SITE_CODE_MAP.get(site_code, "")

    route_codings = (fhir_data.get("route") or {}).get("coding", [{}])
    route_coding  = route_codings[0] if route_codings else {}
    route_code    = route_coding.get("code")
    route_display = route_coding.get("display") or _ROUTE_CODE_MAP.get(route_code, "")

    dq                 = fhir_data.get("doseQuantity") or {}
    dose_quantity_value = dq.get("value")
    dose_quantity_unit  = dq.get("unit", "ml")

    # ------------------------------------------------------------------
    # 6. Performer actor reference
    # ------------------------------------------------------------------
    performers = fhir_data.get("performer", [])
    actor_id   = None
    if performers:
        actor_ref_str = performers[0].get("actor", {}).get("reference", "")
        if "/" in actor_ref_str:
            try:
                actor_id = int(actor_ref_str.split("/")[-1])
            except ValueError:
                pass

    # ------------------------------------------------------------------
    # 7. Recorded / lot / expiry / note
    # ------------------------------------------------------------------
    recorded_str      = fhir_data.get("recorded")
    recorded_datetime = None
    if recorded_str:
        try:
            recorded_datetime = datetime.fromisoformat(recorded_str.replace("Z", "+00:00"))
        except ValueError:
            pass

    lot_number = fhir_data.get("lotNumber")

    expiry_str      = fhir_data.get("expirationDate")
    expiration_date = None
    if expiry_str:
        try:
            from datetime import date as _date
            expiration_date = _date.fromisoformat(expiry_str)
        except ValueError:
            pass

    notes     = fhir_data.get("note", [])
    note_text = notes[0].get("text") if notes else None

    # ------------------------------------------------------------------
    # 8. Build field dict (omit None to avoid overwriting valid data)
    # ------------------------------------------------------------------
    fields = {
        "status":               imm_status,
        "vaccine_code":         vaccine_code,
        "vaccine_display":      vaccine_display,
        "patient":              patient,
        "occurrence_datetime":  occurrence_datetime,
        "occurrence_string":    occurrence_string,
        "recorded_datetime":    recorded_datetime,
        "site_code":            site_code,
        "site_display":         site_display,
        "route_code":           route_code,
        "route_display":        route_display,
        "dose_quantity_value":  dose_quantity_value,
        "dose_quantity_unit":   dose_quantity_unit,
        "actor_id":             actor_id,
        "lot_number":           lot_number,
        "expiration_date":      expiration_date,
        "note":                 note_text,
    }
    fields = {k: v for k, v in fields.items() if v is not None}

    # ------------------------------------------------------------------
    # 9. Upsert
    # ------------------------------------------------------------------
    if identifier_value:
        obj, _ = ImmunizationModel.objects.update_or_create(
            identifier=identifier_value,
            defaults=fields,
        )
    elif vaccine_code and occurrence_datetime:
        fields.setdefault("identifier", f"import-{uuid.uuid4()}")
        lookup_keys = {"patient": patient, "vaccine_code": vaccine_code,
                       "occurrence_datetime": occurrence_datetime}
        obj, _ = ImmunizationModel.objects.update_or_create(
            **lookup_keys,
            defaults={k: v for k, v in fields.items() if k not in lookup_keys},
        )
    else:
        fields.setdefault("identifier", f"import-{uuid.uuid4()}")
        obj = ImmunizationModel.objects.create(**fields)

    return obj


def push_immunization(target_id, immunization_model, idempotency_key=None):
    """Push immunization data to another provider via WAH4PC gateway.

    Args:
        target_id: Target provider UUID
        immunization_model: Immunization model instance
        idempotency_key: Optional idempotency key (generated if not provided)

    Returns:
        dict: Response with transaction data on success, or 'error' and 'status_code' on failure.
              Retries up to _MAX_ATTEMPTS times on 409/429 before giving up.
    """
    api_key     = os.getenv("WAH4PC_API_KEY")
    provider_id = os.getenv("WAH4PC_PROVIDER_ID")

    if not idempotency_key:
        idempotency_key = str(uuid.uuid4())

    last_retryable_result = None

    for attempt in range(_MAX_ATTEMPTS):
        if attempt > 0:
            time.sleep(_BACKOFF_SECONDS[min(attempt - 1, len(_BACKOFF_SECONDS) - 1)])

        try:
            response = requests.post(
                f"{URL}/api/v1/fhir/push/Immunization",
                headers={
                    "X-API-Key":        api_key,
                    "X-Provider-ID":    provider_id,
                    "Idempotency-Key":  idempotency_key,
                },
                json={
                    "senderId":     provider_id,
                    "targetId":     target_id,
                    "resourceType": "Immunization",
                    "resource": {
                        "resourceType": "Bundle",
                        "type":         "collection",
                        "entry":        [{"resource": immunization_to_fhir(immunization_model)}],
                    },
                },
            )

            if response.status_code in _RETRY_STATUSES:
                last_retryable_result = {
                    "error": (
                        "Request already in progress — retrying"
                        if response.status_code == 409
                        else "Rate limit exceeded — retrying"
                    ),
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
                continue

            if response.status_code >= 400:
                error_msg = (
                    response.json().get("error", "Unknown error")
                    if response.text
                    else "Unknown error"
                )
                return {
                    "error": error_msg,
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }

            result = response.json()
            result["idempotency_key"] = idempotency_key
            return result

        except requests.RequestException as e:
            return {
                "error": f"Network error: {str(e)}",
                "status_code": 500,
                "idempotency_key": idempotency_key,
            }

    return last_retryable_result


# =============================================================================
# CONDITION — FHIR R4 / PHCore
# =============================================================================

_CONDITION_CLINICAL_STATUS_SYSTEM    = "http://terminology.hl7.org/CodeSystem/condition-clinical"
_CONDITION_VERIFICATION_STATUS_SYSTEM = "http://terminology.hl7.org/CodeSystem/condition-ver-status"
_ICD10_SYSTEM = "http://hl7.org/fhir/sid/icd-10-cm"


def condition_to_fhir(model):
    """Convert a local Condition instance to a PH Core FHIR Condition resource."""
    patient_fhir_id, patient_display = _patient_ref(model.patient_id)
    pk = getattr(model, "condition_id", None) or getattr(model, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"condition:{pk}"))
        if pk is not None else str(uuid.uuid4())
    )
    fhir: dict = {
        "resourceType": "Condition",
        "id": resource_id,
        "meta": {
            "profile": [f"{_URN_EXT}/ph-core-condition"],
            "lastUpdated": _meta_last_updated(model.updated_at),
        },
        "subject": {
            "display": patient_display,
            "reference": f"Patient/{patient_fhir_id}",
        },
    }
    if model.identifier:
        fhir["identifier"] = [{"value": model.identifier}]
    if model.clinical_status:
        fhir["clinicalStatus"] = {
            "coding": [{"system": _CONDITION_CLINICAL_STATUS_SYSTEM, "code": model.clinical_status}]
        }
    if model.verification_status:
        fhir["verificationStatus"] = {
            "coding": [{"system": _CONDITION_VERIFICATION_STATUS_SYSTEM, "code": model.verification_status}]
        }
    if model.category:
        fhir["category"] = [{"text": model.category}]
    if model.severity:
        fhir["severity"] = {"text": model.severity}
    if model.code:
        fhir["code"] = {
            "text": model.code,
            "coding": [{"system": _ICD10_SYSTEM, "code": model.code}],
        }
    if model.body_site:
        fhir["bodySite"] = [{"text": model.body_site}]
    if model.encounter_id:
        fhir["encounter"] = {"reference": f"Encounter/{model.encounter_id}"}
    if model.onset_datetime:
        fhir["onsetDateTime"] = format_fhir_datetime(model.onset_datetime)
    if model.abatement_datetime:
        fhir["abatementDateTime"] = format_fhir_datetime(model.abatement_datetime)
    if model.recorded_date:
        fhir["recordedDate"] = str(model.recorded_date)
    if model.stage_summary or model.stage_type:
        fhir["stage"] = [{"summary": {"text": model.stage_summary or ""}}]
    if model.note:
        fhir["note"] = [{"text": model.note}]
    return {k: v for k, v in fhir.items() if v is not None}


def conditions_to_bundle(queryset):
    """Wrap a Condition queryset as a FHIR collection Bundle."""
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [{"resource": condition_to_fhir(c)} for c in queryset],
    }


def import_condition_from_fhir(fhir_data, patient):
    """Parse a FHIR Condition payload and upsert into the local Condition model."""
    from patients.models import Condition
    coding = (fhir_data.get("code") or {}).get("coding", [{}])
    code = coding[0].get("code") if coding else (fhir_data.get("code") or {}).get("text", "")
    clinical = ((fhir_data.get("clinicalStatus") or {}).get("coding") or [{}])[0].get("code")
    verification = ((fhir_data.get("verificationStatus") or {}).get("coding") or [{}])[0].get("code")
    ids = fhir_data.get("identifier", [])
    identifier = ids[0].get("value") if ids else f"import-{uuid.uuid4()}"
    fields = {k: v for k, v in {
        "patient": patient,
        "code": code or "",
        "clinical_status": clinical,
        "verification_status": verification,
        "category": ((fhir_data.get("category") or [{}])[0].get("text")),
        "severity": (fhir_data.get("severity") or {}).get("text"),
        "body_site": ((fhir_data.get("bodySite") or [{}])[0].get("text")),
        "note": ((fhir_data.get("note") or [{}])[0].get("text")),
        "status": clinical or "active",
    }.items() if v is not None}
    obj, _ = Condition.objects.update_or_create(identifier=identifier, defaults=fields)
    return obj


def push_condition(target_id, condition_model, idempotency_key=None):
    """Push a single Condition resource to another provider via the WAH4PC gateway."""
    api_key = os.getenv("WAH4PC_API_KEY")
    provider_id = os.getenv("WAH4PC_PROVIDER_ID")
    if not idempotency_key:
        idempotency_key = str(uuid.uuid4())
    last_retryable_result = None
    for attempt in range(_MAX_ATTEMPTS):
        if attempt > 0:
            time.sleep(_BACKOFF_SECONDS[min(attempt - 1, len(_BACKOFF_SECONDS) - 1)])
        try:
            response = requests.post(
                f"{URL}/api/v1/fhir/push/Condition",
                headers={
                    "X-API-Key":       api_key,
                    "X-Provider-ID":   provider_id,
                    "Idempotency-Key": idempotency_key,
                },
                json={
                    "senderId":     provider_id,
                    "targetId":     target_id,
                    "resourceType": "Condition",
                    "resource": {
                        "resourceType": "Bundle",
                        "type":         "collection",
                        "entry":        [{"resource": condition_to_fhir(condition_model)}],
                    },
                },
                timeout=30,
            )
            if response.status_code in _RETRY_STATUSES:
                last_retryable_result = {
                    "error": (
                        "Request already in progress — retrying"
                        if response.status_code == 409
                        else "Rate limit exceeded — retrying"
                    ),
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
                continue
            if response.status_code >= 400:
                return {
                    "error": response.json().get("error", "Unknown error") if response.text else "Unknown error",
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
            result = response.json()
            result["idempotency_key"] = idempotency_key
            return result
        except requests.RequestException as e:
            return {"error": f"Network error: {str(e)}", "status_code": 500, "idempotency_key": idempotency_key}
    return last_retryable_result


# =============================================================================
# ALLERGY INTOLERANCE — FHIR R4 / PHCore
# =============================================================================

_ALLERGY_CLINICAL_STATUS_SYSTEM     = "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical"
_ALLERGY_VERIFICATION_STATUS_SYSTEM = "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification"
_SNOMED_SYSTEM = "http://snomed.info/sct"


def allergy_to_fhir(model):
    """Convert a local AllergyIntolerance instance to a PH Core FHIR AllergyIntolerance resource."""
    patient_fhir_id, patient_display = _patient_ref(model.patient_id)
    pk = getattr(model, "allergy_id", None) or getattr(model, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"allergy:{pk}"))
        if pk is not None else str(uuid.uuid4())
    )
    fhir: dict = {
        "resourceType": "AllergyIntolerance",
        "id": resource_id,
        "meta": {
            "profile": [f"{_URN_EXT}/ph-core-allergyintolerance"],
            "lastUpdated": _meta_last_updated(model.updated_at),
        },
        "patient": {
            "display": patient_display,
            "reference": f"Patient/{patient_fhir_id}",
        },
    }
    if model.identifier:
        fhir["identifier"] = [{"value": model.identifier}]
    if model.clinical_status:
        fhir["clinicalStatus"] = {
            "coding": [{"system": _ALLERGY_CLINICAL_STATUS_SYSTEM, "code": model.clinical_status}]
        }
    if model.verification_status:
        fhir["verificationStatus"] = {
            "coding": [{"system": _ALLERGY_VERIFICATION_STATUS_SYSTEM, "code": model.verification_status}]
        }
    if model.type:
        fhir["type"] = model.type
    if model.category:
        fhir["category"] = [model.category]
    if model.criticality:
        fhir["criticality"] = model.criticality
    if model.code:
        fhir["code"] = {"text": model.code, "coding": [{"system": _SNOMED_SYSTEM, "code": model.code}]}
    if model.encounter_id:
        fhir["encounter"] = {"reference": f"Encounter/{model.encounter_id}"}
    if model.onset_datetime:
        fhir["onsetDateTime"] = format_fhir_datetime(model.onset_datetime)
    if model.recorded_date:
        fhir["recordedDate"] = str(model.recorded_date)
    if model.last_occurrence:
        fhir["lastOccurrence"] = str(model.last_occurrence)
    if model.note:
        fhir["note"] = [{"text": model.note}]
    reaction = {}
    if model.reaction_substance:
        reaction["substance"] = {"text": model.reaction_substance}
    if model.reaction_manifestation:
        reaction["manifestation"] = [{"text": model.reaction_manifestation}]
    if model.reaction_description:
        reaction["description"] = model.reaction_description
    if model.reaction_severity:
        reaction["severity"] = model.reaction_severity
    if model.reaction_exposure_route:
        reaction["exposureRoute"] = {"text": model.reaction_exposure_route}
    if reaction:
        fhir["reaction"] = [reaction]
    return {k: v for k, v in fhir.items() if v is not None}


def allergies_to_bundle(queryset):
    """Wrap an AllergyIntolerance queryset as a FHIR collection Bundle."""
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [{"resource": allergy_to_fhir(a)} for a in queryset],
    }


def import_allergy_from_fhir(fhir_data, patient):
    """Parse a FHIR AllergyIntolerance payload and upsert into the local AllergyIntolerance model."""
    from patients.models import AllergyIntolerance
    coding = (fhir_data.get("code") or {}).get("coding", [{}])
    code = coding[0].get("code") if coding else (fhir_data.get("code") or {}).get("text", "")
    clinical = ((fhir_data.get("clinicalStatus") or {}).get("coding") or [{}])[0].get("code")
    verification = ((fhir_data.get("verificationStatus") or {}).get("coding") or [{}])[0].get("code")
    ids = fhir_data.get("identifier", [])
    identifier = ids[0].get("value") if ids else f"import-{uuid.uuid4()}"
    reaction_raw = (fhir_data.get("reaction") or [{}])[0]
    fields = {k: v for k, v in {
        "patient": patient,
        "code": code or "",
        "clinical_status": clinical,
        "verification_status": verification,
        "type": fhir_data.get("type"),
        "category": (fhir_data.get("category") or [None])[0],
        "criticality": fhir_data.get("criticality"),
        "note": ((fhir_data.get("note") or [{}])[0].get("text")),
        "reaction_manifestation": ((reaction_raw.get("manifestation") or [{}])[0].get("text")),
        "reaction_severity": reaction_raw.get("severity"),
        "reaction_description": reaction_raw.get("description"),
        "status": clinical or "active",
    }.items() if v is not None}
    obj, _ = AllergyIntolerance.objects.update_or_create(identifier=identifier, defaults=fields)
    return obj


def push_allergy(target_id, allergy_model, idempotency_key=None):
    """Push a single AllergyIntolerance resource to another provider via the WAH4PC gateway."""
    api_key = os.getenv("WAH4PC_API_KEY")
    provider_id = os.getenv("WAH4PC_PROVIDER_ID")
    if not idempotency_key:
        idempotency_key = str(uuid.uuid4())
    last_retryable_result = None
    for attempt in range(_MAX_ATTEMPTS):
        if attempt > 0:
            time.sleep(_BACKOFF_SECONDS[min(attempt - 1, len(_BACKOFF_SECONDS) - 1)])
        try:
            response = requests.post(
                f"{URL}/api/v1/fhir/push/AllergyIntolerance",
                headers={
                    "X-API-Key":       api_key,
                    "X-Provider-ID":   provider_id,
                    "Idempotency-Key": idempotency_key,
                },
                json={
                    "senderId":     provider_id,
                    "targetId":     target_id,
                    "resourceType": "AllergyIntolerance",
                    "resource": {
                        "resourceType": "Bundle",
                        "type":         "collection",
                        "entry":        [{"resource": allergy_to_fhir(allergy_model)}],
                    },
                },
                timeout=30,
            )
            if response.status_code in _RETRY_STATUSES:
                last_retryable_result = {
                    "error": (
                        "Request already in progress — retrying"
                        if response.status_code == 409
                        else "Rate limit exceeded — retrying"
                    ),
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
                continue
            if response.status_code >= 400:
                return {
                    "error": response.json().get("error", "Unknown error") if response.text else "Unknown error",
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
            result = response.json()
            result["idempotency_key"] = idempotency_key
            return result
        except requests.RequestException as e:
            return {"error": f"Network error: {str(e)}", "status_code": 500, "idempotency_key": idempotency_key}
    return last_retryable_result


# =============================================================================
# OBSERVATION — FHIR R4 / PHCore
# =============================================================================

_LOINC_SYSTEM        = "http://loinc.org"
_UCUM_SYSTEM         = "http://unitsofmeasure.org"
_OBS_CATEGORY_SYSTEM = "http://terminology.hl7.org/CodeSystem/observation-category"


def observation_to_fhir(model):
    """Convert a local Observation instance to a PH Core FHIR Observation resource."""
    patient_fhir_id, patient_display = _patient_ref(model.subject_id)
    pk = getattr(model, "observation_id", None) or getattr(model, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"observation:{pk}"))
        if pk is not None else str(uuid.uuid4())
    )
    fhir: dict = {
        "resourceType": "Observation",
        "id": resource_id,
        "meta": {
            "profile": [f"{_URN_EXT}/ph-core-observation"],
            "lastUpdated": _meta_last_updated(model.updated_at),
        },
        "subject": {
            "display": patient_display,
            "reference": f"Patient/{patient_fhir_id}",
        },
    }
    if model.identifier:
        fhir["identifier"] = [{"value": model.identifier}]
    if model.status:
        fhir["status"] = model.status
    if model.category:
        fhir["category"] = [
            {"coding": [{"system": _OBS_CATEGORY_SYSTEM, "code": model.category}]}
        ]
    if model.code:
        fhir["code"] = {"coding": [{"system": _LOINC_SYSTEM, "code": model.code}], "text": model.code}
    if model.encounter_id:
        fhir["encounter"] = {"reference": f"Encounter/{model.encounter_id}"}
    if model.effective_datetime:
        fhir["effectiveDateTime"] = format_fhir_datetime(model.effective_datetime)
    elif model.effective_period_start or model.effective_period_end:
        fhir["effectivePeriod"] = {k: v for k, v in {
            "start": format_fhir_datetime(model.effective_period_start) if model.effective_period_start else None,
            "end":   format_fhir_datetime(model.effective_period_end)   if model.effective_period_end   else None,
        }.items() if v is not None}
    if model.issued:
        fhir["issued"] = format_fhir_datetime(model.issued)
    def _try_float(v):
        try:
            return float(v) if v not in (None, "") else None
        except (TypeError, ValueError):
            return None

    if model.value_quantity is not None:
        qty = {"value": float(model.value_quantity), "system": _UCUM_SYSTEM}
        if model.value_quantity_unit:
            qty["unit"] = model.value_quantity_unit
            qty["code"] = model.value_quantity_unit
        fhir["valueQuantity"] = qty
    elif model.value_string:
        fhir["valueString"] = model.value_string
    elif model.value_boolean is not None:
        fhir["valueBoolean"] = model.value_boolean
    elif model.value_integer not in (None, ""):
        fhir["valueInteger"] = model.value_integer
    elif model.value_datetime:
        fhir["valueDateTime"] = format_fhir_datetime(model.value_datetime)
    elif model.value_range_low not in (None, "") or model.value_range_high not in (None, ""):
        range_entry: dict = {}
        low = _try_float(model.value_range_low)
        high = _try_float(model.value_range_high)
        if low is not None:
            range_entry["low"] = {"value": low}
        if high is not None:
            range_entry["high"] = {"value": high}
        if range_entry:
            fhir["valueRange"] = range_entry
    elif model.value_codeableconcept:
        fhir["valueCodeableConcept"] = {"text": model.value_codeableconcept}
    if model.interpretation:
        fhir["interpretation"] = [{"text": model.interpretation}]
    if model.note:
        fhir["note"] = [{"text": model.note}]
    rr_low = _try_float(model.reference_range_low)
    rr_high = _try_float(model.reference_range_high)
    if rr_low is not None or rr_high is not None or model.reference_range_text:
        rr: dict = {}
        if rr_low is not None:
            rr["low"] = {"value": rr_low}
        if rr_high is not None:
            rr["high"] = {"value": rr_high}
        if model.reference_range_text:
            rr["text"] = model.reference_range_text
        fhir["referenceRange"] = [rr]
    return {k: v for k, v in fhir.items() if v is not None}


def observations_to_bundle(queryset):
    """Wrap an Observation queryset as a FHIR collection Bundle."""
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [{"resource": observation_to_fhir(o)} for o in queryset],
    }


def import_observation_from_fhir(fhir_data, patient):
    """Parse a FHIR Observation payload and upsert into the local Observation model."""
    from monitoring.models import Observation
    code_block = fhir_data.get("code") or {}
    codings = code_block.get("coding", [{}])
    code = codings[0].get("code") if codings else code_block.get("text", "")
    ids = fhir_data.get("identifier", [])
    identifier = ids[0].get("value") if ids else f"import-{uuid.uuid4()}"
    category_raw = (fhir_data.get("category") or [{}])[0]
    category_code = ((category_raw.get("coding") or [{}])[0].get("code"))
    fields = {k: v for k, v in {
        "subject_id": patient.id,
        "status": fhir_data.get("status", "final"),
        "code": code,
        "category": category_code,
        "value_string": fhir_data.get("valueString"),
        "value_boolean": fhir_data.get("valueBoolean"),
        "value_integer": fhir_data.get("valueInteger"),
        "value_quantity": (fhir_data.get("valueQuantity") or {}).get("value"),
        "note": ((fhir_data.get("note") or [{}])[0].get("text")),
    }.items() if v is not None}
    obj, _ = Observation.objects.update_or_create(identifier=identifier, defaults=fields)
    return obj


def push_observation(target_id, observation_model, idempotency_key=None):
    """Push a single Observation resource to another provider via the WAH4PC gateway."""
    api_key = os.getenv("WAH4PC_API_KEY")
    provider_id = os.getenv("WAH4PC_PROVIDER_ID")
    if not idempotency_key:
        idempotency_key = str(uuid.uuid4())
    last_retryable_result = None
    for attempt in range(_MAX_ATTEMPTS):
        if attempt > 0:
            time.sleep(_BACKOFF_SECONDS[min(attempt - 1, len(_BACKOFF_SECONDS) - 1)])
        try:
            response = requests.post(
                f"{URL}/api/v1/fhir/push/Observation",
                headers={
                    "X-API-Key":       api_key,
                    "X-Provider-ID":   provider_id,
                    "Idempotency-Key": idempotency_key,
                },
                json={
                    "senderId":     provider_id,
                    "targetId":     target_id,
                    "resourceType": "Observation",
                    "resource": {
                        "resourceType": "Bundle",
                        "type":         "collection",
                        "entry":        [{"resource": observation_to_fhir(observation_model)}],
                    },
                },
                timeout=30,
            )
            if response.status_code in _RETRY_STATUSES:
                last_retryable_result = {
                    "error": (
                        "Request already in progress — retrying"
                        if response.status_code == 409
                        else "Rate limit exceeded — retrying"
                    ),
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
                continue
            if response.status_code >= 400:
                return {
                    "error": response.json().get("error", "Unknown error") if response.text else "Unknown error",
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
            result = response.json()
            result["idempotency_key"] = idempotency_key
            return result
        except requests.RequestException as e:
            return {"error": f"Network error: {str(e)}", "status_code": 500, "idempotency_key": idempotency_key}
    return last_retryable_result


# =============================================================================
# MEDICATION REQUEST — FHIR R4 / PHCore
# =============================================================================

_MEDICATION_SYSTEM = "http://www.nlm.nih.gov/research/umls/rxnorm"


def medicationrequest_to_fhir(model):
    """Convert a local MedicationRequest instance to a PH Core FHIR MedicationRequest resource."""
    patient_fhir_id, patient_display = _patient_ref(model.subject_id)
    pk = getattr(model, "medication_request_id", None) or getattr(model, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"medicationrequest:{pk}"))
        if pk is not None else str(uuid.uuid4())
    )
    med_system = model.medication_system or _MEDICATION_SYSTEM
    fhir: dict = {
        "resourceType": "MedicationRequest",
        "id": resource_id,
        "meta": {
            "profile": [f"{_URN_EXT}/ph-core-medicationrequest"],
            "lastUpdated": _meta_last_updated(model.updated_at),
        },
        "subject": {
            "display": patient_display,
            "reference": f"Patient/{patient_fhir_id}",
        },
    }
    if model.identifier:
        fhir["identifier"] = [{"value": model.identifier}]
    if model.status:
        fhir["status"] = model.status
    if model.intent:
        fhir["intent"] = model.intent
    if model.category:
        fhir["category"] = [{"text": model.category}]
    if model.priority:
        fhir["priority"] = model.priority
    if model.medication_reference:
        fhir["medicationReference"] = {"reference": model.medication_reference}
    elif model.medication_code or model.medication_display:
        coding_entry: dict = {"system": med_system}
        if model.medication_code:
            coding_entry["code"] = model.medication_code
        if model.medication_display:
            coding_entry["display"] = model.medication_display
        fhir["medicationCodeableConcept"] = {
            "text": model.medication_display or model.medication_code or "",
            "coding": [coding_entry],
        }
    if model.encounter_id:
        fhir["encounter"] = {"reference": f"Encounter/{model.encounter_id}"}
    if model.authored_on:
        fhir["authoredOn"] = str(model.authored_on)
    if model.requester_id:
        requester = _practitioner_ref(model.requester_id)
        if requester:
            fhir["requester"] = requester
    if model.reason_code:
        fhir["reasonCode"] = [{"text": model.reason_code}]
    if model.note:
        fhir["note"] = [{"text": model.note}]
    dispense: dict = {}
    if model.dispense_quantity is not None:
        dispense["quantity"] = {"value": float(model.dispense_quantity)}
    if model.dispense_repeats_allowed is not None:
        dispense["numberOfRepeatsAllowed"] = model.dispense_repeats_allowed
    if model.dispense_validity_period_start or model.dispense_validity_period_end:
        dispense["validityPeriod"] = {k: v for k, v in {
            "start": str(model.dispense_validity_period_start) if model.dispense_validity_period_start else None,
            "end":   str(model.dispense_validity_period_end)   if model.dispense_validity_period_end   else None,
        }.items() if v is not None}
    if dispense:
        fhir["dispenseRequest"] = dispense
    return {k: v for k, v in fhir.items() if v is not None}


def medicationrequests_to_bundle(queryset):
    """Wrap a MedicationRequest queryset as a FHIR collection Bundle."""
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [{"resource": medicationrequest_to_fhir(mr)} for mr in queryset],
    }


def import_medicationrequest_from_fhir(fhir_data, patient):
    """Parse a FHIR MedicationRequest payload and upsert into the local MedicationRequest model."""
    from pharmacy.models import MedicationRequest
    ids = fhir_data.get("identifier", [])
    identifier = ids[0].get("value") if ids else f"import-{uuid.uuid4()}"
    med_cc = fhir_data.get("medicationCodeableConcept") or {}
    med_codings = med_cc.get("coding", [{}])
    fields = {k: v for k, v in {
        "subject_id": patient.id,
        "status": fhir_data.get("status", "active"),
        "intent": fhir_data.get("intent", "order"),
        "medication_code": med_codings[0].get("code") if med_codings else None,
        "medication_display": med_cc.get("text"),
        "medication_system": med_codings[0].get("system") if med_codings else None,
        "category": ((fhir_data.get("category") or [{}])[0].get("text")),
        "priority": fhir_data.get("priority"),
        "reason_code": ((fhir_data.get("reasonCode") or [{}])[0].get("text")),
        "note": ((fhir_data.get("note") or [{}])[0].get("text")),
    }.items() if v is not None}
    obj, _ = MedicationRequest.objects.update_or_create(identifier=identifier, defaults=fields)
    return obj


def push_medicationrequest(target_id, mr_model, idempotency_key=None):
    """Push a single MedicationRequest resource to another provider via the WAH4PC gateway."""
    api_key = os.getenv("WAH4PC_API_KEY")
    provider_id = os.getenv("WAH4PC_PROVIDER_ID")
    if not idempotency_key:
        idempotency_key = str(uuid.uuid4())
    last_retryable_result = None
    for attempt in range(_MAX_ATTEMPTS):
        if attempt > 0:
            time.sleep(_BACKOFF_SECONDS[min(attempt - 1, len(_BACKOFF_SECONDS) - 1)])
        try:
            response = requests.post(
                f"{URL}/api/v1/fhir/push/MedicationRequest",
                headers={
                    "X-API-Key":       api_key,
                    "X-Provider-ID":   provider_id,
                    "Idempotency-Key": idempotency_key,
                },
                json={
                    "senderId":     provider_id,
                    "targetId":     target_id,
                    "resourceType": "MedicationRequest",
                    "resource": {
                        "resourceType": "Bundle",
                        "type":         "collection",
                        "entry":        [{"resource": medicationrequest_to_fhir(mr_model)}],
                    },
                },
                timeout=30,
            )
            if response.status_code in _RETRY_STATUSES:
                last_retryable_result = {
                    "error": (
                        "Request already in progress — retrying"
                        if response.status_code == 409
                        else "Rate limit exceeded — retrying"
                    ),
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
                continue
            if response.status_code >= 400:
                return {
                    "error": response.json().get("error", "Unknown error") if response.text else "Unknown error",
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
            result = response.json()
            result["idempotency_key"] = idempotency_key
            return result
        except requests.RequestException as e:
            return {"error": f"Network error: {str(e)}", "status_code": 500, "idempotency_key": idempotency_key}
    return last_retryable_result


# =============================================================================
# DIAGNOSTIC REPORT — FHIR R4 / PHCore
# =============================================================================

def diagnosticreport_to_fhir(model):
    """Convert a local DiagnosticReport instance to a PH Core FHIR DiagnosticReport resource."""
    patient_fhir_id, patient_display = _patient_ref(model.subject_id)
    pk = getattr(model, "diagnostic_report_id", None) or getattr(model, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"diagnosticreport:{pk}"))
        if pk is not None else str(uuid.uuid4())
    )
    fhir: dict = {
        "resourceType": "DiagnosticReport",
        "id": resource_id,
        "meta": {
            "profile": [f"{_URN_EXT}/ph-core-diagnosticreport"],
            "lastUpdated": _meta_last_updated(model.updated_at),
        },
        "subject": {
            "display": patient_display,
            "reference": f"Patient/{patient_fhir_id}",
        },
    }
    if model.identifier:
        fhir["identifier"] = [{"value": model.identifier}]
    if model.status:
        fhir["status"] = model.status
    if model.category_code or model.category_display:
        fhir["category"] = [{
            "text": model.category_display or model.category_code,
            "coding": [{"system": _LOINC_SYSTEM, "code": model.category_code or ""}],
        }]
    if model.code_code or model.code_display:
        fhir["code"] = {
            "text": model.code_display or model.code_code,
            "coding": [{"system": _LOINC_SYSTEM, "code": model.code_code or ""}],
        }
    if model.encounter_id:
        fhir["encounter"] = {"reference": f"Encounter/{model.encounter_id}"}
    if model.effective_datetime:
        fhir["effectiveDateTime"] = format_fhir_datetime(model.effective_datetime)
    if model.issued_datetime:
        fhir["issued"] = format_fhir_datetime(model.issued_datetime)
    if model.performer_id:
        performer = _practitioner_ref(model.performer_id)
        if performer:
            fhir["performer"] = [performer]
    if model.conclusion:
        fhir["conclusion"] = model.conclusion
    if model.conclusion_code:
        fhir["conclusionCode"] = [{"text": model.conclusion_code}]
    # result_data is a JSONField that may hold raw Observation references
    result_data = model.result_data
    if result_data:
        if isinstance(result_data, list):
            fhir["result"] = [{"reference": str(r)} if isinstance(r, str) else r for r in result_data]
        elif isinstance(result_data, dict):
            fhir["result"] = [result_data]
    # Linked Observation PKs via DiagnosticReportResult join table (preferred when available)
    try:
        linked = model.results.all()
        if linked.exists():
            fhir["result"] = [
                {"reference": f"Observation/{str(uuid.uuid5(uuid.NAMESPACE_OID, f'observation:{lr.observation_id}'))}"}
                for lr in linked
            ]
    except Exception:
        pass
    return {k: v for k, v in fhir.items() if v is not None}


def diagnosticreports_to_bundle(queryset):
    """Wrap a DiagnosticReport queryset as a FHIR collection Bundle."""
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [{"resource": diagnosticreport_to_fhir(dr)} for dr in queryset],
    }


def import_diagnosticreport_from_fhir(fhir_data, patient):
    """Parse a FHIR DiagnosticReport payload and upsert into the local DiagnosticReport model."""
    from laboratory.models import DiagnosticReport
    ids = fhir_data.get("identifier", [])
    identifier = ids[0].get("value") if ids else f"import-{uuid.uuid4()}"
    code_block = fhir_data.get("code") or {}
    code_codings = code_block.get("coding", [{}])
    cat_block = (fhir_data.get("category") or [{}])[0]
    cat_codings = cat_block.get("coding", [{}])
    fields = {k: v for k, v in {
        "subject_id": patient.id,
        "status": fhir_data.get("status", "final"),
        "code_code": code_codings[0].get("code") if code_codings else None,
        "code_display": code_block.get("text"),
        "category_code": cat_codings[0].get("code") if cat_codings else None,
        "category_display": cat_block.get("text"),
        "conclusion": fhir_data.get("conclusion"),
        "conclusion_code": ((fhir_data.get("conclusionCode") or [{}])[0].get("text")),
    }.items() if v is not None}
    obj, _ = DiagnosticReport.objects.update_or_create(identifier=identifier, defaults=fields)
    return obj


def push_diagnosticreport(target_id, dr_model, idempotency_key=None):
    """Push a single DiagnosticReport resource to another provider via the WAH4PC gateway."""
    api_key = os.getenv("WAH4PC_API_KEY")
    provider_id = os.getenv("WAH4PC_PROVIDER_ID")
    if not idempotency_key:
        idempotency_key = str(uuid.uuid4())
    last_retryable_result = None
    for attempt in range(_MAX_ATTEMPTS):
        if attempt > 0:
            time.sleep(_BACKOFF_SECONDS[min(attempt - 1, len(_BACKOFF_SECONDS) - 1)])
        try:
            response = requests.post(
                f"{URL}/api/v1/fhir/push/DiagnosticReport",
                headers={
                    "X-API-Key":       api_key,
                    "X-Provider-ID":   provider_id,
                    "Idempotency-Key": idempotency_key,
                },
                json={
                    "senderId":     provider_id,
                    "targetId":     target_id,
                    "resourceType": "DiagnosticReport",
                    "resource": {
                        "resourceType": "Bundle",
                        "type":         "collection",
                        "entry":        [{"resource": diagnosticreport_to_fhir(dr_model)}],
                    },
                },
                timeout=30,
            )
            if response.status_code in _RETRY_STATUSES:
                last_retryable_result = {
                    "error": (
                        "Request already in progress — retrying"
                        if response.status_code == 409
                        else "Rate limit exceeded — retrying"
                    ),
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
                continue
            if response.status_code >= 400:
                return {
                    "error": response.json().get("error", "Unknown error") if response.text else "Unknown error",
                    "status_code": response.status_code,
                    "idempotency_key": idempotency_key,
                }
            result = response.json()
            result["idempotency_key"] = idempotency_key
            return result
        except requests.RequestException as e:
            return {"error": f"Network error: {str(e)}", "status_code": 500, "idempotency_key": idempotency_key}
    return last_retryable_result


# =============================================================================
# ORGANIZATION — FHIR R4 / PHCore R4
# =============================================================================
# PHCore profile: urn://example.com/ph-core/fhir/StructureDefinition/ph-core-organization
# NHFR identifier system: https://nhfr.doh.gov.ph/facility
# Facility-type CodeSystem: urn://example.com/ph-core/fhir/CodeSystem/facility-type
# =============================================================================

_NHFR_SYSTEM      = "https://nhfr.doh.gov.ph/facility"
_ORG_ID_SYSTEM    = f"{_URN_EXT}/organization-id"
_FACILITY_TYPE_CS = f"{_URN_CS}/facility-type"
_ORG_TYPE_HL7     = "http://terminology.hl7.org/CodeSystem/organization-type"
_CONTACT_TYPE_CS  = "http://terminology.hl7.org/CodeSystem/contactentity-type"


def organization_to_fhir(org) -> dict:
    """Convert a local Organization instance to a PHCore R4-compliant FHIR resource."""
    pk = getattr(org, "organization_id", None) or getattr(org, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"organization:{pk}"))
        if pk is not None else str(uuid.uuid4())
    )

    fhir: dict = {
        "resourceType": "Organization",
        "id": resource_id,
        "meta": {
            "profile":     [f"{_URN_EXT}/ph-core-organization"],
            "lastUpdated": _meta_last_updated(getattr(org, "updated_at", None)),
        },
        "active": org.active if org.active is not None else True,
    }

    # 1. Identifiers — NHFR (official) + internal fallback
    identifiers = []
    if org.nhfr_code:
        identifiers.append({
            "use":  "official",
            "type": {
                "coding": [{
                    "system":  "http://terminology.hl7.org/CodeSystem/v2-0203",
                    "code":    "FI",
                    "display": "Facility ID",
                }]
            },
            "system": _NHFR_SYSTEM,
            "value":  org.nhfr_code,
        })
    if pk is not None:
        identifiers.append({
            "use":    "secondary",
            "system": _ORG_ID_SYSTEM,
            "value":  str(pk),
        })
    if identifiers:
        fhir["identifier"] = identifiers

    # 2. Name + alias
    if org.name:
        fhir["name"] = org.name
    if org.alias:
        fhir["alias"] = [org.alias]

    # 3. Type — PHCore facility-type + HL7 fallback
    if org.type_code:
        hl7_code = "prov" if org.type_code in ("hospital", "clinic", "health-center") else org.type_code
        fhir["type"] = [{
            "coding": [
                {
                    "system":  _FACILITY_TYPE_CS,
                    "code":    org.type_code,
                    "display": org.type_code.replace("-", " ").title(),
                },
                {
                    "system":  _ORG_TYPE_HL7,
                    "code":    hl7_code,
                    "display": org.type_code.replace("-", " ").title(),
                },
            ],
            "text": org.type_code.replace("-", " ").title(),
        }]

    # 4. Telecom
    if org.telecom:
        fhir["telecom"] = [{"system": "phone", "value": org.telecom, "use": "work"}]

    # 5. Address with PSGC extensions
    if org.address_line or org.address_city:
        city_display = (
            _PSGC_CITY.get(org.address_city, org.address_city)
            if org.address_city else None
        )
        addr_extensions = []
        if org.address_state:
            region_code = _PSGC_REGION_CODE.get(org.address_state)
            if region_code:
                addr_extensions.append({
                    "url": f"{_URN_EXT}/region",
                    "valueCoding": {
                        "system":  f"{_URN_CS}/PSGC",
                        "code":    region_code,
                        "display": _PSGC_REGION.get(org.address_state, org.address_state),
                    },
                })
        if org.address_city:
            city_9 = _PSGC_CITY_9.get(org.address_city)
            if city_9:
                addr_extensions.append({
                    "url": f"{_URN_EXT}/city-municipality",
                    "valueCoding": {
                        "system":  f"{_URN_CS}/PSGC",
                        "code":    city_9,
                        "display": city_display or org.address_city,
                    },
                })
        addr = _clean({
            "use":        "work",
            "type":       "physical",
            "line":       [org.address_line] if org.address_line else [],
            "city":       city_display or org.address_city,
            "district":   org.address_district,
            "state":      org.address_state,
            "country":    org.address_country or "PH",
            "postalCode": org.address_postal_code,
        })
        if "line" not in addr:
            addr["line"] = []
        if addr_extensions:
            addr["extension"] = addr_extensions
        fhir["address"] = [addr]

    # 6. Contact person (full FHIR Organization.contact[])
    contact_first = getattr(org, "contact_first_name", None)
    contact_last  = getattr(org, "contact_last_name", None)
    contact_tel   = getattr(org, "contact_telecom", None)
    if contact_first or contact_last or contact_tel:
        contact: dict = {}
        if getattr(org, "contact_purpose", None):
            contact["purpose"] = {
                "coding": [{
                    "system":  _CONTACT_TYPE_CS,
                    "code":    org.contact_purpose,
                    "display": org.contact_purpose,
                }]
            }
        name_obj: dict = {}
        if contact_last:
            name_obj["family"] = contact_last
        if contact_first:
            name_obj["given"] = contact_first.split()
        if name_obj:
            contact["name"] = name_obj
        if contact_tel:
            contact["telecom"] = [{"system": "phone", "value": contact_tel, "use": "work"}]
        c_addr = _clean({
            "line":       [org.contact_address_line] if getattr(org, "contact_address_line", None) else None,
            "city":       getattr(org, "contact_address_city", None),
            "state":      getattr(org, "contact_address_state", None),
            "country":    getattr(org, "contact_address_country", None),
            "postalCode": getattr(org, "contact_postal_code", None),
        })
        if c_addr:
            contact["address"] = c_addr
        fhir["contact"] = [contact]

    # 7. partOf — parent organization reference
    parent_id = getattr(org, "part_of_organization_id", None)
    if parent_id:
        fhir["partOf"] = {
            "reference": f"Organization/{str(uuid.uuid5(uuid.NAMESPACE_OID, f'organization:{parent_id}'))}"
        }

    # 8. Endpoint reference
    endpoint_id = getattr(org, "endpoint_id", None)
    if endpoint_id:
        fhir["endpoint"] = [{"reference": f"Endpoint/{endpoint_id}"}]

    # 9. PHCore extensions — logo, description
    extensions = []
    if getattr(org, "logo_url", None):
        extensions.append({
            "url":      f"{_URN_EXT}/organization-logo",
            "valueUrl": org.logo_url,
        })
    if getattr(org, "description", None):
        extensions.append({
            "url":         f"{_URN_EXT}/organization-description",
            "valueString": org.description,
        })
    if extensions:
        fhir["extension"] = extensions

    return {k: v for k, v in fhir.items() if v is not None and v != ""}


def import_organization_from_fhir(fhir_data: dict):
    """Parse a PHCore R4 Organization resource and upsert into the local Organization model.

    Keyed on NHFR identifier (system: https://nhfr.doh.gov.ph/facility).
    Raises ValueError when NHFR identifier is absent.
    """
    from accounts.models import Organization

    nhfr_code = None
    for ident in fhir_data.get("identifier", []):
        if ident.get("system") == _NHFR_SYSTEM:
            nhfr_code = ident.get("value")
            break
    if not nhfr_code:
        raise ValueError("Cannot import Organization without an NHFR identifier.")

    type_code = None
    for t in fhir_data.get("type", []):
        for coding in t.get("coding", []):
            if coding.get("system") == _FACILITY_TYPE_CS:
                type_code = coding.get("code")
                break
        if not type_code:
            type_code = ((t.get("coding") or [{}])[0]).get("code")

    addr       = (fhir_data.get("address") or [{}])[0]
    addr_lines = addr.get("line") or []
    contact_r  = (fhir_data.get("contact") or [{}])[0]
    c_purpose  = ((contact_r.get("purpose") or {}).get("coding") or [{}])[0].get("code")
    c_name     = contact_r.get("name") or {}
    c_addr     = contact_r.get("address") or {}

    fields = {k: v for k, v in {
        "name":                    fhir_data.get("name"),
        "alias":                   (fhir_data.get("alias") or [None])[0],
        "type_code":               type_code,
        "active":                  fhir_data.get("active", True),
        "telecom":                 ((fhir_data.get("telecom") or [{}])[0]).get("value"),
        "address_line":            addr_lines[0] if addr_lines else None,
        "address_city":            addr.get("city"),
        "address_district":        addr.get("district"),
        "address_state":           addr.get("state"),
        "address_country":         addr.get("country"),
        "address_postal_code":     addr.get("postalCode"),
        "contact_purpose":         c_purpose,
        "contact_first_name":      " ".join(c_name.get("given") or []) or None,
        "contact_last_name":       c_name.get("family"),
        "contact_telecom":         ((contact_r.get("telecom") or [{}])[0]).get("value"),
        "contact_address_line":    (c_addr.get("line") or [None])[0],
        "contact_address_city":    c_addr.get("city"),
        "contact_address_state":   c_addr.get("state"),
        "contact_address_country": c_addr.get("country"),
        "contact_postal_code":     c_addr.get("postalCode"),
    }.items() if v is not None}

    org, _ = Organization.objects.update_or_create(nhfr_code=nhfr_code, defaults=fields)
    return org


# =============================================================================
# COVERAGE — FHIR R4 / PHCore (PhilHealth membership)
# =============================================================================

_PHILHEALTH_MEMBER_SYSTEM = "http://philhealth.gov.ph/fhir/Identifier/philhealth-id"
_PHIC_PAYOR_SYSTEM        = "https://philhealth.gov.ph"
_COVERAGE_TYPE_CS         = "http://terminology.hl7.org/CodeSystem/v3-ActCode"
_SUBSCRIBER_REL_CS        = "http://terminology.hl7.org/CodeSystem/subscriber-relationship"


def coverage_to_fhir(model) -> dict:
    """Convert a local Coverage instance to a FHIR R4 Coverage resource."""
    pk = getattr(model, "coverage_id", None) or getattr(model, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"coverage:{pk}"))
        if pk is not None else str(uuid.uuid4())
    )

    fhir: dict = {
        "resourceType": "Coverage",
        "id": resource_id,
        "meta": {
            "profile":     [f"{_URN_EXT}/ph-core-coverage"],
            "lastUpdated": _meta_last_updated(getattr(model, "updated_at", None)),
        },
        "status": model.status or "active",
    }

    if model.identifier:
        fhir["identifier"] = [{"value": model.identifier}]

    # Type — e.g. PUBLICPOL for PhilHealth
    if model.type_code:
        fhir["type"] = {
            "coding": [{
                "system":  _COVERAGE_TYPE_CS,
                "code":    model.type_code,
                "display": model.type_display or model.type_code,
            }]
        }

    # Subscriber (PhilHealth member)
    if model.subscriber_id:
        patient_fhir_id, patient_display = _patient_ref(model.subscriber_id)
        fhir["subscriber"] = {
            "display":   patient_display,
            "reference": f"Patient/{patient_fhir_id}",
        }

    # Subscriber PIN (PhilHealth member ID)
    if model.subscriber_pin:
        fhir["subscriberId"] = model.subscriber_pin

    # Beneficiary (always required)
    patient_fhir_id, patient_display = _patient_ref(model.beneficiary_id)
    fhir["beneficiary"] = {
        "display":   patient_display,
        "reference": f"Patient/{patient_fhir_id}",
    }

    if model.dependent:
        fhir["dependent"] = model.dependent

    if model.relationship_code:
        fhir["relationship"] = {
            "coding": [{
                "system":  _SUBSCRIBER_REL_CS,
                "code":    model.relationship_code,
                "display": model.relationship_display or model.relationship_code,
            }]
        }

    period = {}
    if model.period_start:
        period["start"] = str(model.period_start)
    if model.period_end:
        period["end"] = str(model.period_end)
    if period:
        fhir["period"] = period

    # Payor — PhilHealth as Organization
    if model.payor_id:
        payor_fhir_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"organization:{model.payor_id}"))
        fhir["payor"] = [{"reference": f"Organization/{payor_fhir_id}"}]
    else:
        # Default to PhilHealth as the payor when no local record exists
        fhir["payor"] = [{"display": "Philippine Health Insurance Corporation (PhilHealth)"}]

    # Class (membership category)
    if model.class_code or model.class_name:
        fhir["class"] = [{
            "type": {
                "coding": [{"system": "http://terminology.hl7.org/CodeSystem/coverage-class", "code": "group"}]
            },
            "value": model.class_code or "",
            "name":  model.class_name or "",
        }]

    if model.order:
        fhir["order"] = model.order

    if model.network:
        fhir["network"] = model.network

    return {k: v for k, v in fhir.items() if v is not None}


# =============================================================================
# CLAIM — FHIR R4 / PHCore (PhilHealth eClaims)
# =============================================================================

_CLAIM_TYPE_CS      = "http://terminology.hl7.org/CodeSystem/claim-type"
_CLAIM_USE_CS       = "http://hl7.org/fhir/claim-use"
_PROCESS_PRIORITY_CS = "http://terminology.hl7.org/CodeSystem/processpriority"
_SNOMED_PROC_CS     = "http://snomed.info/sct"


def claim_to_fhir(model) -> dict:
    """Convert a local Claim instance to a FHIR R4 Claim resource.

    Reads related ClaimDiagnosis, ClaimProcedure, ClaimItem, ClaimCareTeam rows
    via the normalized child tables.
    """
    pk = getattr(model, "claim_id", None) or getattr(model, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"claim:{pk}"))
        if pk is not None else str(uuid.uuid4())
    )
    patient_fhir_id, patient_display = _patient_ref(model.subject_id)

    fhir: dict = {
        "resourceType": "Claim",
        "id": resource_id,
        "meta": {
            "profile":     [f"{_URN_EXT}/ph-core-claim"],
            "lastUpdated": _meta_last_updated(getattr(model, "updated_at", None)),
        },
        "status": model.status or "active",
        "use":    model.use or "claim",
        "patient": {
            "display":   patient_display,
            "reference": f"Patient/{patient_fhir_id}",
        },
        "created": format_fhir_datetime(model.created) if model.created else format_fhir_datetime(model.created_at),
    }

    if model.identifier:
        fhir["identifier"] = [{"value": model.identifier}]

    if model.type:
        fhir["type"] = {
            "coding": [{"system": _CLAIM_TYPE_CS, "code": model.type}]
        }

    if model.priority:
        fhir["priority"] = {
            "coding": [{"system": _PROCESS_PRIORITY_CS, "code": model.priority}]
        }

    # Insurer (PhilHealth)
    if model.insurer_id:
        insurer_fhir_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"organization:{model.insurer_id}"))
        fhir["insurer"] = {"reference": f"Organization/{insurer_fhir_id}"}
    else:
        fhir["insurer"] = {"display": "Philippine Health Insurance Corporation (PhilHealth)"}

    # Provider (the submitting hospital/practitioner)
    if model.provider_id:
        provider = _practitioner_ref(model.provider_id)
        if provider:
            fhir["provider"] = provider
        else:
            org_fhir_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"organization:{model.provider_id}"))
            fhir["provider"] = {"reference": f"Organization/{org_fhir_id}"}

    # Billable period
    bp = {}
    if model.billablePeriod_start:
        bp["start"] = str(model.billablePeriod_start)
    if model.billablePeriod_end:
        bp["end"] = str(model.billablePeriod_end)
    if bp:
        fhir["billablePeriod"] = bp

    # Facility
    if model.facility_id:
        try:
            from accounts.models import Location
            loc = Location.objects.get(location_id=model.facility_id)
            fhir["facility"] = {"display": loc.name}
        except Exception:
            pass

    # Diagnoses
    try:
        diagnoses = list(model.diagnoses.all())
        if diagnoses:
            fhir["diagnosis"] = []
            for i, d in enumerate(diagnoses, 1):
                entry: dict = {"sequence": i}
                if d.diagnosisCodeableConcept:
                    entry["diagnosisCodeableConcept"] = {
                        "coding": [{"system": _ICD10_SYSTEM, "code": d.diagnosisCodeableConcept}]
                    }
                if d.type:
                    entry["type"] = [{"coding": [{"code": d.type}]}]
                if d.onAdmission:
                    entry["onAdmission"] = {"coding": [{"code": d.onAdmission}]}
                fhir["diagnosis"].append(entry)
    except Exception:
        pass

    # Procedures
    try:
        procedures = list(model.procedures.all())
        if procedures:
            fhir["procedure"] = []
            for i, p in enumerate(procedures, 1):
                entry = {"sequence": i}
                if p.procedureCodeableConcept:
                    entry["procedureCodeableConcept"] = {
                        "coding": [{"system": _SNOMED_PROC_CS, "code": p.procedureCodeableConcept}]
                    }
                fhir["procedure"].append(entry)
    except Exception:
        pass

    # Care team
    try:
        care_team = list(model.care_team.all())
        if care_team:
            fhir["careTeam"] = []
            for i, ct in enumerate(care_team, 1):
                member: dict = {"sequence": i}
                if ct.provider_id:
                    provider_ref = _practitioner_ref(ct.provider_id)
                    if provider_ref:
                        member["provider"] = provider_ref
                if ct.role:
                    member["role"] = {"coding": [{"code": ct.role}]}
                fhir["careTeam"].append(member)
    except Exception:
        pass

    # Items (line items)
    try:
        items = list(model.items.all())
        if items:
            fhir["item"] = []
            for i, it in enumerate(items, 1):
                item_entry: dict = {"sequence": i}
                if it.productOrService:
                    item_entry["productOrService"] = {"text": it.productOrService}
                if it.unitPrice is not None:
                    item_entry["unitPrice"] = {
                        "value":    float(it.unitPrice),
                        "currency": "PHP",
                    }
                if it.quantity is not None:
                    item_entry["quantity"] = {"value": float(it.quantity)}
                if it.servicedDate:
                    item_entry["servicedDate"] = str(it.servicedDate)
                fhir["item"].append(item_entry)
    except Exception:
        pass

    # Total
    if model.total is not None:
        currency = model.total_currency or "PHP"
        fhir["total"] = {"value": float(model.total), "currency": currency}

    return {k: v for k, v in fhir.items() if v is not None}


def claimresponse_to_fhir(model) -> dict:
    """Convert a local ClaimResponse instance to a FHIR R4 ClaimResponse resource."""
    pk = getattr(model, "claimResponse_id", None) or getattr(model, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"claimresponse:{pk}"))
        if pk is not None else str(uuid.uuid4())
    )
    patient_fhir_id, patient_display = _patient_ref(model.subject_id)

    fhir: dict = {
        "resourceType": "ClaimResponse",
        "id": resource_id,
        "meta": {
            "profile":     [f"{_URN_EXT}/ph-core-claimresponse"],
            "lastUpdated": _meta_last_updated(getattr(model, "updated_at", None)),
        },
        "status":  model.status or "active",
        "use":     model.use or "claim",
        "patient": {
            "display":   patient_display,
            "reference": f"Patient/{patient_fhir_id}",
        },
        "created": format_fhir_datetime(model.created) if model.created else format_fhir_datetime(model.created_at),
        "outcome": model.outcome or "complete",
    }

    if model.identifier:
        fhir["identifier"] = [{"value": model.identifier}]

    if model.type:
        fhir["type"] = {"coding": [{"system": _CLAIM_TYPE_CS, "code": model.type}]}

    # Insurer
    if model.insurer_id:
        insurer_fhir_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"organization:{model.insurer_id}"))
        fhir["insurer"] = {"reference": f"Organization/{insurer_fhir_id}"}
    else:
        fhir["insurer"] = {"display": "Philippine Health Insurance Corporation (PhilHealth)"}

    # Linked request claim
    if model.request_id:
        claim_fhir_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"claim:{model.request_id}"))
        fhir["request"] = {"reference": f"Claim/{claim_fhir_id}"}

    if model.disposition:
        fhir["disposition"] = model.disposition

    if model.preAuthRef:
        fhir["preAuthRef"] = model.preAuthRef

    period = {}
    if model.preAuthPeriod_start:
        period["start"] = str(model.preAuthPeriod_start)
    if model.preAuthPeriod_end:
        period["end"] = str(model.preAuthPeriod_end)
    if period:
        fhir["preAuthPeriod"] = period

    # Payment
    if model.payment_type or model.payment_date:
        payment: dict = {}
        if model.payment_type:
            payment["type"] = {"coding": [{"code": model.payment_type}]}
        if model.payment_date:
            payment["date"] = format_fhir_datetime(model.payment_date)
        fhir["payment"] = payment

    # Totals
    try:
        totals = list(model.totals.all())
        if totals:
            fhir["total"] = [
                {
                    "category": {"coding": [{"code": t.category}]},
                    "amount":   {"value": float(t.amount), "currency": "PHP"},
                }
                for t in totals if t.amount is not None
            ]
    except Exception:
        pass

    return {k: v for k, v in fhir.items() if v is not None}


# =============================================================================
# APPOINTMENT / SCHEDULE / SLOT — FHIR R4
# =============================================================================

_APPOINTMENT_STATUS_CS = "http://hl7.org/fhir/appointmentstatus"
_PARTICIPATION_STATUS_CS = "http://hl7.org/fhir/participationstatus"
_PARTICIPANT_TYPE_CS   = "http://terminology.hl7.org/CodeSystem/v3-ParticipationType"
_ACT_CODE_CS           = "http://terminology.hl7.org/CodeSystem/v3-ActCode"
_SERVICE_TYPE_CS       = f"{_URN_CS}/service-type"
_SPECIALTY_CS          = "http://snomed.info/sct"


def schedule_to_fhir(model) -> dict:
    """Convert a local Schedule instance to a FHIR R4 Schedule resource."""
    pk = getattr(model, "schedule_id", None) or getattr(model, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"schedule:{pk}"))
        if pk is not None else str(uuid.uuid4())
    )

    fhir: dict = {
        "resourceType": "Schedule",
        "id": resource_id,
        "meta": {
            "profile":     [f"{_URN_EXT}/ph-core-schedule"],
            "lastUpdated": _meta_last_updated(getattr(model, "updated_at", None)),
        },
        "active": model.status == "active",
    }

    if model.identifier:
        fhir["identifier"] = [{"value": model.identifier}]

    if model.service_type_code or model.service_type_display:
        fhir["serviceType"] = [{
            "coding": [{
                "system":  _SERVICE_TYPE_CS,
                "code":    model.service_type_code or "",
                "display": model.service_type_display or model.service_type_code or "",
            }]
        }]

    if model.specialty_code or model.specialty_display:
        fhir["specialty"] = [{
            "coding": [{
                "system":  _SPECIALTY_CS,
                "code":    model.specialty_code or "",
                "display": model.specialty_display or model.specialty_code or "",
            }]
        }]

    # Actor list — practitioner, location, or organization
    actors = []
    if model.actor_practitioner_id:
        ref = _practitioner_ref(model.actor_practitioner_id)
        if ref:
            actors.append(ref)
    if model.actor_location_id:
        try:
            from accounts.models import Location
            loc = Location.objects.get(location_id=model.actor_location_id)
            actors.append({"display": loc.name, "reference": f"Location/{loc.identifier}"})
        except Exception:
            pass
    if model.actor_organization_id:
        org_fhir_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"organization:{model.actor_organization_id}"))
        actors.append({"reference": f"Organization/{org_fhir_id}"})
    if actors:
        fhir["actor"] = actors

    horizon = {}
    if model.planning_horizon_start:
        horizon["start"] = format_fhir_datetime(model.planning_horizon_start)
    if model.planning_horizon_end:
        horizon["end"] = format_fhir_datetime(model.planning_horizon_end)
    if horizon:
        fhir["planningHorizon"] = horizon

    if model.comment:
        fhir["comment"] = model.comment

    return {k: v for k, v in fhir.items() if v is not None}


def slot_to_fhir(model) -> dict:
    """Convert a local Slot instance to a FHIR R4 Slot resource."""
    pk = getattr(model, "slot_id", None) or getattr(model, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"slot:{pk}"))
        if pk is not None else str(uuid.uuid4())
    )
    schedule_fhir_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"schedule:{model.schedule_id}"))

    fhir: dict = {
        "resourceType": "Slot",
        "id": resource_id,
        "meta": {
            "profile":     [f"{_URN_EXT}/ph-core-slot"],
            "lastUpdated": _meta_last_updated(getattr(model, "updated_at", None)),
        },
        "schedule":  {"reference": f"Schedule/{schedule_fhir_id}"},
        "status":    model.status,
        "start":     format_fhir_datetime(model.start),
        "end":       format_fhir_datetime(model.end),
    }

    if model.identifier:
        fhir["identifier"] = [{"value": model.identifier}]

    if model.service_type_code or model.service_type_display:
        fhir["serviceType"] = [{
            "coding": [{
                "system":  _SERVICE_TYPE_CS,
                "code":    model.service_type_code or "",
                "display": model.service_type_display or "",
            }]
        }]

    if model.specialty_code:
        fhir["specialty"] = [{
            "coding": [{"system": _SPECIALTY_CS, "code": model.specialty_code,
                        "display": model.specialty_display or model.specialty_code}]
        }]

    if model.appointment_type_code:
        fhir["appointmentType"] = {
            "coding": [{
                "system":  _ACT_CODE_CS,
                "code":    model.appointment_type_code,
                "display": model.appointment_type_display or model.appointment_type_code,
            }]
        }

    if model.overbooked:
        fhir["overbooked"] = model.overbooked

    if model.comment:
        fhir["comment"] = model.comment

    return {k: v for k, v in fhir.items() if v is not None}


def appointment_to_fhir(model) -> dict:
    """Convert a local Appointment instance to a FHIR R4 Appointment resource."""
    pk = getattr(model, "appointment_id", None) or getattr(model, "pk", None)
    resource_id = (
        str(uuid.uuid5(uuid.NAMESPACE_OID, f"appointment:{pk}"))
        if pk is not None else str(uuid.uuid4())
    )
    patient_fhir_id, patient_display = _patient_ref(model.patient_id)

    fhir: dict = {
        "resourceType": "Appointment",
        "id": resource_id,
        "meta": {
            "profile":     [f"{_URN_EXT}/ph-core-appointment"],
            "lastUpdated": _meta_last_updated(getattr(model, "updated_at", None)),
        },
        "status": model.status,
    }

    if model.identifier:
        fhir["identifier"] = [{"value": model.identifier}]

    if model.cancellation_reason_code:
        fhir["cancelationReason"] = {
            "coding": [{"code": model.cancellation_reason_code,
                        "display": model.cancellation_reason_display or model.cancellation_reason_code}]
        }

    if model.service_type_code or model.service_type_display:
        fhir["serviceType"] = [{
            "coding": [{
                "system":  _SERVICE_TYPE_CS,
                "code":    model.service_type_code or "",
                "display": model.service_type_display or "",
            }]
        }]

    if model.specialty_code:
        fhir["specialty"] = [{
            "coding": [{"system": _SPECIALTY_CS, "code": model.specialty_code,
                        "display": model.specialty_display or model.specialty_code}]
        }]

    if model.appointment_type_code:
        fhir["appointmentType"] = {
            "coding": [{
                "system":  _ACT_CODE_CS,
                "code":    model.appointment_type_code,
                "display": model.appointment_type_display or model.appointment_type_code,
            }]
        }

    if model.reason_code:
        fhir["reasonCode"] = [{"text": model.reason_code}]

    if model.priority is not None:
        fhir["priority"] = model.priority

    if model.description:
        fhir["description"] = model.description

    # Slot reference
    if model.slot_id:
        slot_fhir_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"slot:{model.slot_id}"))
        fhir["slot"] = [{"reference": f"Slot/{slot_fhir_id}"}]

    if model.created_datetime:
        fhir["created"] = format_fhir_datetime(model.created_datetime)

    if model.comment:
        fhir["comment"] = model.comment

    if model.patient_instruction:
        fhir["patientInstruction"] = model.patient_instruction

    if model.minutes_duration:
        fhir["minutesDuration"] = model.minutes_duration

    if model.start:
        fhir["start"] = format_fhir_datetime(model.start)
    if model.end:
        fhir["end"] = format_fhir_datetime(model.end)

    # Participants — patient (required) + optional practitioner + optional location
    participants = []

    patient_part: dict = {
        "actor": {
            "display":   patient_display,
            "reference": f"Patient/{patient_fhir_id}",
        },
        "required": "required",
        "status": model.patient_participation_status or "accepted",
    }
    participants.append(patient_part)

    if model.practitioner_id:
        pract_ref = _practitioner_ref(model.practitioner_id)
        if pract_ref:
            participants.append({
                "type": [{
                    "coding": [{
                        "system":  _PARTICIPANT_TYPE_CS,
                        "code":    "PPRF",
                        "display": "primary performer",
                    }]
                }],
                "actor":    pract_ref,
                "required": "required",
                "status":   model.practitioner_participation_status or "accepted",
            })

    if model.location_id:
        try:
            from accounts.models import Location
            loc = Location.objects.get(location_id=model.location_id)
            participants.append({
                "actor":    {"display": loc.name, "reference": f"Location/{loc.identifier or loc.location_id}"},
                "required": "required",
                "status":   "accepted",
            })
        except Exception:
            pass

    fhir["participant"] = participants

    # Resulting encounter
    if model.resulting_encounter_id:
        fhir["basedOn"] = [{"reference": f"Encounter/{model.resulting_encounter_id}"}]

    return {k: v for k, v in fhir.items() if v is not None}
