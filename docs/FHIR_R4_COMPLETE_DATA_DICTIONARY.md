# WAH4H FHIR R4 Complete Data Dictionary

**Version:** 3.0  
**Date:** 2026-05-05  
**Standard:** HL7 FHIR R4 (4.0.1) + Philippine Core (PHCore) R4 Implementation Guide  
**System:** WAH4H for Hospitals — wah4h.echosphere.cfd

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Patterns](#2-architecture-patterns)
3. [WAH4H Identifier Systems](#3-wah4h-identifier-systems)
4. [PHCore Profile URIs](#4-phcore-profile-uris)
5. [Code Systems Reference](#5-code-systems-reference)
6. [Section A — PHCore-Profiled Resources](#6-section-a--phcore-profiled-resources)
7. [Section B — Additional FHIR Resources](#7-section-b--additional-fhir-resources)
8. [Section C — Non-FHIR Internal Models](#8-section-c--non-fhir-internal-models)
9. [Cross-Resource Reference Map](#9-cross-resource-reference-map)
10. [Validation Rules Summary](#10-validation-rules-summary)

---

## 1. Overview

WAH4H uses a **FHIR Hybrid Serializer** approach: every Django REST Framework serializer returns the flat Django model fields **plus** a nested `fhir` key containing a valid FHIR R4 JSON resource. This allows backward compatibility with existing API consumers while enabling FHIR-native interoperability.

All FHIR resources carry:
- `meta.profile[]` — PHCore profile URI (for profiled resources) or omitted
- `meta.lastUpdated` — from model `updated_at` timestamp
- `identifier[]` — WAH4H-namespaced system + value from model identifier field

**Total FHIR Resources in System:** 29 (15 PHCore-profiled + 14 additional)  
**Non-FHIR Internal Models:** 4

---

## 2. Architecture Patterns

### 2.1 FHIR Hybrid Serializer

Every serializer's `to_representation()` appends a `fhir` key:

```python
rep = super().to_representation(obj)
try:
    rep['fhir'] = {
        "resourceType": "...",
        **fhir_meta("ResourceType", obj.updated_at),
        "identifier": [...],
        # ... all FHIR fields
    }
except Exception:
    rep['fhir'] = {}
return rep
```

### 2.2 Fortress Pattern

Cross-application references use `BigIntegerField` instead of Django `ForeignKey` to prevent circular imports between apps. Example: `Observation.subject_id` → `patients.Patient.id` (no FK import).

### 2.3 fhir_meta() Helper

Located in `core/fhir_utils.py`. Injects `meta.profile[]` and `meta.lastUpdated`:

```python
def fhir_meta(resource_type: str, updated_at=None) -> dict:
    profile = PHC_PROFILE.get(resource_type)
    meta = {}
    if profile:
        meta["profile"] = [profile]
    if updated_at:
        meta["lastUpdated"] = updated_at.isoformat()
    return {"meta": meta} if meta else {}
```

### 2.4 Helper Functions

| Helper | Signature | Output |
|--------|-----------|--------|
| `fhir_reference` | `(resource_type, id)` | `{"reference": "ResourceType/id"}` |
| `codeable_concept` | `(system, code, display=None)` | `{"coding": [{"system": ..., "code": ..., "display": ...}]}` |
| `human_name` | `(given, family)` | `{"given": [...], "family": ...}` |
| `fhir_address` | `(line, city, district, state, postal, country)` | FHIR Address object |
| `fhir_contact_point` | `(system, value, use=None)` | FHIR ContactPoint object |

---

## 3. WAH4H Identifier Systems

All defined in `core/fhir_utils.py`. Base: `https://wah4h.echosphere.cfd/fhir/identifier`

| Constant | System URI | Resource |
|----------|-----------|---------|
| `WAH4H_CLAIM_SYSTEM` | `.../claim` | Claim |
| `WAH4H_CLAIM_RESPONSE_SYSTEM` | `.../claim-response` | ClaimResponse |
| `WAH4H_COVERAGE_SYSTEM` | `.../coverage` | Coverage |
| `WAH4H_SCHEDULE_SYSTEM` | `.../schedule` | Schedule |
| `WAH4H_SLOT_SYSTEM` | `.../slot` | Slot |
| `WAH4H_APPOINTMENT_SYSTEM` | `.../appointment` | Appointment |
| `WAH4H_PRACTITIONER_SYSTEM` | `.../practitioner` | Practitioner |
| `WAH4H_PRACTITIONER_ROLE_SYSTEM` | `.../practitioner-role` | PractitionerRole |
| `WAH4H_SERVICE_REQUEST_SYSTEM` | `.../service-request` | ServiceRequest |
| `WAH4H_INVOICE_SYSTEM` | `.../invoice` | Invoice |
| `WAH4H_PAYMENT_RECON_SYSTEM` | `.../payment-reconciliation` | PaymentReconciliation |
| `WAH4H_ACCOUNT_SYSTEM` | `.../account` | Account |
| *(to be defined)* | `.../patient` | Patient |
| *(to be defined)* | `.../organization` | Organization |
| *(to be defined)* | `.../location` | Location |
| *(to be defined)* | `.../encounter` | Encounter |
| *(to be defined)* | `.../condition` | Condition |
| *(to be defined)* | `.../allergy-intolerance` | AllergyIntolerance |
| *(to be defined)* | `.../immunization` | Immunization |
| *(to be defined)* | `.../procedure` | Procedure |
| *(to be defined)* | `.../observation` | Observation |
| *(to be defined)* | `.../charge-item` | ChargeItem |
| *(to be defined)* | `.../diagnostic-report` | DiagnosticReport |
| *(to be defined)* | `.../specimen` | Specimen |
| *(to be defined)* | `.../imaging-study` | ImagingStudy |
| *(to be defined)* | `.../medication` | Medication |
| *(to be defined)* | `.../medication-request` | MedicationRequest |
| *(to be defined)* | `.../medication-administration` | MedicationAdministration |

---

## 4. PHCore Profile URIs

PHCore base: `urn://example.com/ph-core/fhir/StructureDefinition`

| FHIR Resource | PHCore Profile URI |
|--------------|-------------------|
| Patient | `.../ph-core-patient` |
| Practitioner | `.../ph-core-practitioner` |
| PractitionerRole | `.../ph-core-practitioner-role` |
| Organization | `.../ph-core-organization` |
| Location | `.../ph-core-location` |
| Schedule | `.../ph-core-schedule` |
| Slot | `.../ph-core-slot` |
| Appointment | `.../ph-core-appointment` |
| ServiceRequest | `.../ph-core-service-request` |
| Coverage | `.../ph-core-coverage` |
| Claim | `.../ph-core-claim` |
| ClaimResponse | `.../ph-core-claim-response` |
| Invoice | `.../ph-core-invoice` |
| Account | `.../ph-core-account` |
| PaymentReconciliation | `.../ph-core-payment-reconciliation` |

---

## 5. Code Systems Reference

| Constant | System URI | Used In |
|----------|-----------|---------|
| `PHC_CS` | `urn://example.com/ph-core/fhir/CodeSystem` | General PHCore coding |
| `PHC_SPECIALTY_CS` | `urn://example.com/ph-core/fhir/CodeSystem/specialty` | PractitionerRole.specialty |
| `PHC_SERVICE_TYPE_CS` | `urn://example.com/ph-core/fhir/CodeSystem/service-type` | Appointment.serviceType, Invoice.lineItem |
| `PHC_PAYMENT_TYPE_CS` | `urn://example.com/ph-core/fhir/CodeSystem/payment-type` | Coverage.type |
| `HL7_SERVICE_CATEGORY` | `http://terminology.hl7.org/CodeSystem/service-category` | Appointment.serviceCategory |
| `HL7_ADJUDICATION` | `http://terminology.hl7.org/CodeSystem/adjudication` | ClaimResponse.item.adjudication |
| `HL7_PAYMENT_TYPE_CS` | `http://terminology.hl7.org/CodeSystem/ex-paymenttype` | PaymentReconciliation.paymentIssuer |
| `HL7_PAYMENT_ADJ` | `http://terminology.hl7.org/CodeSystem/payment-adjustment-reason` | PaymentReconciliation.detail |
| `HL7_ROLE_CODE` | `http://terminology.hl7.org/CodeSystem/v3-RoleCode` | PractitionerRole.code |
| `LOINC` | `http://loinc.org` | Observation.code, DiagnosticReport.code |
| `SNOMED_CT` | `http://snomed.info/sct` | Condition.code, Procedure.code, AllergyIntolerance.code |
| `ICD_10_PCS` | `http://www.cms.gov/Medicare/Coding/ICD10` | Procedure code (alternative) |
| `CVX` | `http://hl7.org/fhir/sid/cvx` | Immunization.vaccineCode |
| `RxNorm` | `http://www.nlm.nih.gov/research/umls/rxnorm` | Medication.code, MedicationRequest.medication |
| `DICOM_MODALITY` | `http://dicom.nema.org/resources/ontology/DCM` | ImagingStudy.modality |

---

## 6. Section A — PHCore-Profiled Resources

> These 15 resources carry `meta.profile[]` with PHCore URIs and full FHIR R4 `to_representation()` output.

---

### A.1 Patient

| Attribute | Value |
|-----------|-------|
| **Source App** | `patients` |
| **Django Model** | `patients.Patient` |
| **DB Table** | `patient` |
| **FHIR Serializer** | Full (`PatientOutputSerializer.get_fhir()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/patient` |
| **PHCore Profile** | `.../ph-core-patient` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `patient_id` | `identifier[0].value` | string | 0..* | System: WAH4H patient |
| `philhealth_id` | `identifier[1].value` | string | 0..* | System: `http://philhealth.gov.ph` |
| `first_name`, `last_name`, `middle_name`, `suffix_name` | `name[0]` | HumanName | 0..* | `use: "official"` |
| `gender` | `gender` | code | 0..1 | male\|female\|other\|unknown |
| `birthdate` | `birthDate` | date | 0..1 | ISO 8601 |
| `civil_status` | `maritalStatus.coding[0].code` | CodeableConcept | 0..1 | |
| `nationality` | `extension[ph-core-patient-nationality]` | Extension | 0..1 | PHCore extension |
| `mobile_number` | `telecom[0]` | ContactPoint | 0..* | `system: "phone"` |
| `email` | `telecom[1]` | ContactPoint | 0..* | `system: "email"` |
| `address_line` ... `address_country` | `address[0]` | Address | 0..* | FHIR Address |
| `contact_*` | `contact[0]` | BackboneElement | 0..* | Emergency contact |
| `indigenous_flag` | `extension[ph-core-patient-indigenous]` | Extension | 0..1 | PHCore extension |
| `indigenous_group` | `extension[ph-core-patient-indigenous-group]` | Extension | 0..1 | PHCore extension |
| `pwd_type` | `extension[ph-core-patient-disability-type]` | Extension | 0..1 | PHCore extension |
| `active` | `active` | boolean | 0..1 | |

**PHCore Extensions:**
- `ph-core-patient-indigenous` — boolean
- `ph-core-patient-indigenous-group` — string
- `ph-core-patient-disability-type` — string (PWD category)
- `ph-core-patient-nationality` — string

---

### A.2 Practitioner

| Attribute | Value |
|-----------|-------|
| **Source App** | `accounts` |
| **Django Model** | `accounts.Practitioner` |
| **DB Table** | `practitioner` |
| **FHIR Serializer** | Full (`PractitionerSerializer.get_fhir()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/practitioner` (`WAH4H_PRACTITIONER_SYSTEM`) |
| **PHCore Profile** | `.../ph-core-practitioner` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `prc_license` | `identifier[1].value` | string | 0..1 | PRC license, extension: `ph-core-practitioner-license-number` |
| `first_name`, `last_name` | `name[0]` | HumanName | 0..* | `use: "official"` |
| `gender` | `gender` | code | 0..1 | |
| `mobile_number` | `telecom[0]` | ContactPoint | 0..* | `system: "phone"` |
| `email` | `telecom[1]` | ContactPoint | 0..* | `system: "email"` |
| `qualification_code` | `qualification[0].code` | CodeableConcept | 0..* | |
| `active` | `active` | boolean | 0..1 | |

---

### A.3 PractitionerRole

| Attribute | Value |
|-----------|-------|
| **Source App** | `accounts` |
| **Django Model** | `accounts.PractitionerRole` |
| **DB Table** | `practitioner_role` |
| **FHIR Serializer** | Full (`PractitionerRoleSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/practitioner-role` (`WAH4H_PRACTITIONER_ROLE_SYSTEM`) |
| **PHCore Profile** | `.../ph-core-practitioner-role` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `practitioner_id` | `practitioner` | Reference(Practitioner) | 0..1 | |
| `organization_id` | `organization` | Reference(Organization) | 0..1 | |
| `role_code` | `code[0]` | CodeableConcept | 0..* | System: `HL7_ROLE_CODE` |
| `specialty_code` | `specialty[0]` | CodeableConcept | 0..* | System: `PHC_SPECIALTY_CS` |
| `location_id` | `location[]` | Reference(Location)[] | 0..* | |
| `available_start_time` | `availableTime[0].availableStartTime` | time | 0..1 | |
| `available_end_time` | `availableTime[0].availableEndTime` | time | 0..1 | |
| `days_of_week` | `availableTime[0].daysOfWeek[]` | code[] | 0..* | mon\|tue\|wed\|thu\|fri\|sat\|sun |
| `not_available_description` | `notAvailable[0].description` | string | 0..1 | |
| `not_available_start` | `notAvailable[0].during.start` | dateTime | 0..1 | |
| `not_available_end` | `notAvailable[0].during.end` | dateTime | 0..1 | |
| `active` | `active` | boolean | 0..1 | |

---

### A.4 Organization

| Attribute | Value |
|-----------|-------|
| **Source App** | `accounts` |
| **Django Model** | `accounts.HospitalSettings` |
| **DB Table** | `hospital_settings` |
| **FHIR Serializer** | Full (`HospitalSettingsSerializer.get_fhir()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/organization` |
| **PHCore Profile** | `.../ph-core-organization` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `hospital_name` | `name` | string | 0..1 | |
| `nhfr_code` | `extension[ph-core-organization-nhfr-code]` | Extension | 0..1 | PHCore extension |
| `philhealth_accreditation` | `extension[ph-core-organization-philhealth-accreditation]` | Extension | 0..1 | PHCore extension |
| `contact_number` | `telecom[0]` | ContactPoint | 0..* | |
| `email` | `telecom[1]` | ContactPoint | 0..* | |
| `address_*` | `address[0]` | Address | 0..* | |
| `active` | `active` | boolean | 0..1 | defaults `true` |

**PHCore Extensions:**
- `ph-core-organization-nhfr-code` — NHFR facility code
- `ph-core-organization-philhealth-accreditation` — PhilHealth accreditation number

---

### A.5 Location

| Attribute | Value |
|-----------|-------|
| **Source App** | `accounts` (or `core`) |
| **Django Model** | `accounts.Location` |
| **DB Table** | `location` |
| **FHIR Serializer** | Full |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/location` |
| **PHCore Profile** | `.../ph-core-location` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `name` | `name` | string | 0..1 | |
| `description` | `description` | string | 0..1 | |
| `status` | `status` | code | 0..1 | active\|suspended\|inactive |
| `mode` | `mode` | code | 0..1 | instance\|kind |
| `type_code` | `type[0]` | CodeableConcept | 0..* | |
| `telecom_*` | `telecom[]` | ContactPoint[] | 0..* | |
| `address_*` | `address` | Address | 0..1 | |
| `latitude`, `longitude` | `position` | BackboneElement | 0..1 | `{latitude, longitude}` |
| `managing_organization_id` | `managingOrganization` | Reference(Organization) | 0..1 | |
| `part_of_id` | `partOf` | Reference(Location) | 0..1 | |

---

### A.6 Schedule

| Attribute | Value |
|-----------|-------|
| **Source App** | `admission` |
| **Django Model** | `admission.Schedule` |
| **DB Table** | `schedule` |
| **FHIR Serializer** | Full (`ScheduleSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/schedule` (`WAH4H_SCHEDULE_SYSTEM`) |
| **PHCore Profile** | `.../ph-core-schedule` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `status` | `active` (derived) | boolean | 0..1 | `SerializerMethodField`: `status == "active"` |
| `service_type` | `serviceType[0]` | CodeableConcept | 0..* | System: `PHC_SERVICE_TYPE_CS` |
| `actor_practitioner_id` | `actor[0]` | Reference(Practitioner) | 1..* | **FHIR R4 actor is 1..\*** |
| `actor_location_id` | `actor[1]` | Reference(Location) | 1..* | included if set |
| `actor_organization_id` | `actor[2]` | Reference(Organization) | 1..* | included if set |
| `planning_horizon_start` | `planningHorizon.start` | dateTime | 0..1 | |
| `planning_horizon_end` | `planningHorizon.end` | dateTime | 0..1 | |
| `comment` | `comment` | string | 0..1 | |

**Validation:** At least one of `actor_practitioner_id`, `actor_location_id`, `actor_organization_id` must be set (FHIR R4 Schedule.actor 1..*).

---

### A.7 Slot

| Attribute | Value |
|-----------|-------|
| **Source App** | `admission` |
| **Django Model** | `admission.Slot` |
| **DB Table** | `slot` |
| **FHIR Serializer** | Full (`SlotSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/slot` (`WAH4H_SLOT_SYSTEM`) |
| **PHCore Profile** | `.../ph-core-slot` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `status` | `status` | code | 1..1 | busy\|free\|busy-unavailable\|busy-tentative\|entered-in-error |
| `schedule.identifier` | `schedule.reference` | Reference(Schedule) | 1..1 | `"Schedule/SCH-..."` |
| `service_type` | `serviceType[0]` | CodeableConcept | 0..* | System: `PHC_SERVICE_TYPE_CS` |
| `start` | `start` | instant | 1..1 | |
| `end` | `end` | instant | 1..1 | |
| `overbooked` | `overbooked` | boolean | 0..1 | |
| `comment` | `comment` | string | 0..1 | |

---

### A.8 Appointment

| Attribute | Value |
|-----------|-------|
| **Source App** | `admission` |
| **Django Model** | `admission.Appointment` |
| **DB Table** | `appointment` |
| **FHIR Serializer** | Full (`AppointmentSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/appointment` (`WAH4H_APPOINTMENT_SYSTEM`) |
| **PHCore Profile** | `.../ph-core-appointment` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `status` | `status` | code | 1..1 | proposed\|pending\|booked\|arrived\|fulfilled\|cancelled\|noshow\|entered-in-error\|checked-in\|waitlist |
| `cancelation_reason` | `cancelationReason` | CodeableConcept | 0..1 | FHIR R4 single-l spelling |
| `service_category` | `serviceCategory[0]` | CodeableConcept | 0..* | System: `HL7_SERVICE_CATEGORY` |
| `service_type` | `serviceType[0]` | CodeableConcept | 0..* | System: `PHC_SERVICE_TYPE_CS` |
| `specialty` | `specialty[0]` | CodeableConcept | 0..* | |
| `appointment_type` | `appointmentType` | CodeableConcept | 0..1 | |
| `slot_id` → DB lookup | `slot[0].reference` | Reference(Slot) | 0..* | Resolved: `Slot.objects.get(slot_id=obj.slot_id).identifier` |
| `patient_id` | `participant[0].actor` | Reference(Patient) | 1..* | `status: "accepted"` |
| `practitioner_id` | `participant[1].actor` | Reference(Practitioner) | 1..* | `status: "accepted"` |
| `start` | `start` | instant | 0..1 | |
| `end` | `end` | instant | 0..1 | |
| `description` | `description` | string | 0..1 | |
| `comment` | `comment` | string | 0..1 | |

**Note:** `cancelationReason` uses the FHIR R4 single-l spelling (not "cancellationReason").

---

### A.9 ServiceRequest

| Attribute | Value |
|-----------|-------|
| **Source App** | `admission` |
| **Django Model** | `admission.ServiceRequest` |
| **DB Table** | `service_request` |
| **FHIR Serializer** | Full (`ServiceRequestSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/service-request` (`WAH4H_SERVICE_REQUEST_SYSTEM`) |
| **PHCore Profile** | `.../ph-core-service-request` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| Auto-generated `"SRQ-{id}"` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `status` | `status` | code | 1..1 | draft\|active\|on-hold\|revoked\|completed\|entered-in-error\|unknown |
| `intent` | `intent` | code | 1..1 | proposal\|plan\|directive\|order\|filler-order\|instance-order\|option |
| `subject_id` | `subject` | Reference(Patient) | 1..1 | |
| `encounter_id` | `encounter` | Reference(Encounter) | 0..1 | |
| `requester_id` | `requester` | Reference(Practitioner) | 0..1 | |
| `performer_id` | `performer[0]` | Reference(Practitioner) | 0..* | |
| `code_code`, `code_display` | `code` | CodeableConcept | 0..1 | |
| `category_code`, `category_display` | `category[0]` | CodeableConcept | 0..* | |
| `priority` | `priority` | code | 0..1 | routine\|urgent\|asap\|stat |
| `occurrence_datetime` | `occurrenceDateTime` | dateTime | 0..1 | |
| `note` | `note[0].text` | string | 0..1 | |

---

### A.10 Coverage

| Attribute | Value |
|-----------|-------|
| **Source App** | `billing` |
| **Django Model** | `billing.Coverage` |
| **DB Table** | `coverage` |
| **FHIR Serializer** | Full (`CoverageSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/coverage` (`WAH4H_COVERAGE_SYSTEM`) |
| **PHCore Profile** | `.../ph-core-coverage` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `status` | `status` | code | 1..1 | active\|cancelled\|draft\|entered-in-error |
| `type_code` | `type` | CodeableConcept | 0..1 | System: `PHC_PAYMENT_TYPE_CS` |
| `subscriber_id` | `subscriber` | Reference(Patient) | 0..1 | null if absent |
| `beneficiary_id` | `beneficiary` | Reference(Patient) | 1..1 | **required** |
| `payor_id` | `payor[0]` | Reference(Organization) | 1..* | **FHIR R4 payor is 1..\*** |
| `period_start` | `period.start` | date | 0..1 | |
| `period_end` | `period.end` | date | 0..1 | |
| `relationship` | `relationship` | CodeableConcept | 0..1 | |
| `order` | `order` | positiveInt | 0..1 | |

**Validation:** `payor_id` must be set; enforced in `CoverageSerializer.validate()`.

---

### A.11 Claim

| Attribute | Value |
|-----------|-------|
| **Source App** | `billing` |
| **Django Model** | `billing.Claim` (EClaim) |
| **DB Table** | `eclaim` |
| **FHIR Serializer** | Full (`EClaimSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/claim` (`WAH4H_CLAIM_SYSTEM`) |
| **PHCore Profile** | `.../ph-core-claim` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `status` | `status` | code | 1..1 | active\|cancelled\|draft\|entered-in-error |
| `type_code` | `type` | CodeableConcept | 1..1 | |
| `use` | `use` | code | 1..1 | claim\|preauthorization\|predetermination |
| `patient_id` | `patient` | Reference(Patient) | 1..1 | |
| `provider_id` | `provider` | Reference(Practitioner) | 1..1 | **required — FHIR R4 1..1** |
| `insurer_id` | `insurer` | Reference(Organization) | 1..1 | |
| `coverage_id` | `insurance[0].coverage` | Reference(Coverage) | 1..1 | Added in migration 0003 |
| `priority` | `priority` | CodeableConcept | 1..1 | |
| `total_value`, `total_currency` | `total` | Money | 0..1 | |
| `billable_period_start` | `billablePeriod.start` | date | 0..1 | |
| `billable_period_end` | `billablePeriod.end` | date | 0..1 | |
| `created` | `created` | dateTime | 1..1 | |

**Note:** `coverage_id` field added in billing migration `0003_claim_coverage_id_...`. The `insurance[]` array requires `sequence` (1..1), `focal` (1..1), and `coverage` (1..1).

---

### A.12 ClaimResponse

| Attribute | Value |
|-----------|-------|
| **Source App** | `billing` |
| **Django Model** | `billing.ClaimResponse` |
| **DB Table** | `claim_response` |
| **FHIR Serializer** | Full (`ClaimResponseSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/claim-response` (`WAH4H_CLAIM_RESPONSE_SYSTEM`) |
| **PHCore Profile** | `.../ph-core-claim-response` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `status` | `status` | code | 1..1 | |
| `outcome` | `outcome` | code | 1..1 | **required 1..1**; defaults to `"queued"` if null |
| `type_code` | `type` | CodeableConcept | 1..1 | |
| `use` | `use` | code | 1..1 | |
| `patient_id` | `patient` | Reference(Patient) | 1..1 | |
| `insurer_id` | `insurer` | Reference(Organization) | 1..1 | |
| `request_id` | `request` | Reference(Claim) | 0..1 | |
| `payment_amount_value`, `payment_amount_currency` | `payment.amount` | Money | 0..1 | Added in migration 0003 |
| `disposition` | `disposition` | string | 0..1 | |
| `pre_auth_ref` | `preAuthRef` | string | 0..1 | |
| `created` | `created` | dateTime | 1..1 | |

**Note:** `payment_amount_value` and `payment_amount_currency` fields added in billing migration `0003_claim_coverage_id_...`.

---

### A.13 Invoice

| Attribute | Value |
|-----------|-------|
| **Source App** | `billing` |
| **Django Model** | `billing.Invoice` |
| **DB Table** | `invoice` |
| **FHIR Serializer** | Full (`InvoiceSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/invoice` (`WAH4H_INVOICE_SYSTEM`) |
| **PHCore Profile** | `.../ph-core-invoice` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `status` | `status` | code | 1..1 | draft\|issued\|balanced\|cancelled\|entered-in-error |
| `type_code` | `type` | CodeableConcept | 0..1 | |
| `subject_id` | `subject` | Reference(Patient) | 0..1 | |
| `account_id` | `account` | Reference(Account) | 0..1 | |
| `issuer_id` | `issuer` | Reference(Organization) | 0..1 | |
| per InvoiceLineItem | `lineItem[].chargeItem[x]` | Reference or CodeableConcept | 1..1 | Polymorphic: `chargeItemCodeableConcept` preferred; falls back to `chargeItemReference` |
| `li.price_component_type` | `lineItem[].priceComponent[].type` | code | 1..1 | base\|surcharge\|deduction\|discount\|tax\|informational |
| `li.price_component_value` | `lineItem[].priceComponent[].amount.value` | decimal | 0..1 | |
| `total_net_value` | `totalNet.value` | decimal | 0..1 | |
| `total_gross_value` | `totalGross.value` | decimal | 0..1 | |
| `participant_role_id` | `participant[0].role` | CodeableConcept | 0..* | |

**chargeItem[x] Polymorphism (FHIR R4 1..1):**
- If `li.chargeitem_code` is set → `chargeItemCodeableConcept` (system: `PHC_SERVICE_TYPE_CS`)
- Else if `li.chargeitem_reference_id` is set → `chargeItemReference`
- Else → entry omitted (serializer skips)

---

### A.14 Account

| Attribute | Value |
|-----------|-------|
| **Source App** | `billing` |
| **Django Model** | `billing.Account` |
| **DB Table** | `account` |
| **FHIR Serializer** | Full (`AccountSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/account` (`WAH4H_ACCOUNT_SYSTEM`) |
| **PHCore Profile** | `.../ph-core-account` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `status` | `status` | code | 1..1 | active\|inactive\|entered-in-error\|on-hold\|unknown |
| `type_code` | `type` | CodeableConcept | 0..1 | |
| `name` | `name` | string | 0..1 | |
| `subject_id` | `subject[0]` | Reference(Patient) | 0..* | always set (`BigIntegerField` non-null) |
| `service_period_start` | `servicePeriod.start` | date | 0..1 | |
| `service_period_end` | `servicePeriod.end` | date | 0..1 | |
| `owner_id` | `owner` | Reference(Organization) | 0..1 | |
| `description` | `description` | string | 0..1 | |

---

### A.15 PaymentReconciliation

| Attribute | Value |
|-----------|-------|
| **Source App** | `billing` |
| **Django Model** | `billing.PaymentReconciliation` |
| **DB Table** | `payment_reconciliation` |
| **FHIR Serializer** | Full (`PaymentReconciliationSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/payment-reconciliation` (`WAH4H_PAYMENT_RECON_SYSTEM`) |
| **PHCore Profile** | `.../ph-core-payment-reconciliation` |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | WAH4H system |
| `status` | `status` | code | 1..1 | active\|cancelled\|draft\|entered-in-error |
| `payment_date` | `paymentDate` | date | 1..1 | |
| `payment_amount_value` | `paymentAmount.value` | decimal | 1..1 | |
| `payment_amount_currency` | `paymentAmount.currency` | code | 1..1 | ISO 4217 (default: PHP) |
| `request_id` | `request` | Reference(Task) | 0..1 | |
| `requestor_id` | `requestor` | Reference(Organization) | 0..1 | |
| per `detail.type` ≠ null | `detail[].type` | CodeableConcept | 1..1 | **Entries with null `type` are skipped** |
| `detail.amount_value` | `detail[].amount.value` | decimal | 0..1 | |
| `outcome` | `outcome` | code | 0..1 | queued\|complete\|error\|partial |

**Note:** `detail[].type` is FHIR R4 1..1. Serializer filters: `[d for d in details if d.type]`.

---

## 7. Section B — Additional FHIR Resources

> These 14 resources are fully FHIR R4 compliant by model design but do **not** have a PHCore profile. `meta.profile[]` is omitted for these resources. Serializer status varies — some have partial FHIR output in `to_representation()`, others output flat fields only.

---

### B.1 Encounter

| Attribute | Value |
|-----------|-------|
| **Source App** | `admission` |
| **Django Model** | `admission.Encounter` |
| **DB Table** | `encounter` |
| **FHIR Serializer** | Partial (`EncounterSerializer` — flat fields; no full FHIR `to_representation`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/encounter` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | inherited from FHIRResourceModel |
| `status` | `status` | code | 1..1 | planned\|arrived\|triaged\|in-progress\|onleave\|finished\|cancelled |
| `class_field` | `class` | Coding | 1..1 | DB column: `class`; maps to FHIR `class` (reserved word workaround) |
| `type` | `type[0]` | CodeableConcept | 0..* | |
| `service_type` | `serviceType` | CodeableConcept | 0..1 | |
| `priority` | `priority` | CodeableConcept | 0..1 | |
| `subject_id` | `subject` | Reference(Patient) | 1..1 | |
| `episode_of_care_id` | `episodeOfCare[0]` | Reference(EpisodeOfCare) | 0..* | |
| `based_on_service_request_id` | `basedOn[0]` | Reference(ServiceRequest) | 0..* | |
| `appointment_id` | `appointment[0]` | Reference(Appointment) | 0..* | |
| `participant_individual_id` | `participant[0].individual` | Reference(Practitioner) | 0..* | |
| `participant_type` | `participant[0].type[0]` | CodeableConcept | 0..* | |
| `period_start`, `period_end` | `period` | Period | 0..1 | |
| `length` | `length` | Duration | 0..1 | |
| `reason_code` | `reasonCode[0]` | CodeableConcept | 0..* | |
| `reason_reference_id` | `reasonReference[0]` | Reference(Condition) | 0..* | |
| `diagnosis_condition_id` | `diagnosis[0].condition` | Reference(Condition) | 0..* | |
| `diagnosis_rank` | `diagnosis[0].rank` | positiveInt | 0..1 | |
| `diagnosis_use` | `diagnosis[0].use` | CodeableConcept | 0..1 | |
| `location_id` | `location[0].location` | Reference(Location) | 0..* | Primary (bed-level) location |
| `location_ids` | *(JSONField — location hierarchy)* | JSONField | — | WAH4H extension; not FHIR standard |
| `location_status` | `location[0].status` | code | 0..1 | |
| `admit_source` | `hospitalization.admitSource` | CodeableConcept | 0..1 | |
| `re_admission` | `hospitalization.reAdmission` | CodeableConcept | 0..1 | |
| `diet_preference` | `hospitalization.dietPreference[0]` | CodeableConcept | 0..* | |
| `special_arrangement` | `hospitalization.specialArrangement[0]` | CodeableConcept | 0..* | |
| `discharge_disposition` | `hospitalization.dischargeDisposition` | CodeableConcept | 0..1 | |
| `discharge_destination_id` | `hospitalization.destination` | Reference(Location) | 0..1 | |
| `service_provider_id` | `serviceProvider` | Reference(Organization) | 0..1 | |
| `account_id` | `account[0]` | Reference(Account) | 0..* | billing account link |
| `part_of_encounter_id` | `partOf` | Reference(Encounter) | 0..1 | hierarchical encounter |
| `pre_admission_identifier` | `hospitalization.preAdmissionIdentifier.value` | string | 0..1 | |

---

### B.2 Condition

| Attribute | Value |
|-----------|-------|
| **Source App** | `patients` |
| **Django Model** | `patients.Condition` |
| **DB Table** | `condition` |
| **FHIR Serializer** | Partial (`ConditionSerializer` — flat fields; no FHIR `to_representation`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/condition` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | user-defined (e.g., "COND-001") |
| `clinical_status` | `clinicalStatus` | CodeableConcept | 0..1 | active\|recurrence\|relapse\|inactive\|remission\|resolved |
| `verification_status` | `verificationStatus` | CodeableConcept | 0..1 | unconfirmed\|provisional\|differential\|confirmed\|refuted\|entered-in-error |
| `category` | `category[0]` | CodeableConcept | 0..* | |
| `severity` | `severity` | CodeableConcept | 0..1 | |
| `code` | `code` | CodeableConcept | 1..1 | ICD-10 / SNOMED-CT recommended |
| `patient` (FK) | `subject` | Reference(Patient) | 1..1 | |
| `encounter_id` | `encounter` | Reference(Encounter) | 0..1 | nullable — condition can exist without encounter |
| `body_site` | `bodySite[0]` | CodeableConcept | 0..* | |
| `onset_datetime` | `onsetDateTime` | dateTime | 0..1 | |
| `onset_age` | `onsetAge` | Age | 0..1 | polymorphic onset[x] |
| `onset_period_start`, `onset_period_end` | `onsetPeriod` | Period | 0..1 | polymorphic onset[x] |
| `abatement_datetime` | `abatementDateTime` | dateTime | 0..1 | |
| `abatement_age` | `abatementAge` | Age | 0..1 | |
| `abatement_period_start`, `abatement_period_end` | `abatementPeriod` | Period | 0..1 | |
| `recorded_date` | `recordedDate` | date | 0..1 | |
| `recorder_id` | `recorder` | Reference(Practitioner) | 0..1 | |
| `asserter_id` | `asserter` | Reference(Practitioner) | 0..1 | |
| `stage_summary` | `stage[0].summary` | CodeableConcept | 0..* | |
| `stage_type` | `stage[0].type` | CodeableConcept | 0..1 | |
| `evidence_code` | `evidence[0].code[0]` | CodeableConcept | 0..* | |
| `note` | `note[0].text` | string | 0..* | |

---

### B.3 AllergyIntolerance

| Attribute | Value |
|-----------|-------|
| **Source App** | `patients` |
| **Django Model** | `patients.AllergyIntolerance` |
| **DB Table** | `allergy_intolerance` |
| **FHIR Serializer** | Partial (`AllergySerializer` — flat fields; no FHIR `to_representation`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/allergy-intolerance` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | user-defined |
| `clinical_status` | `clinicalStatus` | CodeableConcept | 0..1 | active\|inactive\|resolved |
| `verification_status` | `verificationStatus` | CodeableConcept | 0..1 | unconfirmed\|confirmed\|refuted\|entered-in-error |
| `type` | `type` | code | 0..1 | allergy\|intolerance |
| `category` | `category[]` | code[] | 0..* | food\|medication\|environment\|biologic |
| `criticality` | `criticality` | code | 0..1 | low\|high\|unable-to-assess |
| `code` | `code` | CodeableConcept | 1..1 | SNOMED-CT recommended |
| `patient` (FK) | `patient` | Reference(Patient) | 1..1 | |
| `encounter_id` | `encounter` | Reference(Encounter) | 0..1 | nullable |
| `onset_datetime` | `onsetDateTime` | dateTime | 0..1 | polymorphic onset[x] |
| `onset_age` | `onsetAge` | Age | 0..1 | |
| `onset_period_start`, `onset_period_end` | `onsetPeriod` | Period | 0..1 | |
| `onset_range_low`, `onset_range_high` | `onsetRange` | Range | 0..1 | |
| `recorded_date` | `recordedDate` | date | 0..1 | |
| `recorder_id` | `recorder` | Reference(Practitioner) | 0..1 | |
| `asserter_id` | `asserter` | Reference(Practitioner) | 0..1 | |
| `last_occurrence` | `lastOccurrence` | dateTime | 0..1 | |
| `note` | `note[0].text` | string | 0..* | |
| `reaction_substance` | `reaction[0].substance` | CodeableConcept | 0..1 | |
| `reaction_manifestation` | `reaction[0].manifestation[0]` | CodeableConcept | 1..* | |
| `reaction_description` | `reaction[0].description` | string | 0..1 | |
| `reaction_onset` | `reaction[0].onset` | dateTime | 0..1 | |
| `reaction_severity` | `reaction[0].severity` | code | 0..1 | mild\|moderate\|severe |
| `reaction_exposure_route` | `reaction[0].exposureRoute` | CodeableConcept | 0..1 | |
| `reaction_note` | `reaction[0].note[0].text` | string | 0..* | |

---

### B.4 Immunization

| Attribute | Value |
|-----------|-------|
| **Source App** | `patients` |
| **Django Model** | `patients.Immunization` |
| **DB Table** | `immunization` |
| **FHIR Serializer** | Partial (`ImmunizationSerializer` — flat fields; no FHIR `to_representation`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/immunization` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | user-defined |
| `status` | `status` | code | 1..1 | completed\|entered-in-error\|not-done |
| `status_reason_code`, `status_reason_display` | `statusReason` | CodeableConcept | 0..1 | |
| `vaccine_code`, `vaccine_display` | `vaccineCode` | CodeableConcept | 1..1 | System: CVX recommended |
| `patient` (FK) | `patient` | Reference(Patient) | 1..1 | |
| `encounter_id` | `encounter` | Reference(Encounter) | 0..1 | |
| `occurrence_datetime` | `occurrenceDateTime` | dateTime | 0..1 | polymorphic occurrence[x] |
| `occurrence_string` | `occurrenceString` | string | 0..1 | polymorphic occurrence[x] |
| `recorded_datetime` | `recorded` | dateTime | 0..1 | |
| `primary_source` | `primarySource` | boolean | 0..1 | |
| `report_origin_code`, `report_origin_display` | `reportOrigin` | CodeableConcept | 0..1 | |
| `location_id` | `location` | Reference(Location) | 0..1 | |
| `manufacturer_id` | `manufacturer` | Reference(Organization) | 0..1 | |
| `lot_number` | `lotNumber` | string | 0..1 | |
| `expiration_date` | `expirationDate` | date | 0..1 | |
| `site_code`, `site_display` | `site` | CodeableConcept | 0..1 | |
| `route_code`, `route_display` | `route` | CodeableConcept | 0..1 | |
| `dose_quantity_value`, `dose_quantity_unit` | `doseQuantity` | SimpleQuantity | 0..1 | |
| `performer_id` | `performer[0].actor` | Reference(Practitioner) | 0..* | |
| `performer_function_code`, `performer_function_display` | `performer[0].function` | CodeableConcept | 0..1 | |
| `note` | `note[0].text` | string | 0..* | |
| `reason_code`, `reason_display` | `reasonCode[0]` | CodeableConcept | 0..* | |
| `is_subpotent` | `isSubpotent` | boolean | 0..1 | |
| `subpotent_reason_code`, `subpotent_reason_display` | `subpotentReason[0]` | CodeableConcept | 0..* | |
| `education_document_type` | `education[0].documentType` | string | 0..1 | |
| `education_reference` | `education[0].reference` | uri | 0..1 | |
| `education_publication_date` | `education[0].publicationDate` | dateTime | 0..1 | |
| `education_presentation_date` | `education[0].presentationDate` | dateTime | 0..1 | |
| `program_eligibility_code`, `program_eligibility_display` | `programEligibility[0]` | CodeableConcept | 0..* | |
| `funding_source_code`, `funding_source_display` | `fundingSource` | CodeableConcept | 0..1 | |
| `reaction_date` | `reaction[0].date` | dateTime | 0..1 | |
| `reaction_reported` | `reaction[0].reported` | boolean | 0..1 | |
| `protocol_series` | `protocolApplied[0].series` | string | 0..1 | |
| `protocol_target_disease_code`, `protocol_target_disease_display` | `protocolApplied[0].targetDisease[0]` | CodeableConcept | 0..* | |
| `dose_number_value` | `protocolApplied[0].doseNumberPositiveInt` | positiveInt | 1..1 | required in protocol |
| `series_doses_value` | `protocolApplied[0].seriesDosesPositiveInt` | positiveInt | 0..1 | |

---

### B.5 Procedure

| Attribute | Value |
|-----------|-------|
| **Source App** | `discharge` |
| **Django Model** | `discharge.Procedure` |
| **DB Table** | `discharge_procedure` |
| **FHIR Serializer** | Partial (`ProcedureSerializer` in admission/serializers.py — flat + partial FHIR) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/procedure` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | inherited from FHIRResourceModel |
| `status` | `status` | code | 1..1 | preparation\|in-progress\|not-done\|on-hold\|stopped\|completed\|entered-in-error\|unknown |
| `status_reason_code`, `status_reason_display` | `statusReason` | CodeableConcept | 0..1 | |
| `category_code`, `category_display` | `category` | CodeableConcept | 0..1 | |
| `code_code`, `code_display` | `code` | CodeableConcept | 0..1 | SNOMED-CT / ICD-10-PCS |
| `subject_id` | `subject` | Reference(Patient) | 1..1 | |
| `encounter_id` | `encounter` | Reference(Encounter) | 0..1 | |
| `performed_datetime` | `performedDateTime` | dateTime | 0..1 | polymorphic performed[x] |
| `performed_period_start`, `performed_period_end` | `performedPeriod` | Period | 0..1 | |
| `performed_string` | `performedString` | string | 0..1 | |
| `performed_age_value`, `performed_age_unit` | `performedAge` | Age | 0..1 | |
| `performed_range_low`, `performed_range_high` | `performedRange` | Range | 0..1 | |
| `recorder_id` | `recorder` | Reference(Practitioner) | 0..1 | |
| `asserter_id` | `asserter` | Reference(Practitioner) | 0..1 | |
| `performer_actor_id` | `performer[0].actor` | Reference(Practitioner) | 0..* | embedded single performer |
| `performer_function_code`, `performer_function_display` | `performer[0].function` | CodeableConcept | 0..1 | |
| *via ProcedurePerformer* | `performer[]` | BackboneElement[] | 0..* | normalized child table via `performers` related_name |
| `location_id` | `location` | Reference(Location) | 0..1 | |
| `reason_code_code`, `reason_code_display` | `reasonCode[0]` | CodeableConcept | 0..* | |
| `reason_reference_id` | `reasonReference[0]` | Reference(Condition) | 0..* | |
| `body_site_code`, `body_site_display` | `bodySite[0]` | CodeableConcept | 0..* | |
| `outcome_code`, `outcome_display` | `outcome` | CodeableConcept | 0..1 | |
| `report_id` | `report[0]` | Reference(DiagnosticReport) | 0..* | |
| `complication_code`, `complication_display` | `complication[0]` | CodeableConcept | 0..* | |
| `complication_detail_id` | `complicationDetail[0]` | Reference(Condition) | 0..* | |
| `follow_up_code`, `follow_up_display` | `followUp[0]` | CodeableConcept | 0..* | |
| `note` | `note[0].text` | string | 0..* | |
| `focal_device_action_code`, `focal_device_action_display` | `focalDevice[0].action` | CodeableConcept | 0..1 | |
| `used_code_code`, `used_code_display` | `usedCode[0]` | CodeableConcept | 0..* | |
| `based_on_id` | `basedOn[0]` | Reference(ServiceRequest) | 0..* | |
| `part_of_id` | `partOf[0]` | Reference(Procedure) | 0..* | |
| `instantiates_canonical` | `instantiatesCanonical[]` | canonical[] | 0..* | |
| `instantiates_uri` | `instantiatesUri[]` | uri[] | 0..* | |

---

### B.6 Observation

| Attribute | Value |
|-----------|-------|
| **Source App** | `monitoring` |
| **Django Model** | `monitoring.Observation` |
| **DB Table** | `observation` |
| **FHIR Serializer** | Full (`ObservationSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/observation` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | inherited from FHIRResourceModel |
| `status` | `status` | code | 1..1 | registered\|preliminary\|final\|amended\|corrected\|cancelled\|entered-in-error\|unknown |
| `code` | `code` | CodeableConcept | 1..1 | LOINC recommended |
| `category` | `category[0]` | CodeableConcept | 0..* | vital-signs\|laboratory\|imaging\|exam\|therapy\|activity |
| `subject_id` | `subject` | Reference(Patient) | 0..1 | |
| `encounter_id` | `encounter` | Reference(Encounter) | 0..1 | |
| `performer_id` | `performer[0]` | Reference(Practitioner) | 0..* | |
| `specimen_id` | `specimen` | Reference(Specimen) | 0..1 | |
| `device_id` | `device` | Reference(Device) | 0..1 | |
| `effective_datetime` | `effectiveDateTime` | dateTime | 0..1 | polymorphic effective[x] |
| `effective_period_start`, `effective_period_end` | `effectivePeriod` | Period | 0..1 | |
| `effective_timing` | `effectiveTiming` | Timing | 0..1 | |
| `effective_instant` | `effectiveInstant` | instant | 0..1 | |
| `issued` | `issued` | instant | 0..1 | |
| `value_string` | `valueString` | string | 0..1 | polymorphic value[x] — first non-null wins |
| `value_boolean` | `valueBoolean` | boolean | 0..1 | |
| `value_integer` | `valueInteger` | integer | 0..1 | |
| `value_quantity`, `value_quantity_unit` | `valueQuantity` | Quantity | 0..1 | |
| `value_codeableconcept` | `valueCodeableConcept` | CodeableConcept | 0..1 | |
| `value_datetime` | `valueDateTime` | dateTime | 0..1 | |
| `value_time` | `valueTime` | time | 0..1 | |
| `value_period_start`, `value_period_end` | `valuePeriod` | Period | 0..1 | |
| `value_ratio` | `valueRatio` | Ratio | 0..1 | |
| `value_sampled_data` | `valueSampledData` | SampledData | 0..1 | |
| `value_range_low`, `value_range_high` | `valueRange` | Range | 0..1 | |
| `data_absent_reason` | `dataAbsentReason` | CodeableConcept | 0..1 | |
| `interpretation` | `interpretation[0]` | CodeableConcept | 0..* | |
| `body_site` | `bodySite` | CodeableConcept | 0..1 | |
| `method` | `method` | CodeableConcept | 0..1 | |
| `reference_range_low`, `reference_range_high` | `referenceRange[0].low/high` | SimpleQuantity | 0..* | |
| `reference_range_type` | `referenceRange[0].type` | CodeableConcept | 0..1 | |
| `reference_range_text` | `referenceRange[0].text` | string | 0..1 | |
| `note` | `note[0].text` | string | 0..* | |
| *via ObservationComponent* | `component[]` | BackboneElement[] | 0..* | related_name: `components` |
| `has_member_id` | `hasMember[0]` | Reference(Observation) | 0..* | |
| `derived_from_id` | `derivedFrom[0]` | Reference(Observation) | 0..* | |
| `based_on` | `basedOn[0]` | Reference(ServiceRequest) | 0..* | |
| `part_of` | `partOf[0]` | Reference(Procedure) | 0..* | |

**ObservationComponent → `component[]`:**

| Django Field | FHIR R4 Path | Notes |
|-------------|-------------|-------|
| `code` | `component[n].code` | CodeableConcept |
| `value_quantity`, `value_quantity_unit` | `component[n].valueQuantity` | |
| `value_codeableconcept` | `component[n].valueCodeableConcept` | |
| `value_string` | `component[n].valueString` | |
| `data_absent_reason` | `component[n].dataAbsentReason` | |
| `interpretation` | `component[n].interpretation[0]` | |
| `reference_range_*` | `component[n].referenceRange[]` | |

---

### B.7 ChargeItem

| Attribute | Value |
|-----------|-------|
| **Source App** | `monitoring` |
| **Django Model** | `monitoring.ChargeItem` |
| **DB Table** | `chargeitem` |
| **FHIR Serializer** | Full (`ChargeItemSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/charge-item` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | inherited from FHIRResourceModel |
| `status` | `status` | code | 1..1 | planned\|billable\|not-billable\|aborted\|billed\|entered-in-error\|unknown |
| `code` | `code` | CodeableConcept | 1..1 | |
| `definition_uri` | `definitionUri[]` | uri[] | 0..* | |
| `definition_canonical` | `definitionCanonical[]` | canonical[] | 0..* | |
| `subject_id` | `subject` | Reference(Patient) | 1..1 | |
| `context_id` | `context` | Reference(Encounter) | 0..1 | |
| `account_id` | `account[0]` | Reference(Account) | 0..* | |
| `partof_id` | `partOf[0]` | Reference(ChargeItem) | 0..* | |
| `performing_organization_id` | `performingOrganization` | Reference(Organization) | 0..1 | |
| `requesting_organization_id` | `requestingOrganization` | Reference(Organization) | 0..1 | |
| `performer_actor_id` | `performer[0].actor` | Reference(Practitioner) | 0..* | |
| `performer_function` | `performer[0].function` | CodeableConcept | 0..1 | |
| `enterer_id` | `enterer` | Reference(Practitioner) | 0..1 | |
| `occurrence_datetime` | `occurrenceDateTime` | dateTime | 0..1 | polymorphic occurrence[x] |
| `occurrence_period_start`, `occurrence_period_end` | `occurrencePeriod` | Period | 0..1 | |
| `entered_date` | `enteredDate` | dateTime | 0..1 | |
| `bodysite_code`, `bodysite_system` | `bodysite[0]` | CodeableConcept | 0..* | |
| `quantity_value`, `quantity_unit` | `quantity` | Quantity | 0..1 | |
| `factor_override` | `factorOverride` | decimal | 0..1 | |
| `price_override_value`, `price_override_currency` | `priceOverride` | Money | 0..1 | ISO 4217 currency |
| `override_reason` | `overrideReason` | string | 0..1 | |
| `reason_code`, `reason_system` | `reason[0]` | CodeableConcept | 0..* | |
| `service_reference` | `service[0]` | Reference | 0..* | |
| `product_codeableconcept` | `productCodeableConcept` | CodeableConcept | 0..1 | |
| `product_reference` | `productReference` | Reference | 0..1 | |
| `supporting_information` | `supportingInformation[0]` | Reference | 0..* | |
| `note` | `note[0].text` | string | 0..* | |
| `cost_center_id` | `costCenter` | Reference(Organization) | 0..1 | |

---

### B.8 ChargeItemDefinition

| Attribute | Value |
|-----------|-------|
| **Source App** | `monitoring` |
| **Django Model** | `monitoring.ChargeItemDefinition` |
| **DB Table** | `chargeitemdefinition` |
| **FHIR Serializer** | Full (`ChargeItemDefinitionSerializer.to_representation()`) |
| **Identifier System** | *(URL field, not WAH4H identifier system)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `url` | `url` | uri | 1..1 | canonical URL of definition |
| `version` | `version` | string | 0..1 | |
| `title` | `title` | string | 0..1 | |
| `status` | `status` | code | 1..1 | draft\|active\|retired\|unknown |
| `derivedFromUri` | `derivedFromUri[]` | uri[] | 0..* | |
| `experimental` | `experimental` | boolean | 0..1 | |
| `date` | `date` | dateTime | 0..1 | |
| `publisher` | `publisher` | string | 0..1 | |
| `contact_name`, `contact_telecom` | `contact[]` | ContactDetail[] | 0..* | |
| `description` | `description` | markdown | 0..1 | |
| `usecontext_code`, `usecontext_value` | `useContext[]` | UsageContext[] | 0..* | |
| `jurisdiction_code`, `jurisdiction_system` | `jurisdiction[]` | CodeableConcept[] | 0..* | |
| `copyright` | `copyright` | markdown | 0..1 | |
| `approvalDate` | `approvalDate` | date | 0..1 | |
| `lastReviewDate` | `lastReviewDate` | date | 0..1 | |
| `effectivePeriod_start`, `effectivePeriod_end` | `effectivePeriod` | Period | 0..1 | |
| `code` | `code` | CodeableConcept | 0..1 | |
| `instance_reference` | `instance[]` | Reference[] | 0..* | |
| `applicability_description`, `applicability_language`, `applicability_expression` | `applicability[]` | BackboneElement[] | 0..* | |
| *via ChargeItemDefinitionPriceComponent* | `propertyGroup[0].priceComponent[]` | BackboneElement[] | 0..* | |

**ChargeItemDefinitionPriceComponent → `propertyGroup[0].priceComponent[]`:**

| Django Field | FHIR R4 Path |
|-------------|-------------|
| `type` | `priceComponent[n].type` (base\|surcharge\|deduction\|discount\|tax\|informational) |
| `code` | `priceComponent[n].code` |
| `factor` | `priceComponent[n].factor` |
| `amount_value`, `amount_currency` | `priceComponent[n].amount` |

---

### B.9 DiagnosticReport

| Attribute | Value |
|-----------|-------|
| **Source App** | `laboratory` |
| **Django Model** | `laboratory.DiagnosticReport` |
| **DB Table** | `diagnostic_report` |
| **FHIR Serializer** | Full (`DiagnosticReportSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/diagnostic-report` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | inherited from FHIRResourceModel |
| `status` | `status` | code | 1..1 | registered\|partial\|preliminary\|final\|amended\|corrected\|appended\|cancelled\|entered-in-error\|unknown |
| `code_code`, `code_display` | `code` | CodeableConcept | 1..1 | LOINC recommended |
| `category_code`, `category_display` | `category[0]` | CodeableConcept | 0..* | |
| `subject_id` | `subject` | Reference(Patient) | 0..1 | |
| `encounter_id` | `encounter` | Reference(Encounter) | 0..1 | |
| `requester_id` | `requester` | Reference(Practitioner) | 0..1 | |
| `performer_id` | `performer[0]` | Reference(Practitioner) | 0..* | |
| `results_interpreter_id` | `resultsInterpreter[0]` | Reference(Practitioner) | 0..* | |
| `specimen_id` | `specimen[0]` | Reference(Specimen) | 0..* | |
| `imaging_study_id` | `imagingStudy[0]` | Reference(ImagingStudy) | 0..* | |
| `based_on_id` | `basedOn[0]` | Reference(ServiceRequest) | 0..* | |
| `effective_datetime` | `effectiveDateTime` | dateTime | 0..1 | polymorphic effective[x] |
| `effective_period_start`, `effective_period_end` | `effectivePeriod` | Period | 0..1 | |
| `issued_datetime` | `issued` | instant | 0..1 | |
| `conclusion` | `conclusion` | string | 0..1 | |
| `conclusion_code`, `conclusion_display` | `conclusionCode[0]` | CodeableConcept | 0..* | |
| `priority` | *(not FHIR standard — internal field)* | — | — | routing/scheduling only |
| `billing_reference` | *(not FHIR standard — internal field)* | — | — | links to Claim/Invoice |
| `result_data` | `result[]` *(derived)* | Reference(Observation)[] | 0..* | JSONField; FHIR expects references |
| *via DiagnosticReportResult* | `result[]` | Reference(Observation)[] | 0..* | normalized via `diagnostic_report_result` table |

---

### B.10 Specimen

| Attribute | Value |
|-----------|-------|
| **Source App** | `laboratory` |
| **Django Model** | `laboratory.Specimen` |
| **DB Table** | `specimen` |
| **FHIR Serializer** | Full (`SpecimenSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/specimen` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | inherited from FHIRResourceModel |
| `status` | `status` | code | 0..1 | available\|unavailable\|unsatisfactory\|entered-in-error |
| `type` | `type` | CodeableConcept | 0..1 | SNOMED-CT recommended |
| `subject_id` | `subject` | Reference(Patient) | 0..1 | |
| `received_time` | `receivedTime` | dateTime | 0..1 | |
| `collection_datetime` | `collection.collectedDateTime` | dateTime | 0..1 | |
| `collection_method` | `collection.method` | CodeableConcept | 0..1 | |
| `collection_body_site` | `collection.bodySite` | CodeableConcept | 0..1 | |
| `collector_id` | `collection.collector` | Reference(Practitioner) | 0..1 | |
| `note` | `note[0].text` | string | 0..* | |

---

### B.11 ImagingStudy

| Attribute | Value |
|-----------|-------|
| **Source App** | `laboratory` |
| **Django Model** | `laboratory.ImagingStudy` |
| **DB Table** | `imaging_study` |
| **FHIR Serializer** | Full (`ImagingStudySerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/imaging-study` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | inherited from FHIRResourceModel |
| `status` | `status` | code | 1..1 | registered\|available\|cancelled\|entered-in-error\|unknown |
| `modality` | `modality[0]` | Coding | 0..* | System: `http://dicom.nema.org/resources/ontology/DCM` |
| `subject_id` | `subject` | Reference(Patient) | 1..1 | |
| `encounter_id` | `encounter` | Reference(Encounter) | 0..1 | |
| `started` | `started` | dateTime | 0..1 | |
| `number_of_series` | `numberOfSeries` | unsignedInt | 0..1 | |
| `number_of_instances` | `numberOfInstances` | unsignedInt | 0..1 | |
| `interpreter_id` | `interpreter[0]` | Reference(Practitioner) | 0..* | |
| `description` | `description` | string | 0..1 | |
| `note` | `note[0].text` | string | 0..* | |

---

### B.12 Medication

| Attribute | Value |
|-----------|-------|
| **Source App** | `pharmacy` |
| **Django Model** | `pharmacy.Medication` |
| **DB Table** | `medication` |
| **FHIR Serializer** | Partial (`MedicationSerializer` — flat fields) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/medication` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `medication_id` | `id` | id | 0..1 | integer PK |
| `code_code`, `code_display`, `code_system`, `code_version` | `code` | CodeableConcept | 0..1 | System: RxNorm recommended |
| `status` | `status` | code | 0..1 | active\|inactive\|entered-in-error |
| `implicit_rules` | `implicitRules` | uri | 0..1 | |

---

### B.13 MedicationRequest

| Attribute | Value |
|-----------|-------|
| **Source App** | `pharmacy` |
| **Django Model** | `pharmacy.MedicationRequest` |
| **DB Table** | `medication_request` |
| **FHIR Serializer** | Full (`MedicationRequestSerializer.to_representation()`) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/medication-request` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | inherited from FHIRResourceModel |
| `status` | `status` | code | 1..1 | active\|on-hold\|cancelled\|completed\|entered-in-error\|stopped\|draft\|unknown |
| `status_reason` | `statusReason` | CodeableConcept | 0..1 | |
| `intent` | `intent` | code | 1..1 | proposal\|plan\|order\|original-order\|reflex-order\|filler-order\|instance-order\|option |
| `category` | `category[0]` | CodeableConcept | 0..* | inpatient\|outpatient\|community\|discharge |
| `priority` | `priority` | code | 0..1 | routine\|urgent\|asap\|stat |
| `do_not_perform` | `doNotPerform` | boolean | 0..1 | |
| `reported_boolean` | `reportedBoolean` | boolean | 0..1 | polymorphic reported[x] |
| `reported_reference_id` | `reportedReference` | Reference(Practitioner) | 0..1 | |
| `medication_code`, `medication_display`, `medication_system` | `medicationCodeableConcept` | CodeableConcept | 1..1 | polymorphic medication[x] |
| `medication_reference` | `medicationReference` | Reference(Medication) | 1..1 | alternative to above |
| `subject_id` | `subject` | Reference(Patient) | 1..1 | |
| `encounter_id` | `encounter` | Reference(Encounter) | 0..1 | |
| `authored_on` | `authoredOn` | dateTime | 0..1 | |
| `requester_id` | `requester` | Reference(Practitioner) | 0..1 | |
| `performer_id` | `performer` | Reference(Practitioner) | 0..1 | |
| `performer_type` | `performerType` | CodeableConcept | 0..1 | |
| `recorder_id` | `recorder` | Reference(Practitioner) | 0..1 | |
| `reason_code` | `reasonCode[0]` | CodeableConcept | 0..* | |
| `reason_reference_id` | `reasonReference[0]` | Reference(Condition) | 0..* | |
| `based_on_id` | `basedOn[0]` | Reference(ServiceRequest) | 0..* | |
| `insurance_id` | `insurance[0]` | Reference(Coverage) | 0..* | |
| `group_identifier` | `groupIdentifier.value` | string | 0..1 | |
| `course_of_therapy_type` | `courseOfTherapyType` | CodeableConcept | 0..1 | |
| `note` | `note[0].text` | string | 0..* | |
| `instantiates_canonical` | `instantiatesCanonical[]` | canonical[] | 0..* | |
| `instantiates_uri` | `instantiatesUri[]` | uri[] | 0..* | |
| `billing_reference` | *(not FHIR standard — internal)* | — | — | links to Claim/Invoice |
| *via MedicationRequestDosage* | `dosageInstruction[]` | Dosage[] | 0..* | |
| `dispense_quantity` | `dispenseRequest.quantity.value` | decimal | 0..1 | |
| `dispense_initial_fill_quantity` | `dispenseRequest.initialFill.quantity.value` | decimal | 0..1 | |
| `dispense_interval` | `dispenseRequest.dispenseInterval` | Duration | 0..1 | |
| `dispense_validity_period_start`, `dispense_validity_period_end` | `dispenseRequest.validityPeriod` | Period | 0..1 | |
| `dispense_repeats_allowed` | `dispenseRequest.numberOfRepeatsAllowed` | unsignedInt | 0..1 | |

**MedicationRequestDosage → `dosageInstruction[]`:**

| Django Field | FHIR R4 Path |
|-------------|-------------|
| `dosage_text` | `dosageInstruction[n].text` |
| `dosage_site` | `dosageInstruction[n].site` |
| `dosage_route` | `dosageInstruction[n].route` |
| `dosage_method` | `dosageInstruction[n].method` |
| `dosage_dose_value`, `dosage_dose_unit` | `dosageInstruction[n].doseAndRate[0].doseQuantity` |
| `dosage_rate_quantity_value`, `dosage_rate_quantity_unit` | `dosageInstruction[n].doseAndRate[0].rateQuantity` |
| `dosage_rate_ratio_numerator`, `dosage_rate_ratio_denominator` | `dosageInstruction[n].doseAndRate[0].rateRatio` |
| `sequence` | `dosageInstruction[n].sequence` |

---

### B.14 MedicationAdministration

| Attribute | Value |
|-----------|-------|
| **Source App** | `pharmacy` |
| **Django Model** | `pharmacy.MedicationAdministration` |
| **DB Table** | `medication_administration` |
| **FHIR Serializer** | Partial (`MedicationAdministrationSerializer` — flat fields) |
| **Identifier System** | `https://wah4h.echosphere.cfd/fhir/identifier/medication-administration` *(to be added)* |
| **PHCore Profile** | None |

**FHIR Field Mappings:**

| Django Field | FHIR R4 Path | Type | Card. | Notes |
|-------------|-------------|------|-------|-------|
| `identifier` | `identifier[0].value` | string | 1..1 | inherited from FHIRResourceModel |
| `status` | `status` | code | 1..1 | in-progress\|not-done\|on-hold\|completed\|entered-in-error\|stopped\|unknown |
| `status_reason` | `statusReason[0]` | CodeableConcept | 0..* | |
| `category` | `category` | CodeableConcept | 0..1 | |
| `medication_code`, `medication_display`, `medication_system` | `medicationCodeableConcept` | CodeableConcept | 1..1 | polymorphic medication[x] |
| `medication_reference` | `medicationReference` | Reference(Medication) | 1..1 | alternative |
| `subject_id` | `subject` | Reference(Patient) | 1..1 | |
| `context_id` | `context` | Reference(Encounter) | 0..1 | |
| `performer_actor_id` | `performer[0].actor` | Reference(Practitioner) | 0..* | |
| `performer_function` | `performer[0].function` | CodeableConcept | 0..1 | |
| `request_id` | `request` | Reference(MedicationRequest) | 0..1 | |
| `part_of_id` | `partOf[0]` | Reference(Procedure) | 0..* | |
| `effective_datetime` | `effectiveDateTime` | dateTime | 1..1 | polymorphic effective[x] |
| `effective_period_start`, `effective_period_end` | `effectivePeriod` | Period | 1..1 | |
| `reason_code` | `reasonCode[0]` | CodeableConcept | 0..* | |
| `reason_reference_id` | `reasonReference[0]` | Reference(Condition) | 0..* | |
| `note` | `note[0].text` | string | 0..* | |
| `instantiates_uri` | `instantiatesUri[]` | uri[] | 0..* | |
| `event_history_id` | `eventHistory[0]` | Reference | 0..* | |
| *via MedicationAdministrationDosage* | `dosage` | BackboneElement | 0..1 | OneToOne relationship |

**MedicationAdministrationDosage → `dosage`:**

| Django Field | FHIR R4 Path |
|-------------|-------------|
| `dosage_text` | `dosage.text` |
| `dosage_site` | `dosage.site` |
| `dosage_route` | `dosage.route` |
| `dosage_method` | `dosage.method` |
| `dosage_dose_value`, `dosage_dose_unit` | `dosage.dose` (SimpleQuantity) |
| `dosage_rate_quantity_value`, `dosage_rate_quantity_unit` | `dosage.rateQuantity` |
| `dosage_rate_ratio_numerator`, `dosage_rate_ratio_denominator` | `dosage.rateRatio` |

---

## 8. Section C — Non-FHIR Internal Models

These models support WAH4H operations but do not map to FHIR resources. They should not be exposed via the FHIR API.

---

### C.1 Discharge (discharge.Discharge)

| Attribute | Value |
|-----------|-------|
| **DB Table** | `discharge_summary` |
| **FHIR Equivalent** | No direct FHIR resource; conceptually extends `Encounter.hospitalization` |
| **Serializer** | `DischargeSerializer` (flat fields only) |

**Fields:**

| Field | Description |
|-------|-------------|
| `encounter_id` | BigIntegerField → links to `Encounter` |
| `patient_id` | BigIntegerField → links to `Patient` |
| `physician_id` | BigIntegerField → discharging practitioner |
| `discharge_datetime` | When the patient was physically discharged |
| `notice_datetime` | When discharge notice was issued |
| `billing_cleared_datetime` | When billing clearance was confirmed |
| `workflow_status` | Internal discharge workflow state (e.g., "cleared", "pending") |
| `summary_of_stay` | Free-text clinical summary of hospitalization |
| `discharge_instructions` | Patient discharge instructions |
| `pending_items` | Outstanding items blocking discharge |
| `follow_up_plan` | Post-discharge follow-up instructions |
| `created_by` | Username who initiated the discharge |

**Integration Note:** The clinical text from `summary_of_stay` and `discharge_instructions` could be represented as FHIR `DocumentReference` or `Composition` resources in a future implementation.

---

### C.2 LabTestDefinition (laboratory.LabTestDefinition)

| Attribute | Value |
|-----------|-------|
| **DB Table** | `lab_test_definition` |
| **FHIR Equivalent** | `ActivityDefinition` or `ObservationDefinition` (not currently implemented) |
| **Serializer** | `LabTestDefinitionSerializer` (flat fields) |

**Fields:**

| Field | Description |
|-------|-------------|
| `code` | Unique test code (e.g., "CBC", "UA") |
| `name` | Test name (e.g., "Complete Blood Count") |
| `category` | Test category (hematology, chemistry, microbiology, etc.) |
| `base_price` | Standard pricing for billing |
| `turnaround_time` | Expected result turnaround |
| `unit` | Measurement unit (e.g., "mg/dL") |
| `normal_range` | JSONField — normal reference ranges by demographic |

**Usage:** Referenced during `DiagnosticReport` creation to pre-populate standard values. The `normal_range` JSONField is sourced into `Observation.referenceRange[]` in the FHIR output.

---

### C.3 Inventory (pharmacy.Inventory)

| Attribute | Value |
|-----------|-------|
| **DB Table** | `inventory` |
| **FHIR Equivalent** | `SupplyItem` / `InventoryItem` (R5 only; not in FHIR R4) |
| **Serializer** | `InventorySerializer` (flat fields) |

**Fields:**

| Field | Description |
|-------|-------------|
| `item_code` | Unique item code (pharmacy SKU) |
| `item_name` | Drug/supply name |
| `category` | Category (e.g., "antibiotic", "consumable") |
| `batch_number` | Lot/batch for traceability |
| `current_stock` | Current quantity on hand |
| `reorder_level` | Threshold for restocking alerts |
| `unit_of_measure` | e.g., "mg", "ml", "tablets" |
| `unit_cost` | Cost per unit |
| `status` | active\|inactive\|expired |
| `expiry_date` | Batch expiration date |
| `last_restocked_datetime` | Timestamp of last restock event |
| `manufacturer` | Manufacturer name |
| `form` | Dosage form (tablet, capsule, syrup, etc.) |
| `description` | Optional description |

**Usage:** Internal pharmacy stock management. Not exposed via FHIR API. Linked to `MedicationRequest` fulfillment workflows.

---

### C.4 WAH4PCTransaction (patients.WAH4PCTransaction)

| Attribute | Value |
|-----------|-------|
| **DB Table** | `wah4pc_transaction` |
| **FHIR Equivalent** | `AuditEvent` (conceptually) |
| **Serializer** | None (internal audit log) |

**Fields:**

| Field | Description |
|-------|-------------|
| `transaction_id` | Unique transaction ID |
| `type` | Transaction type (process-query, receive-push, etc.) |
| `status` | PENDING\|SUCCESS\|FAILED |
| `patient_id` | Legacy int reference to patient |
| `related_patient` | FK → `Patient` |
| `target_provider_id` | Provider system we interacted with |
| `requester_id` | Provider who originated the query |
| `sender_id` | Provider who sent the push |
| `raw_payload` | Full inbound JSON (compliance audit) |
| `error_message` | Error details on failure |
| `idempotency_key` | UUID for safe retry logic |

**Usage:** WAH4PC (WAH4H to PhilCore interoperability gateway) audit trail. Every inbound webhook and outbound push is logged here for HIPAA/PhilHealth compliance.

---

## 9. Cross-Resource Reference Map

```
Patient ◄──────────────────── Condition.subject
        ◄──────────────────── AllergyIntolerance.patient
        ◄──────────────────── Immunization.patient
        ◄──────────────────── Encounter.subject
        ◄──────────────────── Observation.subject
        ◄──────────────────── MedicationRequest.subject
        ◄──────────────────── MedicationAdministration.subject
        ◄──────────────────── DiagnosticReport.subject
        ◄──────────────────── Claim.patient
        ◄──────────────────── Coverage.beneficiary
        ◄──────────────────── Account.subject

Encounter ◄─────────────────── Observation.encounter
          ◄─────────────────── MedicationRequest.encounter
          ◄─────────────────── MedicationAdministration.context
          ◄─────────────────── DiagnosticReport.encounter
          ◄─────────────────── Procedure.encounter
          ◄─────────────────── ChargeItem.context
          ◄─────────────────── Immunization.encounter
          ◄─────────────────── Condition.encounter
          ◄─────────────────── Discharge (via encounter_id)
          ──────────────────► Account (via account_id)
          ──────────────────► Appointment (via appointment_id)

Appointment ──────────────────► Slot (via slot_id)
Slot ────────────────────────► Schedule (via schedule FK)
ServiceRequest ◄──────────────── Encounter.basedOn
               ◄──────────────── MedicationRequest.basedOn

DiagnosticReport ◄───────────── DiagnosticReportResult.diagnostic_report (FK)
                 ──────────────► Specimen (via specimen_id)
                 ──────────────► ImagingStudy (via imaging_study_id)
                 ──────────────► Observation (via result[])

Coverage ◄──────────────────── Claim.insurance[0].coverage
         ◄──────────────────── MedicationRequest.insurance[]

Claim ◄─────────────────────── ClaimResponse.request

Account ◄───────────────────── Invoice.account
        ◄───────────────────── ChargeItem.account[]

Practitioner ◄──────────────── PractitionerRole.practitioner
Organization ◄──────────────── PractitionerRole.organization
             ◄──────────────── Coverage.payor[]
             ◄──────────────── Claim.insurer

ChargeItem ──────────────────► Account (via account_id)
           ──────────────────► Invoice (via Invoice.lineItem.chargeItemReference)

MedicationRequest ◄──────────── MedicationAdministration.request
Procedure ◄──────────────────── MedicationAdministration.partOf[]
Condition ◄──────────────────── MedicationAdministration.reasonReference[]
```

---

## 10. Validation Rules Summary

### FHIR R4 Cardinality Constraints Enforced in Serializers

| Resource | Field | Cardinality | Enforcement |
|---------|-------|-------------|-------------|
| `Schedule` | `actor` | 1..* | `validate()` raises error if all actor fields are null |
| `Coverage` | `payor` | 1..* | `validate()` raises error if `payor_id` is null |
| `Claim` | `provider` | 1..1 | `required=True` on `provider_id` field |
| `Claim` | `insurance[].sequence` | 1..1 | Always set to `1` |
| `Claim` | `insurance[].focal` | 1..1 | Always set to `True` |
| `ClaimResponse` | `outcome` | 1..1 | Defaults to `"queued"` if model field is null |
| `Invoice.lineItem` | `chargeItem[x]` | 1..1 | Polymorphic: only one of `chargeItemCodeableConcept` or `chargeItemReference` is emitted |
| `PaymentReconciliation.detail` | `type` | 1..1 | Entries with null `type` are filtered out |
| `Immunization.protocolApplied` | `doseNumber[x]` | 1..1 | Required in FHIR R4 protocolApplied block |
| `MedicationAdministration` | `effective[x]` | 1..1 | Either `effectiveDateTime` or `effectivePeriod` required |

### PHCore-Specific Extensions Applied

| Extension URI | Applied To | Purpose |
|--------------|-----------|---------|
| `.../ph-core-patient-indigenous` | Patient | Indigenous peoples flag |
| `.../ph-core-patient-indigenous-group` | Patient | Indigenous group name |
| `.../ph-core-patient-disability-type` | Patient | PWD disability category |
| `.../ph-core-patient-nationality` | Patient | Nationality code |
| `.../ph-core-practitioner-license-number` | Practitioner | PRC license number |
| `.../ph-core-organization-nhfr-code` | Organization | NHFR facility code |
| `.../ph-core-organization-philhealth-accreditation` | Organization | PhilHealth accreditation |

### Migration History

| Migration | App | Change |
|-----------|-----|--------|
| `0001_initial` | billing | Initial Claim, ClaimResponse, Coverage, Invoice, Account, PaymentReconciliation models |
| `0002_*` | billing | Coverage.coverage_type, Coverage.period, Coverage.payor_id fields |
| `0003_claim_coverage_id_claimresponse_payment_amount` | billing | + `Claim.coverage_id` (BigIntegerField); + `ClaimResponse.payment_amount_value` (DecimalField); + `ClaimResponse.payment_amount_currency` (CharField, default "PHP") |

---

*Generated from WAH4H codebase inspection. For implementation details see individual serializer files in each Django app's `serializers.py`. For PHCore profile specifications see [PHCore R4 Implementation Guide](https://hl7.org/fhir/uv/phcore/).*
