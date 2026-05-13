# WAH4H — User Acceptance Testing (UAT)

**System:** WAH for Hospitals (WAH4H)  
**Version:** 1.0  
**Academic Year:** 2025–2026 | APC | T1 | SS231 | Group 04

---

## Module Availability Verification

The following table reflects the result of a code-level check of every frontend page and backend URL before this UAT was written. Only modules confirmed to have live API connections are included in the test cases.

| Module | Frontend Page | Backend Endpoint | Status |
|---|---|---|---|
| Authentication | Login.tsx, Register.tsx, ResetPassword.tsx | `/api/accounts/` | ✅ Live |
| Account Settings | AccountSettings.tsx | `/api/accounts/` | ✅ Live |
| Patient Management | PatientRegistration.tsx | `/api/patients/` | ✅ Live |
| Admission & Encounters | Admission.tsx | `/api/admission/encounters/`, `/api/admission/procedures/` | ✅ Live |
| Appointments | Appointment.tsx | `/api/admission/appointments/`, `/api/admission/schedules/`, `/api/admission/slots/` | ✅ Live |
| Monitoring | Monitoring.tsx | `/api/monitoring/` | ✅ Live |
| Laboratory | Laboratory.tsx | `/api/laboratory/` | ✅ Live |
| Pharmacy | Pharmacy.tsx | `/api/pharmacy/` | ✅ Live |
| Discharge | Discharge.tsx | `/api/discharge/` | ✅ Live |
| Billing | Billing.tsx | `/api/billing/` | ✅ Live |
| PhilHealth Claims | PhilHealthClaims.tsx | eclaimsService → `/api/billing/claims/` | ✅ Live |
| Dashboard | ModernDashboard.tsx + role dashboards | Multiple services | ✅ Live |
| Admin Panel | AdminPage.tsx | `/api/accounts/admin/` | ✅ Live |
| Inventory | Inventory.tsx | — | ❌ Hardcoded mock data — excluded |
| Compliance | Compliance.tsx | — | ❌ Hardcoded static data — excluded |
| Statistics | App.tsx | — | ❌ "Coming Soon" — excluded |

---

## Table of Contents

1. [Instructions for Testers](#1-instructions-for-testers)
2. [Environments & Test Data Rules](#2-environments--test-data-rules)
3. [Entry & Exit Criteria](#3-entry--exit-criteria)
4. [UAT Sign-Off](#4-uat-sign-off)
5. [Module 1 — Authentication](#module-1--authentication)
6. [Module 2 — Patient Management](#module-2--patient-management)
7. [Module 3 — Admission & Encounters](#module-3--admission--encounters)
8. [Module 4 — Appointments](#module-4--appointments)
9. [Module 5 — Monitoring](#module-5--monitoring)
10. [Module 6 — Laboratory](#module-6--laboratory)
11. [Module 7 — Pharmacy](#module-7--pharmacy)
12. [Module 8 — Discharge](#module-8--discharge)
13. [Module 9 — Billing](#module-9--billing)
14. [Module 10 — PhilHealth Claims](#module-10--philhealth-claims)
15. [Module 11 — Dashboard](#module-11--dashboard)
16. [Module 12 — Admin Panel](#module-12--admin-panel)
17. [Module 13 — Account Settings](#module-13--account-settings)
18. [Module 14 — Security & Access Control](#module-14--security--access-control)
19. [Test Data Matrix](#test-data-matrix)
20. [Acceptance Criteria (per scenario)](#acceptance-criteria-per-scenario)
21. [Regression & Retest Strategy](#regression--retest-strategy)
22. [UAT Summary](#uat-summary)
23. [Defect Log](#defect-log)

---

## 1. Instructions for Testers

1. Execute test cases in order within each module section.
2. Mark each step result as **PASS**, **FAIL**, or **BLOCKED** (blocked = prerequisite failed).
3. For each FAIL, record the actual result in the Notes column and take a screenshot.
4. Use only the test data identifiers from the Test Data Matrix — do not invent ad-hoc names.
5. Do not use production data at any point during UAT.
6. After all test cases are executed, fill in the UAT Summary table and obtain sign-off.

---

## 2. Environments & Test Data Rules

### Environments

| Environment | Frontend URL | Backend URL | Database |
|---|---|---|---|
| UAT (Staging) | `http://localhost:3000` | `http://localhost:8000` | SQLite3 / PostgreSQL (mirrors production schema) |
| Production | `https://wah4h-frontend.vercel.app` | `https://wah4h-backend-apc.azurewebsites.net` | PostgreSQL |

Use a dedicated UAT environment that mirrors production in DB schema, config, and auth flows. Never run UAT tests against the production environment.

### Data Separation

All test data **must** use the following naming conventions:

| Record Type | Convention | Example |
|---|---|---|
| Organizations | `TEST-ORG-<short_name>` | `TEST-ORG-LGUHOSP` |
| User accounts | `test.<role>.<initials>@wah4h.test` | `test.doctor.jq@wah4h.test` |
| Patient IDs | `TST-P-{YYYYMM}-{RANDOM6}` | `TST-P-202605-A1B2C3` |
| Encounter IDs | `TST-ENC-<timestamp>` | `TST-ENC-20260513T090000` |
| Invoice IDs | `TST-INV-<sequential>` | `TST-INV-001` |

### Production Data Policy

No production data is used in UAT. All UAT records must be removable by a single cleanup script. Tag created records with a `uat=true` flag where the data model supports it.

---

## 3. Entry & Exit Criteria

### Entry Criteria (Start UAT)

All of the following must be satisfied before UAT begins:

- [ ] Staging environment deployed and accessible at the URLs in Section 2
- [ ] All 6 test accounts from the Test Data Matrix are created and verified
- [ ] Seed patient `TST-P-202605-A1B2C3` is loaded with allergy (Penicillin) and one condition
- [ ] Test encounter `TST-ENC-20260513T090000` exists and is in-progress
- [ ] At least one lab test catalog entry (CBC) exists
- [ ] At least one pharmacy inventory item (Paracetamol 500mg, stock > 10) exists
- [ ] WAH4PC gateway credentials are configured in staging `.env`
- [ ] OTP is disabled (`LOGIN_USE_OTP = False`, `REGISTER_USE_OTP = False`) for test efficiency, OR email delivery is verified functional
- [ ] No Critical defects are known to be open from prior testing cycles

### Exit Criteria (End UAT)

UAT is complete and acceptance may be granted when:

- [ ] All planned test cases have been executed (Pass, Fail, or Blocked with justification)
- [ ] All Critical defects are fixed and verified via retest
- [ ] No more than 2 High defects remain, each with approved business risk acceptance
- [ ] All core-flow cases (AUTH, PAT, ADM, DIS) have a Pass result
- [ ] Business owner sign-off recorded in Section 4

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

**Backend:** `/api/accounts/` · **Pages:** Login.tsx, Register.tsx, ResetPassword.tsx

---

### TC-AUTH-001: Successful User Registration

**Pre-condition:** OTP disabled (`LOGIN_USE_OTP=False`) or email delivery confirmed. New email not already in database.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/register` | Registration form loads | | |
| 2 | Fill in: first name `UAT`, last name `NewDoc`, email `test.newdoc.uat@wah4h.test`, role `Doctor`, password `TestPass!234` | All fields accept input | | |
| 3 | Click **Register** | If OTP on: OTP sent, verification screen shown. If OTP off: account created, redirected to `/login` | | |
| 4 | Enter correct OTP (if prompted) | Redirected to `/login` with success message | | |
| 5 | Log in with `test.newdoc.uat@wah4h.test` / `TestPass!234` | Login succeeds; Dashboard loads | | |

---

### TC-AUTH-002: Registration Rejected — Password Policy

**Pre-condition:** Registration page loaded.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/register` | Registration form loads | | |
| 2 | Set password `123456789012` (numeric only) and click **Register** | Error: password must not be purely numeric | | |
| 3 | Set password `password123456` (common) and click **Register** | Error: password is too common | | |
| 4 | Set password `Short1!` (< 12 chars) and click **Register** | Error: minimum 12 characters | | |

---

### TC-AUTH-003: Registration Rejected — Duplicate Email

**Pre-condition:** `test.doctor.jq@wah4h.test` already exists.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/register`, enter `test.doctor.jq@wah4h.test` with a valid password | | | |
| 2 | Click **Register** | Error: email is already registered | | |

---

### TC-AUTH-004: Login — Valid Credentials

**Pre-condition:** Account `test.doctor.jq@wah4h.test` exists and is active.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/login` | Login form loads | | |
| 2 | Enter `test.doctor.jq@wah4h.test` / `TestPass!234` and click **Login** | If OTP on: OTP screen; If OTP off: Dashboard | | |
| 3 | Enter OTP if prompted | Dashboard loads | | |
| 4 | Check sidebar modules | Visible: Dashboard, Patients, Admission, Laboratory, Monitoring, Discharge, Appointments, PhilHealth, Settings. Hidden: Billing, Inventory, Statistics | | |

---

### TC-AUTH-005: Login — Invalid Credentials

**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to `/login` | Login form loads | | |
| 2 | Enter `test.doctor.jq@wah4h.test` with wrong password and click **Login** | Error message shown without revealing account existence | | |

---

### TC-AUTH-006: Password Reset Flow

**Pre-condition:** `test.nurse.ja@wah4h.test` active account exists.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Click **Forgot Password** on `/login` | Reset page loads | | |
| 2 | Submit `test.nurse.ja@wah4h.test` | OTP sent (response doesn't confirm email existence) | | |
| 3 | Enter OTP + new password `NewNurse!567` on `/reset-password` | Password updated; redirected to login | | |
| 4 | Log in with `NewNurse!567` | Login succeeds | | |
| 5 | Attempt login with old password `TestPass!234` | Login fails | | |

---

### TC-AUTH-007: Session Idle Timeout

**Pre-condition:** Logged in as `test.doctor.jq`. Frontend idle timeout is active.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Log in and leave the page idle for 13 minutes | | | |
| 2 | Observe at the 13-minute mark | Warning shown: session expires in 2 minutes | | |
| 3 | Do not interact for 2 more minutes | Redirected to `/login` | | |

---

### TC-AUTH-008: Role-Based Sidebar Per Role

**Pre-condition:** One account per role exists (see Test Data Matrix).  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Log in as `test.nurse.ja` | Sidebar: Dashboard, Patients, Admission, Monitoring, Pharmacy, Inventory, Appointments, Settings | | |
| 2 | Log in as `test.lab.lt` | Sidebar: Dashboard, Laboratory, Monitoring, Patients (limited), Compliance, Settings | | |
| 3 | Log in as `test.pharm.px` | Sidebar: Dashboard, Pharmacy, Inventory, Patients (limited), Compliance, Settings | | |
| 4 | Log in as `test.billing.bc` | Sidebar: Dashboard, Billing, PhilHealth, ERP, Patients (limited), Settings | | |
| 5 | Log in as `test.admin.uat` | Sidebar: all modules visible | | |

---

## Module 2 — Patient Management

**Backend:** `/api/patients/` · **Page:** PatientRegistration.tsx

---

### TC-PAT-001: Register New Patient

**Pre-condition:** Logged in as `test.doctor.jq` or `test.nurse.ja`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Patients** | Patient list loads | | |
| 2 | Click **Register New Patient** | Registration form opens | | |
| 3 | Fill required fields: first `Test`, last `Patient UAT`, DOB `1990-01-15`, sex `Male`, civil status `Single`, nationality `Filipino`, address, contact number | | | |
| 4 | Fill optional: PhilHealth ID `99-999999999-9`, blood type `O+`, emergency contact | | | |
| 5 | Click **Save** | Patient created with system ID; appears in the list | | |
| 6 | Open the patient record | All entered demographics display correctly | | |

---

### TC-PAT-002: Reject Duplicate PhilHealth ID

**Pre-condition:** Patient with PhilHealth ID `99-999999999-9` exists.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Click **Register New Patient** and fill required fields | | | |
| 2 | Set PhilHealth ID to `99-999999999-9` | | | |
| 3 | Click **Save** | Error: PhilHealth ID already registered | | |

---

### TC-PAT-003: Search Patient

**Pre-condition:** Patient `Test Patient UAT` exists.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | In **Patients**, type `test patient` in the search bar | `Test Patient UAT` appears (case-insensitive) | | |
| 2 | Clear; type PhilHealth ID `99-999999999-9` | Same patient appears | | |
| 3 | Click the patient row | Full profile opens | | |

---

### TC-PAT-004: Edit Patient Demographics

**Pre-condition:** Patient `TST-P-202605-A1B2C3` exists. Logged in as `test.doctor.jq`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient `TST-P-202605-A1B2C3` | Profile shown | | |
| 2 | Click **Edit** | Fields become editable | | |
| 3 | Change contact number to `09171234567` and click **Save** | Updated value shown; `updated_at` refreshed | | |

---

### TC-PAT-005: Record Condition

**Pre-condition:** Patient `TST-P-202605-A1B2C3` exists. Logged in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient → **Conditions** tab | Conditions list shown | | |
| 2 | Click **Add Condition** | Form opens | | |
| 3 | Enter: `Hypertension`, status `active`, severity `moderate`, onset `2026-01-01` | | | |
| 4 | Click **Save** | Condition appears in chronological order | | |

---

### TC-PAT-006: Record Allergy

**Pre-condition:** Patient `TST-P-202605-A1B2C3` exists.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient → **Allergies** tab | Allergies list shown | | |
| 2 | Click **Add Allergy** | Form opens | | |
| 3 | Enter: substance `Penicillin`, status `active`, criticality `high` | | | |
| 4 | Click **Save** | `Penicillin (high)` appears in the allergy list | | |

---

### TC-PAT-007: Record Immunization

**Pre-condition:** Patient `TST-P-202605-A1B2C3` exists.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient → **Immunizations** tab | Immunizations list shown | | |
| 2 | Click **Add Immunization** | Form opens | | |
| 3 | Enter: vaccine `COVID-19 Booster`, date `2025-09-01`, lot `LOT-UAT-001`, expiry `2026-12-31` | | | |
| 4 | Click **Save** | Immunization appears sorted by date | | |

---

### TC-PAT-008: Fetch Patient from WAH4PC Gateway

**Pre-condition:** WAH4PC env vars configured. Patient has PhilHealth ID `99-999999999-9`. Logged in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient `TST-P-202605-A1B2C3` | Profile shown | | |
| 2 | Click **Fetch from Gateway** | Form opens for Target Provider ID + PhilHealth ID | | |
| 3 | Enter a valid Target Provider ID and PhilHealth `99-999999999-9`, click **Fetch** | Request sent; status notification shown | | |
| 4 | When webhook callback arrives, verify FHIR data shown for review | Encounters, procedures, immunizations displayed before import | | |

---

### TC-PAT-009: Push Patient to WAH4PC Gateway

**Pre-condition:** WAH4PC env vars configured. Patient has conditions and encounters. Logged in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open patient `TST-P-202605-A1B2C3` | Profile shown | | |
| 2 | Click **Send to Gateway** | Confirmation prompt appears | | |
| 3 | Confirm | FHIR bundle sent; success notification shown | | |
| 4 | Log in as `test.admin.uat` and check the audit log | Entry: type=push, patient=`TST-P-202605-A1B2C3`, status tracked | | |

---

## Module 3 — Admission & Encounters

**Backend:** `/api/admission/encounters/`, `/api/admission/procedures/` · **Page:** Admission.tsx

---

### TC-ADM-001: Create Encounter

**Pre-condition:** Patient `TST-P-202605-A1B2C3` exists. Logged in as `test.doctor.jq`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Admission** | Encounters list loads | | |
| 2 | Click **New Encounter** | Form opens | | |
| 3 | Select `TST-P-202605-A1B2C3`, class `Inpatient`, start `2026-05-13 09:00` | | | |
| 4 | Click **Save** | Encounter created with status **in-progress**; appears in the list | | |

---

### TC-ADM-002: Record a Procedure

**Pre-condition:** Active encounter `TST-ENC-20260513T090000` exists. Logged in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open encounter `TST-ENC-20260513T090000` | Detail page shown | | |
| 2 | Click **Add Procedure** | Form opens | | |
| 3 | Enter: `Blood Glucose Test`, status `completed`, body site `arm` | | | |
| 4 | Click **Save** | Procedure appears in the encounter's procedure list | | |

---

### TC-ADM-003: Filter and Search Encounters

**Pre-condition:** At least 2 encounters exist. Logged in as `test.doctor.jq` or `test.nurse.ja`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Admission** | All encounters listed | | |
| 2 | Filter by class **Inpatient** | Only inpatient encounters shown | | |
| 3 | Search `Test Patient` | Encounter for `TST-P-202605-A1B2C3` appears | | |
| 4 | Verify sort order | Most recent admission date first | | |

---

### TC-ADM-004: Close an Encounter

**Pre-condition:** Encounter `TST-ENC-20260513T090000` is in-progress. Logged in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open encounter `TST-ENC-20260513T090000` | Detail shown | | |
| 2 | Click **End Encounter** | End datetime recorded; status changes to **finished** | | |
| 3 | Check active encounters list | Encounter no longer in active list; accessible in history | | |

---

## Module 4 — Appointments

**Backend:** `/api/admission/appointments/`, `/api/admission/schedules/`, `/api/admission/slots/` · **Page:** Appointment.tsx

---

### TC-APT-001: Create Appointment

**Pre-condition:** Patient `TST-P-202605-A1B2C3` and a practitioner exist. Logged in as `test.doctor.jq` or `test.nurse.ja`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Appointments** | Appointments list loads | | |
| 2 | Click **New Appointment** | Form opens | | |
| 3 | Select patient `TST-P-202605-A1B2C3`, practitioner (doctor), date `2026-05-20 10:00`, service type `General Consultation` | | | |
| 4 | Click **Save** | Appointment created and visible in the list | | |

---

### TC-APT-002: Cancel Appointment

**Pre-condition:** Active appointment from TC-APT-001 exists.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the appointment from TC-APT-001 | Detail shown | | |
| 2 | Click **Cancel** | Status changes to **cancelled** | | |

---

### TC-APT-003: Mark Patient Arrived

**Pre-condition:** A new active appointment exists. Logged in as `test.nurse.ja`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open an active appointment | Detail shown | | |
| 2 | Click **Arrive** | Appointment status updated to reflect patient arrival | | |

---

### TC-APT-004: Create and View Schedule

**Pre-condition:** A practitioner exists. Logged in as `test.admin.uat` or `test.doctor.jq`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Appointments → Schedules** | Schedule list loads | | |
| 2 | Click **New Schedule**, select practitioner, set days/times | | | |
| 3 | Click **Save** | Schedule appears in the list | | |
| 4 | Verify available slots are listed under the schedule | Slots visible | | |

---

## Module 5 — Monitoring

**Backend:** `/api/monitoring/` · **Page:** Monitoring.tsx

---

### TC-MON-001: Record Vital Sign

**Pre-condition:** Active encounter for `TST-P-202605-A1B2C3` exists. Logged in as `test.nurse.ja`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Monitoring** | Page loads | | |
| 2 | Click **New Observation** | Form opens | | |
| 3 | Select `TST-P-202605-A1B2C3` and their active encounter | | | |
| 4 | Select type **Temperature**, value `37.5`, unit `°C`, datetime `2026-05-13 09:30` | | | |
| 5 | Click **Save** | Observation appears in the monitoring timeline | | |

---

### TC-MON-002: Record Blood Pressure (Multi-Component)

**Pre-condition:** Active encounter exists. Logged in as `test.nurse.ja`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Click **New Observation** | Form opens | | |
| 2 | Select type **Blood Pressure** | Two sub-fields appear: Systolic and Diastolic | | |
| 3 | Enter Systolic `120` mmHg, Diastolic `80` mmHg and click **Save** | Timeline shows `120/80 mmHg` | | |

---

### TC-MON-003: Abnormal Value Flag

**Pre-condition:** Active encounter exists. Logged in as `test.nurse.ja`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Record **Heart Rate** observation with value `130` bpm | | | |
| 2 | Click **Save** | Observation flagged visually (red/yellow); interpretation code **H** stored | | |

---

### TC-MON-004: View Observation History

**Pre-condition:** At least 3 observations exist for `TST-P-202605-A1B2C3`. Logged in as `test.doctor.jq`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open **Monitoring** for `TST-P-202605-A1B2C3` | Timeline shows all observations | | |
| 2 | Filter by type **Temperature** | Only temperature observations shown | | |
| 3 | Verify sort order | Most recent first | | |

---

### TC-MON-005: Create Charge Item

**Pre-condition:** Active encounter and billing account exist. Logged in as `test.nurse.ja`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Click **Add Charge Item** | Form opens | | |
| 2 | Select service code (e.g., ECG monitoring), quantity `1`, link to encounter | | | |
| 3 | Click **Save** | Charge item created; visible in the billing account | | |

---

## Module 6 — Laboratory

**Backend:** `/api/laboratory/` · **Page:** Laboratory.tsx

---

### TC-LAB-001: Order a Lab Test

**Pre-condition:** Active encounter for `TST-P-202605-A1B2C3` exists. Lab catalog has CBC. Logged in as `test.doctor.jq`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Laboratory** | Page loads | | |
| 2 | Click **New Lab Order** | Form opens | | |
| 3 | Select `TST-P-202605-A1B2C3`, active encounter, test `CBC`, priority `Urgent` | | | |
| 4 | Click **Submit** | Diagnostic report created with status **registered**; appears in the lab queue | | |

---

### TC-LAB-002: Record Specimen Collection

**Pre-condition:** Lab order from TC-LAB-001 is in status **registered**. Logged in as `test.lab.lt`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the pending CBC order | Detail shown | | |
| 2 | Click **Record Specimen** | Form opens | | |
| 3 | Enter: method `venipuncture`, site `left arm`, collected `2026-05-13 10:00` | | | |
| 4 | Click **Save** | Specimen recorded; report status changes to **in-progress** | | |

---

### TC-LAB-003: Enter and Finalize Results

**Pre-condition:** CBC report is in-progress with specimen. Logged in as `test.lab.lt`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the in-progress CBC report | Detail shown | | |
| 2 | Click **Enter Results** | Result entry form opens | | |
| 3 | Enter values for each CBC component | | | |
| 4 | Click **Finalize Report** | Status changes to **final**; issued datetime recorded | | |
| 5 | Log in as `test.doctor.jq` and open the same report | Results visible with reference ranges | | |

---

### TC-LAB-004: Manage Lab Test Catalog

**Pre-condition:** Logged in as `test.lab.lt` or `test.admin.uat`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Laboratory → Test Catalog** | Catalog list loads | | |
| 2 | Click **Add Test** | Form opens | | |
| 3 | Enter: name `Hemoglobin A1c`, code `HBA1C-UAT`, category `chemistry`, price `₱350`, turnaround `24h` | | | |
| 4 | Click **Save** | `HBA1C-UAT` appears in the catalog | | |
| 5 | Deactivate `HBA1C-UAT` | Test hidden from the lab order picker | | |

---

### TC-LAB-005: Record Imaging Study

**Pre-condition:** Active encounter exists. Logged in as `test.lab.lt` or `test.doctor.jq`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Laboratory → Imaging Studies** | List loads | | |
| 2 | Click **New Imaging Study** | Form opens | | |
| 3 | Enter: modality `X-ray`, start `2026-05-13 11:00`, series `1`, instances `2` | | | |
| 4 | Click **Save** | Imaging study appears separately from lab test reports | | |

---

## Module 7 — Pharmacy

**Backend:** `/api/pharmacy/` · **Page:** Pharmacy.tsx

---

### TC-PHR-001: Prescribe Medication

**Pre-condition:** Active encounter for `TST-P-202605-A1B2C3` exists. Patient has Penicillin allergy (TC-PAT-006). Logged in as `test.doctor.jq`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Pharmacy → New Prescription** | Form opens | | |
| 2 | Select patient `TST-P-202605-A1B2C3` | Penicillin allergy warning displayed | | |
| 3 | Select `Paracetamol 500mg`, dose `1 tablet`, route `oral`, frequency `every 6h` | | | |
| 4 | Click **Save** | Prescription created with status **active**; in pharmacy queue | | |

---

### TC-PHR-002: Dispense Medication

**Pre-condition:** Active prescription from TC-PHR-001. Paracetamol stock > 0. Logged in as `test.pharm.px`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Pharmacy → Prescriptions Queue** | Active prescriptions listed | | |
| 2 | Open the `Paracetamol 500mg` prescription | Detail shown | | |
| 3 | Click **Dispense** | Dispense form opens | | |
| 4 | Confirm: medication, dose, route, datetime `2026-05-13 12:00` | | | |
| 5 | Click **Confirm** | Administration record created; stock decremented; charge item generated | | |

---

### TC-PHR-003: Prescriptions Queue Priority Sort

**Pre-condition:** At least 2 prescriptions exist with different priorities. Logged in as `test.pharm.px`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Pharmacy → Prescriptions Queue** | Queue displayed | | |
| 2 | Verify STAT prescriptions appear first | STAT at top | | |
| 3 | Filter by **Routine** | Only routine prescriptions shown | | |

---

## Module 8 — Discharge

**Backend:** `/api/discharge/` · **Page:** Discharge.tsx

---

### TC-DIS-001: Create Discharge Summary

**Pre-condition:** Active encounter `TST-ENC-20260513T090000` exists for `TST-P-202605-A1B2C3`. Logged in as `test.doctor.jq`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Discharge** | List loads | | |
| 2 | Click **New Discharge** | Form opens | | |
| 3 | Select `TST-P-202605-A1B2C3` and encounter `TST-ENC-20260513T090000` | | | |
| 4 | Set discharge datetime `2026-05-15 14:00`; write summary `Patient stable, responding to treatment.` | | | |
| 5 | Click **Save** | Discharge record created with status **draft** | | |

---

### TC-DIS-002: Add Instructions and Follow-Up Plan

**Pre-condition:** Draft discharge from TC-DIS-001 exists. Logged in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the draft discharge record | Detail shown | | |
| 2 | Enter discharge instructions: `Take Paracetamol 500mg every 6 hours for 3 days.` | | | |
| 3 | Enter follow-up: type `outpatient consult`, provider `test.doctor.jq`, timeframe `1 week` | | | |
| 4 | Click **Save** | Instructions and plan saved | | |

---

### TC-DIS-003: Finalize Discharge

**Pre-condition:** Draft discharge with instructions from TC-DIS-002. Logged in as `test.doctor.jq`.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open the draft discharge record | Detail shown | | |
| 2 | Click **Finalize Discharge** | | | |
| 3 | Verify discharge status | Changed to **final**; record is read-only | | |
| 4 | Verify encounter status | `TST-ENC-20260513T090000` changed to **finished** | | |
| 5 | Log in as `test.nurse.ja` and attempt to edit the record | Edit not permitted | | |

---

### TC-DIS-004: View Discharge History

**Pre-condition:** At least one finalized discharge exists. Role: `test.doctor.jq`, `test.nurse.ja`, or `test.billing.bc`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Discharge** | List shows: patient name, encounter, date, doctor, status | | |
| 2 | Filter by date range `2026-05-01` to `2026-05-31` | List narrows correctly | | |
| 3 | Click finalized discharge | Full summary shown read-only | | |

---

## Module 9 — Billing

**Backend:** `/api/billing/` · **Page:** Billing.tsx

---

### TC-BIL-001: Create Billing Account

**Pre-condition:** Encounter `TST-ENC-20260513T090000` exists. Logged in as `test.billing.bc`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Billing → Accounts** | List loads | | |
| 2 | Click **New Billing Account** | Form opens | | |
| 3 | Select `TST-P-202605-A1B2C3`, encounter `TST-ENC-20260513T090000`, service period `2026-05-13` to `2026-05-15` | | | |
| 4 | Click **Save** | Billing account created; visible in the list | | |

---

### TC-BIL-002: Generate Invoice

**Pre-condition:** Billing account from TC-BIL-001 has at least one linked charge item. Logged in as `test.billing.bc`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Billing → Invoices → New Invoice** | Form opens | | |
| 2 | Select billing account for `TST-P-202605-A1B2C3` | Charge items loaded and itemized | | |
| 3 | Set invoice date `2026-05-15`, due date `2026-05-22` | | | |
| 4 | Save as **draft** | Draft invoice `TST-INV-001` created | | |
| 5 | Change status to **Issued** | Invoice marked issued; printable format accessible | | |

---

### TC-BIL-003: Record a Payment

**Pre-condition:** Invoice `TST-INV-001` is issued. Logged in as `test.billing.bc`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Billing → Payments → Record Payment** | Form opens | | |
| 2 | Enter: amount `₱5000`, date `2026-05-16`, method `cash`, reference `OR-UAT-001` | | | |
| 3 | Link to billing account and invoice `TST-INV-001` | | | |
| 4 | Click **Save** | Payment recorded; outstanding balance updated to ₱0 | | |

---

### TC-BIL-004: Payment Reconciliation

**Pre-condition:** A payment and billing account exist. Logged in as `test.billing.bc`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open reconciliation section in **Billing** | Form accessible | | |
| 2 | Link payment `OR-UAT-001` to claim line items | | | |
| 3 | Note discrepancy between claimed and paid amounts | Discrepancies highlighted | | |
| 4 | Mark items as **settled** | Reconciliation record saved | | |

---

## Module 10 — PhilHealth Claims

**Backend:** `/api/billing/claims/` (via eclaimsService) · **Page:** PhilHealthClaims.tsx

---

### TC-PHL-001: Submit PhilHealth Claim

**Pre-condition:** Patient has PhilHealth ID `99-999999999-9`; encounter and billing account exist. Logged in as `test.billing.bc`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **PhilHealth** | Claims list loads | | |
| 2 | Click **New Claim** | Form opens | | |
| 3 | Enter: type `institutional`, patient `TST-P-202605-A1B2C3`, encounter `TST-ENC-20260513T090000`, billable period `2026-05-13` to `2026-05-15`, total `₱5000` | | | |
| 4 | Add an ICD diagnosis code and a procedure as claim line items | | | |
| 5 | Click **Submit** | Claim created with status **active** | | |

---

### TC-PHL-002: View and Search Claims

**Pre-condition:** At least one claim exists. Logged in as `test.billing.bc`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **PhilHealth** | Claims list shown | | |
| 2 | Type in the search bar for `Test Patient UAT` | Matching claim appears | | |
| 3 | Click the claim | Full claim detail shown | | |

---

### TC-PHL-003: Delete a Claim

**Pre-condition:** At least one claim exists. Logged in as `test.billing.bc`.  
**Priority:** Low

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Open an existing claim | Detail shown | | |
| 2 | Click **Delete** and confirm | Claim removed from the list | | |

---

## Module 11 — Dashboard

**Page:** ModernDashboard.tsx + role-specific dashboard components (all call real services)

---

### TC-DASH-001: Role-Specific Dashboard Data

**Pre-condition:** At least one encounter, observation, prescription, and lab order exist in the system.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Log in as `test.doctor.jq` | Dashboard: admissions today, pending lab results, my prescriptions | | |
| 2 | Log in as `test.nurse.ja` | Dashboard: ward patients, pending medication administrations, vital signs due | | |
| 3 | Log in as `test.pharm.px` | Dashboard: prescriptions awaiting dispensing, low-stock medications | | |
| 4 | Log in as `test.lab.lt` | Dashboard: pending lab orders, specimens collected today | | |
| 5 | Log in as `test.billing.bc` | Dashboard: unbilled encounters, pending claims, outstanding invoices | | |
| 6 | Log in as `test.admin.uat` | Dashboard: all system-wide metrics visible | | |

---

### TC-DASH-002: Widget Visibility Toggle

**Pre-condition:** Logged in as any role.  
**Priority:** Low

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | On the Dashboard, open the widget customization menu | Widget toggle list appears | | |
| 2 | Toggle off one widget (e.g., Admissions) | Widget disappears from the Dashboard | | |
| 3 | Refresh the page | Widget remains hidden (preference persisted in localStorage) | | |
| 4 | Toggle it back on | Widget reappears | | |

---

## Module 12 — Admin Panel

**Backend:** `/api/accounts/admin/`, `/api/accounts/fhir/Organization/` · **Page:** AdminPage.tsx

---

### TC-ADM-PANEL-001: Manage Hospital Organization

**Pre-condition:** Logged in as `test.admin.uat`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Admin → Hospital Settings** | Organization form loads with existing data (if any) | | |
| 2 | Fill in: name `TEST-ORG-LGUHOSP`, alias `LGUH`, NHFR code `DOH-UAT-001`, type `Hospital`, telecom `+63 2 8000 0000` | | | |
| 3 | Click **Save** | Organization saved; success notification shown | | |
| 4 | Refresh the Admin page | Saved values are pre-filled in the form | | |

---

### TC-ADM-PANEL-002: Manage Users

**Pre-condition:** Logged in as `test.admin.uat`. At least one non-admin user exists.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Admin → User Management** | User list loads from the API | | |
| 2 | Find `test.doctor.jq` | User row shown with role `doctor` | | |
| 3 | Change role to `nurse` and save | Role updated; API call returns success | | |
| 4 | Change role back to `doctor` and save | Role restored | | |

---

### TC-ADM-PANEL-003: Role Module Access Configuration

**Pre-condition:** Logged in as `test.admin.uat`.  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Admin → Role Access** | Role-module matrix loads from API | | |
| 2 | Toggle a module access setting for a role | Change is reflected immediately | | |
| 3 | Click **Save** | Access configuration updated via API | | |

---

## Module 13 — Account Settings

**Backend:** `/api/accounts/` · **Page:** AccountSettings.tsx

---

### TC-SET-001: Update Profile Information

**Pre-condition:** Logged in as `test.doctor.jq`.  
**Priority:** Low

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Account Settings** | Settings page loads with current profile | | |
| 2 | Update display name to `Dr. UAT Doctor` and mobile to `09171234567` | | | |
| 3 | Click **Save Profile** | Success notification; values persisted | | |

---

### TC-SET-002: Change Password

**Pre-condition:** Logged in as `test.nurse.ja` (password: `TestPass!234`).  
**Priority:** Medium

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Navigate to **Account Settings → Change Password** | Password change form shown | | |
| 2 | Enter current `TestPass!234`, new `NewNurse!789`, confirm `NewNurse!789` | | | |
| 3 | Click **Change Password** (enter OTP if prompted) | Success; password updated | | |
| 4 | Log out; attempt login with `TestPass!234` | Login fails | | |
| 5 | Log in with `NewNurse!789` | Login succeeds | | |

---

## Module 14 — Security & Access Control

---

### TC-SEC-001: Unauthenticated API Requests Rejected

**Pre-condition:** Backend running.  
**Priority:** Critical

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | `GET /api/patients/` with no Authorization header | HTTP 401 Unauthorized | | |
| 2 | `GET /api/patients/` with an expired access token | HTTP 401 Unauthorized | | |
| 3 | `GET /api/admission/encounters/` with `test.billing.bc`'s valid JWT token | HTTP 403 Forbidden | | |

---

### TC-SEC-002: Token Rotation on Refresh

**Pre-condition:** Valid refresh token obtained by logging in as `test.doctor.jq`.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | `POST /api/accounts/token/refresh/` with the refresh token | New access token returned | | |
| 2 | Repeat with the same (now-used) refresh token | HTTP 401; token is blacklisted | | |

---

### TC-SEC-003: Rate Limit — Login Endpoint

**Pre-condition:** Backend running.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Send 60 POST requests to `/api/accounts/login/` within 1 minute | All 60 processed (auth errors OK, not 429) | | |
| 2 | Send a 61st request within the same minute | HTTP 429 with `Retry-After` header | | |

---

### TC-SEC-004: Rate Limit — Password Reset Endpoint

**Pre-condition:** Backend running.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | Send 3 POST requests to `/api/accounts/password-reset/` within 1 minute | All 3 processed | | |
| 2 | Send a 4th request within the same minute | HTTP 429 | | |

---

### TC-SEC-005: WAH4PC Webhook Authentication

**Pre-condition:** Backend running and accessible.  
**Priority:** High

| # | Step | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1 | `POST /api/patients/webhooks/receive` with no `X-Gateway-Auth` header | HTTP 403 Forbidden | | |
| 2 | Same request with incorrect `X-Gateway-Auth` value | HTTP 403 Forbidden | | |
| 3 | Same request with correct `GATEWAY_AUTH_KEY` value | HTTP 200; payload processed | | |

---

## Test Data Matrix

All records below must exist in the UAT environment before testing begins.

### Test Accounts

| Role | Email | Password | Backend Key |
|---|---|---|---|
| Administrator | `test.admin.uat@wah4h.test` | `TestPass!234` | `admin` |
| Doctor | `test.doctor.jq@wah4h.test` | `TestPass!234` | `doctor` |
| Nurse | `test.nurse.ja@wah4h.test` | `TestPass!234` | `nurse` |
| Lab Technician | `test.lab.lt@wah4h.test` | `TestPass!234` | `lab_technician` |
| Pharmacist | `test.pharm.px@wah4h.test` | `TestPass!234` | `pharmacist` |
| Billing Clerk | `test.billing.bc@wah4h.test` | `TestPass!234` | `billing_clerk` |

### Test Patient

| Field | Value |
|---|---|
| System ID | `TST-P-202605-A1B2C3` |
| Name | Test Patient UAT |
| DOB | 1990-01-15 |
| Sex | Male |
| PhilHealth ID | `99-999999999-9` |
| Blood Type | O+ |
| Known Allergy | Penicillin — criticality: high |
| Condition | Hypertension — active |

### Test Organization

| Field | Value |
|---|---|
| Name | `TEST-ORG-LGUHOSP` |
| Type | Hospital |
| NHFR Code | `DOH-UAT-001` |

### Test Encounter

| Field | Value |
|---|---|
| Reference ID | `TST-ENC-20260513T090000` |
| Patient | `TST-P-202605-A1B2C3` |
| Class | Inpatient |
| Start | 2026-05-13 09:00 |
| Status | in-progress (prior to TC-ADM-004 / TC-DIS-003) |

### Test Pharmacy Item

| Field | Value |
|---|---|
| Name | Paracetamol 500mg |
| Stock | > 10 tablets |
| Batch | `LOT-UAT-2026` |

### Test Invoice

| Field | Value |
|---|---|
| Invoice ID | `TST-INV-001` |
| Patient | `TST-P-202605-A1B2C3` |
| Status | Draft → Issued |

---

## Acceptance Criteria (per scenario)

### Pass

A test case is **PASS** when:
- The scenario completes end-to-end without interruption.
- UI and API behavior matches the Expected Result exactly.
- No Critical defects are encountered.

### Fail

A test case is **FAIL** when:
- Any Critical defect occurs (crash, data loss, auth bypass).
- The actual result does not match the expected result and is not due to test setup error.

A FAIL on any **Critical-priority** test case blocks module acceptance until the defect is fixed and retested.

---

## Regression & Retest Strategy

### Retest

All failed test cases are re-executed after the developer verifies the fix, using the same data and steps. The retest result replaces the original status in the Summary table.

### Regression Smoke Subset

Before re-running a full UAT cycle after any fix, the following smoke tests must all pass:

| ID | Description |
|---|---|
| TC-AUTH-004 | Login with valid credentials |
| TC-PAT-001 | Register new patient |
| TC-ADM-001 | Create encounter |
| TC-LAB-003 | Finalize lab results |
| TC-DIS-003 | Finalize discharge |
| TC-SEC-001 | Unauthenticated requests rejected |

Fixes touching authentication, role access, or FHIR serialization require a **full regression run** across all 14 modules before sign-off.

---

## UAT Summary

| Module | Total TCs | Pass | Fail | Blocked | Not Tested |
|---|---|---|---|---|---|
| 1 — Authentication | 8 | | | | |
| 2 — Patient Management | 9 | | | | |
| 3 — Admission & Encounters | 4 | | | | |
| 4 — Appointments | 4 | | | | |
| 5 — Monitoring | 5 | | | | |
| 6 — Laboratory | 5 | | | | |
| 7 — Pharmacy | 3 | | | | |
| 8 — Discharge | 4 | | | | |
| 9 — Billing | 4 | | | | |
| 10 — PhilHealth Claims | 3 | | | | |
| 11 — Dashboard | 2 | | | | |
| 12 — Admin Panel | 3 | | | | |
| 13 — Account Settings | 2 | | | | |
| 14 — Security & Access | 5 | | | | |
| **Total** | **61** | | | | |

---

## Defect Log

| ID | TC Ref | Priority | Description | Actual Result | Assigned To | Status | Retest Result |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

**Priority:** Critical / High / Medium / Low

---

*Document Version: 2.0 — Verified against live codebase*  
*Date: 2026-05-13*  
*System: WAH4H v1.0 | APC 2025–2026 | T1 | SS231 | Group 04*
