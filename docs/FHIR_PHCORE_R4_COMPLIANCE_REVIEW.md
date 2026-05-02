# FHIR PHCore R4 Compliance Review
**System:** WAH4H (Work at Home for Hospitals) — WAH4H Backend  
**Review Date:** 2026-05-02  
**Reviewer:** Claude Code (Automated Static Analysis)  
**FHIR Version:** R4 (4.0.1)  
**Profile:** Philippine Core (PHCore) FHIR R4 Implementation Guide  

---

## Executive Summary

**Overall Verdict: PARTIALLY COMPLIANT**

The WAH4H system is functionally compliant for the four resources it actively exchanges via the WAH4PC inter-hospital gateway (Patient, Immunization, Encounter, Procedure). The remaining eight PHCore R4 resource types (Condition, AllergyIntolerance, Observation, MedicationRequest, DiagnosticReport, Organization, Practitioner, Location) are modeled in the database but have **no FHIR serialization** and cannot participate in inter-hospital data exchange.

---

## Scope

The primary FHIR integration code is concentrated in:

- `wah4h-backend/patients/wah4pc.py` — FHIR serializers, gateway client, webhook handlers (1,700+ lines)
- `wah4h-backend/patients/models.py` — Patient, Condition, AllergyIntolerance, Immunization
- `wah4h-backend/admission/models.py` — Encounter, Procedure
- `wah4h-backend/accounts/models.py` — Organization, Location, Practitioner, PractitionerRole
- `wah4h-backend/monitoring/models.py` — Observation
- `wah4h-backend/pharmacy/models.py` — Medication, MedicationRequest
- `wah4h-backend/laboratory/models.py` — DiagnosticReport, Specimen
- `wah4h-backend/billing/models.py` — Claim, Invoice

---

## Resource-by-Resource Assessment

### ✅ Patient — COMPLIANT (with caveats)

**Serializer:** `patient_to_fhir()` in `wah4pc.py`  
**Reverse parser:** `fhir_to_dict()` in `wah4pc.py`

#### Passing
| Requirement | Implementation | Status |
|---|---|---|
| PhilHealth identifier | `use="official"`, type SB, system `http://philhealth.gov.ph/fhir/Identifier/philhealth-id` | ✅ |
| PHCore religion extension | `_RELIGION_CODE` map (12 entries), emits `valueCodeableConcept` | ✅ |
| PHCore educational-attainment extension | `_EDUCATION_CODE` map (11 entries) | ✅ |
| PHCore occupation extension | `_OCCUPATION_CODE` map (10 entries, PSOC) | ✅ |
| PHCore indigenous-people extension | `valueBoolean`, always emitted | ✅ |
| PHCore race/nationality extension | Emitted as `valueCodeableConcept` | ✅ |
| PSGC address (region) | 9-digit PSA numeric codes via `_PSGC_REGION_CODE` | ✅ |
| PSGC address (city-municipality) | 10-digit → 9-digit conversion via `_PSGC_CITY_9` | ✅ |
| HL7 v3 MaritalStatus | Codes S/M/D/W/L/A via `_HL7_MARITAL_STATUS` | ✅ |
| `meta.profile` | `[_URN_EXT]/ph-core-patient` | ✅ |
| Deterministic resource IDs | UUID5 from `patient:{pk}` — stable across re-sends | ✅ |
| Emergency contact | Included with relationship coding | ✅ |
| Dual URL scheme tolerance | `_get_extension()` handles both `urn://` and `https://` variants | ✅ |

#### Gaps
| Issue | Severity | Location |
|---|---|---|
| **Identifier system URL mismatch**: `request_patient()` sends `"system": "http://philhealth.gov.ph"` (no `/fhir/Identifier/philhealth-id` suffix) — won't match the system used in `patient_to_fhir()` on a receiving system | High | `wah4pc.py:353` |
| **PSGC city coverage**: `_PSGC_CITY` + `_PSGC_CITY_9` only cover NCR (17 entries) + 3 Central Luzon cities; patients from other regions get free-text city names, not PSGC codes | Medium | `wah4pc.py:46–131` |
| **PSGC province coverage**: `_PSGC_PROVINCE` has only 4 entries (NCR, Pampanga, Bulacan, Zambales) | Medium | `wah4pc.py:71–76` |
| **Barangay codes for named barangays are fabricated**: `_barangay_psgc_code()` uses CRC32 (adler32) suffix for named barangays — acknowledged in code as NOT an official PSA code; will fail strict receiver validation | Medium | `wah4pc.py:233–257` |
| **`civil_status` identity mapping**: `_HL7_MARITAL_STATUS` maps `"S" → "S"` (identity), so `maritalStatus` is only emitted when the DB already stores the single-letter HL7 code. If the DB stores display values like "Single"/"Married", no marital status is sent | Medium | `wah4pc.py:31–38, 587` |
| **No `meta.versionId`** on any resource | Low | All serializers |

---

### ✅ Immunization — COMPLIANT (with caveats)

**Serializer:** `immunization_to_fhir()` in `wah4pc.py`  
**Reverse parser:** `import_immunization_from_fhir()` in `wah4pc.py`  
**Bundle wrapper:** `immunizations_to_bundle()`

#### Passing
| Requirement | Implementation | Status |
|---|---|---|
| CVX vaccine code system | `http://hl7.org/fhir/sid/cvx` | ✅ |
| HL7 v3 ActSite (injection site) | `http://terminology.hl7.org/CodeSystem/v3-ActSite` | ✅ |
| HL7 v3 RouteOfAdministration | `http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration` | ✅ |
| UCUM units for doseQuantity | `http://unitsofmeasure.org`, code="ml" | ✅ |
| Performer function | HL7 v2-0443 code "AP" (Administering Provider) | ✅ |
| `meta.profile` | `[_URN_EXT]/ph-core-immunization` | ✅ |
| Deterministic resource IDs | UUID5 from `immunization:{pk}` | ✅ |
| Bundle wrapping | FHIR collection Bundle | ✅ |
| Bidirectional upsert | `import_immunization_from_fhir()` handles incoming | ✅ |

#### Gaps
| Issue | Severity | Location |
|---|---|---|
| **Vaccine code map critically limited**: `_VACCINE_CODE_MAP` only maps 3 codes (Hepatitis B, COVID-19, Japanese Encephalitis); DOH EPI schedule has 15+ vaccines; unmapped codes get the raw code as display text | High | `wah4pc.py:1016–1022` |
| **`encounter_id=0` hardcoded fallback**: when importing from FHIR with no encounter context, `encounter_id` defaults to 0 — not a valid encounter PK, violates relational integrity | High | `wah4pc.py:1593` |
| **Actor reference uses local DB integer PK**: `f"Practitioner/{model.actor_id}"` — uses raw integer instead of the practitioner's FHIR identifier; won't resolve on receiving systems | Medium | `wah4pc.py:1144–1145` |

---

### ✅ Encounter — COMPLIANT (with caveats)

**Serializer:** `encounter_to_fhir()` in `wah4pc.py`  
**Bundle wrapper:** `encounters_to_bundle()`

#### Passing
| Requirement | Implementation | Status |
|---|---|---|
| `class` as single Coding (not CodeableConcept) | Correct per FHIR R4 spec | ✅ |
| HL7 v3 ActCode for encounter class | `http://terminology.hl7.org/CodeSystem/v3-ActCode`, full 11-code map | ✅ |
| Participant with PPRF type | `http://terminology.hl7.org/CodeSystem/v3-ParticipationType` | ✅ |
| `subject` includes `"type": "Patient"` | Correct for Encounter (unlike Procedure) | ✅ |
| PHT datetime handling | `format_fhir_datetime()` pads DateField to midnight PHT | ✅ |
| `meta.profile` | `[_URN_EXT]/ph-core-encounter` | ✅ |

#### Gaps
| Issue | Severity | Location |
|---|---|---|
| **`period_start`/`period_end` are DateField** (not DateTimeField) in the model — same-day encounters lose time precision; padded to midnight PHT as acknowledged workaround | High | `admission/models.py:53–54` |
| **`type` is free text only**: `fhir["type"] = [{"text": model.type}]` — no `coding` array, no code system; PHCore expects a CodeableConcept with a code | Medium | `wah4pc.py:1413–1414` |
| **`reasonCode` is free text only** — no coding | Medium | `wah4pc.py:1426–1427` |
| **`serviceType` not emitted** despite `service_type` field in model | Low | `wah4pc.py:encounter_to_fhir` |
| **`diagnosis` not emitted** despite `diagnosis_condition_id`, `diagnosis_rank`, `diagnosis_use` in model | Medium | `wah4pc.py:encounter_to_fhir` |

---

### ✅ Procedure — COMPLIANT (with caveats)

**Serializer:** `procedure_to_fhir()` in `wah4pc.py`  
**Bundle wrapper:** `procedures_to_bundle()`

#### Passing
| Requirement | Implementation | Status |
|---|---|---|
| SNOMED CT for procedure code | `http://snomed.info/sct` | ✅ |
| SNOMED CT for procedure category | `http://snomed.info/sct` | ✅ |
| `meta.profile` | `[_URN_EXT]/ph-core-procedure` | ✅ |
| `subject` without `"type"` field | Correct for Procedure per spec | ✅ |
| Performer and recorder resolved via identifier lookup | `_practitioner_ref()` looks up Practitioner by PK | ✅ |
| Location resolved by name | `Location.objects.get()` | ✅ |

#### Gaps
| Issue | Severity | Location |
|---|---|---|
| **`bodySite` not emitted** despite `body_site_code`/`body_site_display` in model | Medium | `wah4pc.py:procedure_to_fhir` |
| **`complication` not emitted** despite `complication_code`/`complication_display` in model | Medium | `wah4pc.py:procedure_to_fhir` |
| **`outcome` and `reasonCode` are free text only** — no SNOMED coding | Low | `wah4pc.py:1290–1297` |
| **Performer function code not emitted** despite `performer_function_code`/`performer_function_display` in model | Low | `wah4pc.py:procedure_to_fhir` |

---

### ❌ Condition — NOT EXCHANGEABLE

**Model:** `patients/models.py:Condition`  
**FHIR Serializer:** **None**

The Condition model is structurally comprehensive (clinical status, verification status, severity, staging, onset/abatement, evidence, notes) but there is no `condition_to_fhir()` function. Conditions stored in WAH4H **cannot be sent to or received from other hospitals**.

| Missing Component | PHCore R4 Requirement |
|---|---|
| FHIR serializer function | Required for exchange |
| ICD-10-CM or SNOMED for `code` field | PHCore mandates coded diagnoses |
| `clinical_status` CodeableConcept | Requires system `http://terminology.hl7.org/CodeSystem/condition-clinical` |
| `verification_status` CodeableConcept | Requires system `http://terminology.hl7.org/CodeSystem/condition-ver-status` |

---

### ❌ AllergyIntolerance — NOT EXCHANGEABLE

**Model:** `patients/models.py:AllergyIntolerance`  
**FHIR Serializer:** **None**

Full model exists but no `allergy_to_fhir()` function.

| Missing Component | PHCore R4 Requirement |
|---|---|
| FHIR serializer function | Required for exchange |
| SNOMED/RxNorm for `code` field | PHCore mandates coded allergens |
| `clinical_status` CodeableConcept | Requires HL7 CodeSystem URL |
| `verification_status` CodeableConcept | Requires HL7 CodeSystem URL |
| Reaction manifestation coding | SNOMED required, currently free text |

---

### ❌ Observation — NOT EXCHANGEABLE

**Model:** `monitoring/models.py:Observation`  
**FHIR Serializer:** **None**

The Observation model is the most technically sophisticated in the system (polymorphic value types, reference ranges, multi-component observations) but has no `observation_to_fhir()` function. Vital signs cannot be shared.

| Missing Component | PHCore R4 Requirement |
|---|---|
| FHIR serializer function | Required for exchange |
| LOINC codes for vital signs | PHCore R4 mandates LOINC for all vital sign observations (e.g., 8867-4 for heart rate, 8480-6 for systolic BP, 8462-4 for diastolic BP, 8310-5 for body temperature, 9279-1 for respiratory rate, 2708-6 for SpO2) |

---

### ❌ MedicationRequest — NOT EXCHANGEABLE

**Model:** `pharmacy/models.py:MedicationRequest`  
**FHIR Serializer:** **None**

Prescriptions, dispense requests, and administration records are fully modeled but not FHIR-exchangeable.

| Missing Component | PHCore R4 Requirement |
|---|---|
| FHIR serializer function | Required for exchange |
| RxNorm or Philippine drug code system for `Medication.code` | PHCore mandates coded medications |

---

### ❌ DiagnosticReport — NOT EXCHANGEABLE

**Model:** `laboratory/models.py:DiagnosticReport`, `Specimen`, `ImagingStudy`  
**FHIR Serializer:** **None**

Lab results, specimens, and imaging studies cannot be shared across hospitals.

---

### ⚠️ Organization / Practitioner / Location — MODELED, NOT EXCHANGEABLE

These provider-directory resources have FHIR-aligned models but no serialization or exchange endpoints.

**Additional Practitioner gap:** The `Practitioner` model has no field for the **PRC (Professional Regulation Commission) license identifier** — the primary Philippine practitioner identifier required by PHCore R4 (`system: "http://prc.gov.ph/fhir/Identifier/prc-license"`).

---

## Cross-Cutting Structural Gaps

### 1. Non-Standard Profile Base URIs
All `meta.profile` values use:
```
urn://example.com/ph-core/fhir/StructureDefinition/...
```
This is a WAH4PC gateway-specific convention, **not** the official DOH-published PHCore R4 canonical URLs. For formal certification against the PHCore IG, these must be updated to the DOH-published base (e.g., `https://phfhir.doh.gov.ph/...`). The code comment acknowledges this: `"External providers require the urn://example.com/... scheme exactly"`.

### 2. No Standard FHIR REST API
There are no FHIR RESTful endpoints. All FHIR exchange is mediated through the proprietary WAH4PC gateway protocol. FHIR R4 formal conformance requires:
- `GET /fhir/Patient?identifier=xxx` (FHIR search)
- `POST /fhir/Patient` (FHIR create)
- Content-Type: `application/fhir+json`
- `GET /fhir/metadata` (CapabilityStatement)

### 3. No CapabilityStatement
There is no `/fhir/metadata` endpoint declaring the server's FHIR capabilities. This is required for FHIR R4 conformance declaration.

### 4. No Inbound FHIR Validation
Incoming FHIR resources are parsed with raw dict access (`fhir.get("field")`). There is no schema validation against PHCore profiles. A malformed or non-conformant record from another provider will be silently partially imported.

### 5. Terminology Coverage Summary

| Terminology System | Purpose | Status |
|---|---|---|
| CVX (CDC vaccine codes) | Immunization.vaccineCode | ⚠️ 3 of ~300 codes have display names mapped |
| PSGC (PSA geographic codes) | Patient.address | ⚠️ NCR + 3 Luzon cities only |
| HL7 v3 MaritalStatus | Patient.maritalStatus | ✅ All 6 codes |
| HL7 v3 ActCode | Encounter.class | ✅ All 11 codes |
| SNOMED CT | Procedure.code/category | ⚠️ System used, codes not validated |
| ICD-10-CM | Condition.code | ❌ Not implemented |
| LOINC | Observation.code | ❌ Not implemented |
| RxNorm | Medication.code | ❌ Not implemented |
| PRC license codes | Practitioner identifier | ❌ Not implemented |

---

## Compliance Scorecard

| PHCore R4 Resource | Model Complete | FHIR Exchange | Terminology | Verdict |
|---|---|---|---|---|
| **Patient** | ✅ | ✅ | ⚠️ Partial PSGC | **Compliant** |
| **Immunization** | ✅ | ✅ | ⚠️ Limited CVX | **Compliant** |
| **Encounter** | ⚠️ DateField periods | ✅ | ⚠️ Missing type/dx | **Compliant** |
| **Procedure** | ✅ | ✅ | ⚠️ Missing bodySite | **Compliant** |
| **Condition** | ✅ | ❌ No serializer | ❌ No code system | **Non-Compliant** |
| **AllergyIntolerance** | ✅ | ❌ No serializer | ❌ No code system | **Non-Compliant** |
| **Observation** | ✅ | ❌ No serializer | ❌ No LOINC | **Non-Compliant** |
| **MedicationRequest** | ✅ | ❌ No serializer | ❌ No RxNorm | **Non-Compliant** |
| **DiagnosticReport** | ✅ | ❌ No serializer | — | **Non-Compliant** |
| **Organization** | ✅ | ❌ No exchange | — | **Non-Compliant** |
| **Practitioner** | ⚠️ No PRC ID | ❌ No exchange | — | **Non-Compliant** |
| **CapabilityStatement** | ❌ | ❌ | — | **Missing** |

**4 of 11 clinical resources** are actively exchangeable via FHIR. **7 of 11** are modeled but not exchangeable.

---

## Remediation Roadmap

### Priority 1 — Blocking Interoperability Bugs

| # | Issue | File | Change |
|---|---|---|---|
| P1-1 | PhilHealth identifier system URL mismatch in `request_patient()` | `wah4pc.py:353` | Change `"system": "http://philhealth.gov.ph"` → `"system": "http://philhealth.gov.ph/fhir/Identifier/philhealth-id"` |
| P1-2 | `encounter_id=0` fallback in `import_immunization_from_fhir()` | `wah4pc.py:1593`, `patients/models.py:278` | Make `Immunization.encounter_id` nullable (`null=True, blank=True`); remove the `0` default |
| P1-3 | Actor reference uses local integer PK instead of FHIR identifier | `wah4pc.py:1144` | Resolve practitioner FHIR identifier before building reference |

### Priority 2 — Missing FHIR Serializers

| # | Resource | New Function | Key Code Systems |
|---|---|---|---|
| P2-1 | Condition | `condition_to_fhir()` | ICD-10-CM, SNOMED CT; condition-clinical, condition-ver-status |
| P2-2 | AllergyIntolerance | `allergy_to_fhir()` | SNOMED/RxNorm; allergyintolerance-clinical, allergyintolerance-verification |
| P2-3 | Observation | `observation_to_fhir()` | LOINC vital sign codes |

### Priority 3 — Incomplete Serializers

| # | Issue | File | Change |
|---|---|---|---|
| P3-1 | Expand CVX vaccine code map | `wah4pc.py:1016` | Add DOH EPI schedule vaccines (BCG, DPT, OPV, MMR, etc.) |
| P3-2 | Expand PSGC city/municipality coverage | `wah4pc.py:46–131` | Add all Philippine cities from PSA PSGC release |
| P3-3 | Emit `bodySite` in `procedure_to_fhir()` | `wah4pc.py:procedure_to_fhir` | Add `body_site_code`/`body_site_display` to output |
| P3-4 | Emit `complication` in `procedure_to_fhir()` | `wah4pc.py:procedure_to_fhir` | Add `complication_code`/`complication_display` to output |
| P3-5 | Emit `diagnosis` in `encounter_to_fhir()` | `wah4pc.py:encounter_to_fhir` | Add `diagnosis_condition_id`, `diagnosis_rank`, `diagnosis_use` |
| P3-6 | Fix `civil_status` mapping | `wah4pc.py:31, 587` | Add display-value → HL7 code mapping (e.g., "Single" → "S") |

### Priority 4 — Certification Requirements

| # | Issue | Change |
|---|---|---|
| P4-1 | Add PRC identifier to Practitioner | Add `prc_license` field to `accounts/models.py:Practitioner` |
| P4-2 | Add CapabilityStatement endpoint | Add `/fhir/metadata` view to `wah4h/urls.py` |
| P4-3 | Add FHIR validation of inbound payloads | Integrate `fhir.resources` Python library for schema validation |
| P4-4 | Update profile URIs to DOH-official | Update `_URN_EXT` when DOH publishes canonical PHCore URLs |
| P4-5 | Change Encounter periods to DateTimeField | Migrate `period_start`/`period_end` to `DateTimeField` in `admission/models.py` |

---

## Safe Immediate Fixes (No Migration Required)

The following can be applied immediately without any database migrations or breaking changes:

1. **P1-1**: Fix the identifier system URL in `request_patient()` — one-line string change, no schema impact
2. **P3-1**: Expand `_VACCINE_CODE_MAP` — additive dict change, no existing data affected
3. **P3-2**: Expand `_PSGC_CITY`, `_PSGC_CITY_9`, `_PSGC_PROVINCE` — additive dict change, no existing data affected
4. **P3-3 / P3-4**: Emit `bodySite` and `complication` in `procedure_to_fhir()` — outbound-only change, no inbound impact
5. **P3-5**: Emit `diagnosis` in `encounter_to_fhir()` — outbound-only change
6. **P3-6**: Fix `civil_status` display-value mapping — outbound-only change

---

*Review generated by automated static analysis of the WAH4H codebase. No runtime tests were performed. Compliance assessment is based on code inspection against the PHCore R4 IG requirements.*
