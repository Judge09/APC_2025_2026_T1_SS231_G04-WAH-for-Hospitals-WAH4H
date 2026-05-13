# WAH4H — User Acceptance Testing (UAT)

**System:** WAH for Hospitals (WAH4H)  
**Version:** 1.0  
**Academic Year:** 2025–2026 | APC | T1 | SS231 | Group 04

---

## Table of Contents

1. [Instructions for Testers](#1-instructions-for-testers)
2. [Environments & Test Data Rules](#2-environments--test-data-rules)
3. [Entry & Exit Criteria](#3-entry--exit-criteria)
4. [UAT Sign-Off](#4-uat-sign-off)
5. [Module 1 — Authentication](#module-1--authentication)
6. [Module 2 — Patient Management](#module-2--patient-management)
7. [Module 3 — Admission](#module-3--admission)
8. [Module 4 — Monitoring](#module-4--monitoring)
9. [Module 5 — Laboratory](#module-5--laboratory)
10. [Module 6 — Pharmacy and Inventory](#module-6--pharmacy-and-inventory)
11. [Module 7 — Billing and PhilHealth](#module-7--billing-and-philhealth)
12. [Module 8 — Discharge](#module-8--discharge)
13. [Module 9 — WAH4PC Gateway Integration](#module-9--wah4pc-gateway-integration)
14. [Module 10 — Appointments](#module-10--appointments)
15. [Module 11 — Settings and Account Management](#module-11--settings-and-account-management)
16. [Module 12 — Dashboard](#module-12--dashboard)
17. [Module 13 — Security and Access Control](#module-13--security-and-access-control)
18. [Test Data Matrix](#8-test-data-matrix)
19. [Acceptance Criteria (per scenario)](#9-acceptance-criteria-per-scenario)
20. [Regression & Retest Strategy](#10-regression--retest-strategy)
21. [UAT Summary](#uat-summary)
22. [Defect Log](#defect-log)

---

## 1. Instructions for Testers

1. Execute each test case in order within its module section.
2. Mark each test as **PASS**, **FAIL**, or **BLOCKED** (blocked = a prerequisite failed).
3. For each FAIL, record the actual result in the Notes column and take a screenshot.
4. All tests must use the test data identifiers defined in Section 2 — do not invent ad-hoc names.
5. Do not use production data at any point during UAT.
6. After completing all test cases, fill in the UAT Summary table and obtain sign-off.

---

## 2. Environments & Test Data Rules

### Environments

| Environment | Frontend URL | Backend URL | Database |
|---|---|---|---|
| UAT (Staging) | `http://localhost:3000` | `http://localhost:8000` | SQLite3 / PostgreSQL (mirrors production schema) |
| Production | `https://wah4h-frontend.vercel.app` | `https://wah4h-backend-apc.azurewebsites.net` | PostgreSQL |

Use a dedicated UAT environment (staging) that mirrors production in DB schema, config, and auth flows. Never run UAT tests against the production environment.

### Data Separation

All test data **must** use the following prefixes so UAT records can be identified and removed:

| Record Type | Naming Convention | Example |
|---|---|---|
| Organizations | `TEST-ORG-<short_name>` | `TEST-ORG-LGUHOSP` |
| User accounts | `test.<role>.<initials>` | `test.doctor.jq` |
| Patient IDs | `TST-P-{YYYYMM}-{RANDOM6}` | `TST-P-202605-A1B2C3` |
| Encounter IDs | `TST-ENC-<timestamp>` | `TST-ENC-20260513T090000` |
| Invoice IDs | `TST-INV-<sequential>` | `TST-INV-001` |

### Production Data Policy

No production data is used in UAT. If anonymised production snapshots are required, they must be approved in writing by the Data Owner and stored in a separate location from the production database.

### Reset Policy

All UAT test data must be removable by a single script or migration. Tag created records with a `uat=true` flag where the data model supports it. After UAT is concluded, run the cleanup script before the UAT environment is handed back or promoted.

---

## 3. Entry & Exit Criteria

### Entry Criteria (Start UAT)

UAT may begin when **all** of the following are satisfied:

- [ ] The staging environment is deployed and accessible at the URLs in Section 2.
- [ ] All UAT test accounts from Section 8 are created and verified.
- [ ] Seed test data (`TST-P-202605-A1B2C3` patient, test encounters, lab catalog entries) is loaded.
- [ ] The WAH4PC gateway credentials are configured in the staging `.env`.
- [ ] Email OTP delivery is functional (or `LOGIN_USE_OTP=False` is confirmed for testing).
- [ ] No Critical defects are known to be open from previous testing cycles.

### Exit Criteria (End UAT)

UAT is considered complete and acceptance may be granted when **all** of the following are satisfied:

- [ ] All 60 planned test cases have been executed (status: Pass, Fail, or Blocked with justification).
- [ ] All Critical defects are fixed and verified via retest.
- [ ] No more than 2 High defects remain open, each with an approved business risk acceptance recorded.
- [ ] All core-flow test cases (AUTH, PAT, ADM, DIS) have a Pass result.
- [ ] Business owner sign-off is recorded in the sign-off table in Section 4.

---

## 4. UAT Sign-Off

| Name | Role | Signature | Date |
|---|---|---|---|
| | Project Lead | | |
| | Clinical Tester | | |
| | QA Reviewer | | |
| | Supervisor / Instructor | | |

---

## Module 1 — Authentication

### TC-AUTH-001: User Registration with Valid Data

**Pre-condition:** Email `test.doctor.jq@wah4h.test` is not yet registered. OTP email delivery is functional (or `LOGIN_USE_OTP=False`).  
**Test Account:** New registration (not in Section 8 accounts)  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/register` | Registration form is displayed | | |
| 2 | Enter: first name `Test`, last name `Doctor`, email `test.newdoctor.uat@wah4h.test`, role `doctor`, password `TestPass!234` | Fields accept input without error | | |
| 3 | Click **Register** | OTP sent to email; OTP verification screen shown | | |
| 4 | Enter the correct OTP | Account activated; redirected to `/login` | | |
| 5 | Log in with `test.newdoctor.uat@wah4h.test` / `TestPass!234` | Login succeeds; user lands on the Dashboard | | |

---

### TC-AUTH-002: Registration Rejected — Weak Password

**Pre-condition:** Registration page loaded.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/register` | Registration form is displayed | | |
| 2 | Enter a valid email; set password to `123456789012` (numeric only) | | | |
| 3 | Click **Register** | Error: password must not be purely numeric | | |
| 4 | Change password to `password123456` (common password) | | | |
| 5 | Click **Register** | Error: password is too common | | |
| 6 | Change password to `short1!` (under 12 chars) | | | |
| 7 | Click **Register** | Error: minimum 12 characters required | | |

---

### TC-AUTH-003: Registration Rejected — Duplicate Email

**Pre-condition:** Account `test.doctor.jq@wah4h.test` already exists (see Section 8).  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/register` | Registration form is displayed | | |
| 2 | Enter email `test.doctor.jq@wah4h.test` and password `TestPass!234` | | | |
| 3 | Click **Register** | Error: email is already registered | | |

---

### TC-AUTH-004: Login with Valid Credentials

**Pre-condition:** Account `test.doctor.jq@wah4h.test` exists and is active.  
**Test Account:** `test.doctor.jq` (see Section 8)  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/login` | Login form is displayed | | |
| 2 | Enter email `test.doctor.jq@wah4h.test` and password `TestPass!234` | | | |
| 3 | Click **Login** | (If OTP enabled) OTP sent and OTP screen shown; (if disabled) redirected to Dashboard | | |
| 4 | Enter correct OTP if prompted | Redirected to the Dashboard | | |
| 5 | Verify the sidebar | Shows: Dashboard, Patients, Admission, Laboratory, Monitoring, Discharge, PhilHealth, Appointments, Settings. Does **not** show: Billing, Inventory, Statistics. | | |

---

### TC-AUTH-005: Login Rejected — Invalid Credentials

**Pre-condition:** Login page loaded.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/login` | Login form is displayed | | |
| 2 | Enter `test.doctor.jq@wah4h.test` and an incorrect password | | | |
| 3 | Click **Login** | Error message shown; account existence not revealed in the message | | |

---

### TC-AUTH-006: Password Reset Flow

**Pre-condition:** Account `test.nurse.ja@wah4h.test` exists and is active.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/login` and click **Forgot Password** | Password reset page shown | | |
| 2 | Enter `test.nurse.ja@wah4h.test` and submit | OTP sent; response does not reveal whether email exists | | |
| 3 | Navigate to `/reset-password`; enter OTP and new password `NewTestPass!567` | Password updated; redirected to login | | |
| 4 | Log in with `NewTestPass!567` | Login succeeds | | |
| 5 | Attempt login with old password `TestPass!234` | Login fails | | |

---

### TC-AUTH-007: Session Idle Timeout

**Pre-condition:** User logged in as `test.doctor.jq`. Frontend idle timeout is active (15 min).  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Log in and remain on any page without any interaction for 13 minutes | | | |
| 2 | Observe the screen at the 13-minute mark | Warning shown: session expires in 2 minutes | | |
| 3 | Do not interact; wait the remaining 2 minutes | Automatically redirected to `/login` | | |

---

### TC-AUTH-008: Role-Based Sidebar Access

**Pre-condition:** One account exists per role (Section 8).  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Log in as `test.nurse.ja` | Sidebar: Dashboard, Patients, Admission, Monitoring, Pharmacy (view), Inventory, Appointments, Settings | | |
| 2 | Log in as `test.lab.lt` | Sidebar: Dashboard, Laboratory, Monitoring, Patients (limited), Compliance, Settings | | |
| 3 | Log in as `test.pharm.px` | Sidebar: Dashboard, Pharmacy, Inventory, Patients (limited), Compliance, Settings | | |
| 4 | Log in as `test.billing.bc` | Sidebar: Dashboard, Billing, PhilHealth, ERP, Patients (limited), Settings | | |
| 5 | Log in as `test.admin.uat` | Sidebar shows all modules | | |

---

## Module 2 — Patient Management

### TC-PAT-001: Register a New Patient

**Pre-condition:** Logged in as `test.doctor.jq` or `test.nurse.ja`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Patients** | Patient list is shown | | |
| 2 | Click **Register New Patient** | Registration form opens | | |
| 3 | Enter required fields: first name `Test`, last name `Patient UAT`, DOB `1990-01-15`, sex `Male`, civil status `Single`, nationality `Filipino`, address, contact | | | |
| 4 | Enter optional fields: PhilHealth ID `99-999999999-9`, blood type `O+`, emergency contact | | | |
| 5 | Click **Save** | Patient created with system ID matching pattern `TST-P-202605-A1B2C3`; appears in list | | |
| 6 | Click the patient record | Demographics displayed correctly | | |

---

### TC-PAT-002: Reject Duplicate PhilHealth ID

**Pre-condition:** Patient with PhilHealth ID `99-999999999-9` already exists (Section 8).  
**Role:** `test.doctor.jq`  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Click **Register New Patient** | Registration form opens | | |
| 2 | Enter all required fields; set PhilHealth ID to `99-999999999-9` | | | |
| 3 | Click **Save** | Error: PhilHealth ID is already registered | | |

---

### TC-PAT-003: Search for a Patient

**Pre-condition:** Patient `TST-P-202605-A1B2C3` (Test Patient UAT) exists.  
**Role:** `test.doctor.jq`  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Patients** | Patient list is shown | | |
| 2 | Type `test patient` (partial, lowercase) in the search bar | Patient `Test Patient UAT` appears; search is case-insensitive | | |
| 3 | Clear search; type PhilHealth ID `99-999999999-9` | Same patient appears | | |
| 4 | Click the patient | Full patient profile opens | | |

---

### TC-PAT-004: Edit Patient Demographics

**Pre-condition:** Patient `TST-P-202605-A1B2C3` exists.  
**Role:** `test.doctor.jq`  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient `TST-P-202605-A1B2C3` | Demographics displayed | | |
| 2 | Click **Edit** | Fields become editable | | |
| 3 | Change contact number to `09171234567` and click **Save** | Updated value shown; `updated_at` timestamp refreshed | | |

---

### TC-PAT-005: Record a Patient Condition

**Pre-condition:** Patient `TST-P-202605-A1B2C3` exists.  
**Role:** `test.doctor.jq`  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient profile → **Conditions** tab | Conditions list shown | | |
| 2 | Click **Add Condition** | Condition form opens | | |
| 3 | Enter: condition `Hypertension`, clinical status `active`, severity `moderate`, onset `2026-01-01` | | | |
| 4 | Click **Save** | Condition appears in the conditions list in chronological order | | |

---

### TC-PAT-006: Record a Patient Allergy

**Pre-condition:** Patient `TST-P-202605-A1B2C3` exists.  
**Role:** `test.doctor.jq` or `test.nurse.ja`  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient profile → **Allergies** tab | Allergies list shown | | |
| 2 | Click **Add Allergy** | Allergy form opens | | |
| 3 | Enter: substance `Penicillin`, clinical status `active`, criticality `high` | | | |
| 4 | Click **Save** | Allergy `Penicillin (high)` appears in the allergy list | | |

---

### TC-PAT-007: Record a Patient Immunization

**Pre-condition:** Patient `TST-P-202605-A1B2C3` exists.  
**Role:** `test.doctor.jq` or `test.nurse.ja`  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient profile → **Immunizations** tab | Immunization list shown | | |
| 2 | Click **Add Immunization** | Immunization form opens | | |
| 3 | Enter: vaccine `COVID-19 Booster`, date `2025-09-01`, lot `LOT-UAT-001`, expiry `2026-12-31` | | | |
| 4 | Click **Save** | Immunization appears in the list sorted by date | | |

---

## Module 3 — Admission

### TC-ADM-001: Create a New Encounter

**Pre-condition:** Patient `TST-P-202605-A1B2C3` exists. Logged in as `test.doctor.jq`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Admission** | Encounters list shown | | |
| 2 | Click **New Encounter** | Encounter form opens | | |
| 3 | Select `TST-P-202605-A1B2C3`; class `Inpatient`; start `2026-05-13 09:00` | | | |
| 4 | Click **Save** | Encounter created with status **in-progress**; ID follows pattern `TST-ENC-20260513T090000` | | |

---

### TC-ADM-002: Record a Procedure on an Encounter

**Pre-condition:** Encounter `TST-ENC-20260513T090000` exists (TC-ADM-001). Logged in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open encounter `TST-ENC-20260513T090000` | Encounter detail shown | | |
| 2 | Click **Add Procedure** | Procedure form opens | | |
| 3 | Enter: procedure `Blood Glucose Test`, status `completed`, body site `arm` | | | |
| 4 | Click **Save** | Procedure appears in the encounter's procedure list | | |

---

### TC-ADM-003: View and Filter Active Encounters

**Pre-condition:** At least 2 encounters exist. Logged in as `test.doctor.jq` or `test.nurse.ja`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Admission** | All encounters listed | | |
| 2 | Filter by class **Inpatient** | Only inpatient encounters shown | | |
| 3 | Search `Test Patient` | Matching encounter for `TST-P-202605-A1B2C3` appears | | |
| 4 | Verify sort order | Most recent admission date first | | |

---

### TC-ADM-004: Close an Encounter

**Pre-condition:** Encounter `TST-ENC-20260513T090000` is in-progress. Logged in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open encounter `TST-ENC-20260513T090000` | Encounter detail shown | | |
| 2 | Click **End Encounter** | End date/time recorded automatically; status changes to **finished** | | |
| 3 | Verify in the active encounters list | Encounter no longer appears in active list; accessible in history | | |

---

## Module 4 — Monitoring

### TC-MON-001: Record a Vital Sign Observation

**Pre-condition:** Active encounter for `TST-P-202605-A1B2C3` exists. Logged in as `test.nurse.ja`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Monitoring** | Monitoring page shown | | |
| 2 | Click **New Observation** | Observation form opens | | |
| 3 | Select patient `TST-P-202605-A1B2C3` and their active encounter | | | |
| 4 | Select type **Temperature**; value `37.5`; unit `°C`; effective `2026-05-13 09:30` | | | |
| 5 | Click **Save** | Observation appears in the monitoring timeline | | |

---

### TC-MON-002: Record Blood Pressure (Multi-Component)

**Pre-condition:** Active encounter exists for `TST-P-202605-A1B2C3`. Logged in as `test.nurse.ja`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Click **New Observation** | Observation form opens | | |
| 2 | Select type **Blood Pressure** | Two sub-fields shown: Systolic and Diastolic | | |
| 3 | Enter Systolic `120` mmHg, Diastolic `80` mmHg | | | |
| 4 | Click **Save** | Observation saved; timeline shows `120/80 mmHg` | | |

---

### TC-MON-003: Abnormal Value Flagging

**Pre-condition:** Active encounter exists. Logged in as `test.nurse.ja`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Click **New Observation**; select **Heart Rate**; enter `130` bpm | | | |
| 2 | Click **Save** | Observation saved with visual high flag (red or yellow highlight) | | |
| 3 | Check stored interpretation code | Interpretation shows **H** (high) | | |

---

### TC-MON-004: View Observation History

**Pre-condition:** At least 3 observations exist for `TST-P-202605-A1B2C3`. Logged in as `test.doctor.jq`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open Monitoring for `TST-P-202605-A1B2C3` | Timeline shows all observations | | |
| 2 | Filter by type **Temperature** | Only temperature observations shown | | |
| 3 | Verify sort order | Most recent observation first | | |

---

### TC-MON-005: Create a Charge Item

**Pre-condition:** Active encounter and billing account exist for `TST-P-202605-A1B2C3`. Logged in as `test.nurse.ja`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Monitoring** and click **Add Charge Item** | Charge item form opens | | |
| 2 | Select service code (ECG monitoring); quantity `1`; link to encounter | | | |
| 3 | Click **Save** | Charge item created; visible in the patient's billing account | | |

---

## Module 5 — Laboratory

### TC-LAB-001: Order a Lab Test (Doctor)

**Pre-condition:** Active encounter exists for `TST-P-202605-A1B2C3`. Lab test catalog has at least one entry. Logged in as `test.doctor.jq`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Laboratory** | Lab module shown | | |
| 2 | Click **New Lab Order** | Order form opens | | |
| 3 | Select `TST-P-202605-A1B2C3`, their active encounter, and test `CBC` | | | |
| 4 | Set priority **Urgent** | | | |
| 5 | Click **Submit** | Diagnostic report created with status **registered**; appears in lab queue | | |

---

### TC-LAB-002: Record Specimen Collection (Lab Technician)

**Pre-condition:** Lab order from TC-LAB-001 is in status **registered**. Logged in as `test.lab.lt`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Laboratory** and open the pending CBC order | Order detail shown | | |
| 2 | Click **Record Specimen** | Specimen form opens | | |
| 3 | Enter: method `venipuncture`, body site `left arm`, collected `2026-05-13 10:00` | | | |
| 4 | Click **Save** | Specimen recorded; diagnostic report status changes to **in-progress** | | |

---

### TC-LAB-003: Enter and Finalize Lab Results (Lab Technician)

**Pre-condition:** CBC diagnostic report is **in-progress** with a specimen. Logged in as `test.lab.lt`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the in-progress CBC report | Report detail shown | | |
| 2 | Click **Enter Results** | Result entry form opens | | |
| 3 | Enter values for each CBC component (Hemoglobin, WBC, Platelets, etc.) | | | |
| 4 | Click **Finalize Report** | Status changes to **final**; issued datetime recorded | | |
| 5 | Log in as `test.doctor.jq` and open the same report | Result values visible with reference ranges | | |

---

### TC-LAB-004: Manage Lab Test Catalog

**Pre-condition:** Logged in as `test.lab.lt` or `test.admin.uat`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Laboratory → Test Catalog** | Catalog list shown | | |
| 2 | Click **Add Test** | Test form opens | | |
| 3 | Enter: name `Hemoglobin A1c`, code `HBA1C-UAT`, category `chemistry`, base price `₱350`, turnaround `24h` | | | |
| 4 | Click **Save** | Test `HBA1C-UAT` appears in the catalog | | |
| 5 | Open `HBA1C-UAT` and click **Deactivate** | Test is hidden from the lab order picker | | |

---

### TC-LAB-005: Record an Imaging Study

**Pre-condition:** Active encounter exists. Logged in as `test.lab.lt` or `test.doctor.jq`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Laboratory → Imaging Studies** | Imaging studies list shown | | |
| 2 | Click **New Imaging Study** | Form opens | | |
| 3 | Enter: modality `X-ray`, start `2026-05-13 11:00`, series `1`, instances `2` | | | |
| 4 | Click **Save** | Imaging study appears in the list, separate from lab test reports | | |

---

## Module 6 — Pharmacy and Inventory

### TC-PHR-001: Prescribe Medication (Doctor)

**Pre-condition:** Active encounter for `TST-P-202605-A1B2C3` exists. Patient has Penicillin allergy (TC-PAT-006). Logged in as `test.doctor.jq`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Pharmacy** → **New Prescription** | Prescription form opens | | |
| 2 | Select patient `TST-P-202605-A1B2C3` | Penicillin allergy warning is displayed | | |
| 3 | Select a non-allergenic medication (e.g., `Paracetamol 500mg`); dose `1 tablet`; route `oral`; frequency `every 6h` | | | |
| 4 | Click **Save** | Prescription created with status **active**; appears in the pharmacy queue | | |

---

### TC-PHR-002: Dispense Medication (Pharmacist)

**Pre-condition:** Active prescription from TC-PHR-001 exists. Inventory has stock for `Paracetamol 500mg`. Logged in as `test.pharm.px`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Pharmacy → Prescriptions Queue** | Active prescriptions listed | | |
| 2 | Open the `Paracetamol 500mg` prescription | Full prescription detail shown | | |
| 3 | Click **Dispense** | Dispense confirmation form opens | | |
| 4 | Confirm: medication `Paracetamol 500mg`, dose `1 tablet`, route `oral`, datetime `2026-05-13 12:00` | | | |
| 5 | Click **Confirm** | Administration record created; inventory stock decremented; charge item generated | | |

---

### TC-PHR-003: View Prescriptions Queue

**Pre-condition:** At least 2 prescriptions exist with different priorities. Logged in as `test.pharm.px`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Pharmacy → Prescriptions Queue** | Queue displayed | | |
| 2 | Verify STAT prescriptions appear at the top | STAT items sorted first | | |
| 3 | Filter by priority **Routine** | Only routine prescriptions shown | | |

---

### TC-PHR-004: Manage Medication Inventory

**Pre-condition:** Logged in as `test.pharm.px`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Inventory** | List shows: name, stock, unit, reorder level, expiry, batch, unit cost | | |
| 2 | Click **Adjust Stock** on any item | Stock adjustment form opens | | |
| 3 | Enter receipt quantity `100`, reason `UAT restock`, batch `LOT-UAT-2026` | | | |
| 4 | Click **Save** | Stock level updated; movement logged with timestamp | | |

---

### TC-PHR-005: Low Stock Alert

**Pre-condition:** An inventory item exists with stock ≤ reorder level. Logged in as `test.pharm.px`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Inventory** | Low-stock items are visually flagged | | |
| 2 | Check the pharmacy dashboard widget | Summary of low-stock medications visible | | |

---

### TC-PHR-006: Expired Medication Flag

**Pre-condition:** An inventory item with expiry date in the past exists. Logged in as `test.pharm.px`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Inventory** | Expired items highlighted (distinct from non-expired) | | |
| 2 | Open the dispense picker for any prescription | Expired medication does not appear as a selectable option | | |

---

## Module 7 — Billing and PhilHealth

### TC-BIL-001: Create a Billing Account

**Pre-condition:** Encounter `TST-ENC-20260513T090000` exists. Logged in as `test.billing.bc`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Billing → Accounts** | Billing accounts list shown | | |
| 2 | Click **New Billing Account** | Account form opens | | |
| 3 | Select `TST-P-202605-A1B2C3`, encounter `TST-ENC-20260513T090000`, service period `2026-05-13` to `2026-05-15` | | | |
| 4 | Click **Save** | Billing account created; visible in the list | | |

---

### TC-BIL-002: Generate an Invoice

**Pre-condition:** Billing account from TC-BIL-001 exists with at least one linked charge item. Logged in as `test.billing.bc`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Billing → Invoices** → **New Invoice** | Invoice form opens | | |
| 2 | Select the billing account for `TST-P-202605-A1B2C3` | Charge items loaded and itemized | | |
| 3 | Set invoice date `2026-05-15`; due date `2026-05-22` | | | |
| 4 | Save as **draft** | Draft invoice `TST-INV-001` created | | |
| 5 | Change status to **Issued** | Invoice marked issued; printable format accessible | | |

---

### TC-BIL-003: Submit a PhilHealth Claim

**Pre-condition:** Patient `TST-P-202605-A1B2C3` has PhilHealth ID `99-999999999-9`; encounter and billing account exist. Logged in as `test.billing.bc`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **PhilHealth** → **New Claim** | Claim form opens | | |
| 2 | Enter: type `institutional`, patient `TST-P-202605-A1B2C3`, encounter `TST-ENC-20260513T090000`, billable period `2026-05-13` to `2026-05-15`, total `₱5000` | | | |
| 3 | Add diagnosis ICD code and procedure as claim line items | | | |
| 4 | Click **Submit** | Claim created with status **active** | | |

---

### TC-BIL-004: Record a Payment

**Pre-condition:** Invoice `TST-INV-001` is issued. Logged in as `test.billing.bc`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Billing → Payments** → **Record Payment** | Payment form opens | | |
| 2 | Enter: amount `₱5000`, date `2026-05-16`, method `cash`, reference `OR-UAT-001` | | | |
| 3 | Link to billing account and invoice `TST-INV-001` | | | |
| 4 | Click **Save** | Payment recorded; outstanding balance updated to ₱0 | | |

---

### TC-BIL-005: Process Payment Reconciliation

**Pre-condition:** A PhilHealth claim and a payment exist. Logged in as `test.billing.bc`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the reconciliation section in **Billing** | Reconciliation form accessible | | |
| 2 | Link payment `OR-UAT-001` to the PhilHealth claim line items | | | |
| 3 | Observe any discrepancy between claimed and paid amounts | Discrepancies highlighted | | |
| 4 | Mark reconciled items as **settled** and save | Reconciliation record saved | | |

---

## Module 8 — Discharge

### TC-DIS-001: Create a Discharge Summary

**Pre-condition:** Active encounter `TST-ENC-20260513T090000` exists for `TST-P-202605-A1B2C3`. Logged in as `test.doctor.jq`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Discharge** | Discharge list shown | | |
| 2 | Click **New Discharge** | Discharge form opens | | |
| 3 | Select `TST-P-202605-A1B2C3` and encounter `TST-ENC-20260513T090000` | | | |
| 4 | Set discharge datetime `2026-05-15 14:00`; write summary `Patient stable, responding to treatment.` | | | |
| 5 | Click **Save** | Discharge record created with status **draft** | | |

---

### TC-DIS-002: Add Discharge Instructions and Follow-Up Plan

**Pre-condition:** Draft discharge record from TC-DIS-001 exists. Logged in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the draft discharge record | Discharge detail shown | | |
| 2 | Enter discharge instructions: `Take Paracetamol 500mg every 6 hours for 3 days. Rest and increase fluid intake.` | | | |
| 3 | Enter follow-up plan: type `outpatient consult`, provider `test.doctor.jq`, timeframe `1 week` | | | |
| 4 | Click **Save** | Instructions and plan saved on the record | | |

---

### TC-DIS-003: Finalize Discharge

**Pre-condition:** Draft discharge with instructions from TC-DIS-002. Logged in as `test.doctor.jq`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the draft discharge record | Discharge detail shown | | |
| 2 | Click **Finalize Discharge** | | | |
| 3 | Verify discharge status | Status changed to **final**; record is read-only | | |
| 4 | Verify encounter status | Encounter `TST-ENC-20260513T090000` status changed to **finished** | | |
| 5 | Log in as `test.nurse.ja` and attempt to edit the finalized discharge | Edit is not permitted | | |

---

### TC-DIS-004: View Discharge History

**Pre-condition:** At least one finalized discharge exists.  
**Role:** `test.doctor.jq`, `test.nurse.ja`, or `test.billing.bc`  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Discharge** | List shows: patient name, encounter, discharge date, doctor, status | | |
| 2 | Filter by date range `2026-05-01` to `2026-05-31` | List narrows to discharges in May 2026 | | |
| 3 | Click the finalized discharge | Full summary displayed in read-only mode | | |

---

## Module 9 — WAH4PC Gateway Integration

### TC-WAH-001: Fetch Patient from Gateway

**Pre-condition:** WAH4PC env vars configured in staging `.env`. Patient `TST-P-202605-A1B2C3` has PhilHealth ID `99-999999999-9`. Logged in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient `TST-P-202605-A1B2C3` | Patient detail shown | | |
| 2 | Click **Fetch from Gateway** | Gateway fetch form opens | | |
| 3 | Enter a valid Target Provider ID and PhilHealth `99-999999999-9` | | | |
| 4 | Click **Fetch** | Request sent; status notification shown to user | | |
| 5 | When the webhook callback arrives, verify returned data displayed for review | FHIR data (encounters, procedures, immunizations) shown before import | | |
| 6 | Log in as `test.admin.uat` and check the audit log | Entry exists: type=pull, patient=`TST-P-202605-A1B2C3`, status tracked | | |

---

### TC-WAH-002: Push Patient to Gateway

**Pre-condition:** WAH4PC env vars configured. Patient `TST-P-202605-A1B2C3` has conditions and encounters. Logged in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient `TST-P-202605-A1B2C3` | Patient detail shown | | |
| 2 | Click **Send to Gateway** | Confirmation prompt appears | | |
| 3 | Confirm the action | FHIR bundle sent; success notification shown | | |
| 4 | Log in as `test.admin.uat` and check the audit log | Entry exists: type=push, patient=`TST-P-202605-A1B2C3`, status tracked | | |

---

### TC-WAH-003: Push Restricted to Authorized Role

**Pre-condition:** Patient `TST-P-202605-A1B2C3` exists. Logged in as `test.billing.bc`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient `TST-P-202605-A1B2C3` | Patient detail shown (billing-limited view) | | |
| 2 | Look for **Send to Gateway** option | Option is not visible | | |
| 3 | Directly call `POST /api/patients/wah4pc/send` with billing clerk's JWT token | Response: HTTP 403 Forbidden | | |

---

### TC-WAH-004: Incoming Webhook Authentication

**Pre-condition:** Backend is running and accessible.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | POST to `/api/patients/webhooks/receive` with no `X-Gateway-Auth` header | HTTP 403 Forbidden | | |
| 2 | POST with an incorrect `X-Gateway-Auth` value | HTTP 403 Forbidden | | |
| 3 | POST with the correct `GATEWAY_AUTH_KEY` value | HTTP 200; payload processed | | |

---

## Module 10 — Appointments

### TC-APT-001: Create an Appointment

**Pre-condition:** Patient `TST-P-202605-A1B2C3` and practitioner linked to `test.doctor.jq` exist. Logged in as `test.doctor.jq` or `test.nurse.ja`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Appointments** | Appointments list shown | | |
| 2 | Click **New Appointment** | Appointment form opens | | |
| 3 | Select patient `TST-P-202605-A1B2C3`, practitioner, date `2026-05-20 10:00`, service type `General Consultation` | | | |
| 4 | Click **Save** | Appointment created and visible in the list | | |

---

### TC-APT-002: Cancel an Appointment

**Pre-condition:** An active appointment from TC-APT-001 exists. Logged in as `test.doctor.jq`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the appointment from TC-APT-001 | Appointment detail shown | | |
| 2 | Click **Cancel** | Appointment status changed to **cancelled** | | |

---

### TC-APT-003: Mark Patient as Arrived

**Pre-condition:** A new active appointment exists. Logged in as `test.nurse.ja`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open an active appointment | Appointment detail shown | | |
| 2 | Click **Arrive** | Appointment status updated to reflect patient arrival | | |

---

## Module 11 — Settings and Account Management

### TC-SET-001: Update Account Settings

**Pre-condition:** Logged in as `test.doctor.jq`.  
**Priority:** Low

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Account Settings** | Account settings page shown | | |
| 2 | Update display name to `Dr. UAT Doctor` and click **Save** | Success notification; display name updated | | |

---

### TC-SET-002: Change Password (Logged In)

**Pre-condition:** Logged in as `test.nurse.ja`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Account Settings → Change Password** | Password change form shown | | |
| 2 | Enter current password `TestPass!234` and new password `NewNursePass!789` | | | |
| 3 | Submit (enter OTP if prompted) | Password updated | | |
| 4 | Log out and attempt login with old password `TestPass!234` | Login fails | | |
| 5 | Log in with `NewNursePass!789` | Login succeeds | | |

---

### TC-SET-003: Admin Manages Organizations

**Pre-condition:** Logged in as `test.admin.uat`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Settings → Organizations** | Organization list shown | | |
| 2 | Click **Add Organization** | Organization form opens | | |
| 3 | Enter: name `TEST-ORG-LGUHOSP`, type `hospital`, address, contact | | | |
| 4 | Click **Save** | `TEST-ORG-LGUHOSP` appears in the list and in encounter/registration dropdowns | | |

---

### TC-SET-004: Admin Manages Practitioners

**Pre-condition:** Logged in as `test.admin.uat`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Settings → Practitioners** | Practitioner list shown | | |
| 2 | Click **Add Practitioner** | Practitioner form opens | | |
| 3 | Enter: first name `UAT`, last name `Doctor`, gender `Male`, license `MD-UAT-001`, org `TEST-ORG-LGUHOSP` | | | |
| 4 | Click **Save** | Practitioner created and available in encounter/procedure assignment pickers | | |

---

## Module 12 — Dashboard

### TC-DASH-001: Role-Specific Dashboard Content

**Pre-condition:** At least one encounter, observation, and prescription exist in the system.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Log in as `test.doctor.jq` | Dashboard: patients admitted today, pending lab results, my prescriptions | | |
| 2 | Log in as `test.nurse.ja` | Dashboard: ward patients, pending medication administrations, vital signs due | | |
| 3 | Log in as `test.pharm.px` | Dashboard: prescriptions awaiting dispensing, low-stock medications | | |
| 4 | Log in as `test.lab.lt` | Dashboard: pending lab orders, specimens collected today | | |
| 5 | Log in as `test.billing.bc` | Dashboard: unbilled encounters, pending claims, outstanding invoices | | |
| 6 | Log in as `test.admin.uat` | Dashboard: all system-wide metrics visible | | |

---

## Module 13 — Security and Access Control

### TC-SEC-001: Rate Limiting — Login Endpoint

**Pre-condition:** Backend running and accessible.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Send 60 POST requests to `/api/accounts/login/` within one minute | All 60 succeed (or return auth errors, not 429) | | |
| 2 | Send a 61st request within the same minute | HTTP 429 Too Many Requests with `Retry-After` header | | |

---

### TC-SEC-002: Rate Limiting — Password Reset Endpoint

**Pre-condition:** Backend running.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Send 3 POST requests to `/api/accounts/password-reset/` within one minute | All 3 processed | | |
| 2 | Send a 4th request within the same minute | HTTP 429 Too Many Requests | | |

---

### TC-SEC-003: Unauthorized API Access

**Pre-condition:** Backend running.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Send `GET /api/patients/` with no Authorization header | HTTP 401 Unauthorized | | |
| 2 | Send with an expired access token | HTTP 401 Unauthorized | | |
| 3 | Send `GET /api/admission/encounters/` with `test.billing.bc`'s valid JWT token | HTTP 403 Forbidden | | |

---

### TC-SEC-004: Token Rotation on Refresh

**Pre-condition:** Valid refresh token obtained by logging in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | POST to `/api/accounts/token/refresh/` with the refresh token | New access token returned | | |
| 2 | POST again with the same (now used) refresh token | HTTP 401; token is blacklisted | | |

---

## 8. Test Data Matrix

The following records must exist in the UAT environment before testing begins.

### Test Accounts

| Role | Username / Email | Password | Notes |
|---|---|---|---|
| Administrator | `test.admin.uat@wah4h.test` | `TestPass!234` | Created via `createsuperuser` |
| Doctor | `test.doctor.jq@wah4h.test` | `TestPass!234` | Register with role `doctor` |
| Nurse | `test.nurse.ja@wah4h.test` | `TestPass!234` | Register with role `nurse` |
| Lab Technician | `test.lab.lt@wah4h.test` | `TestPass!234` | Register with role `lab_technician` |
| Pharmacist | `test.pharm.px@wah4h.test` | `TestPass!234` | Register with role `pharmacist` |
| Billing Clerk | `test.billing.bc@wah4h.test` | `TestPass!234` | Register with role `billing_clerk` |

### Test Patient

| Field | Value |
|---|---|
| System ID | `TST-P-202605-A1B2C3` |
| Full Name | Test Patient UAT |
| Date of Birth | 1990-01-15 |
| Sex | Male |
| PhilHealth ID | `99-999999999-9` |
| Blood Type | O+ |
| Known Allergy | Penicillin (criticality: high) |

### Test Organization

| Field | Value |
|---|---|
| Name | `TEST-ORG-LGUHOSP` |
| Type | Hospital |

### Test Encounter

| Field | Value |
|---|---|
| Encounter ID | `TST-ENC-20260513T090000` |
| Patient | `TST-P-202605-A1B2C3` |
| Class | Inpatient |
| Start | 2026-05-13 09:00 |
| Status | in-progress (before TC-ADM-004 / TC-DIS-003) |

### Test Invoice

| Field | Value |
|---|---|
| Invoice ID | `TST-INV-001` |
| Patient | `TST-P-202605-A1B2C3` |
| Billing Account | Linked to `TST-ENC-20260513T090000` |

---

## 9. Acceptance Criteria (per scenario)

### Pass

A test case is marked **PASS** when:
- The scenario runs end-to-end without interruption.
- Both the UI and API behave exactly as described in the Expected Result column.
- No Critical defects are encountered.
- No more than the agreed number of High defects are present, and mitigations exist for each.

### Fail

A test case is marked **FAIL** when:
- Any Critical defect is encountered (system crash, data loss, security bypass, authentication failure).
- More than 2 High defects affect the core flow of the scenario with no accepted workaround.
- The actual result does not match the expected result and cannot be attributed to test data setup error.

A **FAIL** on a Critical-priority test case blocks acceptance of the entire module until the defect is fixed and retested.

---

## 10. Regression & Retest Strategy

### Retest

- All failed test cases are re-executed after the defect fix is verified by the developer.
- The re-run must use the same test data identifiers and steps as the original execution.
- The retest result (Pass/Fail) replaces the original status in the UAT Summary table.

### Regression

- When a fix is applied to a failed test case, a **regression smoke subset** must pass before re-running the full UAT cycle.
- The smoke subset includes: TC-AUTH-004, TC-PAT-001, TC-ADM-001, TC-LAB-003, TC-DIS-003, TC-SEC-003.
- If any smoke test fails after a fix, the fix is considered incomplete and must be reworked before any further testing continues.
- Fixes that touch cross-cutting concerns (authentication, role access, FHIR serialization) require a full regression run across all 13 modules before sign-off.

---

## UAT Summary

| Module | Total TCs | Pass | Fail | Blocked | Not Tested |
|---|---|---|---|---|---|
| 1 — Authentication | 8 | | | | |
| 2 — Patient Management | 7 | | | | |
| 3 — Admission | 4 | | | | |
| 4 — Monitoring | 5 | | | | |
| 5 — Laboratory | 5 | | | | |
| 6 — Pharmacy and Inventory | 6 | | | | |
| 7 — Billing and PhilHealth | 5 | | | | |
| 8 — Discharge | 4 | | | | |
| 9 — WAH4PC Gateway | 4 | | | | |
| 10 — Appointments | 3 | | | | |
| 11 — Settings and Account | 4 | | | | |
| 12 — Dashboard | 1 | | | | |
| 13 — Security and Access | 4 | | | | |
| **Total** | **60** | | | | |

---

## Defect Log

| ID | TC Ref | Priority | Description | Actual Result | Assigned To | Status | Retest Result |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

**Priority Levels:** Critical / High / Medium / Low

---

*Document Version: 1.1 — Aligned with WAH4H Final UAT Playbook*  
*Date: 2026-05-13*  
*System: WAH4H v1.0 | APC 2025–2026 | T1 | SS231 | Group 04*
