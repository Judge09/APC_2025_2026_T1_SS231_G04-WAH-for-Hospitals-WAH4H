# WAH4H – User Stories

> **Format:** Stories follow the standard Agile format compatible with Jira, OpenProject, and similar platforms.
> Each story includes an **Epic prefix**, **role**, **intent**, **business value**, **acceptance criteria**, **priority**, and **story point estimate**.
>
> **Story ID format:** `[EPIC-NNN]` — copy the ID directly as the issue key when creating tickets.
>
> **Epics:**
> | Prefix | Epic |
> |--------|------|
> | AUTH | Authentication & Account Management |
> | PAT | Patient Management |
> | ADM | Admission & Encounters |
> | MON | Monitoring & Vital Signs |
> | LAB | Laboratory |
> | PHR | Pharmacy |
> | BIL | Billing & Financial Management |
> | DIS | Discharge |
> | SYS | System Administration |
> | DASH | Dashboard & Analytics |
> | SEC | Security & Compliance |

---

## Epic: AUTH – Authentication & Account Management

---

### AUTH-001 · Initiate Staff Account Registration

- **As a** new hospital staff member
- **I want to** submit my registration details and receive an OTP on my email
- **So that** I can begin the process of creating a verified account in WAH4H

**Acceptance Criteria:**
- [ ] The registration form collects: first name, last name, email, password, role, and organization
- [ ] On form submission, the system validates the email is not already registered
- [ ] A 6-digit OTP is sent to the provided email address
- [ ] The form shows a clear error if the email is already in use
- [ ] Password must be at least 12 characters, not purely numeric, and not a common password

**Priority:** High
**Story Points:** 5

---

### AUTH-002 · Complete Registration via OTP Verification

- **As a** new hospital staff member who received an OTP
- **I want to** enter my OTP to verify my email and activate my account
- **So that** I can log in and start using the system

**Acceptance Criteria:**
- [ ] The OTP input screen is displayed after initiation
- [ ] The system accepts the correct OTP and creates the user account
- [ ] An incorrect OTP shows a clear error message
- [ ] The OTP expires after a defined time window and the user can request a new one
- [ ] On success, the user is redirected to the login screen

**Priority:** High
**Story Points:** 3

---

### AUTH-003 · Initiate Two-Step Login

- **As a** registered staff member
- **I want to** log in using my email and password
- **So that** the system can verify my identity before granting access

**Acceptance Criteria:**
- [ ] The login form accepts email and password
- [ ] On correct credentials, an OTP is sent to the registered email
- [ ] On incorrect credentials, a descriptive error is shown (no account enumeration)
- [ ] Login attempts are rate-limited (max 60/min per IP)

**Priority:** High
**Story Points:** 3

---

### AUTH-004 · Complete Login via OTP Verification

- **As a** staff member who received a login OTP
- **I want to** enter my OTP to complete login
- **So that** I receive my JWT access and refresh tokens and can access the system

**Acceptance Criteria:**
- [ ] Correct OTP returns a 15-minute access token and a refresh token
- [ ] Incorrect OTP shows an error without exposing token data
- [ ] Successful login redirects the user to the dashboard appropriate for their role
- [ ] Tokens are stored securely (HttpOnly cookies or secure storage)

**Priority:** High
**Story Points:** 3

---

### AUTH-005 · Refresh JWT Access Token

- **As a** logged-in staff member
- **I want to** have my session automatically refreshed
- **So that** I am not abruptly logged out during active work

**Acceptance Criteria:**
- [ ] The frontend silently calls the token refresh endpoint before the 15-minute access token expires
- [ ] A valid refresh token returns a new access token
- [ ] An expired or blacklisted refresh token redirects the user to the login screen
- [ ] The old refresh token is blacklisted after rotation

**Priority:** High
**Story Points:** 3

---

### AUTH-006 · Initiate Password Reset

- **As a** staff member who has forgotten their password
- **I want to** request a password reset via my registered email
- **So that** I can regain access to my account

**Acceptance Criteria:**
- [ ] A "Forgot Password" link is accessible from the login page
- [ ] Submitting a registered email sends a password-reset OTP to that address
- [ ] Password reset requests are rate-limited (max 3/min)
- [ ] The response does not reveal whether the email exists in the system

**Priority:** High
**Story Points:** 3

---

### AUTH-007 · Complete Password Reset via OTP

- **As a** staff member who received a password-reset OTP
- **I want to** enter the OTP and set a new password
- **So that** I can log in again with my new credentials

**Acceptance Criteria:**
- [ ] The OTP and new password are submitted together
- [ ] The new password must pass OWASP-compliant rules (min 12 chars, not numeric-only, not a common password)
- [ ] On success, the old password is invalidated and the user is redirected to login
- [ ] Expired or invalid OTP shows a descriptive error

**Priority:** High
**Story Points:** 3

---

### AUTH-008 · Change Password While Logged In

- **As a** logged-in staff member
- **I want to** change my password from my account settings
- **So that** I can maintain account security proactively

**Acceptance Criteria:**
- [ ] The change-password flow requires an OTP verification step
- [ ] Current password confirmation is required before the OTP is sent
- [ ] The new password must meet OWASP-compliant rules
- [ ] On success, all existing tokens are invalidated and the user is redirected to login

**Priority:** Medium
**Story Points:** 3

---

### AUTH-009 · Role-Based Access Control

- **As a** system administrator
- **I want to** assign a specific role to each staff account
- **So that** each user only sees and interacts with the modules relevant to their job

**Acceptance Criteria:**
- [ ] Roles available: System Administrator, Doctor, Nurse, Lab Technician, Pharmacist, Billing Clerk
- [ ] Each role grants access to a defined set of modules (see role matrix in `docs/ROLE_QUICK_REFERENCE.md`)
- [ ] Navigation menus display only modules the current user's role can access
- [ ] API endpoints return 403 Forbidden when a user attempts to access a resource outside their role
- [ ] Role assignment is visible and editable by Administrators only

**Priority:** High
**Story Points:** 8

---

## Epic: PAT – Patient Management

---

### PAT-001 · Register a New Patient

- **As a** doctor or nurse
- **I want to** register a new patient with their demographic and contact information
- **So that** the patient has a record in the system that other modules can reference

**Acceptance Criteria:**
- [ ] Registration form collects: first name, last name, date of birth, sex, civil status, nationality, address, contact number
- [ ] Optional fields: PhilHealth ID (format XX-XXXXXXXXX-X validated), blood type, PWD status, indigenous people status
- [ ] Emergency contact information can be recorded
- [ ] Duplicate PhilHealth ID is rejected with a clear error
- [ ] Saved patient appears in the patient list with a unique system ID

**Priority:** High
**Story Points:** 8

---

### PAT-002 · Search and View Patient Records

- **As a** doctor, nurse, or authorized staff member
- **I want to** search for a patient by name, PhilHealth ID, or system ID
- **So that** I can quickly retrieve their record to view or update it

**Acceptance Criteria:**
- [ ] Search bar is available on the patient list page
- [ ] Search is case-insensitive and supports partial name matches
- [ ] Results list shows: name, date of birth, PhilHealth ID, last encounter date
- [ ] Clicking a patient opens their full profile
- [ ] Results are paginated (50 per page)

**Priority:** High
**Story Points:** 5

---

### PAT-003 · Edit Patient Demographics

- **As a** doctor or nurse
- **I want to** update a patient's demographic information
- **So that** the record remains accurate if details change (e.g., address, contact number)

**Acceptance Criteria:**
- [ ] All demographic fields are editable from the patient profile
- [ ] PhilHealth ID format is re-validated on edit
- [ ] Changes are saved with an updated timestamp
- [ ] Audit trail is maintained (updated_at field reflects last change)

**Priority:** Medium
**Story Points:** 3

---

### PAT-004 · Record a Patient Condition / Diagnosis

- **As a** doctor
- **I want to** record a medical condition or diagnosis for a patient
- **So that** it is part of their permanent clinical history

**Acceptance Criteria:**
- [ ] Condition form collects: condition name/code, clinical status (active/resolved/recurrence), severity, onset date
- [ ] Optional: abatement date, stage, evidence, notes
- [ ] A patient can have multiple conditions listed
- [ ] Conditions are displayed on the patient profile in chronological order
- [ ] Clinical status can be updated as the patient's condition changes

**Priority:** High
**Story Points:** 5

---

### PAT-005 · Record Patient Allergies and Intolerances

- **As a** doctor or nurse
- **I want to** record a patient's known allergies or drug intolerances
- **So that** clinicians and pharmacists are warned before administering substances

**Acceptance Criteria:**
- [ ] Allergy form collects: substance, clinical status, criticality (low/high/unable-to-assess)
- [ ] Reaction details can be added: manifestation, severity
- [ ] Multiple allergies per patient are supported
- [ ] Allergy list is prominently visible on the patient profile
- [ ] Pharmacists see allergy warnings when processing prescriptions

**Priority:** High
**Story Points:** 5

---

### PAT-006 · Record Patient Immunization History

- **As a** doctor or nurse
- **I want to** record a patient's vaccinations
- **So that** their immunization history is available for clinical decisions

**Acceptance Criteria:**
- [ ] Immunization form collects: vaccine code/name, date administered, lot number, expiry date
- [ ] Performer (administering practitioner) can be linked
- [ ] Protocol/series information is recordable (e.g., dose 1 of 3)
- [ ] Multiple immunization records per patient are supported
- [ ] Records are sorted by date administered

**Priority:** Medium
**Story Points:** 5

---

### PAT-007 · Fetch Patient Records from Inter-Hospital Gateway (WAH4PC)

- **As a** doctor or nurse
- **I want to** query the WAH4PC network for a patient's records from other hospitals
- **So that** I have a complete clinical picture even if the patient was previously treated elsewhere

**Acceptance Criteria:**
- [ ] A "Fetch from Gateway" action is available on the patient profile
- [ ] The system sends a query to the WAH4PC gateway using the patient's PhilHealth ID
- [ ] Returned data (encounters, procedures, immunizations) is displayed for review before import
- [ ] The transaction is logged in the WAH4PCTransaction audit table (type: pull, status tracked)
- [ ] Network errors are handled gracefully with a user-friendly message

**Priority:** High
**Story Points:** 8

---

### PAT-008 · Push Patient Records to Inter-Hospital Gateway (WAH4PC)

- **As a** doctor
- **I want to** send a patient's records to the WAH4PC network
- **So that** other hospitals treating the same patient can access their history

**Acceptance Criteria:**
- [ ] A "Send to Gateway" action is available on the patient profile
- [ ] The system packages the patient's record as a FHIR bundle and sends it to the gateway
- [ ] The transaction is logged in the WAH4PCTransaction audit table (type: push, status tracked)
- [ ] Success and failure states are communicated to the user
- [ ] Only authorized roles (Doctor) can trigger a push

**Priority:** High
**Story Points:** 8

---

## Epic: ADM – Admission & Encounters

---

### ADM-001 · Create a New Encounter (Admission)

- **As a** doctor or nurse
- **I want to** create an encounter record when a patient arrives at the hospital
- **So that** all clinical activities are linked to this visit

**Acceptance Criteria:**
- [ ] Encounter form requires: patient, encounter class (inpatient/outpatient/emergency), start date/time
- [ ] Optional: admission source, expected discharge date
- [ ] The encounter is linked to the selected patient record
- [ ] A newly created encounter appears in the encounters list with status "in-progress"
- [ ] Doctor, nurse, and administrator roles can create encounters

**Priority:** High
**Story Points:** 5

---

### ADM-002 · Assign Patient to a Ward, Room, and Bed

- **As a** nurse
- **I want to** assign an admitted patient to a specific ward, room, and bed
- **So that** I know the patient's physical location for care delivery

**Acceptance Criteria:**
- [ ] Location picker shows the hierarchical structure: Building → Wing → Ward → Room → Bed
- [ ] Only beds with "available" status are selectable
- [ ] Assigning a bed marks it as occupied
- [ ] The assigned location is displayed on the encounter record
- [ ] Changing the location updates the bed status accordingly

**Priority:** High
**Story Points:** 5

---

### ADM-003 · Record Hospitalization Details

- **As a** nurse or doctor
- **I want to** record the details of a patient's hospitalization (diet, special arrangements, re-admission flag)
- **So that** the care team can accommodate the patient's needs throughout their stay

**Acceptance Criteria:**
- [ ] Diet preference field (free text or coded values)
- [ ] Special courtesy and special arrangement fields
- [ ] Re-admission checkbox to flag returning patients
- [ ] These details are saved on the encounter and visible to all authorized staff
- [ ] Changes are reflected immediately without reloading the encounter

**Priority:** Medium
**Story Points:** 3

---

### ADM-004 · Document a Procedure During an Encounter

- **As a** doctor
- **I want to** record a medical procedure performed on a patient during their encounter
- **So that** the procedure is part of the clinical record and can be referenced in billing

**Acceptance Criteria:**
- [ ] Procedure form requires: procedure code/name, status, patient, encounter reference
- [ ] Optional: performer, body site, outcome, complications, follow-up recommendations
- [ ] Multiple procedures can be recorded per encounter
- [ ] Procedures are listed on the encounter detail page
- [ ] A completed procedure can be referenced when building a billing claim

**Priority:** High
**Story Points:** 5

---

### ADM-005 · View and Manage Active Encounters

- **As a** nurse or doctor
- **I want to** see a list of all currently active encounters
- **So that** I can monitor which patients are admitted and access their records quickly

**Acceptance Criteria:**
- [ ] Encounter list shows: patient name, encounter class, location, admission date, attending physician
- [ ] Filters by encounter class, location, date range, and status are available
- [ ] Clicking an encounter opens the full encounter detail page
- [ ] Encounters are sorted by admission date (most recent first) by default
- [ ] Search by patient name is supported

**Priority:** High
**Story Points:** 5

---

### ADM-006 · Close / End an Encounter

- **As a** doctor
- **I want to** mark an encounter as finished when the patient has been discharged
- **So that** it is no longer listed as active and the patient's visit is properly closed

**Acceptance Criteria:**
- [ ] An "End Encounter" action is available on the encounter detail page
- [ ] The end date/time is recorded automatically
- [ ] The encounter status changes to "finished"
- [ ] Closed encounters are still accessible for historical reference
- [ ] Closing an encounter triggers the discharge workflow if a discharge record has not yet been created

**Priority:** High
**Story Points:** 3

---

## Epic: MON – Monitoring & Vital Signs

---

### MON-001 · Record a Patient Vital Sign Observation

- **As a** nurse
- **I want to** record a vital sign measurement for a patient
- **So that** the patient's condition is tracked over time during their admission

**Acceptance Criteria:**
- [ ] Observation form requires: observation type (e.g., temperature, heart rate), value, unit, effective date/time, patient, encounter
- [ ] Common vital sign types are available via a coded picker (FHIR observation codes)
- [ ] The recorded value is saved against the patient's current encounter
- [ ] The observation appears in the patient's monitoring timeline

**Priority:** High
**Story Points:** 5

---

### MON-002 · Record a Multi-Component Observation (Blood Pressure)

- **As a** nurse
- **I want to** record blood pressure as a single observation with separate systolic and diastolic values
- **So that** both components are stored and displayed together for clinical accuracy

**Acceptance Criteria:**
- [ ] Blood pressure entry has two sub-fields: systolic (mmHg) and diastolic (mmHg)
- [ ] Both components are saved as child records (ObservationComponent) linked to the parent observation
- [ ] Display shows "120/80 mmHg" format in the monitoring timeline
- [ ] Reference ranges are applied independently to each component
- [ ] Abnormal component values are flagged individually

**Priority:** High
**Story Points:** 5

---

### MON-003 · View Patient Observation History

- **As a** doctor or nurse
- **I want to** view the historical trend of a patient's vital signs during their current encounter
- **So that** I can assess their progress and identify deterioration early

**Acceptance Criteria:**
- [ ] The monitoring page shows a timeline of all observations for the selected encounter
- [ ] Each entry shows: observation type, value, unit, date/time, recorded by
- [ ] Observations can be filtered by type and date range
- [ ] The timeline is sorted chronologically (most recent first)

**Priority:** High
**Story Points:** 5

---

### MON-004 · Flag Abnormal Observation Values

- **As a** nurse or doctor
- **I want to** see automatic flagging when a recorded value falls outside the normal reference range
- **So that** I can respond to potentially dangerous readings quickly

**Acceptance Criteria:**
- [ ] Each observation type has a configurable reference range (min/max, with age-based variations)
- [ ] Values outside the range are highlighted visually (color-coded: yellow = borderline, red = critical)
- [ ] An interpretation code (e.g., "H" for high, "L" for low, "N" for normal) is stored on the observation
- [ ] Abnormal observations can be filtered/sorted to the top of the list

**Priority:** High
**Story Points:** 5

---

### MON-005 · Create a Charge Item for a Billable Monitoring Service

- **As a** nurse
- **I want to** create a charge item when performing a billable monitoring service (e.g., ECG monitoring)
- **So that** the service is captured in the patient's billing account

**Acceptance Criteria:**
- [ ] Charge item form requires: service code, quantity, unit price, patient, encounter
- [ ] The charge item is linked to the active billing account for the encounter
- [ ] Created charge items appear in the patient's billing summary
- [ ] Performer and enterer fields can be recorded for accountability

**Priority:** Medium
**Story Points:** 3

---

## Epic: LAB – Laboratory

---

### LAB-001 · Order a Lab Test for a Patient

- **As a** doctor
- **I want to** place a lab test order for a patient
- **So that** the lab technician can collect specimens and perform the test

**Acceptance Criteria:**
- [ ] Lab order form requires: test type (from catalog), patient, encounter, requester
- [ ] Priority can be set: routine, urgent, STAT
- [ ] The created diagnostic report has status "registered"
- [ ] The lab order appears in the lab queue visible to lab technicians
- [ ] A charge item is automatically created for the ordered test

**Priority:** High
**Story Points:** 5

---

### LAB-002 · Record Specimen Collection

- **As a** lab technician
- **I want to** record the collection of a specimen for a lab order
- **So that** the sample's chain of custody is documented

**Acceptance Criteria:**
- [ ] Specimen form collects: collection method, body site, collection date/time, received time
- [ ] Specimen is linked to the corresponding diagnostic report
- [ ] Notes field available for special collection circumstances
- [ ] Specimen record updates the diagnostic report status to "in-progress"

**Priority:** High
**Story Points:** 3

---

### LAB-003 · Enter and Finalize Lab Test Results

- **As a** lab technician
- **I want to** enter the results of a completed lab test
- **So that** doctors can review the findings and make clinical decisions

**Acceptance Criteria:**
- [ ] Result entry is available on each diagnostic report in "in-progress" status
- [ ] Results support flexible data entry (numeric values, text, coded values stored as JSON)
- [ ] Individual result items can be linked as DiagnosticReportResult entries
- [ ] Finalizing the report changes its status to "final" and records the issued date/time
- [ ] Completed results are visible to the ordering doctor and nurse

**Priority:** High
**Story Points:** 8

---

### LAB-004 · Manage Lab Test Catalog

- **As a** lab technician or system administrator
- **I want to** manage the catalog of available lab tests
- **So that** doctors can order from an up-to-date list with correct pricing and reference ranges

**Acceptance Criteria:**
- [ ] Catalog entry includes: test name, code (SKU), category, base price, turnaround time
- [ ] Reference ranges (normal min/max) are configurable per test, with support for age-based variations (JSON)
- [ ] New tests can be added, existing tests edited or deactivated
- [ ] Deactivated tests no longer appear in the order form's test picker
- [ ] Price changes are reflected in new charge items (existing items are unaffected)

**Priority:** Medium
**Story Points:** 5

---

### LAB-005 · Track Imaging Studies

- **As a** lab technician or doctor
- **I want to** record imaging studies (X-ray, CT scan, ultrasound) for a patient
- **So that** the imaging history is part of the patient's clinical record

**Acceptance Criteria:**
- [ ] Imaging study form collects: modality (X-ray, CT, MRI, Ultrasound, etc.), start date/time, number of series/instances
- [ ] Interpreter (radiologist/doctor) can be linked
- [ ] Study is associated with the patient's encounter
- [ ] Imaging studies are listed separately from lab test reports
- [ ] Records support attaching notes or findings text

**Priority:** Medium
**Story Points:** 5

---

### LAB-006 · View Lab Results as a Doctor or Nurse

- **As a** doctor or nurse
- **I want to** view the finalized lab results for my patient
- **So that** I can incorporate the findings into my clinical assessment

**Acceptance Criteria:**
- [ ] Lab results are accessible from the patient's encounter page
- [ ] Finalized reports show: test name, all result values, reference ranges, flags for out-of-range values
- [ ] Results are sorted by collection date (most recent first)
- [ ] Pending/in-progress reports show their current status
- [ ] STAT and urgent orders are visually distinguished from routine orders

**Priority:** High
**Story Points:** 3

---

## Epic: PHR – Pharmacy

---

### PHR-001 · Prescribe Medication for a Patient

- **As a** doctor
- **I want to** create a medication prescription (medication request) for a patient
- **So that** the pharmacist can dispense the correct medication

**Acceptance Criteria:**
- [ ] Prescription form requires: medication (from catalog), patient, encounter, intent, priority
- [ ] Dosage instructions: dose quantity, route (oral/IV/etc.), frequency, timing
- [ ] Dispense instructions: validity period, quantity to dispense, refills allowed
- [ ] Created prescription appears in the pharmacy queue with status "active"
- [ ] Patient's known allergies are shown as warnings during prescription

**Priority:** High
**Story Points:** 8

---

### PHR-002 · Dispense Medication to a Patient

- **As a** pharmacist or nurse
- **I want to** record that a medication has been dispensed and administered to a patient
- **So that** the administration is documented and inventory is updated

**Acceptance Criteria:**
- [ ] A medication administration record is created referencing the original prescription
- [ ] Administration records the: medication given, dose, route, date/time, administering practitioner
- [ ] The prescription status is updated to "completed" after the final dose
- [ ] Inventory stock count is decremented by the dispensed quantity
- [ ] A charge item is created for the medication against the patient's billing account

**Priority:** High
**Story Points:** 8

---

### PHR-003 · View and Manage Medication Inventory

- **As a** pharmacist
- **I want to** view the current medication inventory and manage stock levels
- **So that** I can ensure medications are available when needed and prevent stockouts

**Acceptance Criteria:**
- [ ] Inventory list shows: medication name, current stock, unit, reorder level, expiry date, batch number, unit cost
- [ ] Stock can be adjusted manually (stock receipt, returns, corrections)
- [ ] Expired medications are flagged visually
- [ ] Inventory is searchable by medication name or code
- [ ] Stock movements are recorded with a reason and timestamp

**Priority:** High
**Story Points:** 5

---

### PHR-004 · Receive Low-Stock Alerts

- **As a** pharmacist
- **I want to** be notified when a medication's stock falls below its reorder level
- **So that** I can reorder in time to avoid a stockout

**Acceptance Criteria:**
- [ ] Each inventory item has a configurable reorder level
- [ ] When stock falls at or below the reorder level, the item is flagged in the inventory list
- [ ] A summary of low-stock medications is visible on the pharmacy dashboard
- [ ] The alert is cleared when stock is replenished above the reorder level

**Priority:** Medium
**Story Points:** 3

---

### PHR-005 · Track Medication Batch Numbers and Expiry Dates

- **As a** pharmacist
- **I want to** record the batch/lot number and expiry date for each medication stock entry
- **So that** I can identify and quarantine affected stock in case of a recall

**Acceptance Criteria:**
- [ ] Batch number and expiry date fields are present on inventory entries
- [ ] Medications approaching expiry (within configurable threshold) are highlighted
- [ ] Expired medications are clearly marked and excluded from dispensing selections
- [ ] Batch number is recorded on each medication administration for traceability

**Priority:** Medium
**Story Points:** 3

---

### PHR-006 · View Prescriptions Queue

- **As a** pharmacist
- **I want to** view all active prescriptions awaiting dispensing
- **So that** I can work through them in priority order

**Acceptance Criteria:**
- [ ] Prescription queue shows: patient name, medication, dose, route, priority, ordering doctor, time ordered
- [ ] Queue is filterable by priority (STAT, urgent, routine) and date
- [ ] STAT prescriptions appear at the top by default
- [ ] Each prescription can be opened for full detail and action
- [ ] Already-dispensed prescriptions are moved to a completed view

**Priority:** High
**Story Points:** 5

---

## Epic: BIL – Billing & Financial Management

---

### BIL-001 · Create a Billing Account for an Encounter

- **As a** billing clerk
- **I want to** create a billing account linked to a patient's encounter
- **So that** all charge items generated during the stay are accumulated in one place

**Acceptance Criteria:**
- [ ] Billing account form requires: patient, encounter, service period start/end
- [ ] Optional: guarantor (person/organization responsible for payment), coverage reference (PhilHealth)
- [ ] A patient may have one active billing account per encounter
- [ ] The account is visible to billing clerks and administrators
- [ ] Charge items from labs, pharmacy, and monitoring link to this account automatically

**Priority:** High
**Story Points:** 5

---

### BIL-002 · Generate an Invoice for a Patient

- **As a** billing clerk
- **I want to** generate an invoice from a patient's accumulated charge items
- **So that** the total cost of care is presented to the patient or guarantor

**Acceptance Criteria:**
- [ ] Invoice is generated from all charge items linked to the billing account
- [ ] Invoice displays: itemized list of services, quantities, unit prices, subtotal, taxes (if applicable), total
- [ ] Invoice can be marked as: draft, issued, balanced, cancelled
- [ ] Issued invoice is accessible in a printable/PDF format
- [ ] Invoice date and due date are recorded

**Priority:** High
**Story Points:** 8

---

### BIL-003 · Submit a PhilHealth Insurance Claim

- **As a** billing clerk or doctor
- **I want to** submit a PhilHealth claim for a patient's inpatient or outpatient encounter
- **So that** the hospital can recover the covered cost from PhilHealth

**Acceptance Criteria:**
- [ ] Claim form collects: claim type, patient, encounter, provider, insurer (PhilHealth), billable period, total amount
- [ ] Diagnoses (ICD codes) and procedures can be attached as claim line items
- [ ] Care team members are listed on the claim
- [ ] Supporting documents can be referenced
- [ ] Submitted claim status is tracked (active, cancelled, entered-in-error)
- [ ] Claim items include: revenue code, service code, service date, quantity, unit price

**Priority:** High
**Story Points:** 13

---

### BIL-004 · Record a Payment Against an Invoice

- **As a** billing clerk
- **I want to** record a payment made by the patient or their guarantor
- **So that** the account balance is updated accurately

**Acceptance Criteria:**
- [ ] Payment form records: amount, payment date, payment method, reference number
- [ ] Payment is linked to the patient's billing account and invoice
- [ ] The outstanding balance on the account is recalculated after the payment is recorded
- [ ] Overpayments are flagged for review
- [ ] Payment history is viewable on the billing account

**Priority:** High
**Story Points:** 5

---

### BIL-005 · Process Payment Reconciliation

- **As a** billing clerk
- **I want to** reconcile payments received against submitted claims
- **So that** I can confirm that the correct amount was reimbursed by PhilHealth or other payers

**Acceptance Criteria:**
- [ ] Reconciliation record links a payment to one or more claim line items
- [ ] Discrepancies between claimed and paid amounts are highlighted
- [ ] Reconciled claim items are marked as settled
- [ ] A reconciliation summary report is available per billing period

**Priority:** Medium
**Story Points:** 8

---

### BIL-006 · Send and View Payment Notices

- **As a** billing clerk
- **I want to** record payment notices sent to patients or payers
- **So that** there is a documented record of payment communications

**Acceptance Criteria:**
- [ ] Payment notice form records: recipient (patient/payer), payment reference, notice date, status
- [ ] Notices are linked to the relevant invoice or claim
- [ ] A list of all payment notices is accessible and filterable by date and status
- [ ] Notice status can be updated (e.g., sent, acknowledged, disputed)

**Priority:** Low
**Story Points:** 3

---

## Epic: DIS – Discharge

---

### DIS-001 · Create a Discharge Summary

- **As a** doctor
- **I want to** create a discharge summary for a patient who is leaving the hospital
- **So that** the patient and any follow-up providers have a complete record of their stay

**Acceptance Criteria:**
- [ ] Discharge form requires: patient, encounter, discharge date/time
- [ ] Summary of stay (free text) must be completed
- [ ] Form is linked to the patient's current encounter
- [ ] Created discharge record shows status "draft" until finalized

**Priority:** High
**Story Points:** 5

---

### DIS-002 · Record Discharge Instructions and Follow-Up Plan

- **As a** doctor
- **I want to** add discharge instructions and a follow-up plan to the discharge summary
- **So that** the patient knows what to do after leaving the hospital

**Acceptance Criteria:**
- [ ] Discharge instructions field accepts free text (medications to take, activity restrictions, wound care, etc.)
- [ ] Follow-up plan field records: follow-up type, responsible provider, timeframe
- [ ] Pending items (e.g., outstanding lab results, referrals) can be listed
- [ ] Instructions are accessible from the discharge record and printable for the patient

**Priority:** High
**Story Points:** 3

---

### DIS-003 · Finalize and Submit Discharge Record

- **As a** doctor
- **I want to** finalize the discharge record
- **So that** the encounter is officially closed and the patient is marked as discharged

**Acceptance Criteria:**
- [ ] A "Finalize Discharge" action changes the discharge status from "draft" to "final"
- [ ] Finalizing the discharge updates the associated encounter status to "finished"
- [ ] Bed/location assigned to the patient is freed and marked as available
- [ ] The discharge record is read-only after finalization
- [ ] Only the creating doctor or an administrator can finalize the discharge

**Priority:** High
**Story Points:** 5

---

### DIS-004 · View Discharge History

- **As a** doctor, nurse, or billing clerk
- **I want to** view a list of completed discharges
- **So that** I can reference past discharge summaries for clinical or billing purposes

**Acceptance Criteria:**
- [ ] Discharge list shows: patient name, encounter, discharge date, discharging doctor, status
- [ ] Filterable by date range, doctor, and status
- [ ] Clicking a discharge record opens the full summary
- [ ] Finalized discharge records cannot be edited (viewing only)

**Priority:** Medium
**Story Points:** 3

---

## Epic: SYS – System Administration

---

### SYS-001 · Manage Hospital Organizations

- **As a** system administrator
- **I want to** add and manage hospital and healthcare organization records
- **So that** staff and patients can be associated with the correct institution

**Acceptance Criteria:**
- [ ] Organization form collects: name, type (hospital/clinic/etc.), address, contact info, license number
- [ ] Organizations appear in staff registration and encounter forms
- [ ] Existing organizations can be edited or deactivated
- [ ] Deactivated organizations are hidden from selection dropdowns

**Priority:** High
**Story Points:** 3

---

### SYS-002 · Manage Hospital Locations (Wards, Rooms, Beds)

- **As a** system administrator
- **I want to** define and manage the physical locations within the hospital
- **So that** patients can be accurately assigned to specific wards, rooms, and beds

**Acceptance Criteria:**
- [ ] Location hierarchy: Building → Wing → Ward → Room → Bed
- [ ] Each location has a name, type, status (available/occupied/maintenance), and parent location
- [ ] New locations can be added at any level of the hierarchy
- [ ] Bed status updates automatically when patients are admitted/discharged
- [ ] The location tree is viewable in a hierarchical display

**Priority:** High
**Story Points:** 8

---

### SYS-003 · Manage Practitioner Profiles

- **As a** system administrator
- **I want to** create and manage practitioner (staff) profiles
- **So that** doctors, nurses, and other staff can be linked to clinical activities

**Acceptance Criteria:**
- [ ] Practitioner form collects: first name, last name, gender, date of birth, professional ID/license number
- [ ] Practitioners can be assigned to an organization and department
- [ ] A practitioner profile is created automatically on account registration
- [ ] Profiles can be edited or deactivated by administrators
- [ ] Deactivated practitioners are excluded from clinical assignment pickers

**Priority:** High
**Story Points:** 5

---

### SYS-004 · Manage Practitioner Roles and Availability

- **As a** system administrator
- **I want to** assign roles and availability schedules to practitioners
- **So that** the system reflects who is on duty and what services they provide

**Acceptance Criteria:**
- [ ] Practitioner role record includes: practitioner, role code, organization, availability schedule (days and times)
- [ ] A practitioner can have multiple roles (e.g., a doctor who also teaches)
- [ ] Availability is expressed as recurring weekly schedules
- [ ] Role assignments are visible when assigning practitioners to encounters and procedures

**Priority:** Medium
**Story Points:** 5

---

### SYS-005 · Configure API Endpoints for Interoperability

- **As a** system administrator
- **I want to** manage the API endpoint records used for inter-hospital communication
- **So that** the WAH4PC gateway and other external integrations remain correctly configured

**Acceptance Criteria:**
- [ ] Endpoint record collects: name, URL, connection type, status (active/suspended)
- [ ] Endpoints are associated with the hospital organization
- [ ] An endpoint can be tested (ping/health check) from the admin interface
- [ ] Only administrators can create or modify endpoint records

**Priority:** Medium
**Story Points:** 3

---

### SYS-006 · Monitor System Health

- **As a** system administrator
- **I want to** view a system health report
- **So that** I can proactively identify and resolve infrastructure issues

**Acceptance Criteria:**
- [ ] Health check endpoint (`/api/health/`) returns: database connectivity, cache status, external service reachability
- [ ] A liveness probe endpoint (`/api/health/ping/`) returns a simple "OK" response
- [ ] Health status is accessible from the admin dashboard without authentication (for monitoring tools)
- [ ] Unhealthy services are highlighted with a descriptive error

**Priority:** High
**Story Points:** 3

---

## Epic: DASH – Dashboard & Analytics

---

### DASH-001 · View System-Wide Administrative Dashboard

- **As a** system administrator
- **I want to** see a consolidated overview of the hospital's key metrics
- **So that** I can make informed operational decisions

**Acceptance Criteria:**
- [ ] Dashboard displays: total patients registered, active encounters, today's admissions, today's discharges
- [ ] Bed occupancy rate is shown as a percentage and broken down by ward
- [ ] Pending items per department (lab orders, prescriptions, billing invoices) are summarized
- [ ] Dashboard auto-refreshes without requiring a full page reload

**Priority:** High
**Story Points:** 8

---

### DASH-002 · View Role-Specific Dashboard

- **As a** doctor, nurse, pharmacist, lab technician, or billing clerk
- **I want to** see a dashboard tailored to my role
- **So that** I can immediately see my pending tasks and relevant metrics without navigating through the full system

**Acceptance Criteria:**
- [ ] Doctor dashboard: my patients admitted today, pending lab results to review, prescriptions I've ordered
- [ ] Nurse dashboard: patients in my assigned ward, pending medication administrations, vital signs due
- [ ] Pharmacist dashboard: prescriptions awaiting dispensing, low-stock medications, expired medications
- [ ] Lab Technician dashboard: pending lab orders, specimens collected today, overdue results
- [ ] Billing Clerk dashboard: unbilled encounters, pending claims, outstanding invoices
- [ ] Dashboard widgets are role-specific and non-configurable by the user

**Priority:** High
**Story Points:** 13

---

### DASH-003 · View Patient Census and Bed Occupancy

- **As a** nurse or administrator
- **I want to** see a real-time view of bed occupancy by ward
- **So that** I can manage patient placement and communicate capacity to admissions

**Acceptance Criteria:**
- [ ] Ward-level view shows each bed's status: occupied, available, under maintenance
- [ ] Occupied beds show the patient's name and admission date
- [ ] Total and available bed count is shown per ward
- [ ] The view refreshes when bed assignments change (on admission or discharge)

**Priority:** Medium
**Story Points:** 8

---

## Epic: SEC – Security & Compliance

---

### SEC-001 · Update Account Profile and Personal Settings

- **As a** logged-in staff member
- **I want to** update my profile information and personal preferences
- **So that** my account details remain accurate

**Acceptance Criteria:**
- [ ] Account settings page allows editing: display name, contact email
- [ ] Profile changes are saved immediately with a success notification
- [ ] Email changes trigger a re-verification OTP flow before taking effect
- [ ] Profile picture or avatar upload is supported (optional)

**Priority:** Low
**Story Points:** 3

---

### SEC-002 · Enforce OWASP-Compliant Password Policy

- **As a** system administrator
- **I want to** enforce a strong password policy for all user accounts
- **So that** the system is protected against brute-force and credential-stuffing attacks

**Acceptance Criteria:**
- [ ] Minimum password length: 12 characters
- [ ] Passwords that are purely numeric are rejected
- [ ] Common/dictionary passwords (e.g., "password123") are rejected
- [ ] These rules are enforced at registration, password reset, and password change
- [ ] Clear error messages explain which rule was violated

**Priority:** High
**Story Points:** 3

---

### SEC-003 · Rate Limit Sensitive API Endpoints

- **As a** system administrator
- **I want to** have rate limiting applied to sensitive endpoints
- **So that** the system is protected from automated abuse and denial-of-service attempts

**Acceptance Criteria:**
- [ ] Anonymous requests: max 20 requests/minute
- [ ] Authenticated requests: max 100 requests/minute
- [ ] Login endpoint: max 60 requests/minute
- [ ] Password reset endpoint: max 3 requests/minute
- [ ] Rate-limited responses return HTTP 429 with a Retry-After header
- [ ] Rate limits reset on the rolling 1-minute window

**Priority:** High
**Story Points:** 3

---

### SEC-004 · Maintain Audit Log for Inter-Hospital Data Exchanges

- **As a** system administrator
- **I want to** view an audit log of all WAH4PC gateway transactions
- **So that** I can investigate data exchange issues and ensure compliance with data sharing agreements

**Acceptance Criteria:**
- [ ] Every push and pull transaction to/from the WAH4PC gateway is logged
- [ ] Log entry includes: transaction type (push/pull), status (success/failed/pending), timestamp, patient reference, raw payload
- [ ] Audit log is accessible only to administrators
- [ ] Log entries are immutable (cannot be edited or deleted)
- [ ] Log can be filtered by transaction type, status, and date range

**Priority:** High
**Story Points:** 5

---

### SEC-005 · Session Timeout and Token Invalidation

- **As a** system administrator
- **I want to** enforce a 15-minute idle session timeout
- **So that** unattended workstations do not expose patient data

**Acceptance Criteria:**
- [ ] Access tokens expire after 15 minutes of inactivity
- [ ] The frontend prompts the user with a warning 2 minutes before expiry
- [ ] Expired sessions redirect to the login page
- [ ] Logging out immediately blacklists the current refresh token
- [ ] A blacklisted token cannot be used to obtain a new access token

**Priority:** High
**Story Points:** 5

---

*Last updated: 2026-04-13 | System: WAH4H v1.0 | Total stories: 50*
