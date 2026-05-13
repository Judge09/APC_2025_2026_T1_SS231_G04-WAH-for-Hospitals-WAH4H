# WAH4H — User Acceptance Testing (UAT)

**System:** WAH for Hospitals (WAH4H)  
**Version:** 1.0  
**Academic Year:** 2025–2026 | APC | T1 | SS231 | Group 04  
**Test Environment:** `http://localhost:3000` (frontend) / `http://localhost:8000` (backend)

---

## Instructions for Testers

1. Execute each test case in order within its module section.
2. Mark each test as **PASS**, **FAIL**, or **BLOCKED** (blocked = prerequisite failed).
3. For each FAIL, record the actual result and take a screenshot.
4. All tests assume a clean seeded database unless noted as requiring prior test completion.
5. Use the credentials created by `python manage.py seed_data` or create accounts manually.

---

## Test Roles Required

| Role | Test Account Email | Notes |
|---|---|---|
| Administrator | admin@wah4h.test | Created via `createsuperuser` |
| Doctor | doctor@wah4h.test | Register with role = doctor |
| Nurse | nurse@wah4h.test | Register with role = nurse |
| Lab Technician | labtech@wah4h.test | Register with role = lab_technician |
| Pharmacist | pharmacist@wah4h.test | Register with role = pharmacist |
| Billing Clerk | billing@wah4h.test | Register with role = billing_clerk |

---

## UAT Sign-Off

| Name | Role | Signature | Date |
|---|---|---|---|
| | Project Lead | | |
| | Clinical Tester | | |
| | QA Reviewer | | |
| | Supervisor | | |

---

## Module 1 — Authentication

### TC-AUTH-001: User Registration with Valid Data

**Pre-condition:** Email not already registered. OTP email delivery is functional.  
**Role:** Any (new user)

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/register` | Registration form is displayed | | |
| 2 | Enter: first name, last name, email, role (doctor), password (`ValidPass@123`) | Fields accept input without error | | |
| 3 | Click **Register** | OTP is sent to the email; OTP verification screen is shown | | |
| 4 | Enter the correct OTP | Account is activated; user is redirected to `/login` | | |
| 5 | Log in with the new credentials | Login succeeds and user lands on the dashboard | | |

---

### TC-AUTH-002: Registration Rejected — Weak Password

**Pre-condition:** Registration page loaded.  
**Role:** Any (new user)

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/register` | Registration form is displayed | | |
| 2 | Enter a valid email and password `123456789012` (numeric only, 12 chars) | | | |
| 3 | Click **Register** | Error message: password must not be purely numeric | | |
| 4 | Change password to `password123456` (common password) | | | |
| 5 | Click **Register** | Error message: password is too common | | |
| 6 | Change password to `short` (under 12 chars) | | | |
| 7 | Click **Register** | Error message: minimum 12 characters required | | |

---

### TC-AUTH-003: Registration Rejected — Duplicate Email

**Pre-condition:** An account for `doctor@wah4h.test` already exists.  
**Role:** Any (new user)

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/register` | Registration form is displayed | | |
| 2 | Enter `doctor@wah4h.test` as the email and a valid password | | | |
| 3 | Click **Register** | Error message: email is already registered | | |

---

### TC-AUTH-004: Login with Valid Credentials

**Pre-condition:** Account exists and is active.  
**Role:** Doctor

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/login` | Login form is displayed | | |
| 2 | Enter `doctor@wah4h.test` and valid password | | | |
| 3 | Click **Login** | (If OTP enabled) OTP sent to email and OTP screen shown; (If OTP disabled) redirected to dashboard | | |
| 4 | Enter correct OTP (if prompted) | Redirected to the Dashboard | | |
| 5 | Verify the sidebar shows only doctor-accessible modules | Admission, Patients, Laboratory, Monitoring, Discharge, PhilHealth, Appointments, Settings — visible. Pharmacy, Billing, Inventory, Statistics — not visible. | | |

---

### TC-AUTH-005: Login Rejected — Invalid Credentials

**Pre-condition:** Login page loaded.  
**Role:** Any

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/login` | Login form is displayed | | |
| 2 | Enter a valid email and incorrect password | | | |
| 3 | Click **Login** | Error message is shown; no account existence is revealed | | |

---

### TC-AUTH-006: Password Reset Flow

**Pre-condition:** Active user account exists.  
**Role:** Any

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/login` and click **Forgot Password** | Password reset page is shown | | |
| 2 | Enter the registered email and submit | OTP is sent to the email (response does not reveal whether email exists) | | |
| 3 | Navigate to `/reset-password` and enter the OTP and a new valid password | Password is updated; user is redirected to login | | |
| 4 | Log in with the new password | Login succeeds | | |
| 5 | Attempt login with the old password | Login fails | | |

---

### TC-AUTH-007: Session Idle Timeout

**Pre-condition:** User is logged in.  
**Role:** Any

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Log in and remain on any page without interaction for 13 minutes | | | |
| 2 | Observe the screen at 13 minutes | Warning prompt displayed: session will expire in 2 minutes | | |
| 3 | Do not interact; wait 2 more minutes | User is automatically redirected to `/login` | | |

---

### TC-AUTH-008: Role-Based Sidebar Access

**Pre-condition:** One account exists per role.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Log in as **Nurse** | Sidebar shows: Dashboard, Patients, Admission, Monitoring, Pharmacy (view), Inventory, Appointments, Settings | | |
| 2 | Log in as **Lab Technician** | Sidebar shows: Dashboard, Laboratory, Monitoring, Patients (limited), Compliance, Settings | | |
| 3 | Log in as **Pharmacist** | Sidebar shows: Dashboard, Pharmacy, Inventory, Patients (limited), Compliance, Settings | | |
| 4 | Log in as **Billing Clerk** | Sidebar shows: Dashboard, Billing, PhilHealth, ERP, Patients (limited), Settings | | |
| 5 | Log in as **Administrator** | Sidebar shows all modules | | |

---

## Module 2 — Patient Management

### TC-PAT-001: Register a New Patient

**Pre-condition:** Logged in as Doctor or Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Patients** | Patient list is shown | | |
| 2 | Click **Register New Patient** | Patient registration form opens | | |
| 3 | Fill in required fields: first name, last name, date of birth, sex, civil status, nationality, address, contact number | Fields accept input | | |
| 4 | Fill in optional fields: PhilHealth ID (`12-345678901-2`), blood type, emergency contact | Fields accept input | | |
| 5 | Click **Save** | Patient is created; appears in the patient list with a unique system ID | | |
| 6 | Verify the patient record opens | Demographics are displayed correctly | | |

---

### TC-PAT-002: Reject Duplicate PhilHealth ID

**Pre-condition:** Patient with PhilHealth ID `12-345678901-2` already exists.  
**Role:** Doctor or Nurse

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Click **Register New Patient** | Registration form opens | | |
| 2 | Enter all required fields and set PhilHealth ID to `12-345678901-2` | | | |
| 3 | Click **Save** | Error: PhilHealth ID is already registered | | |

---

### TC-PAT-003: Search for a Patient

**Pre-condition:** At least one patient record exists.  
**Role:** Doctor, Nurse, or Administrator

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Patients** | Patient list is shown | | |
| 2 | Type the patient's first name (partial) in the search bar | Results filter to matching patients; search is case-insensitive | | |
| 3 | Clear the search and type the patient's PhilHealth ID | Matching patient appears | | |
| 4 | Click a patient in the results | Full patient profile opens | | |

---

### TC-PAT-004: Edit Patient Demographics

**Pre-condition:** Patient record exists. Logged in as Doctor or Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open a patient's profile | Patient demographics are displayed | | |
| 2 | Click **Edit** | Demographics fields become editable | | |
| 3 | Change the contact number and click **Save** | Updated value is shown; `updated_at` timestamp is refreshed | | |

---

### TC-PAT-005: Record a Patient Condition

**Pre-condition:** Patient record exists. Logged in as Doctor.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open a patient's profile → **Conditions** tab | Conditions list is shown | | |
| 2 | Click **Add Condition** | Condition form opens | | |
| 3 | Enter: condition name, clinical status (active), severity, onset date | | | |
| 4 | Click **Save** | Condition appears in the patient's conditions list | | |
| 5 | Verify the condition is sorted chronologically | Most recent onset at top | | |

---

### TC-PAT-006: Record a Patient Allergy

**Pre-condition:** Patient record exists. Logged in as Doctor or Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open a patient's profile → **Allergies** tab | Allergies list is shown | | |
| 2 | Click **Add Allergy** | Allergy form opens | | |
| 3 | Enter: substance (Penicillin), clinical status (active), criticality (high) | | | |
| 4 | Click **Save** | Allergy appears in the patient's allergy list | | |

---

### TC-PAT-007: Record a Patient Immunization

**Pre-condition:** Patient record exists. Logged in as Doctor or Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open a patient's profile → **Immunizations** tab | Immunization list is shown | | |
| 2 | Click **Add Immunization** | Immunization form opens | | |
| 3 | Enter: vaccine name, date administered, lot number, expiry date | | | |
| 4 | Click **Save** | Immunization appears in the list sorted by date | | |

---

## Module 3 — Admission

### TC-ADM-001: Create a New Encounter

**Pre-condition:** Patient record exists. Logged in as Doctor or Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Admission** | Encounters list is shown | | |
| 2 | Click **New Encounter** | Encounter form opens | | |
| 3 | Select the patient, set class to **Inpatient**, set start date/time | | | |
| 4 | Click **Save** | Encounter appears in the list with status **in-progress** | | |

---

### TC-ADM-002: Record a Procedure on an Encounter

**Pre-condition:** An active encounter exists. Logged in as Doctor.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open an existing encounter record | Encounter detail page is shown | | |
| 2 | Navigate to the **Procedures** section and click **Add Procedure** | Procedure form opens | | |
| 3 | Enter: procedure code/name, status (completed), body site | | | |
| 4 | Click **Save** | Procedure appears in the encounter's procedure list | | |

---

### TC-ADM-003: View and Filter Active Encounters

**Pre-condition:** At least 2 encounters exist. Logged in as Doctor or Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Admission** | All encounters are listed | | |
| 2 | Filter by class **Inpatient** | List shows only inpatient encounters | | |
| 3 | Search by a patient's name | Matching encounter appears | | |
| 4 | Verify sort order | Encounters sorted by admission date, most recent first | | |

---

### TC-ADM-004: Close an Encounter

**Pre-condition:** An active encounter exists. Logged in as Doctor.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open an in-progress encounter | Encounter detail is shown | | |
| 2 | Click **End Encounter** | End date/time recorded automatically; encounter status changes to **finished** | | |
| 3 | Verify the encounter no longer appears in the active list | Closed encounter is accessible in history | | |

---

## Module 4 — Monitoring

### TC-MON-001: Record a Vital Sign Observation

**Pre-condition:** An active encounter exists for a patient. Logged in as Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Monitoring** | Monitoring page is shown | | |
| 2 | Click **New Observation** | Observation form opens | | |
| 3 | Select patient and their active encounter | | | |
| 4 | Select observation type **Temperature**, enter `37.5`, unit `°C`, effective date/time | | | |
| 5 | Click **Save** | Observation appears in the patient's monitoring timeline | | |

---

### TC-MON-002: Record Blood Pressure (Multi-Component)

**Pre-condition:** Active encounter exists. Logged in as Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Click **New Observation** | Observation form opens | | |
| 2 | Select type **Blood Pressure** | Two sub-fields appear: Systolic and Diastolic | | |
| 3 | Enter Systolic `120` mmHg, Diastolic `80` mmHg | | | |
| 4 | Click **Save** | Observation saved; timeline shows `120/80 mmHg` | | |

---

### TC-MON-003: Abnormal Value Flagging

**Pre-condition:** Active encounter exists. Logged in as Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Click **New Observation**, select **Heart Rate**, enter `130` bpm (above normal range) | | | |
| 2 | Click **Save** | Observation saved with a visual high flag (color-coded) | | |
| 3 | Verify interpretation code | Interpretation shows **H** (high) | | |

---

### TC-MON-004: View Observation History

**Pre-condition:** At least 3 observations exist for a patient. Logged in as Doctor or Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the Monitoring page for a patient | Timeline shows all observations | | |
| 2 | Filter by type **Temperature** | Only temperature observations are shown | | |
| 3 | Verify sort order | Most recent observation first | | |

---

### TC-MON-005: Create a Charge Item

**Pre-condition:** Active encounter and billing account exist. Logged in as Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Monitoring** and click **Add Charge Item** | Charge item form opens | | |
| 2 | Select service code, enter quantity `1`, confirm unit price, link to encounter | | | |
| 3 | Click **Save** | Charge item created and visible in the billing account | | |

---

## Module 5 — Laboratory

### TC-LAB-001: Order a Lab Test (Doctor)

**Pre-condition:** Active encounter exists. Lab test catalog has at least one entry. Logged in as Doctor.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Laboratory** | Lab module is shown | | |
| 2 | Click **New Lab Order** | Order form opens | | |
| 3 | Select patient, encounter, and a test from the catalog (e.g., CBC) | | | |
| 4 | Set priority to **Urgent** | | | |
| 5 | Click **Submit** | Diagnostic report created with status **registered**; appears in the lab queue | | |

---

### TC-LAB-002: Record Specimen Collection (Lab Technician)

**Pre-condition:** A lab order with status **registered** exists. Logged in as Lab Technician.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Laboratory** and open a pending order | Order detail is shown | | |
| 2 | Click **Record Specimen** | Specimen form opens | | |
| 3 | Enter: collection method (venipuncture), body site (arm), collection date/time | | | |
| 4 | Click **Save** | Specimen record created; diagnostic report status changes to **in-progress** | | |

---

### TC-LAB-003: Enter and Finalize Lab Results (Lab Technician)

**Pre-condition:** Lab order is in-progress with a specimen recorded. Logged in as Lab Technician.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open an in-progress diagnostic report | Report detail is shown | | |
| 2 | Click **Enter Results** | Result entry form opens | | |
| 3 | Enter result values for each test component | | | |
| 4 | Click **Finalize Report** | Report status changes to **final**; issued date/time recorded | | |
| 5 | Log in as Doctor and open the same report | Result values are visible with reference ranges | | |

---

### TC-LAB-004: Manage Lab Test Catalog

**Pre-condition:** Logged in as Lab Technician or Administrator.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Laboratory → Test Catalog** | Catalog list is shown | | |
| 2 | Click **Add Test** | Test form opens | | |
| 3 | Enter: name (Hemoglobin A1c), code (HBA1C), category (chemistry), base price (₱350), turnaround time (24h) | | | |
| 4 | Click **Save** | Test appears in the catalog | | |
| 5 | Open the new test and click **Deactivate** | Test is hidden from the lab order picker | | |

---

### TC-LAB-005: Record an Imaging Study

**Pre-condition:** Active encounter exists. Logged in as Lab Technician or Doctor.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Laboratory → Imaging Studies** | Imaging studies list is shown | | |
| 2 | Click **New Imaging Study** | Form opens | | |
| 3 | Enter: modality (X-ray), start date/time, number of series (1), instances (2) | | | |
| 4 | Click **Save** | Imaging study appears in the list, separate from lab test reports | | |

---

## Module 6 — Pharmacy and Inventory

### TC-PHR-001: Prescribe Medication (Doctor)

**Pre-condition:** Active encounter exists. Patient has a known penicillin allergy (from TC-PAT-006). Logged in as Doctor.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Pharmacy** | Pharmacy module is shown | | |
| 2 | Click **New Prescription** | Prescription form opens | | |
| 3 | Select patient — verify allergy warnings are shown for Penicillin | Allergy alert is visible | | |
| 4 | Select a non-allergenic medication, set dose, route (oral), frequency | | | |
| 5 | Click **Save** | Prescription created with status **active**; appears in the pharmacy queue | | |

---

### TC-PHR-002: Dispense Medication (Pharmacist)

**Pre-condition:** An active prescription exists (TC-PHR-001). Inventory has stock for the medication. Logged in as Pharmacist.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Pharmacy → Prescriptions Queue** | Active prescriptions are listed | | |
| 2 | Open the prescription from TC-PHR-001 | Full prescription detail is shown | | |
| 3 | Click **Dispense** | Dispense confirmation form opens | | |
| 4 | Confirm: medication, dose, route, date/time | | | |
| 5 | Click **Confirm** | Medication administration record created; inventory stock decremented; charge item generated | | |

---

### TC-PHR-003: View Prescriptions Queue

**Pre-condition:** At least 2 prescriptions exist with different priorities. Logged in as Pharmacist.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Pharmacy → Prescriptions Queue** | Queue is displayed | | |
| 2 | Verify STAT prescriptions appear at the top | STAT items are sorted first | | |
| 3 | Filter by priority **Routine** | Only routine prescriptions are shown | | |

---

### TC-PHR-004: Manage Medication Inventory

**Pre-condition:** Logged in as Pharmacist.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Inventory** | Inventory list shows: name, stock, unit, reorder level, expiry date, batch number, unit cost | | |
| 2 | Click **Adjust Stock** on any item | Stock adjustment form opens | | |
| 3 | Enter a receipt quantity and reason | | | |
| 4 | Click **Save** | Stock level updated; stock movement logged with timestamp | | |

---

### TC-PHR-005: Low Stock Alert

**Pre-condition:** An inventory item has stock at or below its reorder level. Logged in as Pharmacist.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Inventory** | Low-stock items are visually flagged in the list | | |
| 2 | Check the pharmacy dashboard | Summary of low-stock medications is visible | | |

---

### TC-PHR-006: Expired Medication Flag

**Pre-condition:** An inventory item with an expiry date in the past exists. Logged in as Pharmacist.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Inventory** | Expired items are highlighted | | |
| 2 | Attempt to select the expired item in the dispense picker | Expired medication does not appear as a selectable option | | |

---

## Module 7 — Billing and PhilHealth

### TC-BIL-001: Create a Billing Account

**Pre-condition:** Active encounter exists. Logged in as Billing Clerk.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Billing → Accounts** | Billing accounts list is shown | | |
| 2 | Click **New Billing Account** | Account form opens | | |
| 3 | Select patient and encounter; set service period start/end | | | |
| 4 | Click **Save** | Billing account created and visible in the list | | |

---

### TC-BIL-002: Generate an Invoice

**Pre-condition:** Billing account exists with linked charge items. Logged in as Billing Clerk.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Billing → Invoices** and click **New Invoice** | Invoice form opens | | |
| 2 | Select the billing account | Charge items are loaded and itemized | | |
| 3 | Set invoice date and due date | | | |
| 4 | Click **Save** (status: draft) | Draft invoice created | | |
| 5 | Change status to **Issued** | Invoice is marked issued and can be printed/exported | | |

---

### TC-BIL-003: Submit a PhilHealth Claim

**Pre-condition:** Patient has a PhilHealth ID; encounter and billing account exist. Logged in as Billing Clerk.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **PhilHealth** | Claims list is shown | | |
| 2 | Click **New Claim** | Claim form opens | | |
| 3 | Fill in: claim type (institutional), patient, encounter, provider, billable period, total amount | | | |
| 4 | Add diagnoses (ICD codes) and procedures as claim line items | | | |
| 5 | Click **Submit** | Claim created with status **active** | | |

---

### TC-BIL-004: Record a Payment

**Pre-condition:** An issued invoice exists. Logged in as Billing Clerk.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Billing → Payments** and click **Record Payment** | Payment form opens | | |
| 2 | Enter: amount, payment date, method (cash), reference number | | | |
| 3 | Link to the billing account and invoice | | | |
| 4 | Click **Save** | Payment recorded; outstanding balance on the account is updated | | |

---

### TC-BIL-005: Process Payment Reconciliation

**Pre-condition:** A claim and payment exist. Logged in as Billing Clerk.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Billing** and open the reconciliation section | Reconciliation form is accessible | | |
| 2 | Link the payment to the relevant claim line items | | | |
| 3 | Note any discrepancy between claimed and paid amounts | Discrepancies are highlighted | | |
| 4 | Mark reconciled items as **settled** and save | Reconciliation record saved | | |

---

## Module 8 — Discharge

### TC-DIS-001: Create a Discharge Summary

**Pre-condition:** Active encounter exists. Logged in as Doctor.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Discharge** | Discharge list is shown | | |
| 2 | Click **New Discharge** | Discharge form opens | | |
| 3 | Select the patient and their active encounter | | | |
| 4 | Set discharge date/time and write a summary of stay | | | |
| 5 | Click **Save** | Discharge record created with status **draft** | | |

---

### TC-DIS-002: Add Discharge Instructions and Follow-Up Plan

**Pre-condition:** A draft discharge record exists (TC-DIS-001). Logged in as Doctor.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the draft discharge record | Discharge detail is shown | | |
| 2 | Enter discharge instructions: medication instructions, activity restrictions | | | |
| 3 | Enter follow-up plan: follow-up type, provider, timeframe | | | |
| 4 | Click **Save** | Instructions and plan saved on the discharge record | | |

---

### TC-DIS-003: Finalize Discharge

**Pre-condition:** Draft discharge with instructions exists (TC-DIS-002). Logged in as Doctor.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the draft discharge record | Discharge detail is shown | | |
| 2 | Click **Finalize Discharge** | | | |
| 3 | Verify discharge status changed to **final** | Discharge record is read-only | | |
| 4 | Verify associated encounter status | Encounter status changed to **finished** | | |
| 5 | Log in as Nurse and attempt to edit the finalized discharge | Edit is not permitted | | |

---

### TC-DIS-004: View Discharge History

**Pre-condition:** At least one finalized discharge exists.  
**Role:** Doctor, Nurse, or Billing Clerk

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Discharge** | Discharge list is shown with patient name, date, doctor, status | | |
| 2 | Filter by date range | List narrows to discharges within the selected range | | |
| 3 | Click a finalized discharge | Full summary is displayed in read-only mode | | |

---

## Module 9 — WAH4PC Gateway Integration

### TC-WAH-001: Fetch Patient from Gateway

**Pre-condition:** WAH4PC environment variables are configured. Patient has a valid PhilHealth ID. Logged in as Doctor or Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open a patient's profile | Patient detail is shown | | |
| 2 | Click **Fetch from Gateway** | Gateway fetch form opens | | |
| 3 | Enter a valid Target Provider ID and the patient's PhilHealth ID | | | |
| 4 | Click **Fetch** | Request sent asynchronously; user receives a status message | | |
| 5 | When the webhook callback arrives, verify the returned data is displayed for review | FHIR data (encounters, procedures, immunizations) shown before import | | |
| 6 | Verify the transaction is logged in the audit log (check as Admin) | Log entry exists: type=pull, status tracked | | |

---

### TC-WAH-002: Push Patient to Gateway

**Pre-condition:** WAH4PC environment variables are configured. Patient record with conditions and encounters exists. Logged in as Doctor.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open a patient's profile | Patient detail is shown | | |
| 2 | Click **Send to Gateway** | Confirmation prompt appears | | |
| 3 | Confirm the action | FHIR bundle sent to the gateway; success notification shown | | |
| 4 | Verify the transaction is logged in the audit log (check as Admin) | Log entry exists: type=push, status tracked | | |

---

### TC-WAH-003: Gateway Push Restricted to Authorized Role

**Pre-condition:** Patient record exists. Logged in as Billing Clerk.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open a patient's profile | Patient detail is shown | | |
| 2 | Attempt to find or click **Send to Gateway** | Send to Gateway option is not visible or returns 403 | | |

---

### TC-WAH-004: Incoming Webhook Authentication

**Pre-condition:** Backend is running and accessible.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Send a POST request to `/api/patients/webhooks/receive` without the `X-Gateway-Auth` header | Response: HTTP 403 Forbidden | | |
| 2 | Send the same request with an incorrect `X-Gateway-Auth` value | Response: HTTP 403 Forbidden | | |
| 3 | Send the request with the correct `GATEWAY_AUTH_KEY` value | Response: HTTP 200; payload processed | | |

---

## Module 10 — Appointments

### TC-APT-001: Create an Appointment

**Pre-condition:** Patient record and at least one doctor practitioner exist. Logged in as Doctor or Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Appointments** | Appointments list is shown | | |
| 2 | Click **New Appointment** | Appointment form opens | | |
| 3 | Select patient, practitioner, date/time, and service type | | | |
| 4 | Click **Save** | Appointment created and visible in the list | | |

---

### TC-APT-002: Cancel an Appointment

**Pre-condition:** An active appointment exists. Logged in as Doctor or Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open an existing appointment | Appointment detail is shown | | |
| 2 | Click **Cancel** | Appointment status changed to **cancelled** | | |

---

### TC-APT-003: Mark Patient as Arrived

**Pre-condition:** An active appointment exists. Logged in as Doctor or Nurse.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open an existing appointment | Appointment detail is shown | | |
| 2 | Click **Arrive** | Appointment status updated to reflect patient arrival | | |

---

## Module 11 — Settings and Account Management

### TC-SET-001: Update Account Settings

**Pre-condition:** Logged in as any user.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Account Settings** | Account settings page is shown | | |
| 2 | Update the display name and click **Save** | Success notification; display name updated | | |

---

### TC-SET-002: Change Password (Logged In)

**Pre-condition:** Logged in as any user.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Account Settings → Change Password** | Password change form is shown | | |
| 2 | Enter current password and a new valid password | | | |
| 3 | Submit — if OTP is enabled, enter the OTP | | | |
| 4 | Verify old password no longer works | Login with old password is rejected | | |

---

### TC-SET-003: Admin Manages Organizations (Administrator Only)

**Pre-condition:** Logged in as Administrator.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Settings → Organizations** | Organization list is shown | | |
| 2 | Click **Add Organization** | Organization form opens | | |
| 3 | Enter: name, type, address, contact info | | | |
| 4 | Click **Save** | Organization appears in the list and in registration/encounter dropdowns | | |

---

### TC-SET-004: Admin Manages Practitioners (Administrator Only)

**Pre-condition:** Logged in as Administrator.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Settings → Practitioners** | Practitioner list is shown | | |
| 2 | Click **Add Practitioner** | Practitioner form opens | | |
| 3 | Enter: first name, last name, gender, professional ID, organization | | | |
| 4 | Click **Save** | Practitioner profile created and available in encounter/procedure assignment pickers | | |

---

## Module 12 — Dashboard

### TC-DASH-001: Role-Specific Dashboard Content

**Pre-condition:** At least one encounter, observation, and prescription exist in the system.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Log in as **Doctor** | Dashboard shows: patients admitted today, pending lab results, my prescriptions | | |
| 2 | Log in as **Nurse** | Dashboard shows: ward patients, pending medication administrations, vital signs due | | |
| 3 | Log in as **Pharmacist** | Dashboard shows: prescriptions awaiting dispensing, low-stock medications | | |
| 4 | Log in as **Lab Technician** | Dashboard shows: pending lab orders, specimens collected today | | |
| 5 | Log in as **Billing Clerk** | Dashboard shows: unbilled encounters, pending claims, outstanding invoices | | |
| 6 | Log in as **Administrator** | Dashboard shows all system-wide metrics | | |

---

## Module 13 — Security and Access Control

### TC-SEC-001: Rate Limiting on Login Endpoint

**Pre-condition:** Backend is running.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Send 60 valid login requests within one minute to `POST /api/accounts/login/` | All 60 requests succeed | | |
| 2 | Send a 61st request within the same minute | Response: HTTP 429 Too Many Requests with `Retry-After` header | | |

---

### TC-SEC-002: Rate Limiting on Password Reset Endpoint

**Pre-condition:** Backend is running.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Send 3 requests to `POST /api/accounts/password-reset/` within one minute | All 3 requests are processed | | |
| 2 | Send a 4th request within the same minute | Response: HTTP 429 Too Many Requests | | |

---

### TC-SEC-003: Unauthorized API Access

**Pre-condition:** Backend is running.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Send `GET /api/patients/` without an Authorization header | Response: HTTP 401 Unauthorized | | |
| 2 | Send the same request with an expired access token | Response: HTTP 401 Unauthorized | | |
| 3 | Send with a valid Billing Clerk token to `GET /api/admission/encounters/` | Response: HTTP 403 Forbidden | | |

---

### TC-SEC-004: Token Rotation on Refresh

**Pre-condition:** Valid refresh token available.

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Use a refresh token to get a new access token via `POST /api/accounts/token/refresh/` | New access token returned | | |
| 2 | Attempt to use the same (old) refresh token again | Response: HTTP 401; token is blacklisted | | |

---

## UAT Summary

| Module | Total TCs | Pass | Fail | Blocked | Not Tested |
|---|---|---|---|---|---|
| Authentication | 8 | | | | |
| Patient Management | 7 | | | | |
| Admission | 4 | | | | |
| Monitoring | 5 | | | | |
| Laboratory | 5 | | | | |
| Pharmacy and Inventory | 6 | | | | |
| Billing and PhilHealth | 5 | | | | |
| Discharge | 4 | | | | |
| WAH4PC Gateway | 4 | | | | |
| Appointments | 3 | | | | |
| Settings and Account | 4 | | | | |
| Dashboard | 1 | | | | |
| Security and Access | 4 | | | | |
| **Total** | **60** | | | | |

---

## Defect Log

| ID | TC Ref | Description | Severity | Assigned To | Status |
|---|---|---|---|---|---|
| | | | | | |

**Severity Levels:** Critical / High / Medium / Low

---

*Document Version: 1.0*  
*Date: 2026-05-13*  
*System: WAH4H v1.0 | APC 2025–2026 | T1 | SS231 | Group 04*
