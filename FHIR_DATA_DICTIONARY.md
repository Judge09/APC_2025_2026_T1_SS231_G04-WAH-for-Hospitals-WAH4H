# WAH4H FHIR / PHCore R4 Data Dictionary

**Version:** 1.0 — 2026-05-05  
**Standard:** HL7 FHIR R4 + Philippine Core (PHCore) R4 Implementation Guide  
**External service:** `wah4pc.echosphere.cfd` (requires `urn://example.com/ph-core/fhir/...` URN scheme)

---

## Resource Map

| Django Model | FHIR Resource | DB Table | PHCore Profile | App |
|---|---|---|---|---|
| `Patient` | Patient | `patient` | `ph-core-patient` | patients |
| `Condition` | Condition | `condition` | — | patients |
| `Organization` | Organization | `organization` | `ph-core-organization` | accounts |
| `Location` | Location | `location` | `ph-core-location` | accounts |
| `Practitioner` | Practitioner | `practitioner` | `ph-core-practitioner` | accounts |
| `PractitionerRole` | PractitionerRole | `practitioner_role` | — | accounts |
| `Schedule` | Schedule | `appointment_schedule` | `ph-core-schedule` | admission |
| `Slot` | Slot | `appointment_slot` | `ph-core-slot` | admission |
| `Appointment` | Appointment | `appointment` | `ph-core-appointment` | admission |
| `ServiceRequest` | ServiceRequest | `service_request` | — | admission |
| `Coverage` | Coverage | `billing_coverage` | `ph-core-coverage` | billing |
| `Claim` | Claim | `billing_claim` | `ph-core-claim` | billing |
| `ClaimResponse` | ClaimResponse | `billing_claim_response` | `ph-core-claim-response` | billing |
| `Invoice` | Invoice | `billing_invoice` | — | billing |
| `PaymentReconciliation` | PaymentReconciliation | `billing_payment_reconciliation` | — | billing |
| `Account` | Account | `account` | — | billing |

---

## Base Classes

### `FHIRResourceModel` (abstract, `core.models`)

All FHIR resources in this system inherit these columns:

| Column | Django Field | FHIR Element | Notes |
|---|---|---|---|
| `identifier` | `CharField(max_length=100, unique=True)` | `identifier[0].value` | Business identifier; auto-generated on create |
| `status` | `CharField(max_length=100)` | `status` | Resource-specific value set |
| `created_at` | `DateTimeField(auto_now_add=True)` | _(audit field, not serialized as FHIR)_ | |
| `updated_at` | `DateTimeField(auto_now=True)` | `meta.lastUpdated` | |

---

## 1. Patient

**DB Table:** `patient`  
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-patient`  
**FHIR serializer:** `patients/wah4pc.py` → `wah4h-pc-gateway` endpoint

> Note: `Patient` extends `TimeStampedModel` (not `FHIRResourceModel`); it has its own `patient_id` business key and `philhealth_id` for PhilHealth linkage.

| Column | Django Field | FHIR R4 Element | Code System | Required |
|---|---|---|---|---|
| `id` | `BigAutoField` (PK) | `id` | — | Yes |
| `patient_id` | `CharField(255, unique)` | `identifier[].value` | _(internal)_ | — |
| `philhealth_id` | `CharField(14)` | `identifier[].value` | `http://philhealth.gov.ph/fhir/Identifier/philhealth-id` | — |
| `first_name` | `CharField(255)` | `name[0].given[0]` | — | — |
| `middle_name` | `CharField(255)` | `name[0].given[1]` | — | — |
| `last_name` | `CharField(255)` | `name[0].family` | — | — |
| `suffix_name` | `CharField(255)` | `name[0].suffix[0]` | — | — |
| `gender` | `CharField(100)` | `gender` | `http://hl7.org/fhir/administrative-gender` | — |
| `birthdate` | `DateField` | `birthDate` | — | — |
| `civil_status` | `CharField(255)` | `maritalStatus` | `http://terminology.hl7.org/CodeSystem/v3-MaritalStatus` | — |
| `nationality` | `CharField(255)` | `extension[ph-core-patient-nationality].valueString` | PHCore ext | — |
| `blood_type` | `CharField(100)` | _(not mapped to FHIR std)_ | — | — |
| `pwd_type` | `CharField(100)` | `extension[ph-core-patient-disability-type].valueCodeableConcept` | `urn://example.com/ph-core/fhir/CodeSystem/disability-type` | — |
| `indigenous_flag` | `BooleanField` | `extension[ph-core-patient-indigenous].valueBoolean` | PHCore ext | — |
| `indigenous_group` | `CharField(255)` | `extension[ph-core-patient-indigenous-group].valueString` | PHCore ext | — |
| `mobile_number` | `CharField(255)` | `telecom[].value` (system=phone) | — | — |
| `email` | `CharField(255)` | `telecom[].value` (system=email) | — | — |
| `address_line` | `CharField(255)` | `address[0].line[0]` | — | — |
| `address_city` | `CharField(255)` | `address[0].city` | — | — |
| `address_district` | `CharField(255)` | `address[0].district` | — | — |
| `address_state` | `CharField(255)` | `address[0].state` | — | — |
| `address_postal_code` | `CharField(100)` | `address[0].postalCode` | — | — |
| `address_country` | `CharField(255)` | `address[0].country` | — | — |
| `contact_first_name` | `CharField(50)` | `contact[0].name.given[0]` | — | — |
| `contact_last_name` | `CharField(50)` | `contact[0].name.family` | — | — |
| `contact_mobile_number` | `CharField(50)` | `contact[0].telecom[].value` | — | — |
| `contact_relationship` | `CharField(50)` | `contact[0].relationship` | `http://terminology.hl7.org/CodeSystem/v3-RoleCode` | — |
| `active` | `BooleanField` | `active` | — | — |

**PHCore Extensions applied:**

| Extension URI | Field | Value Type |
|---|---|---|
| `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-patient-indigenous` | `indigenous_flag` | `valueBoolean` |
| `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-patient-indigenous-group` | `indigenous_group` | `valueString` |
| `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-patient-disability-type` | `pwd_type` | `valueCodeableConcept` |
| `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-patient-nationality` | `nationality` | `valueString` |

**Validation:**
- `philhealth_id` must match `^\d{2}-\d{9}-\d$` (14 chars, `XX-XXXXXXXXX-X`)
- `active` drives `status` string field (`active=True` → `status='active'`)

---

## 2. Organization

**DB Table:** `organization`  
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-organization`  
**FHIR serializer:** `accounts/serializers.py → HospitalSettingsSerializer.get_fhir()`

| Column | Django Field | FHIR R4 Element | Code System | Required |
|---|---|---|---|---|
| `organization_id` | `AutoField` (PK) | `id` | — | Yes |
| `nhfr_code` | `CharField(100, unique)` | `identifier[0].value` | `https://nhfr.doh.gov.ph` | — |
| `type_code` | `CharField(100)` | `type[0].coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-facility-type` | — |
| `name` | `CharField(255)` | `name` | — | — |
| `alias` | `CharField(255)` | `alias[0]` | — | — |
| `telecom` | `CharField(50)` | `telecom[0].value` | — | — |
| `active` | `BooleanField` | `active` | — | — |
| `address_line` | `CharField(255)` | `address[0].line[0]` | — | — |
| `address_city` | `CharField(255)` | `address[0].city` | — | — |
| `address_district` | `CharField(255)` | `address[0].district` | — | — |
| `address_state` | `CharField(255)` | `address[0].state` | — | — |
| `address_country` | `CharField(255)` | `address[0].country` | — | — |
| `address_postal_code` | `CharField(100)` | `address[0].postalCode` | — | — |
| `part_of_organization` | `ForeignKey(Organization)` | `partOf` (Reference) | — | — |
| `endpoint` | `ForeignKey(Endpoint)` | `endpoint[]` (Reference) | — | — |
| `contact_*` | `CharField` fields | `contact[0].name / telecom / address` | — | — |

**PHCore Extensions applied:**

| Extension URI | Field | Value Type |
|---|---|---|
| `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-organization-nhfr-code` | `nhfr_code` | `valueString` |

**FHIR Identifier Systems:**

| Use | System |
|---|---|
| NHFR facility code | `https://nhfr.doh.gov.ph` |

**Constraints:**
- `unique_together = [('name', 'address_city')]` — prevents duplicate org registrations

---

## 3. Location

**DB Table:** `location`  
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-location`

| Column | Django Field | FHIR R4 Element | Notes |
|---|---|---|---|
| `location_id` | `AutoField` (PK) | `id` | |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | Inherited + overridden |
| `status` | `CharField(100)` | `status` | `active \| suspended \| inactive` |
| `physical_type_code` | `CharField(100)` | `physicalType.coding[0].code` | |
| `type_code` | `CharField(100)` | `type[0].coding[0].code` | |
| `operational_status` | `CharField(100)` | `operationalStatus.code` | |
| `mode` | `CharField(255)` | `mode` | `instance \| kind` |
| `name` | `CharField(255)` | `name` | |
| `alias` | `CharField(255)` | `alias[0]` | |
| `description` | `TextField` | `description` | |
| `telecom` | `CharField(50)` | `telecom[0].value` | |
| `longitude` | `DecimalField(18,10)` | `position.longitude` | Numeric; changed from CharField in migration 0004 |
| `latitude` | `DecimalField(18,10)` | `position.latitude` | Numeric; changed from CharField in migration 0004 |
| `altitude` | `DecimalField(18,10)` | `position.altitude` | Numeric; changed from CharField in migration 0004 |
| `managing_organization` | `ForeignKey(Organization)` | `managingOrganization` (Reference) | |
| `part_of_location` | `ForeignKey(Location)` | `partOf` (Reference) | |
| `address_line` | `CharField(255)` | `address.line[0]` | |
| `address_city` | `CharField(255)` | `address.city` | |
| `address_district` | `CharField(255)` | `address.district` | |
| `address_state` | `CharField(255)` | `address.state` | |
| `address_country` | `CharField(255)` | `address.country` | |
| `address_postal_code` | `CharField(100)` | `address.postalCode` | |
| `hours_of_operation_days` | `CharField(255)` | `hoursOfOperation[0].daysOfWeek[]` | |
| `hours_of_operation_all_day` | `CharField(255)` | `hoursOfOperation[0].allDay` | |
| `opening_time` | `CharField(255)` | `hoursOfOperation[0].openingTime` | |
| `closing_time` | `CharField(255)` | `hoursOfOperation[0].closingTime` | |
| `availability_exceptions` | `CharField(255)` | `availabilityExceptions` | |

---

## 4. Practitioner

**DB Table:** `practitioner`  
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-practitioner`  
**FHIR serializer:** `accounts/serializers.py → PractitionerSerializer.get_fhir()`

| Column | Django Field | FHIR R4 Element | Code System | Required |
|---|---|---|---|---|
| `practitioner_id` | `AutoField` (PK) | `id` | — | Yes |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | _(internal)_ | Yes |
| `active` | `BooleanField` | `active` | — | — |
| `first_name` | `CharField(255)` | `name[0].given[0]` | — | Yes |
| `middle_name` | `CharField(255)` | `name[0].given[1]` | — | — |
| `last_name` | `CharField(255)` | `name[0].family` | — | Yes |
| `suffix_name` | `CharField(255)` | `name[0].suffix[0]` | — | — |
| `gender` | `CharField(100)` | `gender` | `http://hl7.org/fhir/administrative-gender` | — |
| `birth_date` | `DateField` | `birthDate` | — | — |
| `telecom` | `CharField(50)` | `telecom[0].value` | — | — |
| `communication_language` | `CharField(255)` | `communication[0].coding[0].code` | — | — |
| `address_*` | `CharField` fields | `address[0].*` | — | — |
| `qualification_code` | `CharField(100)` | `qualification[0].code.coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-qualification` | — |
| `qualification_identifier` | `CharField(100)` | `qualification[0].identifier[0].value` | `https://prc.gov.ph/fhir/Identifier/license` | — |
| `qualification_issuer` | `ForeignKey(Organization)` | `qualification[0].issuer` (Reference) | — | — |
| `qualification_period_start` | `DateField` | `qualification[0].period.start` | — | — |
| `qualification_period_end` | `DateField` | `qualification[0].period.end` | — | — |

**PHCore Extensions applied:**

| Extension URI | Field | Value Type |
|---|---|---|
| `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-practitioner-license-number` | `qualification_identifier` | `valueString` |

**Constraints:**
- `unique_together = [('first_name', 'last_name', 'birth_date')]`

---

## 5. PractitionerRole

**DB Table:** `practitioner_role`  
**PHCore Profile:** — (standard FHIR R4)

| Column | Django Field | FHIR R4 Element | Notes |
|---|---|---|---|
| `practitioner_role_id` | `AutoField` (PK) | `id` | |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | |
| `active` | `BooleanField` | `active` | |
| `practitioner` | `ForeignKey(Practitioner)` | `practitioner` (Reference) | Required |
| `organization` | `ForeignKey(Organization)` | `organization` (Reference) | Required |
| `location` | `ForeignKey(Location)` | `location[]` (Reference) | |
| `role_code` | `CharField(100)` | `code[0].coding[0].code` | |
| `specialty_code` | `CharField(100)` | `specialty[0].coding[0].code` | `http://snomed.info/sct` |
| `telecom` | `CharField(50)` | `telecom[0].value` | |
| `period_start` | `DateField` | `period.start` | |
| `period_end` | `DateField` | `period.end` | |
| `available_days_of_week` | `CharField(255)` | `availableTime[0].daysOfWeek[]` | |
| `available_all_day_flag` | `BooleanField` | `availableTime[0].allDay` | |
| `available_start_time` | `CharField(255)` | `availableTime[0].availableStartTime` | |
| `available_end_time` | `CharField(255)` | `availableTime[0].availableEndTime` | |
| `not_available_description` | `TextField` | `notAvailable[0].description` | |
| `not_available_period_start` | `DateField` | `notAvailable[0].during.start` | |
| `not_available_period_end` | `DateField` | `notAvailable[0].during.end` | |
| `availability_exceptions` | `CharField(255)` | `availabilityExceptions` | |
| `healthcare_service` | `ForeignKey(HealthcareService)` | `healthcareService[]` (Reference) | |
| `endpoint` | `ForeignKey(Endpoint)` | `endpoint[]` (Reference) | |

**Business Rule (enforced in `clean()`):**
- Cannot have two active roles with the same `(practitioner, organization, role_code)` tuple.

---

## 6. Schedule

**DB Table:** `appointment_schedule`  
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-schedule`  
**FHIR serializer:** `admission/serializers.py → ScheduleSerializer.to_representation()`

| Column | Django Field | FHIR R4 Element | Code System | Required |
|---|---|---|---|---|
| `schedule_id` | `AutoField` (PK) | `id` | — | Yes |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | — | Yes |
| `status` | `CharField(100)` | `active` (bool derived) | — | Yes |
| `actor_practitioner_id` | `BigIntegerField` | `actor[]` → `Practitioner/{id}` | — | — |
| `actor_location_id` | `BigIntegerField` | `actor[]` → `Location/{id}` | — | — |
| `actor_organization_id` | `BigIntegerField` | `actor[]` → `Organization/{id}` | — | — |
| `service_type_code` | `CharField(100)` | `serviceType[0].coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-service-type` | — |
| `service_type_display` | `CharField(255)` | `serviceType[0].coding[0].display` | — | — |
| `specialty_code` | `CharField(100)` | `specialty[0].coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-specialty` | — |
| `specialty_display` | `CharField(255)` | `specialty[0].coding[0].display` | — | — |
| `planning_horizon_start` | `DateTimeField` | `planningHorizon.start` | — | — |
| `planning_horizon_end` | `DateTimeField` | `planningHorizon.end` | — | — |
| `comment` | `TextField` | `comment` | — | — |

**Indexes:** `actor_practitioner_id`, `actor_location_id`, `(planning_horizon_start, planning_horizon_end)`

**Validation:** `planning_horizon_end` must be after `planning_horizon_start` (enforced in serializer).

---

## 7. Slot

**DB Table:** `appointment_slot`  
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-slot`  
**FHIR serializer:** `admission/serializers.py → SlotSerializer.to_representation()`

| Column | Django Field | FHIR R4 Element | Code System | Required |
|---|---|---|---|---|
| `slot_id` | `AutoField` (PK) | `id` | — | Yes |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | — | Yes |
| `status` | `CharField(100)` | `status` | `http://hl7.org/fhir/slotstatus` | Yes |
| `schedule` | `ForeignKey(Schedule)` | `schedule` → `Schedule/{identifier}` | — | Yes |
| `service_type_code` | `CharField(100)` | `serviceType[0].coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-service-type` | — |
| `service_type_display` | `CharField(255)` | `serviceType[0].coding[0].display` | — | — |
| `specialty_code` | `CharField(100)` | `specialty[0].coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-specialty` | — |
| `specialty_display` | `CharField(255)` | `specialty[0].coding[0].display` | — | — |
| `appointment_type_code` | `CharField(100)` | `appointmentType.coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-appointment-type` | — |
| `appointment_type_display` | `CharField(255)` | `appointmentType.coding[0].display` | — | — |
| `start` | `DateTimeField` (NOT NULL) | `start` | ISO 8601 datetime | Yes |
| `end` | `DateTimeField` (NOT NULL) | `end` | ISO 8601 datetime | Yes |
| `overbooked` | `BooleanField` | `overbooked` | — | — |
| `comment` | `TextField` | `comment` | — | — |

**Status values:** `busy | free | busy-unavailable | busy-tentative | entered-in-error`

---

## 8. Appointment

**DB Table:** `appointment`  
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-appointment`  
**FHIR serializer:** `admission/serializers.py → AppointmentSerializer.to_representation()`

| Column | Django Field | FHIR R4 Element | Code System | Required |
|---|---|---|---|---|
| `appointment_id` | `AutoField` (PK) | `id` | — | Yes |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | — | Yes |
| `status` | `CharField(100)` | `status` | `http://hl7.org/fhir/appointmentstatus` | Yes |
| `cancellation_reason_code` | `CharField(100)` | `cancelationReason.coding[0].code` | — | — |
| `cancellation_reason_display` | `CharField(255)` | `cancelationReason.coding[0].display` | — | — |
| `service_category_code` | `CharField(100)` | `serviceCategory[0].coding[0].code` | — | — |
| `service_category_display` | `CharField(255)` | `serviceCategory[0].coding[0].display` | — | — |
| `service_type_code` | `CharField(100)` | `serviceType[0].coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-service-type` | — |
| `service_type_display` | `CharField(255)` | `serviceType[0].coding[0].display` | — | — |
| `specialty_code` | `CharField(100)` | `specialty[0].coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-specialty` | — |
| `specialty_display` | `CharField(255)` | `specialty[0].coding[0].display` | — | — |
| `appointment_type_code` | `CharField(100)` | `appointmentType.coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-appointment-type` | — |
| `appointment_type_display` | `CharField(255)` | `appointmentType.coding[0].display` | — | — |
| `reason_code` | `CharField(255)` | `reasonCode[0].coding[0].code` | `http://snomed.info/sct` | — |
| `priority` | `PositiveSmallIntegerField` | `priority` | — | — |
| `description` | `TextField` | `description` | — | — |
| `start` | `DateTimeField` | `start` | ISO 8601 | — |
| `end` | `DateTimeField` | `end` | ISO 8601 | — |
| `created_datetime` | `DateTimeField` | `created` | — | — |
| `minutes_duration` | `PositiveSmallIntegerField` | `minutesDuration` | — | — |
| `slot_id` | `BigIntegerField` | `slot[]` → `Slot/{id}` | — | — |
| `patient_id` | `BigIntegerField` (NOT NULL) | `participant[SBJ].actor` → `Patient/{id}` | `http://terminology.hl7.org/CodeSystem/v3-ParticipationType` (SBJ) | Yes |
| `patient_participation_status` | `CharField(50)` | `participant[SBJ].status` | `accepted \| declined \| tentative \| needs-action` | — |
| `practitioner_id` | `BigIntegerField` | `participant[PPRF].actor` → `Practitioner/{id}` | (PPRF) | — |
| `practitioner_participation_status` | `CharField(50)` | `participant[PPRF].status` | — | — |
| `location_id` | `BigIntegerField` | `participant[LOC].actor` → `Location/{id}` | (LOC) | — |
| `based_on_service_request_id` | `BigIntegerField` | `basedOn[]` → `ServiceRequest/{id}` | — | — |
| `resulting_encounter_id` | `BigIntegerField` | _(flat field only — not serialized to FHIR output)_ | — | — |
| `comment` | `TextField` | `comment` | — | — |
| `patient_instruction` | `TextField` | `patientInstruction` | — | — |

**Status values:** `proposed | pending | booked | arrived | fulfilled | cancelled | noshow | entered-in-error | checked-in | waitlist`

**FHIR participant[] array** — built dynamically in `to_representation()`:

| Participant | Type Code | Actor Reference | Status Source |
|---|---|---|---|
| Patient | `SBJ` (Subject) | `Patient/{patient_id}` | `patient_participation_status` or `"accepted"` |
| Practitioner | `PPRF` (Primary performer) | `Practitioner/{practitioner_id}` | `practitioner_participation_status` or `"accepted"` |
| Location | `LOC` (Location) | `Location/{location_id}` | `"accepted"` (fixed) |

---

## 9. ServiceRequest

**DB Table:** `service_request`  
**PHCore Profile:** — (standard FHIR R4, minimal implementation)

| Column | Django Field | FHIR R4 Element | Notes |
|---|---|---|---|
| `service_request_id` | `AutoField` (PK) | `id` | |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | |
| `status` | `CharField(100)` | `status` | |
| `intent` | `CharField(100)` | `intent` | `proposal \| plan \| directive \| order \| ...` |
| `priority` | `CharField(100)` | `priority` | |
| `code` | `CharField(255)` | `code.coding[0].code` | |
| `code_system` | `CharField(255)` | `code.coding[0].system` | |
| `code_display` | `CharField(255)` | `code.coding[0].display` | |
| `subject_id` | `BigIntegerField` | `subject` → `Patient/{id}` | Required |
| `encounter_id` | `BigIntegerField` | `encounter` → `Encounter/{id}` | |
| `requester_id` | `BigIntegerField` | `requester` → `Practitioner/{id}` | |
| `performer_id` | `BigIntegerField` | `performer[]` → `Practitioner/{id}` | |
| `reason_code` | `CharField(255)` | `reasonCode[0].coding[0].code` | |
| `note` | `TextField` | `note[0].text` | |
| `occurrence_datetime` | `DateTimeField` | `occurrenceDateTime` | |
| `authored_on` | `DateTimeField` | `authoredOn` | |

---

## 10. Coverage

**DB Table:** `billing_coverage`  
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-coverage`  
**FHIR serializer:** `billing/serializers.py → CoverageSerializer.to_representation()`

| Column | Django Field | FHIR R4 Element | Code System | Required |
|---|---|---|---|---|
| `coverage_id` | `AutoField` (PK) | `id` | — | Yes |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | _(internal)_ | Yes |
| `status` | `CharField(100)` | `status` | `active \| cancelled \| draft \| entered-in-error` | Yes |
| `type_code` | `CharField(100)` | `type.coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-coverage-type` | — |
| `type_display` | `CharField(255)` | `type.coding[0].display` | — | — |
| `policy_holder_id` | `BigIntegerField` | `policyHolder` → `Patient/{id}` or `Organization/{id}` | — | — |
| `subscriber_id` | `BigIntegerField` | `subscriber` → `Patient/{id}` | — | — |
| `beneficiary_id` | `BigIntegerField` (NOT NULL) | `beneficiary` → `Patient/{id}` | — | Yes |
| `payor_id` | `BigIntegerField` | `payor[]` → `Organization/{id}` | — | — |
| `subscriber_pin` | `CharField(14)` | `subscriberId` | PhilHealth PIN (`XX-XXXXXXXXX-X`) — PHCore-level constraint, not R4-enforced | — |
| `class_code` | `CharField(100)` | `class[0].type.coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-coverage-class` | — |
| `class_name` | `CharField(255)` | `class[0].name` | — | — |
| `period_start` | `DateField` | `period.start` | — | — |
| `period_end` | `DateField` | `period.end` | — | — |
| `dependent` | `CharField(10)` | `dependent` | 0 = principal, 1+ = dependent | — |
| `relationship_code` | `CharField(100)` | `relationship.coding[0].code` | `http://terminology.hl7.org/CodeSystem/subscriber-relationship` | — |
| `relationship_display` | `CharField(255)` | `relationship.coding[0].display` | — | — |
| `order` | `PositiveSmallIntegerField` | `order` | — | — |
| `network` | `CharField(255)` | `network` | e.g. `Z-Benefit`, `Konsulta Package` | — |
| `cost_to_beneficiary` | `TextField` | `costToBeneficiary[0].valueString` | — | — |

**Subscriber relationship codes** (`http://terminology.hl7.org/CodeSystem/subscriber-relationship`):
`self | spouse | child | parent | other`

---

## 11. Claim

**DB Table (header):** `billing_claim`  
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-claim`  
**FHIR serializer:** `billing/serializers.py → EClaimSerializer.to_representation()`

### 11a. Claim (header — `billing_claim`)

| Column | Django Field | FHIR R4 Element | Code System | Required |
|---|---|---|---|---|
| `claim_id` | `AutoField` (PK) | `id` | — | Yes |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | — | Yes |
| `status` | `CharField(100)` | `status` | `draft \| active \| cancelled \| entered-in-error` | Yes |
| `type` | `CharField(100)` | `type.coding[0].code` | `http://terminology.hl7.org/CodeSystem/claim-type` | — |
| `subType` | `CharField(100)` | `subType.coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-claim-type` | — |
| `use` | `CharField(255)` | `use` | `claim \| preauthorization \| predetermination` | — |
| `subject_id` | `BigIntegerField` | `patient` → `Patient/{id}` | — | Yes |
| `insurer_id` | `BigIntegerField` | `insurer` → `Organization/{id}` | — | Yes* |
| `provider_id` | `BigIntegerField` | `provider` → `Practitioner/{id}` | — | — |
| `facility_id` | `BigIntegerField` | `facility` → `Location/{id}` | — | — |
| `enterer_id` | `BigIntegerField` | `enterer` → `Practitioner/{id}` | — | — |
| `billablePeriod_start` | `DateField` | `billablePeriod.start` | — | — |
| `billablePeriod_end` | `DateField` | `billablePeriod.end` | — | — |
| `created` | `DateTimeField` | `created` | ISO 8601 | — |
| `priority` | `CharField(255)` | `priority.coding[0].code` | `http://terminology.hl7.org/CodeSystem/processpriority` | — |
| `total` | `DecimalField(12,2)` | `total.value` | — | — |
| `total_currency` | `CharField(10)` | `total.currency` | ISO 4217 (default `PHP`) | — |
| `related_claim_id` | `BigIntegerField` | `related[0].claim` → `Claim/{id}` | — | — |
| `payee_type` | `CharField(100)` | `payee.type.coding[0].code` | — | — |
| `accident_date` | `DateField` | `accident.date` | — | — |
| `accident_type` | `CharField(100)` | `accident.type.coding[0].code` | — | — |

> *`insurer_id` required by serializer validation: `{'insurer_id': {'required': True, 'allow_null': False}}`

### 11b. ClaimDiagnosis (`billing_claim_diagnosis`)

| Column | FHIR R4 Element | Notes |
|---|---|---|
| `sequence` | `diagnosis[].sequence` | |
| `diagnosisCodeableConcept` | `diagnosis[].diagnosisCodeableConcept.coding[0].code` | ICD-10 code; validated `^[A-Z][0-9A-Z]{1,6}(\.[0-9A-Z]{1,4})?$` |
| `diagnosisReference` | `diagnosis[].diagnosisReference` (Reference) | |
| `type` | `diagnosis[].type[0].coding[0].code` | `http://terminology.hl7.org/CodeSystem/ex-diagnosistype` |
| `onAdmission` | `diagnosis[].onAdmission.coding[0].code` | |
| `packageCode` | `diagnosis[].packageCode.coding[0].code` | |

### 11c. ClaimProcedure (`billing_claim_procedure`)

| Column | FHIR R4 Element | Notes |
|---|---|---|
| `sequence` | `procedure[].sequence` | |
| `type` | `procedure[].type[0].coding[0].code` | `http://terminology.hl7.org/CodeSystem/ex-procedure-type` |
| `procedureCodeableConcept` | `procedure[].procedureCodeableConcept.coding[0].code` | SNOMED CT |
| `procedureReference` | `procedure[].procedureReference` (Reference) | |

### 11d. ClaimCareTeam (`billing_claim_care_team`)

| Column | FHIR R4 Element | Notes |
|---|---|---|
| `sequence` | `careTeam[].sequence` | |
| `provider_id` | `careTeam[].provider` → `Practitioner/{id}` | |
| `responsible` | `careTeam[].responsible` | Boolean string |
| `role` | `careTeam[].role.coding[0].code` | `http://terminology.hl7.org/CodeSystem/v3-RoleCode` |
| `qualification` | `careTeam[].qualification.coding[0].code` | |

### 11e. ClaimItem (`billing_claim_item`)

| Column | FHIR R4 Element | Notes |
|---|---|---|
| `sequence` | `item[].sequence` | |
| `category` | `item[].category.coding[0].code` | |
| `productOrService` | `item[].productOrService.coding[0].code` | SNOMED CT |
| `servicedDate` | `item[].servicedDate` | |
| `quantity` | `item[].quantity.value` | FHIR Quantity |
| `unitPrice` | `item[].unitPrice` | FHIR Money (PHP) |
| `net` | `item[].net` | FHIR Money (PHP) |

### 11f. ClaimSupportingInfo (`billing_claim_supporting_info`)

| Column | FHIR R4 Element |
|---|---|
| `category` | `supportingInfo[].category.coding[0].code` |
| `code` | `supportingInfo[].code.coding[0].code` |
| `timing_date` / `timing_period_*` | `supportingInfo[].timing[x]` |
| `value_boolean` / `value_string` / `value_quantity` | `supportingInfo[].value[x]` |

### 11g. ClaimItemDetail (`billing_claim_item_detail`) / ClaimItemDetailSubDetail (`claim_item_detail_sub_detail`)

Nested line-item breakdowns. Same fields as ClaimItem (sequence, category, productOrService, quantity, unitPrice, net).

---

## 12. ClaimResponse

**DB Table (header):** `billing_claim_response`  
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-claim-response`  
**FHIR serializer:** `billing/serializers.py → ClaimResponseSerializer.to_representation()`

### 12a. ClaimResponse (header)

| Column | Django Field | FHIR R4 Element | Required |
|---|---|---|---|
| `claimResponse_id` | `AutoField` (PK) | `id` | Yes |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | Yes |
| `status` | `CharField(100)` | `status` | Yes |
| `type` | `CharField(100)` | `type.coding[0].code` | — |
| `use` | `CharField(255)` | `use` | — |
| `subject_id` | `BigIntegerField` | `patient` → `Patient/{id}` | Yes |
| `insurer_id` | `BigIntegerField` | `insurer` → `Organization/{id}` | — |
| `requestor_id` | `BigIntegerField` | `requestor` → `Practitioner/{id}` | — |
| `request_id` | `BigIntegerField` | `request` → `Claim/{id}` | — |
| `created` | `DateTimeField` | `created` | — |
| `outcome` | `CharField(255)` | `outcome` | `queued \| complete \| error \| partial` |
| `disposition` | `TextField` | `disposition` | — |
| `preAuthRef` | `CharField(255)` | `preAuthRef` | — |
| `preAuthPeriod_start` / `_end` | `DateField` | `preAuthPeriod.start/end` | — |
| `payment_type` | `CharField(100)` | `payment.type.coding[0].code` | — |
| `payment_date` | `DateTimeField` | `payment.date` | — |
| `payment_adjustment` | `CharField(255)` | `payment.adjustment.value` | — |
| `payment_adjustmentReason` | `CharField(255)` | `payment.adjustmentReason.coding[0].code` | — |

### 12b. ClaimResponseTotal (`billing_claim_response_total`)

| Column | FHIR R4 Element |
|---|---|
| `category` | `total[].category.coding[0].code` |
| `amount` | `total[].amount` (FHIR Money, PHP) |

### 12c. ClaimResponseItem / Detail / SubDetail / AddItem / Error / ProcessNote

Supporting normalized tables for adjudication results, process notes, and errors. See `billing/models.py` for full field list.

---

## 13. Invoice

**DB Table:** `billing_invoice`  
**PHCore Profile:** — (standard FHIR R4)

| Column | Django Field | FHIR R4 Element | Notes |
|---|---|---|---|
| `invoice_id` | `AutoField` (PK) | `id` | |
| `identifier` | `CharField(unique)` | `identifier[0].value` | Auto-generated `INV-YYYYMMDDHHmmss` |
| `status` | `CharField` | `status` | `draft \| issued \| balanced \| cancelled \| entered-in-error` |
| `type` | `CharField(100)` | `type.coding[0].code` | |
| `subject_id` | `BigIntegerField` | `subject` → `Patient/{id}` | Required |
| `recipient_id` | `BigIntegerField` | `recipient` → `Organization/{id}` | |
| `issuer_id` | `BigIntegerField` | `issuer` → `Organization/{id}` | |
| `account_id` | `BigIntegerField` | `account` → `Account/{id}` | |
| `invoice_datetime` | `DateTimeField` | `date` | |
| `participant_role` | `CharField(255)` | `participant[0].role.coding[0].code` | |
| `participant_actor_id` | `BigIntegerField` | `participant[0].actor` | |
| `total_net_value` | `DecimalField(10,2)` | `totalNet.value` | |
| `total_net_currency` | `CharField(3)` | `totalNet.currency` | ISO 4217 |
| `total_gross_value` | `DecimalField(10,2)` | `totalGross.value` | |
| `total_gross_currency` | `CharField(3)` | `totalGross.currency` | ISO 4217 |
| `payment_terms` | `CharField(255)` | `paymentTerms` | |
| `note` | `TextField` | `note[0].text` | |

**InvoiceLineItem (`billing_invoice_line_item`):**

| Column | FHIR R4 Element |
|---|---|
| `sequence` | `lineItem[].sequence` |
| `chargeitem_reference_id` | `lineItem[].chargeItem[Reference]` |
| `chargeitem_code` | `lineItem[].chargeItem[CodeableConcept]` |
| `description` | _(snapshot field, not standard FHIR)_ |
| `quantity` | _(no direct FHIR R4 mapping — belongs on a ChargeItem reference)_ |
| `unit_price` | `lineItem[].priceComponent[].amount` (type=`base`) |
| `net_value` | _(derived, not standard FHIR)_ |
| `gross_value` | _(derived, not standard FHIR)_ |

**Auto-generation logic:** `InvoiceManager.generate_from_pending_orders()` aggregates unbilled `DiagnosticReport` (lab) and `MedicationRequest` (pharmacy) records for a patient into a single Invoice with line items.

---

## 14. PaymentReconciliation

**DB Table:** `billing_payment_reconciliation`  
**PHCore Profile:** — (standard FHIR R4)

| Column | Django Field | FHIR R4 Element | Notes |
|---|---|---|---|
| `payment_reconciliation_id` | `AutoField` (PK) | `id` | |
| `identifier` | `CharField(unique)` | `identifier[0].value` | |
| `status` | `CharField` | `status` | |
| `period_start` / `period_end` | `DateField` | `period.start/end` | |
| `created_datetime` | `DateTimeField` | `created` | |
| `payment_issuer_id` | `BigIntegerField` | `paymentIssuer` → `Organization/{id}` | |
| `requestor_id` | `BigIntegerField` | `requestor` → `Organization/{id}` | |
| `outcome` | `CharField(255)` | `outcome` | |
| `disposition` | `TextField` | `disposition` | |
| `payment_date` | `DateTimeField` | `paymentDate` | |
| `payment_amount_value` | `DecimalField(10,2)` | `paymentAmount.value` | |
| `payment_amount_currency` | `CharField(3)` | `paymentAmount.currency` | ISO 4217 |
| `payment_identifier` | `CharField(100)` | `paymentIdentifier.value` | |
| `invoice` | `ForeignKey(Invoice)` | _(fortress extension)_ | Direct link to Invoice |

**PaymentReconciliationDetail (`billing_payment_reconciliation_detail`)** — per-allocation line items.

---

## 15. Account

**DB Table:** `account`  
**PHCore Profile:** — (standard FHIR R4)

| Column | Django Field | FHIR R4 Element | Notes |
|---|---|---|---|
| `account_id` | `AutoField` (PK) | `id` | |
| `identifier` | `CharField(unique)` | `identifier[0].value` | |
| `status` | `CharField` | `status` | `active \| inactive \| entered-in-error` |
| `type` | `CharField(100)` | `type.coding[0].code` | |
| `name` | `CharField(255)` | `name` | |
| `subject_id` | `BigIntegerField` | `subject[]` → `Patient/{id}` | |
| `servicePeriod_start` / `_end` | `DateField` | `servicePeriod.start/end` | |
| `coverage_reference_id` | `BigIntegerField` | `coverage[0].coverage` → `Coverage/{id}` | |
| `coverage_priority` | `CharField(255)` | `coverage[0].priority` | |
| `owner_id` | `BigIntegerField` | `owner` → `Organization/{id}` | |
| `description` | `TextField` | `description` | |
| `guarantor_party_id` | `BigIntegerField` | `guarantor[0].party` | |
| `guarantor_onHold` | `CharField(255)` | `guarantor[0].onHold` | |
| `guarantor_period_*` | `DateField` | `guarantor[0].period.start/end` | |
| `partOf_id` | `BigIntegerField` | `partOf` → `Account/{id}` | |

---

## Code Systems Reference

| Alias | URI | Used For |
|---|---|---|
| `HL7_CLAIM_TYPE` | `http://terminology.hl7.org/CodeSystem/claim-type` | Claim.type |
| `HL7_CLAIM_USE` | `http://terminology.hl7.org/CodeSystem/claim-use` | Claim.use, ClaimResponse.use |
| `HL7_SUBSCRIBER_REL` | `http://terminology.hl7.org/CodeSystem/subscriber-relationship` | Coverage.relationship |
| `HL7_ACT_CODE` | `http://terminology.hl7.org/CodeSystem/v3-ActCode` | Encounter class |
| `HL7_MARITAL` | `http://terminology.hl7.org/CodeSystem/v3-MaritalStatus` | Patient.maritalStatus |
| `HL7_PRIORITY` | `http://terminology.hl7.org/CodeSystem/processpriority` | Claim.priority |
| `HL7_DIAGNOSIS_TYPE` | `http://terminology.hl7.org/CodeSystem/ex-diagnosistype` | ClaimDiagnosis.type |
| `HL7_PROCEDURE_TYPE` | `http://terminology.hl7.org/CodeSystem/ex-procedure-type` | ClaimProcedure.type |
| `HL7_ROLE_CODE` | `http://terminology.hl7.org/CodeSystem/v3-RoleCode` | CareTeam.role |
| `HL7_APPT_STATUS` | `http://hl7.org/fhir/appointmentstatus` | Appointment.status |
| `HL7_SLOT_STATUS` | `http://hl7.org/fhir/slotstatus` | Slot.status |
| `HL7_SERVICE_TYPE` | `http://terminology.hl7.org/CodeSystem/service-type` | Standard service types |
| `HL7_PARTICIPANT_TYPE` | `http://terminology.hl7.org/CodeSystem/v3-ParticipationType` | Appointment.participant.type |
| `ICD10_SYSTEM` | `http://hl7.org/fhir/sid/icd-10` | ClaimDiagnosis codes |
| `SNOMED_SYSTEM` | `http://snomed.info/sct` | Procedures, specialty |
| `PHIC_IDENTIFIER_SYSTEM` | `http://philhealth.gov.ph/fhir/Identifier/philhealth-id` | Patient.identifier (PhilHealth) |
| `NHFR_IDENTIFIER_SYSTEM` | `https://nhfr.doh.gov.ph` | Organization.identifier (NHFR) |
| `PHC_COVERAGE_TYPE_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-coverage-type` | Coverage.type |
| `PHC_COVERAGE_CLASS_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-coverage-class` | Coverage.class[].type |
| `PHC_CLAIM_TYPE_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-claim-type` | Claim.subType |
| `PHC_SERVICE_TYPE_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-service-type` | Schedule/Slot/Appointment.serviceType |
| `PHC_APPT_TYPE_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-appointment-type` | Slot/Appointment.appointmentType |
| `PHC_SPECIALTY_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-specialty` | Schedule/Slot/Appointment.specialty |
| `PHC_FACILITY_TYPE_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-facility-type` | Organization.type |

---

## PHCore Extension URIs

All extensions use the base: `urn://example.com/ph-core/fhir/StructureDefinition`

| Short name | Full URI | Resource | Field |
|---|---|---|---|
| `ph-core-patient-indigenous` | `.../ph-core-patient-indigenous` | Patient | `indigenous_flag` |
| `ph-core-patient-indigenous-group` | `.../ph-core-patient-indigenous-group` | Patient | `indigenous_group` |
| `ph-core-patient-disability-type` | `.../ph-core-patient-disability-type` | Patient | `pwd_type` |
| `ph-core-patient-nationality` | `.../ph-core-patient-nationality` | Patient | `nationality` |
| `ph-core-practitioner-license-number` | `.../ph-core-practitioner-license-number` | Practitioner | `qualification_identifier` |
| `ph-core-organization-nhfr-code` | `.../ph-core-organization-nhfr-code` | Organization | `nhfr_code` |
| `ph-core-organization-philhealth-accreditation` | `.../ph-core-organization-philhealth-accreditation` | Organization | _(future)_ |

---

## PHCore Profile URIs

| Resource | Profile URI |
|---|---|
| Patient | `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-patient` |
| Practitioner | `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-practitioner` |
| Organization | `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-organization` |
| Coverage | `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-coverage` |
| Claim | `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-claim` |
| ClaimResponse | `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-claim-response` |
| Schedule | `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-schedule` |
| Slot | `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-slot` |
| Appointment | `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-appointment` |
| Location | `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-location` |

---

## Key Architectural Patterns

### Fortress Pattern
Cross-app references are stored as `BigIntegerField` (not Django FK) to prevent circular imports between apps. For example, `Appointment.patient_id` is an integer pointing to `patients.Patient`, not a FK.

### FHIR Serializer Hybrid
Every `to_representation()` returns **all original flat fields plus a `fhir` key** containing the FHIR R4 JSON. This preserves frontend backward compatibility while exposing standards-compliant output to the WAH4PC gateway.

### WAH4PC Gateway
Patient FHIR bundles are submitted to `wah4pc.echosphere.cfd` via `patients/wah4pc.py`. The PHCore validation service requires `urn://example.com/ph-core/fhir/...` URN scheme (not `https://philcore.fhir.org.ph/`).

### Validation rules

| Rule | Location | Detail |
|---|---|---|
| PhilHealth ID format | `patients/models.py` | `^\d{2}-\d{9}-\d$` |
| PhilHealth PIN format | `billing/models.py` | `XX-XXXXXXXXX-X` (14 chars) |
| ICD-10 diagnosis code | `billing/serializers.py` | `^[A-Z][0-9A-Z]{1,6}(\.[0-9A-Z]{1,4})?$` |
| Schedule horizon order | `admission/serializers.py` | `planning_horizon_end > planning_horizon_start` |
| PractitionerRole uniqueness | `accounts/models.py` | No two active roles with same `(practitioner, organization, role_code)` |
| Claim insurer required | `billing/serializers.py` | `insurer_id` is required and non-null |
