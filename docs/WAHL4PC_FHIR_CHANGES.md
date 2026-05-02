# WAH4PC FHIR Integration — Change Log
**File modified:** `wah4h-backend/patients/wah4pc.py`  
**Change date:** 2026-05-02  
**Net diff:** +120 lines, −4 lines (all additive except 2 targeted one-line fixes)  
**Reason:** PHCore R4 compliance remediation — Priority 1 (blocking bugs) and Priority 3 (incomplete serialisers)

---

## Change 1 — PhilHealth Identifier System URL (P1-1)

### What changed
**Location:** `request_patient()` function, identifier query payload

| Version | Value |
|---|---|
| Before | `"system": "http://philhealth.gov.ph"` |
| After | `"system": "http://philhealth.gov.ph/fhir/Identifier/philhealth-id"` |

### Why
`patient_to_fhir()` and `push_patient()` always emitted the full FHIR identifier system URL (`/fhir/Identifier/philhealth-id`). `request_patient()` was sending the short base domain instead. A receiving system performing an exact-match identifier lookup would find no match for records pushed by this system — the two identifiers looked different even though they referred to the same patient.

### Impact
- Outbound query behaviour changes: the gateway now receives the canonical system URL in identifier search requests.
- `fhir_to_dict()` is **not affected** — it uses a `"philhealth" in system` substring check, so it accepts both URL forms (verified by smoke test).
- No database migration required.
- No inbound parsing changes.

---

## Change 2 — Civil Status Display-Value Aliases (P3-6)

### What changed
**Location:** `_HL7_MARITAL_STATUS` dict (module-level constant)

| Version | Dict entries |
|---|---|
| Before | 6 entries — single-letter HL7 codes only (`"S"→"S"`, `"M"→"M"`, …) |
| After | 16 entries — original 6 plus 10 display-value aliases |

### New aliases added
```
"SINGLE"             → "S"
"MARRIED"            → "M"
"DIVORCED"           → "D"
"WIDOWED"            → "W"
"LEGALLY SEPARATED"  → "L"
"SEPARATED"          → "L"
"ANNULLED"           → "A"
"LIVE-IN"            → "T"  (HL7 T = Domestic partner)
"LIVE IN"            → "T"
"COHABITING"         → "T"
```

### Why
`patient_to_fhir()` calls `_HL7_MARITAL_STATUS.get(patient.civil_status.upper())`. If `civil_status` was stored as a display string ("Single", "Married") rather than the HL7 single-letter code, the lookup returned `None` and `maritalStatus` was silently omitted from the FHIR output. Patients registered before the HL7-code normalisation would never have their marital status transmitted.

The `.upper()` call was already in place; these aliases simply add the uppercase display values that `.upper()` produces.

### Impact
- Patients whose `civil_status` is a display string now have `maritalStatus` emitted in their FHIR Patient resource.
- Existing patients already storing single-letter codes ("S", "M") are unaffected — those entries are still present and take priority.
- No database changes. Read-only change to outbound serialisation.

---

## Change 3 — CVX Vaccine Code Map Expansion (P3-1)

### What changed
**Location:** `_VACCINE_CODE_MAP` dict (module-level constant)

| Version | Entries |
|---|---|
| Before | 3 entries |
| After | 48 entries |

### New code groups added

**DOH EPI Schedule (Expanded Program on Immunization):**
| CVX Code | Vaccine |
|---|---|
| 19 | BCG (Bacillus Calmette-Guérin) |
| 02 | Oral Polio Vaccine (OPV) |
| 10 | Inactivated Polio Vaccine (IPV) |
| 146 | Pentavalent (DTP-HepB-Hib) |
| 110 | DTaP-Hib (Quadrivalent) |
| 20 | DTP (Diphtheria-Tetanus-Pertussis) |
| 28 | DT (Diphtheria-Tetanus, pediatric) |
| 09 | Td (Tetanus-Diphtheria, adult) |
| 35 | Tetanus Toxoid (TT) |
| 03 | MMR (Measles-Mumps-Rubella) |
| 04 | Measles-Rubella (MR) |
| 05 | Measles |
| 94 | Measles-Containing Vaccine |
| 133 | PCV13 (Pneumococcal Conjugate Vaccine, 13-valent) |
| 33 | PPV23 (Pneumococcal Polysaccharide Vaccine, 23-valent) |
| 100 | Pneumococcal Conjugate NOS |
| 119 | Rotavirus (monovalent, RV1) |
| 116 | Rotavirus (pentavalent, RV5) |
| 62 | HPV (Bivalent, Cervarix) |
| 137 | HPV (9-valent, Gardasil 9) |
| 165 | HPV (4-valent, Gardasil) |
| 88 | Influenza (seasonal, injectable) |
| 141 | Influenza (seasonal, high-dose) |
| 21 | Varicella (Chickenpox) |
| 52 | Hepatitis A (pediatric) |
| 83 | Hepatitis A + Hepatitis B (combination) |
| 25 | Typhoid (Vi polysaccharide, injectable) |
| 101 | Typhoid (oral, Ty21a) |
| 56 | Dengue (Dengvaxia, CYD-TDV) |
| 18 | Rabies |
| 39 | Japanese Encephalitis (inactivated) |
| 38 | Japanese Encephalitis (live) |
| 37 | Yellow Fever |
| 136 | Meningococcal ACWY |
| 114 | Meningococcal B |
| 26 | Cholera (oral) |

**COVID-19 vaccines:**
| CVX Code | Vaccine |
|---|---|
| 207 | COVID-19 mRNA (Moderna Spikevax) |
| 208 | COVID-19 mRNA (Pfizer-BioNTech Comirnaty) |
| 210 | COVID-19 Viral Vector (AstraZeneca Vaxzevria) |
| 212 | COVID-19 Viral Vector (Janssen / J&J) |
| 217 | COVID-19 mRNA (Moderna Bivalent Booster) |
| 218 | COVID-19 mRNA (Pfizer Bivalent Booster) |
| 211 | COVID-19 Inactivated (Sinovac CoronaVac) |
| 510 | COVID-19 Inactivated (Sinopharm BIBP) |
| 511 | COVID-19 Protein Subunit (Novavax Nuvaxovid) |

**Backward-compatible legacy codes (unchanged):**
| Code | Vaccine |
|---|---|
| `"08"` | Hepatitis B (already present, kept) |
| `"COVID-19"` | COVID-19 mRNA (non-standard, kept) |
| `"JC"` | Japanese Encephalitis (non-standard, kept) |

### Also expanded: `_SITE_CODE_MAP` and `_ROUTE_CODE_MAP`

**`_SITE_CODE_MAP`** (injection sites): 3 → 8 entries  
Added: `RL` (Right Leg), `LT` (Left Thigh), `RT` (Right Thigh), `LVL` (Left Vastus Lateralis), `RVL` (Right Vastus Lateralis)

**`_ROUTE_CODE_MAP`** (administration routes): 3 → 6 entries  
Added: `SQ` (Subcutaneous), `NASINH` (Nasal Inhalation), `IV` (Intravenous)

### Why
Previously, any CVX code not in the 3-entry map caused `vaccineCode.text` and `vaccineCode.coding[0].display` to be set to the raw code string (e.g., `"19"`) rather than a human-readable name. Receiving systems that display the `text` field would show the unintelligible code. All DOH EPI schedule vaccines are now covered.

### Impact
- Outbound FHIR Immunization resources will have human-readable `vaccineCode.text` and `display` for all covered CVX codes.
- The `vaccine_code` field in the DB is unchanged — this is a display-name-only lookup.
- `import_immunization_from_fhir()` (inbound) is not affected — it reads `code` from the FHIR payload, not this map.
- All 3 pre-existing codes (`"08"`, `"COVID-19"`, `"JC"`) continue to work identically.

---

## Change 4 — `procedure_to_fhir()` Now Emits `bodySite` and `complication` (P3-3 / P3-4)

### What changed
**Location:** `procedure_to_fhir()` function — two new blocks inserted before the `recorder` block

#### Before (excerpt)
```python
    # location
    if location_display:
        fhir["location"] = {"display": location_display}

    # recorder
    if recorder:
        fhir["recorder"] = recorder
```

#### After
```python
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

    # location
    if location_display:
        fhir["location"] = {"display": location_display}

    # recorder
    if recorder:
        fhir["recorder"] = recorder
```

### Why
The `Procedure` model has `body_site_code`, `body_site_display`, `complication_code`, and `complication_display` fields that were being stored in the database but silently dropped during FHIR serialisation. Any procedure with a body site or complication would lose that data when sent to another hospital.

### Impact
- Outbound Procedure FHIR resources now include `bodySite` (with SNOMED CT coding) and `complication` (free text) when those fields are populated in the DB.
- Procedures with empty `body_site_code`/`body_site_display` and empty `complication_code`/`complication_display` are unaffected — the blocks only emit when the fields have data.
- No inbound parsing changes. No database migration.

---

## Change 5 — `encounter_to_fhir()` Now Emits `serviceType` and `diagnosis` (P3-5)

### What changed
**Location:** `encounter_to_fhir()` function — two new blocks inserted before the final `return fhir`

#### Before (excerpt)
```python
    # participant
    if participant_fhir:
        fhir["participant"] = [participant_fhir]

    return fhir
```

#### After
```python
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
```

### Why
The `Encounter` model has `service_type`, `diagnosis_condition_id`, `diagnosis_use`, and `diagnosis_rank` fields that were stored but never serialised. Encounters sent to other hospitals were missing the primary diagnosis — critical clinical information.

The `diagnosis.condition.reference` uses the local `diagnosis_condition_id` integer value. Because the Condition resource is not yet exchangeable (no `condition_to_fhir()` function), the reference is a logical reference only; receiving systems that cannot resolve it will receive the encounter without a resolvable diagnosis link, but will not error.

### Impact
- Outbound Encounter resources now include `serviceType` (free text) and `diagnosis` (condition reference + use + rank) when those fields are populated.
- Encounters without these fields are unaffected.
- `diagnosis.rank` is cast to `int`; if the stored value cannot be parsed as an integer (e.g., a string like "Primary"), the rank is silently omitted and the rest of the diagnosis object is still emitted.
- No inbound parsing changes. No database migration.

---

## Summary of Files Changed

| File | Changes | Migration required |
|---|---|---|
| `wah4h-backend/patients/wah4pc.py` | 5 targeted changes (+120 lines, −4 lines) | No |
| `docs/FHIR_PHCORE_R4_COMPLIANCE_REVIEW.md` | New file — full PHCore R4 compliance review | No |
| `docs/WAHL4PC_FHIR_CHANGES.md` | This file | No |

## No Breaking Changes

All changes are:
- **Additive** (new dict entries, new FHIR fields) or **one-line fixes** (PhilHealth URL)
- **Outbound-only** — no inbound parsing logic was modified
- **Backward-compatible** — existing data, existing DB records, and existing API contracts are unaffected
- The `fhir_to_dict()` reverse parser continues to accept both short (`http://philhealth.gov.ph`) and full (`http://philhealth.gov.ph/fhir/Identifier/philhealth-id`) identifier system URLs from external providers
