# WAH4H — System Manual

**WAH for Hospitals (WAH4H)**  
Hospital Information System for Philippine LGU Hospitals  
Version 1.0 | Academic Year 2025–2026

**Developed by:** Asia Pacific College — APC 2025–2026 | T1 | SS231 | Group 04  
John Kenneth Jajurie · Mariyah Vanna Monique Chavez · Jhon Lloyd Nicolas · Elijah Josh Quibin

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [System Architecture](#3-system-architecture)
4. [Installation and Setup](#4-installation-and-setup)
5. [Authentication and Security](#5-authentication-and-security)
6. [User Roles and Access Control](#6-user-roles-and-access-control)
7. [Module Reference](#7-module-reference)
   - 7.1 [Dashboard](#71-dashboard)
   - 7.2 [Patient Management](#72-patient-management)
   - 7.3 [Admission](#73-admission)
   - 7.4 [Monitoring](#74-monitoring)
   - 7.5 [Laboratory](#75-laboratory)
   - 7.6 [Pharmacy and Inventory](#76-pharmacy-and-inventory)
   - 7.7 [Billing and PhilHealth](#77-billing-and-philhealth)
   - 7.8 [Discharge](#78-discharge)
   - 7.9 [Settings and Administration](#79-settings-and-administration)
8. [WAH4PC Gateway Integration](#8-wah4pc-gateway-integration)
9. [API Reference](#9-api-reference)
10. [Deployment Guide](#10-deployment-guide)
11. [Troubleshooting](#11-troubleshooting)
12. [Glossary](#12-glossary)

---

## 1. Introduction

### 1.1 Purpose of This Manual

This System Manual is the primary reference document for WAH4H — a full-stack Hospital Information System (HIS) built for Philippine Local Government Unit (LGU) hospitals. It covers installation, configuration, day-to-day operation for all user roles, and technical reference for administrators and developers.

### 1.2 Who Should Read This

| Audience | Relevant Sections |
|---|---|
| Hospital end users (doctors, nurses, staff) | Sections 5, 6, 7 |
| System administrators | Sections 4, 5, 6, 8, 9, 10, 11 |
| Developers and integrators | Sections 3, 4, 8, 9, 10 |

### 1.3 Scope

WAH4H covers all core hospital workflows: patient registration, admission, vital sign monitoring, laboratory test management, pharmacy dispensing, billing, PhilHealth claims, inter-hospital data exchange via the WAH4PC Gateway, and patient discharge.

---

## 2. System Overview

### 2.1 Key Highlights

- **FHIR-compliant** data models across all clinical modules (HL7 FHIR R4)
- **JWT-based authentication** with token rotation and optional OTP two-step verification
- **Role-based access control** for 6 distinct hospital staff roles
- **Inter-hospital data exchange** via the WAH4PC Gateway
- **PhilHealth** insurance claims integration
- **OWASP-compliant** API security (rate limiting, input validation, secure tokens)
- **Deployed** on Azure App Service (backend) and Vercel (frontend)

### 2.2 Feature Summary

| Module | Key Capabilities |
|---|---|
| Authentication | JWT login, OTP 2-step verification, password reset via email, 15-minute session idle timeout |
| Patient Management | Registration, demographics, conditions, allergies, immunizations, PHCORE compliance |
| Admission | Encounter creation, procedure tracking, ward/room/bed assignment |
| Pharmacy | Drug inventory management, medication requests, administration records |
| Laboratory | Lab test catalog, specimen tracking, diagnostic reports, imaging studies |
| Monitoring | Vital signs, clinical observations, charge item tracking |
| Billing | Invoices, PhilHealth claims, payment reconciliation, billing accounts |
| Discharge | Discharge documentation, instructions, follow-up plans |
| WAH4PC Integration | Push/pull patient records to/from the inter-hospital gateway |
| Dashboard | Role-specific analytics and activity overview |

---

## 3. System Architecture

### 3.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                      │
│              React 18 + Vite + TypeScript               │
│         (Vercel — wah4h-frontend.vercel.app)            │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS / REST API (JWT Bearer Token)
┌─────────────────────▼───────────────────────────────────┐
│                   Django REST API                       │
│              Django 6.0 + DRF + SimpleJWT               │
│            (Azure App Service — wah4h-backend-apc)      │
└────────┬───────────────────────────┬────────────────────┘
         │                           │
┌────────▼────────┐       ┌──────────▼──────────────────┐
│   PostgreSQL    │       │     WAH4PC Gateway           │
│   (Production)  │       │  wah4pc.echosphere.cfd       │
│   SQLite3 (Dev) │       │  Inter-hospital data exchange│
└─────────────────┘       └──────────────────────────────┘
```

### 3.2 Tech Stack

#### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 5.4 | Build tool |
| Tailwind CSS | 3.4 | Utility-first styling |
| shadcn/ui + Radix UI | latest | Accessible component library |
| React Router | v6 | Client-side routing |
| TanStack Query | v5 | Data fetching and caching |
| Axios | latest | HTTP client |
| React Hook Form + Zod | latest | Form validation |
| Recharts | latest | Data visualization |
| react-idle-timer | latest | Session timeout management |
| Sonner | latest | Toast notifications |

#### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.12 | Runtime |
| Django | 6.0 | Web framework |
| Django REST Framework | latest | REST API layer |
| SimpleJWT | latest | JWT authentication |
| django-cors-headers | latest | CORS management |
| django-filters | latest | QuerySet filtering |
| Gunicorn | latest | WSGI production server |
| WhiteNoise | latest | Static file serving |
| PostgreSQL | latest | Production database |
| python-dotenv | latest | Environment variables |

### 3.3 Backend Design Patterns

- **Fortress Pattern** — Cross-app references use `BigIntegerField` instead of `ForeignKey` for loose coupling between modules. This allows modules to be deployed and tested independently.
- **FHIR Compliance** — All clinical models follow FHIR R4 resource structures.
- **CQRS-Lite** — The Patient module separates read (ACL) and write (Service) paths.
- **Header-Detail** — Normalized tables for one-to-many detail records (e.g., `MedicationRequest` → `MedicationRequestDosage`).

### 3.4 Project Structure

```
WAH-for-Hospitals-WAH4H/
├── .github/workflows/         # CI/CD GitHub Actions workflow
├── docs/                      # System documentation
├── Frontend/
│   └── wah4hospitals-clinic-hub-79-main/
│       ├── src/
│       │   ├── components/    # UI components by module
│       │   ├── contexts/      # AuthContext, RoleContext
│       │   ├── hooks/         # Custom React hooks
│       │   ├── pages/         # Route-level page components
│       │   ├── schemas/       # Zod validation schemas
│       │   ├── services/      # Axios API service layer
│       │   ├── types/         # TypeScript interfaces
│       │   ├── utils/         # Utility functions
│       │   └── App.tsx        # Root component with routing
│       ├── package.json
│       └── vite.config.ts
└── wah4h-backend/
    ├── wah4h/                 # Django project settings and root URLs
    ├── core/                  # Shared abstract models (FHIR base)
    ├── accounts/              # Authentication and user management
    ├── patients/              # Patient records + WAH4PC gateway
    ├── admission/             # Encounters and procedures
    ├── pharmacy/              # Medication management
    ├── laboratory/            # Lab tests and diagnostics
    ├── monitoring/            # Vital signs and observations
    ├── billing/               # Invoices, claims, and payments
    ├── discharge/             # Discharge workflow
    ├── templates/             # Email templates (OTP, password reset)
    ├── requirements.txt
    ├── env.txt                # Environment variable template
    └── startup.sh             # Gunicorn startup script
```

---

## 4. Installation and Setup

### 4.1 Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Python | 3.12 | Backend runtime |
| Node.js | 18+ | Frontend build (or use Bun) |
| PostgreSQL | latest | Production database; SQLite3 works for local dev |
| Git | any | Version control |

### 4.2 Backend Setup

```bash
# 1. Navigate to the backend directory
cd wah4h-backend

# 2. Create and activate a virtual environment
python -m venv venv

# Linux/macOS
source venv/bin/activate

# Windows (Command Prompt)
venv\Scripts\activate

# Windows (Git Bash)
source venv/Scripts/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp env.txt .env
# Edit .env with your actual values (see Section 4.4)

# 5. Apply database migrations
python manage.py migrate

# 6. (Optional) Seed the database with sample data
python manage.py seed_data

# 7. Create a superuser (admin account)
python manage.py createsuperuser

# 8. Start the development server
python manage.py runserver
```

The backend will be available at `http://localhost:8000`.  
The Django admin panel is at `http://localhost:8000/admin/`.

### 4.3 Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd Frontend/wah4hospitals-clinic-hub-79-main

# 2. Install dependencies
npm install
# or with Bun:
bun install

# 3. Create your environment file
# Create a .env file in the frontend root:
echo "STURDY_ADVENTURE_BASE_8000=http://localhost:8000" > .env

# 4. Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

#### Available Frontend Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

### 4.4 Environment Variables

#### Backend — `wah4h-backend/.env`

```env
# Django Core
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (leave blank to use SQLite3 for local dev)
DATABASE_NAME=wah4h_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your-database-password
DATABASE_HOST=localhost
DATABASE_PORT=5432

# WAH4PC Gateway Integration
WAH4PC_GATEWAY_URL=https://wah4pc.echosphere.cfd
WAH4PC_API_KEY=wah_your-api-key
WAH4PC_PROVIDER_ID=your-provider-uuid
GATEWAY_AUTH_KEY=your-gateway-auth-key

# CORS (add your frontend URL)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Public Base URL (used for webhook callbacks)
PUBLIC_BASE_URL=http://localhost:8000

# Email (for OTP and password reset)
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
```

> See `wah4h-backend/env.txt` for the full template with inline comments.

#### Frontend — `.env`

```env
# Backend API base URL
STURDY_ADVENTURE_BASE_8000=http://localhost:8000
```

> Vite exposes variables with these prefixes only: `VITE_`, `LOCAL_`, `BACKEND_`, `STURDY_`.

---

## 5. Authentication and Security

### 5.1 Login Flow

1. User navigates to `/login` and enters their email and password.
2. The backend validates the credentials and (if `LOGIN_USE_OTP = True`) sends a 6-digit OTP to the registered email.
3. The user enters the OTP to receive a 15-minute **access token** and a rotating **refresh token**.
4. All subsequent API requests include `Authorization: Bearer <access_token>` in the header.
5. The frontend silently refreshes the access token before it expires. If the refresh token is expired or blacklisted, the user is redirected to the login page.

> **Note:** OTP is currently set to `LOGIN_USE_OTP = False` for development. Enable it in production by setting this to `True` in `wah4h/settings.py`.

### 5.2 Registration Flow

1. New staff member fills in the registration form: first name, last name, email, password, and role.
2. The system validates the email is not already registered and that the password meets the policy.
3. A 6-digit OTP is sent to the provided email.
4. The user verifies the OTP and the account is activated.

### 5.3 Password Reset Flow

1. User clicks **Forgot Password** on the login page.
2. User enters their registered email address.
3. A password reset OTP is sent to that address (rate-limited to 3 requests/minute).
4. User enters the OTP and a new password meeting the policy requirements.
5. The old password and all existing tokens are invalidated on success.

### 5.4 Password Policy

All passwords must:
- Be at least **12 characters** long
- Not be **purely numeric**
- Not be a **common or dictionary password** (e.g., "password123")

These rules are enforced at registration, password reset, and password change.

### 5.5 Session Management

| Setting | Value |
|---|---|
| Access token lifetime | 15 minutes |
| Refresh token lifetime | 7 days |
| Token rotation | Refresh token blacklisted after each use |
| Idle session timeout | 15 minutes (frontend enforced) |

The frontend will display a warning 2 minutes before a session expires. Logging out immediately blacklists the current refresh token.

### 5.6 Security Controls Summary

| Feature | Implementation |
|---|---|
| Authentication | JWT with 15-min access tokens and 7-day rotating refresh tokens |
| OTP Verification | 2-step email OTP for registration, login, and password reset |
| CORS | Restricted to configured allowed origins only |
| Rate Limiting | Per-endpoint throttling (see below) |
| SQL Injection | Prevented via Django ORM parameterized queries |
| CSRF | Django CSRF middleware enabled |
| Clickjacking | `X-Frame-Options` header enforced |
| HTTPS | Enforced in production via Azure and Vercel |
| Secrets Management | All secrets via environment variables, never committed to Git |

#### Rate Limits

| Scope | Limit |
|---|---|
| Anonymous | 20 requests/minute |
| Authenticated | 100 requests/minute |
| Login endpoint | 60 requests/minute |
| Password reset | 3 requests/minute |

Rate-limited responses return HTTP 429 with a `Retry-After` header.

---

## 6. User Roles and Access Control

### 6.1 Role Overview

WAH4H implements Role-Based Access Control (RBAC) with 6 roles organized in a 4-level hierarchy.

```
Level 4: ADMIN
  └── System Administrator — Full system access

Level 3: CLINICAL
  ├── Doctor — Patient care, prescriptions, discharge
  └── Nurse — Care delivery, vitals, medication administration

Level 2: TECHNICAL
  ├── Lab Technician — Lab test processing and results
  └── Pharmacist — Medication dispensing and inventory

Level 1: SUPPORT
  └── Billing Clerk — Invoices, claims, payment processing
```

### 6.2 Module Access Matrix

| Module | Admin | Doctor | Nurse | Lab Tech | Pharmacist | Billing |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Patient Management | ✅ | ✅ | ✅ | Limited | Limited | Limited |
| Admission | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Laboratory | ✅ | ✅ | ✅ (view) | ✅ | ❌ | ❌ |
| Monitoring | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Discharge | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Pharmacy | ✅ | ❌ | ✅ (view) | ❌ | ✅ | ❌ |
| Inventory | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Appointments | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Billing | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| PhilHealth | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Compliance | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| ERP | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Statistics | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 6.3 Role-Based Workflows

#### Doctor
1. Login → **Dashboard** — view patient alerts and pending lab results
2. **Patients** — access and update medical records
3. **Admission** — create and manage patient encounters
4. **Laboratory** — order tests and review finalized results
5. **Monitoring** — track patient vital signs and progress
6. **Discharge** — create discharge summaries and finalize discharges

#### Nurse
1. Login → **Dashboard** — view ward assignments and pending tasks
2. **Patients** — access care information
3. **Monitoring** — record vital signs and clinical observations
4. **Pharmacy** — view active medication orders
5. **Inventory** — manage medical supply usage
6. **Admission** — assist with patient intake and documentation

#### Lab Technician
1. Login → **Dashboard** — view pending lab orders
2. **Laboratory** — process specimens, enter test results, manage imaging studies
3. **Monitoring** — check patient status for prioritization
4. **Compliance** — quality control checks

#### Pharmacist
1. Login → **Dashboard** — view medication orders and low-stock alerts
2. **Pharmacy** — dispense medications and verify prescriptions
3. **Inventory** — manage pharmaceutical stock levels
4. **Patients** — check patient allergies and medication history
5. **Compliance** — regulatory compliance checks

#### Billing Clerk
1. Login → **Dashboard** — view billing summaries and outstanding invoices
2. **Billing** — create invoices, record payments
3. **PhilHealth** — file and track insurance claims
4. **ERP** — financial reporting
5. **Patients** — access billing-related patient information

#### System Administrator
Full access to all modules, plus:
- User account creation and management
- Organization, location, and practitioner profile management
- System configuration and settings
- WAH4PC gateway endpoint configuration
- Audit log review

---

## 7. Module Reference

### 7.1 Dashboard

The dashboard is the landing page after login and is tailored to each user's role.

**All roles** see:
- Summary statistics relevant to their department
- Pending action items

**Administrator dashboard** shows:
- Total patients registered, active encounters, today's admissions and discharges
- Bed occupancy rate by ward
- Pending items per department (lab orders, prescriptions, billing invoices)

**Role-specific dashboards:**
- Doctor: patients admitted today, pending lab results, my active prescriptions
- Nurse: patients in assigned ward, pending medication administrations, vital signs due
- Pharmacist: prescriptions awaiting dispensing, low-stock medications, expiring stock
- Lab Technician: pending lab orders, specimens collected today, overdue results
- Billing Clerk: unbilled encounters, pending claims, outstanding invoices

---

### 7.2 Patient Management

**Accessible by:** Administrator, Doctor, Nurse (full); Lab Technician, Pharmacist (limited); Billing Clerk (billing info only)

#### Registering a New Patient

1. Navigate to **Patients** in the sidebar.
2. Click **Register New Patient**.
3. Fill in the required fields:
   - First name, last name, date of birth, sex, civil status, nationality
   - Address and contact number
   - Emergency contact details
4. Fill in optional fields as available:
   - PhilHealth ID (format: `XX-XXXXXXXXX-X`, validated)
   - Blood type, PWD status, indigenous people status
5. Click **Save**. The patient appears in the patient list with a unique system ID.

> Duplicate PhilHealth IDs are rejected with a validation error.

#### Searching for a Patient

- Use the search bar at the top of the patient list.
- Search is case-insensitive and supports partial name, PhilHealth ID, or system ID matches.
- Results are paginated at 50 per page.

#### Patient Profile Sections

| Section | Description |
|---|---|
| Demographics | Name, date of birth, address, contacts |
| Conditions | Active and resolved diagnoses |
| Allergies | Known allergies and drug intolerances |
| Immunizations | Vaccination history |
| Encounters | Visit history |
| WAH4PC | Fetch or push records to/from the inter-hospital network |

#### Recording a Condition

1. Open the patient's profile → **Conditions** tab.
2. Click **Add Condition**.
3. Enter: condition name/code, clinical status (active/resolved/recurrence), severity, onset date.
4. Optionally add abatement date, stage, evidence, and notes.
5. Click **Save**.

#### Recording Allergies

1. Open the patient's profile → **Allergies** tab.
2. Click **Add Allergy**.
3. Enter: substance, clinical status, criticality (low/high/unable-to-assess).
4. Optionally add reaction details: manifestation, severity.
5. Click **Save**.

> Allergy warnings are shown to pharmacists when processing prescriptions for the same patient.

#### Recording Immunizations

1. Open the patient's profile → **Immunizations** tab.
2. Click **Add Immunization**.
3. Enter: vaccine code/name, date administered, lot number, expiry date.
4. Optionally link the administering practitioner and protocol/series info.
5. Click **Save**.

---

### 7.3 Admission

**Accessible by:** Administrator, Doctor, Nurse

#### Creating an Encounter (Admitting a Patient)

1. Navigate to **Admission** in the sidebar.
2. Click **New Encounter**.
3. Select the patient from the search field.
4. Set the encounter class: **Inpatient**, **Outpatient**, or **Emergency**.
5. Set the admission date and time.
6. Optionally fill in: admission source, expected discharge date.
7. Click **Save**. The encounter appears with status **in-progress**.

#### Assigning a Ward, Room, and Bed

1. Open the encounter record.
2. In the **Location** section, use the hierarchical picker: Building → Wing → Ward → Room → Bed.
3. Only beds with **Available** status are selectable.
4. Saving the assignment automatically marks the bed as **Occupied**.

#### Documenting a Procedure

1. Open the encounter record.
2. Navigate to the **Procedures** section.
3. Click **Add Procedure**.
4. Enter: procedure code/name, status, body site, outcome.
5. Optionally link the performer, complications, and follow-up recommendations.
6. Click **Save**. The procedure is linked to the encounter and available for billing reference.

#### Closing an Encounter

1. Open the encounter record.
2. Click **End Encounter**.
3. The end date/time is recorded automatically and the status changes to **finished**.
4. Closing an encounter triggers the discharge workflow if a discharge record has not yet been created.

---

### 7.4 Monitoring

**Accessible by:** Administrator, Doctor, Nurse, Lab Technician (view)

#### Recording a Vital Sign Observation

1. Navigate to **Monitoring** in the sidebar.
2. Click **New Observation**.
3. Select the patient and their active encounter.
4. Select the observation type from the coded picker (e.g., Temperature, Heart Rate, Oxygen Saturation).
5. Enter the measured value and unit.
6. Set the effective date and time.
7. Click **Save**. The observation appears in the patient's monitoring timeline.

#### Recording Blood Pressure

Blood pressure is a multi-component observation:
1. Select **Blood Pressure** as the observation type.
2. Enter **Systolic** value (mmHg) and **Diastolic** value (mmHg) separately.
3. Both values are stored as child `ObservationComponent` records linked to the parent observation.
4. The display shows the combined format (e.g., **120/80 mmHg**).

#### Abnormal Value Flags

- Each observation type has reference ranges defined in the system.
- Values outside the range are highlighted:
  - Yellow: borderline (high or low)
  - Red: critical
- An interpretation code is stored: **H** (high), **L** (low), **N** (normal).

#### Creating a Charge Item

Billable monitoring services (e.g., ECG monitoring) generate charge items:
1. Click **Add Charge Item**.
2. Select the service code from the charge item definition catalog.
3. Enter quantity and confirm the unit price.
4. Link to the patient's active encounter.
5. Click **Save**. The charge item flows automatically to the billing account.

---

### 7.5 Laboratory

**Accessible by:** Administrator, Doctor (order and view), Nurse (view), Lab Technician (process and enter results)

#### Ordering a Lab Test (Doctor)

1. Navigate to **Laboratory** in the sidebar.
2. Click **New Lab Order**.
3. Select the patient and their active encounter.
4. Select a test from the catalog (LabTestDefinition).
5. Set the priority: **Routine**, **Urgent**, or **STAT**.
6. Click **Submit**. A `DiagnosticReport` record is created with status **registered** and appears in the lab queue.

> A charge item for the test cost is automatically created against the patient's billing account.

#### Processing a Lab Order (Lab Technician)

1. Navigate to **Laboratory** and open a pending order.
2. **Record specimen collection**: collection method, body site, collection date/time, received time. This updates the diagnostic report status to **in-progress**.
3. After testing is complete, click **Enter Results**.
4. Enter all result values (numeric, text, or coded).
5. Click **Finalize Report**. Status changes to **final** and the issued date/time is recorded.
6. Finalized results are visible to the ordering doctor and nurse.

#### Managing the Lab Test Catalog

Administrators and lab technicians can manage the catalog:
1. Navigate to **Laboratory → Test Catalog**.
2. Click **Add Test** to create a new entry with: name, code (SKU), category, base price, turnaround time, and reference ranges.
3. Deactivated tests are hidden from the order form's test picker.

#### Recording Imaging Studies

1. Navigate to **Laboratory → Imaging Studies**.
2. Click **New Imaging Study**.
3. Enter: modality (X-ray, CT, MRI, Ultrasound, etc.), start date/time, number of series/instances.
4. Optionally link the interpreter (radiologist/doctor) and notes/findings.
5. Click **Save**.

---

### 7.6 Pharmacy and Inventory

**Accessible by:** Administrator, Nurse (view pharmacy), Pharmacist (full)

#### Prescribing Medication (Doctor)

1. Navigate to **Pharmacy** in the sidebar or from a patient's encounter.
2. Click **New Prescription**.
3. Select the medication from the catalog.
4. Set: patient, encounter, intent, priority.
5. Enter dosage instructions: dose quantity, route (oral/IV/etc.), frequency.
6. Enter dispense instructions: validity period, quantity, refill count.
7. Click **Save**. The prescription appears in the pharmacy queue with status **active**.

> Patient allergy warnings are shown during prescription if applicable.

#### Dispensing Medication (Pharmacist/Nurse)

1. Navigate to **Pharmacy → Prescriptions Queue**.
2. Open the prescription to dispense.
3. Verify the patient's allergy profile (shown in the detail view).
4. Click **Dispense / Administer**.
5. Confirm: medication, dose, route, date/time, administering practitioner.
6. Click **Confirm**. A `MedicationAdministration` record is created, inventory stock is decremented, and a charge item is generated.

#### Managing Inventory

1. Navigate to **Inventory** in the sidebar.
2. The inventory list shows: medication name, current stock, unit, reorder level, expiry date, batch number, unit cost.
3. Click **Adjust Stock** to record receipts, returns, or corrections (each movement is logged with a reason and timestamp).
4. Items at or below the reorder level are flagged in the list.
5. Expired medications are highlighted and excluded from dispensing selections.

---

### 7.7 Billing and PhilHealth

**Accessible by:** Administrator, Doctor (PhilHealth only), Billing Clerk (full)

#### Creating a Billing Account

1. Navigate to **Billing → Accounts**.
2. Click **New Billing Account**.
3. Select the patient and their encounter.
4. Set the service period start/end dates.
5. Optionally link a guarantor and a PhilHealth coverage reference.
6. Click **Save**. Charge items from labs, pharmacy, and monitoring link to this account automatically.

#### Generating an Invoice

1. Navigate to **Billing → Invoices**.
2. Click **New Invoice** and select the billing account.
3. The system aggregates all linked charge items into an itemized invoice.
4. Review the itemized list, subtotal, and total.
5. Set the invoice date and due date.
6. Change status to **Issued** when ready to present to the patient.
7. The issued invoice is accessible in a printable/PDF format.

#### Submitting a PhilHealth Claim

1. Navigate to **PhilHealth** in the sidebar (or **Billing → Claims**).
2. Click **New Claim**.
3. Fill in: claim type, patient, encounter, provider, billable period, total amount.
4. Attach diagnoses (ICD codes) and procedures as claim line items.
5. List care team members on the claim.
6. Reference any supporting documents.
7. Submit the claim. Status is tracked: **active**, **cancelled**, **entered-in-error**.

#### Recording a Payment

1. Navigate to **Billing → Payments**.
2. Click **Record Payment**.
3. Enter: amount, payment date, method, reference number.
4. Link to the patient's billing account and invoice.
5. Click **Save**. The outstanding balance is recalculated automatically.

#### Payment Reconciliation

1. Navigate to **Billing → Reconciliation**.
2. Create a reconciliation record linking a payment to one or more claim line items.
3. Discrepancies between claimed and paid amounts are highlighted.
4. Mark reconciled items as **settled**.

---

### 7.8 Discharge

**Accessible by:** Administrator, Doctor

#### Creating a Discharge Summary

1. Navigate to **Discharge** in the sidebar.
2. Click **New Discharge**.
3. Select the patient and their active encounter.
4. Set the discharge date and time.
5. Write a **Summary of Stay** (required free-text field).
6. Click **Save**. The discharge record is created with status **draft**.

#### Adding Instructions and Follow-Up Plan

1. Open the discharge record (status: draft).
2. In the **Discharge Instructions** field, enter: medications to take, activity restrictions, wound care instructions, etc.
3. In the **Follow-Up Plan** field, enter: type, responsible provider, timeframe.
4. List any pending items (e.g., outstanding lab results, referrals).
5. Click **Save**.

#### Finalizing Discharge

1. Open the discharge record (status: draft).
2. Review all fields for completeness.
3. Click **Finalize Discharge**.
4. The discharge status changes to **final**, the associated encounter changes to **finished**, and the patient's bed is freed and marked as **available**.
5. Finalized discharge records are read-only.

> Only the creating doctor or an Administrator can finalize a discharge.

---

### 7.9 Settings and Administration

**Accessible by:** All roles (personal settings); Administrator (full system administration)

#### Personal Account Settings

- Navigate to **Account Settings** to update: display name, contact email, and profile picture.
- Email changes trigger a re-verification OTP flow before taking effect.
- Change password requires an OTP verification step and confirms the current password first.

#### System Administration (Administrator Only)

From **Settings / Control Panel**, administrators can manage:

| Function | Description |
|---|---|
| User Management | Create, edit, activate, or deactivate staff accounts and assign roles |
| Organizations | Add and manage hospital or healthcare organization records |
| Locations | Define the physical hierarchy: Building → Wing → Ward → Room → Bed |
| Practitioners | Manage practitioner profiles, specialties, and availability schedules |
| API Endpoints | Configure and test inter-hospital endpoint records for WAH4PC integration |
| Audit Log | View immutable logs of all WAH4PC data exchange transactions |

---

## 8. WAH4PC Gateway Integration

### 8.1 Overview

WAH4H integrates with the **WAH4PC Gateway** (`wah4pc.echosphere.cfd`) for inter-hospital patient data exchange. This allows patient records to be shared across participating LGU hospitals using FHIR-formatted data bundles.

### 8.2 Fetching a Patient from Another Hospital

This action requests the patient's records from another hospital.

**From the frontend:**
1. Open the patient's profile.
2. Click **Fetch from Gateway**.
3. Enter the patient's **PhilHealth ID** and the **Target Provider ID** (the hospital to query).
4. Click **Fetch**. The request is sent asynchronously to the WAH4PC gateway.
5. The returned FHIR data (encounters, procedures, immunizations) is displayed for review before import.

**API (direct call):**
```
POST /api/patients/wah4pc/fetch
Content-Type: application/json

{
  "targetProviderId": "uuid-of-target-provider",
  "philHealthId": "12-345678901-2"
}
```

Responses are delivered asynchronously via webhook callback to `/api/patients/webhooks/receive`.

### 8.3 Pushing a Patient to the Gateway

This action sends the patient's records to the WAH4PC network.

**From the frontend:**
1. Open the patient's profile.
2. Click **Send to Gateway**.
3. Confirm the action. The system packages the patient record as a FHIR bundle and sends it to the gateway.
4. Success and failure states are communicated via toast notifications.

**API (direct call):**
```
POST /api/patients/wah4pc/send
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "patientId": "local-patient-uuid"
}
```

> Only users with the **Doctor** role or higher can trigger a push.

### 8.4 Incoming Webhook Endpoints

The gateway sends data back to WAH4H via these endpoints:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/fhir/process-query` | Process incoming data queries from the gateway |
| POST | `/fhir/receive-results` | Receive patient data query results |
| POST | `/fhir/receive-push` | Receive pushed patient data |
| POST | `/api/patients/webhooks/receive` | Receive WAH4PC webhook callbacks |

All incoming webhooks are validated using the `X-Gateway-Auth` header against `GATEWAY_AUTH_KEY`.

### 8.5 Audit Logging

Every push and pull transaction is logged in the WAH4PCTransaction table:

| Field | Description |
|---|---|
| Transaction type | push or pull |
| Status | success / failed / pending |
| Timestamp | Date and time of the transaction |
| Patient reference | The patient record involved |
| Raw payload | The FHIR bundle sent or received |

The audit log is accessible only to administrators and is immutable (entries cannot be edited or deleted).

### 8.6 Gateway Configuration

Set the following variables in `wah4h-backend/.env`:

```env
WAH4PC_GATEWAY_URL=https://wah4pc.echosphere.cfd
WAH4PC_API_KEY=wah_your-api-key
WAH4PC_PROVIDER_ID=your-provider-uuid
GATEWAY_AUTH_KEY=your-gateway-auth-key
```

---

## 9. API Reference

### 9.1 General Behavior

- **Base path:** All endpoints are prefixed with `/api/`.
- **Authentication:** Include `Authorization: Bearer <access_token>` on all protected endpoints.
- **Pagination:** 50 items per page. Use `?page=2` to paginate.
- **Filtering:** Supports `?field=value` query parameters via DjangoFilterBackend.
- **Search:** Use `?search=keyword` for full-text search where supported.
- **Ordering:** Use `?ordering=field` (ascending) or `?ordering=-field` (descending).
- **Date format:** ISO 8601 (`YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ`).

### 9.2 Authentication — `/api/accounts/`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/accounts/register/` | Register a new user (initiates OTP) |
| POST | `/api/accounts/login/` | Login with email and password (initiates OTP) |
| POST | `/api/accounts/token/refresh/` | Refresh access token using refresh token |
| POST | `/api/accounts/logout/` | Logout (blacklists refresh token) |
| POST | `/api/accounts/password-reset/` | Request password reset OTP email |
| POST | `/api/accounts/password-reset/confirm/` | Confirm password reset with OTP |

### 9.3 Accounts Management — `/api/accounts/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/accounts/organizations/` | List / create organizations |
| GET/PUT/DELETE | `/api/accounts/organizations/{id}/` | Retrieve / update / delete organization |
| GET/POST | `/api/accounts/locations/` | List / create locations |
| GET/PUT/DELETE | `/api/accounts/locations/{id}/` | Retrieve / update / delete location |
| GET/POST | `/api/accounts/practitioners/` | List / create practitioners |
| GET/PUT/DELETE | `/api/accounts/practitioners/{id}/` | Retrieve / update / delete practitioner |
| GET/POST | `/api/accounts/practitioner-roles/` | List / create practitioner roles |
| GET/PUT/DELETE | `/api/accounts/practitioner-roles/{id}/` | Retrieve / update / delete practitioner role |

### 9.4 Patients — `/api/patients/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/patients/` | List / create patients |
| GET/PUT/PATCH | `/api/patients/{id}/` | Retrieve / update patient |
| GET | `/api/patients/search/?q=term` | Search patients (partial name, ID) |
| GET | `/api/patients/{id}/conditions/` | Patient conditions |
| GET | `/api/patients/{id}/allergies/` | Patient allergies |
| GET | `/api/patients/{id}/immunizations/` | Patient immunizations |
| GET/POST | `/api/patients/conditions/` | Condition CRUD |
| GET/POST | `/api/patients/allergies/` | Allergy CRUD |
| GET/POST | `/api/patients/immunizations/` | Immunization CRUD |
| POST | `/api/patients/wah4pc/fetch` | Fetch patient from WAH4PC Gateway |
| POST | `/api/patients/wah4pc/send` | Send patient to WAH4PC Gateway |
| POST | `/api/patients/webhooks/receive` | Receive WAH4PC webhook callback |

### 9.5 Admission — `/api/admission/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/admission/encounters/` | List / create encounters |
| GET/PUT/DELETE | `/api/admission/encounters/{id}/` | Retrieve / update / delete encounter |
| GET/POST | `/api/admission/procedures/` | List / create procedures |
| GET/PUT/DELETE | `/api/admission/procedures/{id}/` | Retrieve / update / delete procedure |

### 9.6 Pharmacy — `/api/pharmacy/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/pharmacy/inventory/` | Medication inventory |
| GET/PUT/DELETE | `/api/pharmacy/inventory/{id}/` | Manage inventory item |
| GET/POST | `/api/pharmacy/requests/` | Medication requests (prescriptions) |
| GET/PUT/DELETE | `/api/pharmacy/requests/{id}/` | Manage medication request |
| GET/POST | `/api/pharmacy/administrations/` | Medication administrations |
| GET/PUT/DELETE | `/api/pharmacy/administrations/{id}/` | Manage medication administration |

### 9.7 Laboratory — `/api/laboratory/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/laboratory/tests/` | Lab test catalog (definitions) |
| GET/PUT/DELETE | `/api/laboratory/tests/{id}/` | Manage lab test definition |
| GET/POST | `/api/laboratory/reports/` | Diagnostic reports |
| GET/PUT/DELETE | `/api/laboratory/reports/{id}/` | Manage diagnostic report |
| GET/POST | `/api/laboratory/specimens/` | Specimen records |
| GET/POST | `/api/laboratory/imaging-studies/` | Imaging studies |

### 9.8 Monitoring — `/api/monitoring/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/monitoring/observations/` | Vital signs and observations |
| GET/PUT/DELETE | `/api/monitoring/observations/{id}/` | Manage observation |
| GET/POST | `/api/monitoring/charge-items/` | Charge items |
| GET/PUT/DELETE | `/api/monitoring/charge-items/{id}/` | Manage charge item |
| GET/POST | `/api/monitoring/charge-item-definitions/` | Charge item definitions (catalog) |

### 9.9 Billing — `/api/billing/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/billing/accounts/` | Billing accounts |
| GET/PUT/DELETE | `/api/billing/accounts/{id}/` | Manage billing account |
| GET/POST | `/api/billing/invoices/` | Invoices |
| GET/PUT/DELETE | `/api/billing/invoices/{id}/` | Manage invoice |
| GET/POST | `/api/billing/claims/` | PhilHealth insurance claims |
| GET/PUT/DELETE | `/api/billing/claims/{id}/` | Manage claim |
| GET/POST | `/api/billing/payments/` | Payment records |
| GET/PUT/DELETE | `/api/billing/payments/{id}/` | Manage payment |
| GET/POST | `/api/billing/payment-notices/` | Payment notices |

### 9.10 Discharge — `/api/discharge/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/discharge/discharges/` | Discharge records |
| GET/PUT/DELETE | `/api/discharge/discharges/{id}/` | Manage discharge record |
| GET/POST | `/api/discharge/procedures/` | Discharge-related procedures |

### 9.11 FHIR Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/fhir/metadata` | FHIR CapabilityStatement |
| GET | `/fhir/Patient/{id}/$everything` | Full patient record bundle |
| POST | `/fhir/process-query` | Process incoming gateway query |
| POST | `/fhir/receive-results` | Receive gateway query results |
| POST | `/fhir/receive-push` | Receive pushed patient data |

---

## 10. Deployment Guide

### 10.1 Backend — Azure App Service

**Trigger:** Push to branch `2026_Quibin_final_merge/interops_to_system`

**CI/CD Workflow:** `.github/workflows/2026_quibin_final_merge-interops_to_system_wah4h-backend.yml`

**Required GitHub Secrets:**

| Secret | Description |
|---|---|
| `AZUREAPPSERVICE_CLIENTID_*` | Azure Service Principal Client ID |
| `AZUREAPPSERVICE_TENANTID_*` | Azure AD Tenant ID |
| `AZUREAPPSERVICE_SUBSCRIPTIONID_*` | Azure Subscription ID |

**Manual production deployment:**

```bash
cd wah4h-backend
source venv/bin/activate
# Using the startup script:
bash startup.sh
# Or directly:
gunicorn wah4h.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
```

**Production environment variables** must be configured in the Azure App Service → Configuration → Application Settings panel with the same keys as in `.env`.

### 10.2 Frontend — Vercel

#### Step 1: Create `vercel.json`

Create this file at `Frontend/wah4hospitals-clinic-hub-79-main/vercel.json` to support React client-side routing:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### Step 2: Vercel Project Settings

| Setting | Value |
|---|---|
| Root Directory | `Frontend/wah4hospitals-clinic-hub-79-main` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

#### Step 3: Environment Variables in Vercel

In Vercel Dashboard → Project → **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `STURDY_ADVENTURE_BASE_8000` | `https://your-azure-backend-url.azurewebsites.net` |

#### Step 4: Deploy

```bash
npm install -g vercel
cd Frontend/wah4hospitals-clinic-hub-79-main
vercel --prod
```

#### Step 5: CORS Configuration

After deploying the frontend, add the Vercel URL to the backend's `CORS_ALLOWED_ORIGINS`:

```env
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
```

Redeploy the backend or update the Azure App Service Application Settings.

### 10.3 Production Checklist

Before going live, verify:

- [ ] `DEBUG=False` in the backend environment
- [ ] `SECRET_KEY` is a long, random, unique value not used elsewhere
- [ ] `ALLOWED_HOSTS` includes only the production domain(s)
- [ ] Database is PostgreSQL (not SQLite3)
- [ ] `LOGIN_USE_OTP=True` is set in settings
- [ ] `CORS_ALLOWED_ORIGINS` contains only the production frontend URL
- [ ] Email credentials are configured for OTP delivery
- [ ] WAH4PC gateway credentials are set
- [ ] HTTPS is enforced on both frontend and backend
- [ ] GitHub Secrets are configured for the CI/CD pipeline

---

## 11. Troubleshooting

### 11.1 Login Issues

| Symptom | Resolution |
|---|---|
| "Invalid credentials" error | Verify email and password. Check that the user account exists and is active. |
| OTP not received | Check spam/junk folder. Verify `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` are set correctly. |
| "Token is invalid or expired" | Access token has expired. The frontend should refresh automatically; if not, log out and log back in. |
| Login page loops after submit | Check browser console for CORS errors. Verify `CORS_ALLOWED_ORIGINS` includes the frontend URL. |

### 11.2 Module Access Issues

| Symptom | Resolution |
|---|---|
| A module is not visible in the sidebar | The user's role does not have access. Check the role access matrix in Section 6. |
| 403 Forbidden on an API call | The authenticated user's role does not have permission for that endpoint. Verify the role assignment in the database. |
| Role shows incorrectly after login | Clear browser localStorage and log in again. If persistent, check the `role` field on the User model in Django admin. |

### 11.3 WAH4PC Gateway Issues

| Symptom | Resolution |
|---|---|
| Fetch from Gateway times out | Verify `WAH4PC_GATEWAY_URL`, `WAH4PC_API_KEY`, and `WAH4PC_PROVIDER_ID` in the backend `.env`. |
| Webhook not received | Ensure `PUBLIC_BASE_URL` points to a publicly accessible URL (not `localhost`). The gateway must be able to reach the webhook endpoint. |
| Webhook rejected with 403 | The `X-Gateway-Auth` header in the incoming request does not match `GATEWAY_AUTH_KEY`. Verify both values are in sync with the gateway's configuration. |

### 11.4 Database Issues

| Symptom | Resolution |
|---|---|
| `django.db.OperationalError: no such table` | Run `python manage.py migrate` to apply pending migrations. |
| Connection refused to PostgreSQL | Verify `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, and `DATABASE_PASSWORD` in `.env`. Ensure PostgreSQL is running. |
| Migrations fail | Check for conflicting migration files. Run `python manage.py showmigrations` to identify unapplied migrations. |

### 11.5 Frontend Build Issues

| Symptom | Resolution |
|---|---|
| `STURDY_ADVENTURE_BASE_8000` is undefined | Ensure the `.env` file exists in `Frontend/wah4hospitals-clinic-hub-79-main/` and the variable is defined. Restart the dev server. |
| API calls go to wrong URL | Check `vite.config.ts` for proxy settings and verify the environment variable is being read correctly. |
| Build fails with TypeScript errors | Run `npm run lint` to identify and fix type errors before building. |

### 11.6 Common Django Admin Tasks

```bash
# Create a superuser account
python manage.py createsuperuser

# Apply new migrations
python manage.py migrate

# Seed sample data
python manage.py seed_data

# Collect static files (required for production)
python manage.py collectstatic

# Check for any configuration issues
python manage.py check
```

---

## 12. Glossary

| Term | Definition |
|---|---|
| **FHIR** | Fast Healthcare Interoperability Resources — an international standard for exchanging healthcare information electronically (HL7 FHIR R4). |
| **JWT** | JSON Web Token — a compact, URL-safe token format used for authentication and authorization. |
| **OTP** | One-Time Password — a 6-digit code sent to a user's email for 2-step verification. |
| **RBAC** | Role-Based Access Control — a security model where system access is restricted based on a user's assigned role. |
| **Encounter** | A FHIR resource representing a patient's visit to the hospital — the central record that links clinical activities together. |
| **Diagnostic Report** | A FHIR resource representing the result of a lab test or imaging study, including the findings. |
| **Observation** | A FHIR resource for measurements and clinical data recorded for a patient (e.g., vital signs, lab values). |
| **MedicationRequest** | A FHIR resource representing a prescription or medication order. |
| **Charge Item** | A FHIR resource representing a billable item generated by a clinical service (lab, pharmacy, monitoring). |
| **WAH4PC** | WAH for Primary Care — the inter-hospital gateway that facilitates FHIR-based patient data exchange between participating LGU hospitals. |
| **PhilHealth** | Philippine Health Insurance Corporation — the government agency providing national health insurance; WAH4H supports electronic claim submission. |
| **PHCORE** | Philippine Core Health Data Standards — a set of data specifications for Philippine health information systems. |
| **LGU** | Local Government Unit — the tier of Philippine government (city, municipality) that operates public hospitals. |
| **DRF** | Django REST Framework — the library used to build the WAH4H REST API. |
| **SimpleJWT** | A Django library providing JSON Web Token authentication for Django REST Framework. |
| **Vite** | A frontend build tool used by the WAH4H React application for fast development and optimized production builds. |
| **shadcn/ui** | A component library built on Radix UI primitives and Tailwind CSS, used for WAH4H's accessible UI components. |
| **TanStack Query** | A data-fetching and caching library for React (formerly React Query), used for API state management. |
| **Gunicorn** | A Python WSGI HTTP server used to run the Django application in production. |
| **WhiteNoise** | A Django library for serving static files directly from the application server in production. |
| **Fortress Pattern** | A backend design pattern used in WAH4H where cross-module references use integer IDs instead of foreign keys, allowing modules to evolve independently. |

---

*Last Updated: 2026-05-13*  
*System: WAH4H v1.0*  
*Asia Pacific College — APC 2025–2026 | T1 | SS231 | Group 04*
