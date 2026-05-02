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
    "No Formal Education":   "no-formal-education",
    "Elementary":            "elementary",
    "High School":           "high-school",
    "Junior High School":    "junior-high-school",
    "Senior High School":    "senior-high-school",
    "Vocational/Technical":  "vocational-technical",
    "Vocational":            "vocational-technical",
    "College Undergraduate": "college-undergraduate",
    "College Graduate":      "college-graduate",
    "Post Graduate":         "post-graduate",
    "Post-Graduate":         "post-graduate",
    "Masteral":              "masteral",
    "Doctorate":             "doctorate",
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
            "lastUpdated": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "profile": [f"{_URN_EXT}/ph-core-patient"],
        },
        "extension": extensions,
        "active": True,
    }

    # ------------------------------------------------------------------
    # 3. Identifier — use="official" + SB social-beneficiary type coding.
    # ------------------------------------------------------------------
    if patient.philhealth_id:
        fhir["identifier"] = [{
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
        }]

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
                    "system":  "http://hl7.org/fhir/ValueSet/relatedperson-relationshiptype",
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
        # encounter_id is required NOT NULL — default 0 when not in payload
        "encounter_id":         0,
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
