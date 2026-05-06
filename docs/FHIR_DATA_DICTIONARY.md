# WAH4H FHIR / PHCore R4 Data Dictionary

**Version:** 2.0 — 2026-05-05
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
| `PractitionerRole` | PractitionerRole | `practitioner_role` | `ph-core-practitioner-role` | accounts |
| `Schedule` | Schedule | `appointment_schedule` | `ph-core-schedule` | admission |
| `Slot` | Slot | `appointment_slot` | `ph-core-slot` | admission |
| `Appointment` | Appointment | `appointment` | `ph-core-appointment` | admission |
| `ServiceRequest` | ServiceRequest | `service_request` | `ph-core-service-request` | admission |
| `Coverage` | Coverage | `billing_coverage` | `ph-core-coverage` | billing |
| `Claim` | Claim | `billing_claim` | `ph-core-claim` | billing |
| `ClaimResponse` | ClaimResponse | `billing_claim_response` | `ph-core-claim-response` | billing |
| `Invoice` | Invoice | `billing_invoice` | `ph-core-invoice` | billing |
| `PaymentReconciliation` | PaymentReconciliation | `billing_payment_reconciliation` | `ph-core-payment-reconciliation` | billing |
| `Account` | Account | `account` | `ph-core-account` | billing |

---

## Base Classes

### `FHIRResourceModel` (abstract, `core.models`)

All FHIR resources in this system inherit these columns:

| Column | Django Field | FHIR Element | Notes |
|---|---|---|---|
| `identifier` | `CharField(max_length=100, unique=True)` | `identifier[0].value` | Business identifier; auto-generated on create |
| `status` | `CharField(max_length=100)` | `status` | Resource-specific value set |
| `created_at` | `DateTimeField(auto_now_add=True)` | _(audit field, not serialized as FHIR)_ | |
| `updated_at` | `DateTimeField(auto_now=True)` | `meta.lastUpdated` | Injected by `fhir_meta(resource_type, obj.updated_at)` |

### WAH4H Internal Identifier Systems

All business identifiers use WAH4H-specific URI systems — never `urn:uuid`:

| Resource | System URI |
|---|---|
| Claim | `https://wah4h.echosphere.cfd/fhir/identifier/claim` |
| ClaimResponse | `https://wah4h.echosphere.cfd/fhir/identifier/claim-response` |
| Coverage | `https://wah4h.echosphere.cfd/fhir/identifier/coverage` |
| Schedule | `https://wah4h.echosphere.cfd/fhir/identifier/schedule` |
| Slot | `https://wah4h.echosphere.cfd/fhir/identifier/slot` |
| Appointment | `https://wah4h.echosphere.cfd/fhir/identifier/appointment` |
| Practitioner | `https://wah4h.echosphere.cfd/fhir/identifier/practitioner` |
| ServiceRequest | `https://wah4h.echosphere.cfd/fhir/identifier/service-request` |
| Invoice | `https://wah4h.echosphere.cfd/fhir/identifier/invoice` |
| PaymentReconciliation | `https://wah4h.echosphere.cfd/fhir/identifier/payment-reconciliation` |
| Account | `https://wah4h.echosphere.cfd/fhir/identifier/account` |
| PractitionerRole | `https://wah4h.echosphere.cfd/fhir/identifier/practitioner-role` |

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
- `active=True` → `status='active'`

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

**FHIR output notes:**
- `meta.lastUpdated` populated from `obj.updated_at`
- `meta.profile` = `[ph-core-organization]`

**Constraints:**
- `unique_together = [('name', 'address_city')]`

---

## 3. Location

**DB Table:** `location`
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-location`

| Column | Django Field | FHIR R4 Element | Notes |
|---|---|---|---|
| `location_id` | `AutoField` (PK) | `id` | |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | |
| `status` | `CharField(100)` | `status` | `active \| suspended \| inactive` |
| `physical_type_code` | `CharField(100)` | `physicalType.coding[0].code` | |
| `type_code` | `CharField(100)` | `type[0].coding[0].code` | |
| `operational_status` | `CharField(100)` | `operationalStatus.code` | |
| `mode` | `CharField(255)` | `mode` | `instance \| kind` |
| `name` | `CharField(255)` | `name` | |
| `alias` | `CharField(255)` | `alias[0]` | |
| `description` | `TextField` | `description` | |
| `telecom` | `CharField(50)` | `telecom[0].value` | |
| `longitude` | `DecimalField(18,10)` | `position.longitude` | |
| `latitude` | `DecimalField(18,10)` | `position.latitude` | |
| `altitude` | `DecimalField(18,10)` | `position.altitude` | |
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
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | `https://wah4h.echosphere.cfd/fhir/identifier/practitioner` | Yes |
| `active` | `BooleanField` | `active` | — | — |
| `first_name` | `CharField(255)` | `name[0].given[0]` | — | Yes |
| `middle_name` | `CharField(255)` | `name[0].given[1]` | — | — |
| `last_name` | `CharField(255)` | `name[0].family` | — | Yes |
| `suffix_name` | `CharField(255)` | `name[0].suffix[0]` | — | — |
| `gender` | `CharField(100)` | `gender` | `http://hl7.org/fhir/administrative-gender` | — |
| `birth_date` | `DateField` | `birthDate` | — | — |
| `telecom` | `CharField(50)` | `telecom[0].value` | — | — |
| `qualification_code` | `CharField(100)` | `qualification[0].code.coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-qualification` | — |
| `qualification_identifier` | `CharField(100)` | `qualification[0].identifier[0].value` | `https://prc.gov.ph/fhir/Identifier/license` | — |
| `qualification_issuer_id` | `BigIntegerField` | `qualification[0].issuer` → `Organization/{id}` | — | — |
| `qualification_period_start` | `DateField` | `qualification[0].period.start` | — | — |
| `qualification_period_end` | `DateField` | `qualification[0].period.end` | — | — |

**PHCore Extensions applied:**

| Extension URI | Field | Value Type |
|---|---|---|
| `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-practitioner-license-number` | `qualification_identifier` | `valueString` |

**FHIR output notes:**
- `meta.lastUpdated` populated from `obj.updated_at`
- `identifier[0].system` = `WAH4H_PRACTITIONER_SYSTEM` (not `urn:uuid`)

**Constraints:**
- `unique_together = [('first_name', 'last_name', 'birth_date')]`

---

## 5. PractitionerRole

**DB Table:** `practitioner_role`
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-practitioner-role`
**FHIR serializer:** `accounts/serializers.py → PractitionerRoleSerializer.to_representation()`

| Column | Django Field | FHIR R4 Element | Code System | Required |
|---|---|---|---|---|
| `practitioner_role_id` | `AutoField` (PK) | `id` | — | Yes |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | `https://wah4h.echosphere.cfd/fhir/identifier/practitioner-role` | Yes |
| `active` | `BooleanField` | `active` | — | — |
| `practitioner` | `ForeignKey(Practitioner)` | `practitioner` → `Practitioner/{id}` | — | Yes (1..1) |
| `organization` | `ForeignKey(Organization)` | `organization` → `Organization/{id}` | — | — |
| `location` | `ForeignKey(Location)` | `location[]` → `Location/{id}` | — | — |
| `role_code` | `CharField(100)` | `code[0].coding[0].code` | `http://terminology.hl7.org/CodeSystem/v3-RoleCode` | — |
| `specialty_code` | `CharField(100)` | `specialty[0].coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-specialty` | — |
| `telecom` | `CharField(50)` | `telecom[0].value` | — | — |
| `period_start` | `DateField` | `period.start` | — | — |
| `period_end` | `DateField` | `period.end` | — | — |
| `available_days_of_week` | `CharField(255)` | `availableTime[0].daysOfWeek[]` | Comma-separated | — |
| `available_all_day_flag` | `BooleanField` | `availableTime[0].allDay` | — | — |
| `available_start_time` | `CharField(255)` | `availableTime[0].availableStartTime` | — | — |
| `available_end_time` | `CharField(255)` | `availableTime[0].availableEndTime` | — | — |
| `not_available_description` | `TextField` | `notAvailable[0].description` | — | — |
| `not_available_period_start` | `DateField` | `notAvailable[0].during.start` | — | — |
| `not_available_period_end` | `DateField` | `notAvailable[0].during.end` | — | — |
| `availability_exceptions` | `CharField(255)` | `availabilityExceptions` | — | — |
| `healthcare_service` | `ForeignKey(HealthcareService)` | `healthcareService[]` (Reference) | — | — |
| `endpoint` | `ForeignKey(Endpoint)` | `endpoint[]` (Reference) | — | — |

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
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | `https://wah4h.echosphere.cfd/fhir/identifier/schedule` | Yes |
| `status` | `CharField(100)` | _(drives `active` boolean — see note)_ | — | Yes |
| `actor_practitioner_id` | `BigIntegerField` | `actor[]` → `Practitioner/{id}` | — | — |
| `actor_location_id` | `BigIntegerField` | `actor[]` → `Location/{id}` | — | — |
| `actor_organization_id` | `BigIntegerField` | `actor[]` → `Organization/{id}` | — | — |
| `service_type_code` | `CharField(100)` | `serviceType[0].coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-service-type` | — |
| `service_type_display` | `CharField(255)` | `serviceType[0].coding[0].display` | — | — |
| `specialty_code` | `CharField(100)` | `specialty[0].coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-specialty` | — |
| `specialty_display` | `CharField(255)` | `specialty[0].coding[0].display` | — | — |
| `planning_horizon_start` | `DateTimeField` | `planningHorizon.start` | — | Yes |
| `planning_horizon_end` | `DateTimeField` | `planningHorizon.end` | — | Yes |
| `comment` | `TextField` | `comment` | — | — |

**FHIR output notes:**
- `active` (boolean) = `obj.status == "active"` — derived by `SerializerMethodField`, not a model column
- `actor[]` built dynamically from whichever actor IDs are non-null
- **FHIR R4 cardinality: `actor` is 1..*** — validated in `validate()`: at least one of `actor_practitioner_id`, `actor_location_id`, `actor_organization_id` must be provided
- `meta.lastUpdated` populated from `obj.updated_at`

**Indexes:** `actor_practitioner_id`, `actor_location_id`, `(planning_horizon_start, planning_horizon_end)`

---

## 7. Slot

**DB Table:** `appointment_slot`
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-slot`
**FHIR serializer:** `admission/serializers.py → SlotSerializer.to_representation()`

| Column | Django Field | FHIR R4 Element | Code System | Required |
|---|---|---|---|---|
| `slot_id` | `AutoField` (PK) | `id` | — | Yes |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | `https://wah4h.echosphere.cfd/fhir/identifier/slot` | Yes |
| `status` | `CharField(100)` | `status` | `http://hl7.org/fhir/slotstatus` | Yes |
| `schedule` | `ForeignKey(Schedule)` | `schedule` → `Schedule/{schedule.identifier}` | — | Yes (1..1) |
| `service_type_code` | `CharField(100)` | `serviceType[0].coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-service-type` | — |
| `service_type_display` | `CharField(255)` | `serviceType[0].coding[0].display` | — | — |
| `specialty_code` | `CharField(100)` | `specialty[0].coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-specialty` | — |
| `specialty_display` | `CharField(255)` | `specialty[0].coding[0].display` | — | — |
| `appointment_type_code` | `CharField(100)` | `appointmentType.coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-appointment-type` | — |
| `appointment_type_display` | `CharField(255)` | `appointmentType.coding[0].display` | — | — |
| `start` | `DateTimeField` (NOT NULL) | `start` | ISO 8601 | Yes |
| `end` | `DateTimeField` (NOT NULL) | `end` | ISO 8601 | Yes |
| `overbooked` | `BooleanField` | `overbooked` | — | — |
| `comment` | `TextField` | `comment` | — | — |

**FHIR output notes:**
- `schedule` reference uses `obj.schedule.identifier` (the Schedule's string identifier), not integer PK
- `meta.lastUpdated` populated from `obj.updated_at`

**Status values:** `busy | free | busy-unavailable | busy-tentative | entered-in-error`

---

## 8. Appointment

**DB Table:** `appointment`
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-appointment`
**FHIR serializer:** `admission/serializers.py → AppointmentSerializer.to_representation()`

| Column | Django Field | FHIR R4 Element | Code System | Required |
|---|---|---|---|---|
| `appointment_id` | `AutoField` (PK) | `id` | — | Yes |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | `https://wah4h.echosphere.cfd/fhir/identifier/appointment` | Yes |
| `status` | `CharField(100)` | `status` | `http://hl7.org/fhir/appointmentstatus` | Yes |
| `cancellation_reason_code` | `CharField(100)` | `cancelationReason.coding[0].code` | `http://terminology.hl7.org/CodeSystem/v3-ActCode` | — |
| `cancellation_reason_display` | `CharField(255)` | `cancelationReason.coding[0].display` | — | — |
| `service_category_code` | `CharField(100)` | `serviceCategory[0].coding[0].code` | `http://terminology.hl7.org/CodeSystem/service-category` | — |
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
| `slot_id` | `BigIntegerField` | `slot[]` → `Slot/{slot.identifier}` | — | — |
| `patient_id` | `BigIntegerField` (NOT NULL) | `participant[SBJ].actor` → `Patient/{id}` | `http://terminology.hl7.org/CodeSystem/v3-ParticipationType` (SBJ) | Yes |
| `patient_participation_status` | `CharField(50)` | `participant[SBJ].status` | `accepted \| declined \| tentative \| needs-action` | — |
| `practitioner_id` | `BigIntegerField` | `participant[PPRF].actor` → `Practitioner/{id}` | (PPRF) | — |
| `practitioner_participation_status` | `CharField(50)` | `participant[PPRF].status` | — | — |
| `location_id` | `BigIntegerField` | `participant[LOC].actor` → `Location/{id}` | (LOC) | — |
| `based_on_service_request_id` | `BigIntegerField` | `basedOn[]` → `ServiceRequest/{id}` | — | — |
| `resulting_encounter_id` | `BigIntegerField` | _(flat field only — not serialized to FHIR output)_ | — | — |
| `comment` | `TextField` | `comment` | — | — |
| `patient_instruction` | `TextField` | `patientInstruction` | — | — |

**FHIR output notes:**
- `cancelationReason` — FHIR R4 single-l spelling (not `cancellation`)
- `serviceCategory` uses `HL7_SERVICE_CATEGORY` (`http://terminology.hl7.org/CodeSystem/service-category`), distinct from `serviceType`
- `slot[]` reference resolves `Slot.objects.get(slot_id=obj.slot_id).identifier` at serialization time, using the Slot's string identifier
- `participant[]` array is built dynamically; `patient_id` is NOT NULL so at least one participant always present (FHIR R4 `participant` is 1..*)
- `meta.lastUpdated` populated from `obj.updated_at`

**Status values:** `proposed | pending | booked | arrived | fulfilled | cancelled | noshow | entered-in-error | checked-in | waitlist`

**FHIR participant[] array:**

| Participant | Type Code | Actor Reference | Status Source |
|---|---|---|---|
| Patient | `SBJ` (Subject) | `Patient/{patient_id}` | `patient_participation_status` or `"accepted"` |
| Practitioner | `PPRF` (Primary performer) | `Practitioner/{practitioner_id}` | `practitioner_participation_status` or `"accepted"` |
| Location | `LOC` (Location) | `Location/{location_id}` | `"accepted"` (fixed) |

---

## 9. ServiceRequest

**DB Table:** `service_request`
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-service-request`
**FHIR serializer:** `admission/serializers.py → ServiceRequestSerializer.to_representation()`

| Column | Django Field | FHIR R4 Element | Notes |
|---|---|---|---|
| `service_request_id` | `AutoField` (PK) | `id` | |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | `https://wah4h.echosphere.cfd/fhir/identifier/service-request` |
| `status` | `CharField(100)` | `status` | Required (1..1) |
| `intent` | `CharField(100)` | `intent` | Defaults to `"order"` if blank. Required (1..1) |
| `priority` | `CharField(100)` | `priority` | |
| `code` | `CharField(255)` | `code.coding[0].code` | |
| `code_system` | `CharField(255)` | `code.coding[0].system` | Falls back to `http://snomed.info/sct` |
| `code_display` | `CharField(255)` | `code.coding[0].display` | |
| `subject_id` | `BigIntegerField` | `subject` → `Patient/{id}` | Required (1..1) |
| `encounter_id` | `BigIntegerField` | `encounter` → `Encounter/{id}` | |
| `requester_id` | `BigIntegerField` | `requester` → `Practitioner/{id}` | |
| `performer_id` | `BigIntegerField` | `performer[]` → `Practitioner/{id}` | |
| `reason_code` | `CharField(255)` | `reasonCode[0].coding[0].code` | `http://snomed.info/sct` |
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
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | `https://wah4h.echosphere.cfd/fhir/identifier/coverage` | Yes |
| `status` | `CharField(100)` | `status` | `active \| cancelled \| draft \| entered-in-error` | Yes |
| `type_code` | `CharField(100)` | `type.coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-coverage-type` | — |
| `type_display` | `CharField(255)` | `type.coding[0].display` | — | — |
| `subscriber_id` | `BigIntegerField` | `subscriber` → `Patient/{id}` | — | — |
| `beneficiary_id` | `BigIntegerField` (NOT NULL) | `beneficiary` → `Patient/{id}` | — | Yes (1..1) |
| `payor_id` | `BigIntegerField` | `payor[]` → `Organization/{id}` | — | Yes (1..*) |
| `subscriber_pin` | `CharField(14)` | `subscriberId` + PHCore extension | `XX-XXXXXXXXX-X` (PhilHealth PIN) | — |
| `class_code` | `CharField(100)` | `class[0].type.coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-coverage-class` | — |
| `class_name` | `CharField(255)` | `class[0].name` | — | — |
| `period_start` | `DateField` | `period.start` | — | — |
| `period_end` | `DateField` | `period.end` | — | — |
| `dependent` | `CharField(10)` | `dependent` | 0 = principal, 1+ = dependent | — |
| `relationship_code` | `CharField(100)` | `relationship.coding[0].code` | `http://terminology.hl7.org/CodeSystem/subscriber-relationship` | — |
| `relationship_display` | `CharField(255)` | `relationship.coding[0].display` | — | — |
| `order` | `PositiveSmallIntegerField` | `order` | — | — |
| `network` | `CharField(255)` | `network` | e.g. `Z-Benefit`, `Konsulta Package` | — |

**FHIR output notes:**
- `subscriber` is omitted from FHIR output when `subscriber_id` is null (not fabricated from `beneficiary_id`)
- `payor[]` is **required** — `validate()` raises `ValidationError` if `payor_id` is blank
- `meta.lastUpdated` populated from `obj.updated_at`

**PHCore extension:**
- `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-coverage-philhealth-pin` → `subscriber_pin` (valueString)

**Subscriber relationship codes:** `self | spouse | child | parent | other`

---

## 11. Claim

**DB Table (header):** `billing_claim`
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-claim`
**FHIR serializer:** `billing/serializers.py → EClaimSerializer.to_representation()`

### 11a. Claim (header — `billing_claim`)

| Column | Django Field | FHIR R4 Element | Code System | Required |
|---|---|---|---|---|
| `claim_id` | `AutoField` (PK) | `id` | — | Yes |
| `identifier` | `CharField(100, unique)` | `identifier[0].value` | `https://wah4h.echosphere.cfd/fhir/identifier/claim` | Yes |
| `status` | `CharField(100)` | `status` | `draft \| active \| cancelled \| entered-in-error` | Yes |
| `type` | `CharField(100)` | `type.coding[0].code` | `http://terminology.hl7.org/CodeSystem/claim-type` | — |
| `subType` | `CharField(100)` | `subType.coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-claim-type` | — |
| `use` | `CharField(255)` | `use` | `claim \| preauthorization \| predetermination` | — |
| `subject_id` | `BigIntegerField` | `patient` → `Patient/{id}` | — | Yes |
| `insurer_id` | `BigIntegerField` | `insurer` → `Organization/{id}` | — | Yes* |
| `provider_id` | `BigIntegerField` | `provider` → `Practitioner/{id}` | — | Yes** |
| `coverage_id` | `BigIntegerField` | `insurance[0].coverage` → `Coverage/{id}` | — | — |
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

> \* `insurer_id` required by serializer: `{'insurer_id': {'required': True, 'allow_null': False}}`
> \** `provider_id` required by serializer: `{'provider_id': {'required': True, 'allow_null': False}}` (FHIR R4 `Claim.provider` is 1..1)

**FHIR `insurance[]` array:**
- Serialized as `insurance[0]` with `sequence:1`, `focal:true`, `coverage: Coverage/{coverage_id}`
- Array is empty `[]` when `coverage_id` is null — populate `coverage_id` on all new claims

**FHIR output notes:**
- `meta.lastUpdated` populated from `obj.updated_at`

### 11b. ClaimDiagnosis (`billing_claim_diagnosis`)

| Column | FHIR R4 Element | Notes |
|---|---|---|
| `sequence` | `diagnosis[].sequence` | |
| `diagnosisCodeableConcept` | `diagnosis[].diagnosisCodeableConcept.coding[0].code` | ICD-10; validated `^[A-Z][0-9A-Z]{1,6}(\.[0-9A-Z]{1,4})?$` |
| `type` | `diagnosis[].type[0].coding[0].code` | `http://terminology.hl7.org/CodeSystem/ex-diagnosistype` |
| `onAdmission` | `diagnosis[].onAdmission.coding[0].code` | |
| `packageCode` | `diagnosis[].packageCode.coding[0].code` | |

### 11c. ClaimProcedure (`billing_claim_procedure`)

| Column | FHIR R4 Element | Notes |
|---|---|---|
| `sequence` | `procedure[].sequence` | |
| `type` | `procedure[].type[0].coding[0].code` | `http://terminology.hl7.org/CodeSystem/ex-procedure-type` |
| `procedureCodeableConcept` | `procedure[].procedureCodeableConcept.coding[0].code` | SNOMED CT |

### 11d. ClaimCareTeam (`billing_claim_care_team`)

| Column | FHIR R4 Element | Notes |
|---|---|---|
| `sequence` | `careTeam[].sequence` | |
| `provider_id` | `careTeam[].provider` → `Practitioner/{id}` | |
| `responsible` | `careTeam[].responsible` | Boolean string |
| `role` | `careTeam[].role.coding[0].code` | `http://terminology.hl7.org/CodeSystem/v3-RoleCode` |

### 11e. ClaimItem (`billing_claim_item`)

| Column | FHIR R4 Element | Notes |
|---|---|---|
| `sequence` | `item[].sequence` | |
| `productOrService` | `item[].productOrService.coding[0].code` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-service-type` |
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
| `outcome` | `CharField(255)` | `outcome` | `queued \| complete \| error \| partial` — defaults to `"queued"` when null |
| `disposition` | `TextField` | `disposition` | — |
| `preAuthRef` | `CharField(255)` | `preAuthRef` | — |
| `preAuthPeriod_start` / `_end` | `DateField` | `preAuthPeriod.start/end` | — |
| `payment_type` | `CharField(100)` | `payment.type.coding[0].code` | — |
| `payment_date` | `DateTimeField` | `payment.date` | — |
| `payment_adjustment` | `CharField(255)` | `payment.adjustment.value` | — |
| `payment_adjustmentReason` | `CharField(255)` | `payment.adjustmentReason.coding[0].code` | — |
| `payment_amount_value` | `DecimalField(12,2)` | `payment.amount.value` | — |
| `payment_amount_currency` | `CharField(10)` | `payment.amount.currency` | ISO 4217, default `PHP` |

**FHIR output notes:**
- `outcome` is 1..1 in FHIR R4 — defaults to `"queued"` if null
- `payment.amount` is included when `payment` block is present, using `payment_amount_value/currency`
- `identifier[0].system` = `WAH4H_CLAIM_RESPONSE_SYSTEM`
- `meta.lastUpdated` populated from `obj.updated_at`

### 12b. ClaimResponseTotal (`billing_claim_response_total`)

| Column | FHIR R4 Element |
|---|---|
| `category` | `total[].category.coding[0].code` — `http://terminology.hl7.org/CodeSystem/adjudication` |
| `amount` | `total[].amount` (FHIR Money, PHP) |

---

## 13. Invoice

**DB Table:** `billing_invoice`
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-invoice`
**FHIR serializer:** `billing/serializers.py → InvoiceSerializer.to_representation()`

| Column | Django Field | FHIR R4 Element | Notes |
|---|---|---|---|
| `invoice_id` | `AutoField` (PK) | `id` | |
| `identifier` | `CharField(unique)` | `identifier[0].value` | `https://wah4h.echosphere.cfd/fhir/identifier/invoice` |
| `status` | `CharField` | `status` | `draft \| issued \| balanced \| cancelled \| entered-in-error` |
| `type` | `CharField(100)` | `type.coding[0].code` | `http://terminology.hl7.org/CodeSystem/v3-ActCode` |
| `subject_id` | `BigIntegerField` | `subject` → `Patient/{id}` | Required |
| `recipient_id` | `BigIntegerField` | `recipient` → `Patient/{id}` | |
| `issuer_id` | `BigIntegerField` | `issuer` → `Organization/{id}` | |
| `account_id` | `BigIntegerField` | `account` → `Account/{id}` | |
| `invoice_datetime` | `DateTimeField` | `date` | |
| `participant_role` | `CharField(255)` | `participant[0].role.coding[0].code` | `http://terminology.hl7.org/CodeSystem/v3-ParticipationType` |
| `participant_actor_id` | `BigIntegerField` | `participant[0].actor` → `Practitioner/{id}` | |
| `total_net_value` | `DecimalField(10,2)` | `totalNet.value` | Auto-calculated from line items |
| `total_net_currency` | `CharField(3)` | `totalNet.currency` | ISO 4217, default `PHP` |
| `total_gross_value` | `DecimalField(10,2)` | `totalGross.value` | Auto-calculated |
| `total_gross_currency` | `CharField(3)` | `totalGross.currency` | ISO 4217, default `PHP` |
| `payment_terms` | `CharField(255)` | `paymentTerms` | |
| `note` | `TextField` | `note[0].text` | |

**InvoiceLineItem (`billing_invoice_line_item`):**

| Column | FHIR R4 Element | Notes |
|---|---|---|
| `sequence` | `lineItem[].sequence` | |
| `chargeitem_code` | `lineItem[].chargeItemCodeableConcept` | Used when set; code system `urn://example.com/ph-core/fhir/CodeSystem/ph-core-service-type` |
| `chargeitem_reference_id` | `lineItem[].chargeItemReference` → `ChargeItem/{id}` | Fallback when `chargeitem_code` is null |
| `description` | _(snapshot field, not standard FHIR)_ | |
| `quantity` | _(line-item level; no direct FHIR Invoice mapping — belongs on ChargeItem)_ | |
| `unit_price` | `lineItem[].priceComponent[base].amount` | |

> **chargeItem[x] rule:** FHIR R4 `lineItem.chargeItem[x]` is 1..1. Serializer prefers `chargeItemCodeableConcept` when `chargeitem_code` is set; falls back to `chargeItemReference` when only `chargeitem_reference_id` is set.

**Auto-generation logic:** `InvoiceManager.generate_from_pending_orders()` aggregates unbilled `DiagnosticReport` (lab) and `MedicationRequest` (pharmacy) records for a patient into a single Invoice with line items.

---

## 14. PaymentReconciliation

**DB Table:** `billing_payment_reconciliation`
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-payment-reconciliation`
**FHIR serializer:** `billing/serializers.py → PaymentReconciliationSerializer.to_representation()`

| Column | Django Field | FHIR R4 Element | Notes |
|---|---|---|---|
| `payment_reconciliation_id` | `AutoField` (PK) | `id` | |
| `identifier` | `CharField(unique)` | `identifier[0].value` | `https://wah4h.echosphere.cfd/fhir/identifier/payment-reconciliation` |
| `status` | `CharField` | `status` | |
| `period_start` / `period_end` | `DateField` | `period.start/end` | |
| `created_datetime` | `DateTimeField` | `created` | |
| `payment_issuer_id` | `BigIntegerField` | `paymentIssuer` → `Organization/{id}` | |
| `requestor_id` | `BigIntegerField` | `requestor` → `Practitioner/{id}` | |
| `request_task_id` | `BigIntegerField` | `request` → `Task/{id}` | |
| `outcome` | `CharField(255)` | `outcome` | |
| `disposition` | `TextField` | `disposition` | |
| `payment_date` | `DateTimeField` | `paymentDate` | |
| `payment_amount_value` | `DecimalField(10,2)` | `paymentAmount.value` | |
| `payment_amount_currency` | `CharField(3)` | `paymentAmount.currency` | ISO 4217, default `PHP` |
| `payment_identifier` | `CharField(100)` | `paymentIdentifier.value` | |
| `invoice` | `ForeignKey(Invoice)` | _(fortress extension — not standard FHIR)_ | Direct link to Invoice |
| `form_code` | `CharField(100)` | `formCode.coding[0].code` | `http://terminology.hl7.org/CodeSystem/forms-codes` |

**PaymentReconciliationDetail (`billing_payment_reconciliation_detail`):**

| Column | FHIR R4 Element | Notes |
|---|---|---|
| `identifier` | `detail[].identifier.value` | |
| `predecessor_identifier` | `detail[].predecessor.value` | |
| `type` | `detail[].type.coding[0].code` | `http://terminology.hl7.org/CodeSystem/ex-paymenttype` — **1..1 required**; detail entries with null type are omitted from FHIR output |
| `request_id` | `detail[].request` → `Claim/{id}` | |
| `submitter_id` | `detail[].submitter` → `Organization/{id}` | |
| `response_id` | `detail[].response` → `ClaimResponse/{id}` | |
| `date` | `detail[].date` | |
| `responsible_id` | `detail[].responsible` → `Practitioner/{id}` | |
| `payee_id` | `detail[].payee` → `Organization/{id}` | |
| `amount_value` / `amount_currency` | `detail[].amount` (FHIR Money) | |

---

## 15. Account

**DB Table:** `account`
**PHCore Profile:** `urn://example.com/ph-core/fhir/StructureDefinition/ph-core-account`
**FHIR serializer:** `billing/serializers.py → AccountSerializer.to_representation()`

| Column | Django Field | FHIR R4 Element | Notes |
|---|---|---|---|
| `account_id` | `AutoField` (PK) | `id` | |
| `identifier` | `CharField(unique)` | `identifier[0].value` | `https://wah4h.echosphere.cfd/fhir/identifier/account` |
| `status` | `CharField` | `status` | `active \| inactive \| entered-in-error` |
| `type` | `CharField(100)` | `type.coding[0].code` | `http://terminology.hl7.org/CodeSystem/v3-ActCode` |
| `name` | `CharField(255)` | `name` | |
| `subject_id` | `BigIntegerField` | `subject[]` → `Patient/{id}` | NOT NULL |
| `servicePeriod_start` / `_end` | `DateField` | `servicePeriod.start/end` | |
| `coverage_reference_id` | `BigIntegerField` | `coverage[0].coverage` → `Coverage/{id}` | |
| `coverage_priority` | `CharField(255)` | `coverage[0].priority` | |
| `owner_id` | `BigIntegerField` | `owner` → `Organization/{id}` | |
| `description` | `TextField` | `description` | |
| `guarantor_party_id` | `BigIntegerField` | `guarantor[0].party` → `Patient/{id}` | |
| `guarantor_onHold` | `CharField(255)` | `guarantor[0].onHold` | |
| `guarantor_period_*` | `DateField` | `guarantor[0].period.start/end` | |
| `partOf_id` | `BigIntegerField` | `partOf` → `Account/{id}` | |

---

## Code Systems Reference

| Alias | URI | Used For |
|---|---|---|
| `HL7_CLAIM_TYPE` | `http://terminology.hl7.org/CodeSystem/claim-type` | Claim.type, ClaimResponse.type |
| `HL7_SUBSCRIBER_REL` | `http://terminology.hl7.org/CodeSystem/subscriber-relationship` | Coverage.relationship |
| `HL7_ACT_CODE` | `http://terminology.hl7.org/CodeSystem/v3-ActCode` | Encounter class, Invoice.type, Account.type |
| `HL7_MARITAL` | `http://terminology.hl7.org/CodeSystem/v3-MaritalStatus` | Patient.maritalStatus |
| `HL7_PRIORITY` | `http://terminology.hl7.org/CodeSystem/processpriority` | Claim.priority |
| `HL7_DIAGNOSIS_TYPE` | `http://terminology.hl7.org/CodeSystem/ex-diagnosistype` | ClaimDiagnosis.type |
| `HL7_PROCEDURE_TYPE` | `http://terminology.hl7.org/CodeSystem/ex-procedure-type` | ClaimProcedure.type |
| `HL7_ROLE_CODE` | `http://terminology.hl7.org/CodeSystem/v3-RoleCode` | CareTeam.role, PractitionerRole.code |
| `HL7_APPT_STATUS` | `http://hl7.org/fhir/appointmentstatus` | Appointment.status |
| `HL7_SLOT_STATUS` | `http://hl7.org/fhir/slotstatus` | Slot.status |
| `HL7_SERVICE_CATEGORY` | `http://terminology.hl7.org/CodeSystem/service-category` | Appointment.serviceCategory |
| `HL7_SERVICE_TYPE` | `http://terminology.hl7.org/CodeSystem/service-type` | Standard service types |
| `HL7_PARTICIPANT_TYPE` | `http://terminology.hl7.org/CodeSystem/v3-ParticipationType` | Appointment.participant.type |
| `HL7_ADJUDICATION` | `http://terminology.hl7.org/CodeSystem/adjudication` | ClaimResponseTotal.category |
| `HL7_PAYMENT_TYPE_CS` | `http://terminology.hl7.org/CodeSystem/ex-paymenttype` | ClaimResponse.payment.type, PaymentReconciliation.detail.type |
| `HL7_PAYMENT_ADJ` | `http://terminology.hl7.org/CodeSystem/payment-adjustment-reason` | ClaimResponse.payment.adjustmentReason |
| `ICD10_SYSTEM` | `http://hl7.org/fhir/sid/icd-10` | ClaimDiagnosis codes |
| `SNOMED_SYSTEM` | `http://snomed.info/sct` | Procedures, specialty, ServiceRequest.code |
| `PHIC_IDENTIFIER_SYSTEM` | `http://philhealth.gov.ph/fhir/Identifier/philhealth-id` | Patient.identifier (PhilHealth) |
| `NHFR_IDENTIFIER_SYSTEM` | `https://nhfr.doh.gov.ph` | Organization.identifier (NHFR) |
| `PHC_COVERAGE_TYPE_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-coverage-type` | Coverage.type |
| `PHC_COVERAGE_CLASS_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-coverage-class` | Coverage.class[].type |
| `PHC_CLAIM_TYPE_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-claim-type` | Claim.subType |
| `PHC_SERVICE_TYPE_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-service-type` | Schedule/Slot/Appointment.serviceType, Claim.item.productOrService |
| `PHC_APPT_TYPE_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-appointment-type` | Slot/Appointment.appointmentType |
| `PHC_SPECIALTY_CS` | `urn://example.com/ph-core/fhir/CodeSystem/ph-core-specialty` | Schedule/Slot/Appointment.specialty, PractitionerRole.specialty |
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
| `ph-core-coverage-philhealth-pin` | `.../ph-core-coverage-philhealth-pin` | Coverage | `subscriber_pin` |

---

## PHCore Profile URIs

All profile URIs use the base: `urn://example.com/ph-core/fhir/StructureDefinition`

| Resource | Profile URI |
|---|---|
| Patient | `.../ph-core-patient` |
| Practitioner | `.../ph-core-practitioner` |
| PractitionerRole | `.../ph-core-practitioner-role` |
| Organization | `.../ph-core-organization` |
| Location | `.../ph-core-location` |
| Coverage | `.../ph-core-coverage` |
| Claim | `.../ph-core-claim` |
| ClaimResponse | `.../ph-core-claim-response` |
| Schedule | `.../ph-core-schedule` |
| Slot | `.../ph-core-slot` |
| Appointment | `.../ph-core-appointment` |
| Invoice | `.../ph-core-invoice` |
| Account | `.../ph-core-account` |
| PaymentReconciliation | `.../ph-core-payment-reconciliation` |
| ServiceRequest | `.../ph-core-service-request` |

---

## Key Architectural Patterns

### Fortress Pattern
Cross-app references are stored as `BigIntegerField` (not Django FK) to prevent circular imports between apps. For example, `Appointment.patient_id` is an integer pointing to `patients.Patient`, not a FK.

### FHIR Serializer Hybrid
Every `to_representation()` / `get_fhir()` returns **all original flat fields plus a `fhir` key** containing the FHIR R4 JSON. This preserves frontend backward compatibility while exposing standards-compliant output to the WAH4PC gateway.

### FHIR meta block
Every FHIR resource includes:
```json
{
  "meta": {
    "profile": ["urn://example.com/ph-core/fhir/StructureDefinition/<profile-name>"],
    "lastUpdated": "<ISO 8601 datetime from obj.updated_at>"
  }
}
```
Generated by `fhir_meta(resource_type, obj.updated_at)` in `core/fhir_utils.py`.

### WAH4PC Gateway
Patient FHIR bundles are submitted to `wah4pc.echosphere.cfd` via `patients/wah4pc.py`. The PHCore validation service requires `urn://example.com/ph-core/fhir/...` URN scheme (not `https://philcore.fhir.org.ph/`).

---

## Validation Rules

| Rule | Location | Detail |
|---|---|---|
| PhilHealth ID format | `patients/models.py` | `^\d{2}-\d{9}-\d$` |
| PhilHealth PIN format | `billing/models.py` | `XX-XXXXXXXXX-X` (14 chars) |
| ICD-10 diagnosis code | `billing/serializers.py` | `^[A-Z][0-9A-Z]{1,6}(\.[0-9A-Z]{1,4})?$` |
| Coverage.payor required | `billing/serializers.py` | `payor_id` must not be blank (FHIR R4 `payor` is 1..*) |
| Claim.provider required | `billing/serializers.py` | `provider_id` required via `extra_kwargs` (FHIR R4 `provider` is 1..1) |
| Claim.insurer required | `billing/serializers.py` | `insurer_id` required via `extra_kwargs` |
| ClaimResponse.outcome default | `billing/serializers.py` | Defaults to `"queued"` when null (FHIR R4 `outcome` is 1..1) |
| Schedule.actor required | `admission/serializers.py` | At least one actor ID must be set (FHIR R4 `actor` is 1..*) |
| Schedule horizon order | `admission/serializers.py` | `planning_horizon_end > planning_horizon_start` |
| Slot overlap prevention | `admission/serializers.py` | No two slots in same schedule may overlap |
| Appointment duplicate prevention | `admission/serializers.py` | Patient cannot have two overlapping active appointments |
| PractitionerRole uniqueness | `accounts/models.py` | No two active roles with same `(practitioner, organization, role_code)` |

---

## Migration History (billing)

| Migration | Changes |
|---|---|
| `0001_initial.py` | Initial schema |
| `0002_add_coverage_fix_claim_total.py` | Coverage model added; Claim.total changed to DecimalField |
| `0003_claim_coverage_id_claimresponse_payment_amount.py` | Added `Claim.coverage_id`; added `ClaimResponse.payment_amount_value` and `payment_amount_currency` |
