# WAH4H - Work at Home for Hospitals

## System Documentation (Current State)

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Backend - Django Apps & Models](#backend---django-apps--models)
5. [Backend - API Routes](#backend---api-routes)
6. [Frontend - Pages & Routes](#frontend---pages--routes)
7. [Frontend - Component Architecture](#frontend---component-architecture)
8. [Role-Based Access Control](#role-based-access-control)
9. [WAH4PC Integration](#wah4pc-integration)
10. [Environment Configuration](#environment-configuration)
11. [Running the Application](#running-the-application)

---

## Overview

WAH4H is a Hospital Information System designed for Philippine LGU hospitals. It follows **FHIR (Fast Healthcare Interoperability Resources)** standards and provides modules for patient management, admissions, pharmacy, laboratory, monitoring, billing, and discharge workflows.

### Team

- John Kenneth Jajurie
- Mariyah Vanna Monique Chavez
- Jhon Lloyd Nicolas
- Elijah Josh Quibin

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Framework | Django 6.0 + Django REST Framework |
| Database | SQLite3 |
| Authentication | JWT (Simple JWT) - 30min access, 1-day refresh |
| Filtering | django-filters |
| CORS | django-cors-headers |
| Timezone | Asia/Manila |
| Pagination | 50 items per page |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 5.4 |
| Styling | Tailwind CSS |
| UI Library | shadcn-ui (Radix UI) |
| Routing | React Router v6 |
| State | React Context API (Auth, Role) |
| Data Fetching | TanStack Query (React Query) |
| HTTP Client | Axios |
| Icons | Lucide React |

---

## Project Structure

```
WAH-for-Hospitals-WAH4H/
├── docs/                          # Documentation
├── Frontend/
│   └── wah4hospitals-clinic-hub-79-main/
│       ├── src/
│       │   ├── components/        # UI components by module
│       │   ├── contexts/          # AuthContext, RoleContext
│       │   ├── hooks/             # Custom React hooks
│       │   ├── lib/               # Utility libraries
│       │   ├── pages/             # Page components (17 pages)
│       │   ├── schemas/           # Form validation schemas
│       │   ├── services/          # API service layers
│       │   ├── types/             # TypeScript type definitions
│       │   ├── utils/             # Utility functions
│       │   ├── data/              # Static data and constants
│       │   ├── constants/         # Application constants
│       │   └── App.tsx            # Root component with routing
│       ├── .env                   # Environment variables
│       └── package.json
├── wah4h-backend/
│   ├── wah4h/                     # Django project settings & root urls
│   ├── core/                      # Shared abstract base models
│   ├── accounts/                  # Authentication & user management
│   ├── patients/                  # Patient registration & clinical data
│   ├── admission/                 # Encounters & procedures
│   ├── pharmacy/                  # Medication management
│   ├── laboratory/                # Lab tests & diagnostic reports
│   ├── monitoring/                # Observations & charge items
│   ├── billing/                   # Invoicing, claims & payments
│   ├── discharge/                 # Discharge workflow
│   ├── manage.py
│   └── db.sqlite3
└── README.md
```

---

## Backend - Django Apps & Models

### Design Patterns

- **Fortress Pattern** — Cross-app references use `BigIntegerField` instead of `ForeignKey` for loose coupling between modules.
- **FHIR Compliance** — All clinical models follow FHIR resource structures.
- **CQRS-Lite** — Patient module separates read (ACL) and write (Service) paths.
- **Header-Detail** — Normalized tables (e.g., `MedicationRequest` → `MedicationRequestDosage`).

### Abstract Base Models (`core`)

| Model | Fields |
|-------|--------|
| **TimeStampedModel** | `created_at`, `updated_at` |
| **FHIRResourceModel** | `identifier` (unique, indexed), `status` (indexed) + timestamps |

### Accounts App

| Model | Key Fields |
|-------|-----------|
| **Organization** | `organization_id`, `nhfr_code` (unique), `type_code`, `name`, `alias`, address fields, contact fields |
| **Location** | `location_id`, `identifier` (unique), `physical_type_code`, `name`, address fields, `hours_of_operation` |
| **Practitioner** | `practitioner_id`, `identifier` (unique), `first_name`, `last_name`, `gender`, `birth_date`, qualification fields |
| **PractitionerRole** | `practitioner_role_id`, `role_code`, `specialty_code`, FK→Practitioner, FK→Organization, FK→Location |
| **User** | `practitioner_id` (OneToOne→Practitioner), `username`, `email`, `role`, `status`, JWT auth |
| **Endpoint** | API endpoint connectivity |
| **HealthcareService** | Service definitions |

### Patients App

| Model | Key Fields |
|-------|-----------|
| **Patient** | `patient_id` (unique), `first_name`, `last_name`, `middle_name`, `suffix_name`, `gender`, `birthdate`, `civil_status`, `nationality`, `religion`, `philhealth_id`, `blood_type`, `pwd_type`, `occupation`, `education`, `mobile_number`, address fields, emergency contact fields, `indigenous_flag`, `consent_flag` |
| **Condition** | `condition_id`, `clinical_status`, `verification_status`, `category`, `severity`, `code`, `body_site`, onset/abatement fields, FK→Patient |
| **AllergyIntolerance** | `allergy_id`, `clinical_status`, `type`, `category`, `criticality`, `code`, reaction fields, FK→Patient |
| **Immunization** | `immunization_id`, `vaccine_code`, `vaccine_display`, `lot_number`, `expiration_date`, `dose_quantity`, FK→Patient |

### Admission App

| Model | Key Fields |
|-------|-----------|
| **Encounter** | `encounter_id`, `class_field`, `type`, `service_type`, `priority`, `period_start/end`, diagnosis fields, hospitalization fields (admit_source, diet_preference, discharge_disposition), Ext→subject_id |
| **Procedure** | `procedure_id`, `category`, `code`, `body_site`, `outcome`, performed timing fields, FK→Encounter |
| **ProcedurePerformer** | Junction table for procedure performers |

### Pharmacy App

| Model | Key Fields |
|-------|-----------|
| **Medication** | `medication_id`, `code_code` (unique), `code_display` (lookup table) |
| **MedicationRequest** | `medication_request_id`, medication ref, `intent`, `category`, `priority`, `authored_on`, Ext→subject_id, encounter_id, requester_id |
| **MedicationRequestDosage** | `dosage_text`, `dosage_route`, `dosage_dose_value/unit`, `dosage_rate`, FK→MedicationRequest |
| **Inventory** | `inventory_id`, `item_code` (unique), `item_name`, `category`, `batch_number`, `current_stock`, `reorder_level`, `unit_cost`, `expiry_date` |
| **MedicationAdministration** | `medication_administration_id`, medication ref, `effective_datetime`, Ext→subject_id, request_id |
| **MedicationAdministrationDosage** | Dosage details, OneToOne→MedicationAdministration |

### Laboratory App

| Model | Key Fields |
|-------|-----------|
| **LabTestDefinition** | `test_id`, `code` (unique), `name`, `category`, `base_price`, `turnaround_time` (charge master) |
| **DiagnosticReport** | `diagnostic_report_id`, `code`, `category`, `conclusion`, `effective_datetime`, `issued_datetime`, Ext→subject_id, encounter_id |
| **DiagnosticReportResult** | Junction: FK→DiagnosticReport, Ext→observation_id |
| **Specimen** | `specimen_id`, `type`, `collection_datetime`, `collection_method` |
| **ImagingStudy** | `imaging_study_id`, `modality`, `description`, `number_of_series/instances` |

### Monitoring App

| Model | Key Fields |
|-------|-----------|
| **Observation** | `observation_id`, `code`, `category`, polymorphic value fields (string, boolean, integer, quantity, datetime, etc.), `effective_datetime`, Ext→subject_id, encounter_id |
| **ObservationComponent** | Component values (e.g., systolic/diastolic for BP), FK→Observation |
| **ChargeItem** | `chargeitem_id`, `code`, occurrence fields, `price_override`, `quantity`, Ext→subject_id, account_id |
| **ChargeItemDefinition** | `chargeitemdefinition_id`, `url`, `title`, `code`, pricing rules |
| **ChargeItemDefinitionPriceComponent** | `type`, `code`, `factor`, `amount_value/currency`, FK→ChargeItemDefinition |

### Billing App

| Model | Key Fields |
|-------|-----------|
| **Account** | `account_id`, `type`, `name`, `servicePeriod`, coverage fields |
| **Claim** | `claim_id`, `type`, `use`, `billablePeriod`, `priority`, `total`, Ext→patient_id, provider_id |
| **ClaimResponse** | `claimResponse_id`, `outcome`, `disposition`, payment fields |
| **Invoice** | `invoice_id`, `type`, `invoice_datetime`, `total_net/gross_value`, `payment_terms`, Ext→subject_id, account_id |
| **InvoiceLineItem** | Line items with price components, FK→Invoice |
| **PaymentReconciliation** | `payment_reconciliation_id`, `payment_date`, `payment_amount`, `outcome` |
| **PaymentNotice** | `payment_notice_id`, `payment_date`, `payment_status`, `amount` |

### Discharge App

| Model | Key Fields |
|-------|-----------|
| **Discharge** | `discharge_id`, `discharge_datetime`, `workflow_status`, `summary_of_stay`, `discharge_instructions`, `follow_up_plan`, Ext→encounter_id, patient_id, physician_id |
| **Procedure** | `procedure_id`, `category`, `code`, `body_site`, `outcome`, performed timing fields, Ext→encounter_id, subject_id |
| **ProcedurePerformer** | Junction table, FK→Procedure |

---

## Backend - API Routes

### Root URL Configuration

| Prefix | Module | Description |
|--------|--------|-------------|
| `/admin/` | Django Admin | Admin interface |
| `/api/accounts/` | Accounts | Auth, orgs, practitioners |
| `/api/patients/` | Patients | Patient registration & clinical data |
| `/api/admission/` | Admission | Encounters & procedures |
| `/api/pharmacy/` | Pharmacy | Medication management |
| `/api/laboratory/` | Laboratory | Lab tests & reports |
| `/api/monitoring/` | Monitoring | Observations & charges |
| `/api/billing/` | Billing | Invoices, claims, payments |
| `/api/discharge/` | Discharge | Discharge workflow |

### Detailed Endpoints

#### Accounts (`/api/accounts/`)
```
GET/POST       /organizations/
GET/PUT/DELETE  /organizations/{id}/
GET/POST       /locations/
GET/PUT/DELETE  /locations/{id}/
GET/POST       /practitioners/
GET/PUT/DELETE  /practitioners/{id}/
GET/POST       /practitioner-roles/
GET/PUT/DELETE  /practitioner-roles/{id}/
POST           /login/
POST           /register/
POST           /token/refresh/
```

#### Patients (`/api/patients/`)
```
GET/POST       /                          # List / Create patient
GET/PUT/PATCH  /{id}/                     # Retrieve / Update patient
GET            /search/?q=term&limit=50   # Search patients
GET            /{id}/conditions/          # Patient conditions
GET            /{id}/allergies/           # Patient allergies
GET            /{id}/immunizations/       # Patient immunizations
GET/POST       /conditions/               # Condition CRUD
GET/POST       /allergies/                # Allergy CRUD
GET/POST       /immunizations/            # Immunization CRUD
POST           /wah4pc/fetch              # Fetch from WAH4PC gateway
POST           /webhooks/receive          # Receive WAH4PC webhook
```

#### Admission (`/api/admission/`)
```
GET/POST       /encounters/
GET/PUT/DELETE  /encounters/{id}/
```

#### Pharmacy (`/api/pharmacy/`)
```
GET/POST       /inventory/
GET/PUT/DELETE  /inventory/{id}/
GET/POST       /requests/
GET/PUT/DELETE  /requests/{id}/
GET/POST       /administrations/
GET/PUT/DELETE  /administrations/{id}/
```

#### Laboratory (`/api/laboratory/`)
```
GET/POST       /tests/                    # Lab test definitions (catalog)
GET/PUT/DELETE  /tests/{id}/
GET/POST       /reports/                  # Diagnostic reports
GET/PUT/DELETE  /reports/{id}/
```

#### Monitoring (`/api/monitoring/`)
```
GET/POST       /observations/
GET/PUT/DELETE  /observations/{id}/
GET/POST       /charge-items/
GET/PUT/DELETE  /charge-items/{id}/
```

#### Billing (`/api/billing/`)
```
GET/POST       /accounts/
GET/PUT/DELETE  /accounts/{id}/
GET/POST       /invoices/
GET/PUT/DELETE  /invoices/{id}/
GET/POST       /claims/
GET/PUT/DELETE  /claims/{id}/
GET/POST       /payments/
GET/PUT/DELETE  /payments/{id}/
GET/POST       /billing-records/
GET/PUT/DELETE  /billing-records/{id}/
```

#### Discharge (`/api/discharge/`)
```
GET/POST       /procedures/
GET/PUT/DELETE  /procedures/{id}/
GET/POST       /discharges/
GET/PUT/DELETE  /discharges/{id}/
```

---

## Frontend - Pages & Routes

### Public Routes
| Path | Page | Description |
|------|------|-------------|
| `/login` | Login | User authentication |
| `/register` | Register | User registration |

### Protected Routes (require authentication)
| Path | Page | Status |
|------|------|--------|
| `/` or `/dashboard` | ModernDashboard | Active |
| `/patients` or `/patient-registration` | PatientRegistration | Active |
| `/admission` | AdmissionPage | Active |
| `/pharmacy` | Pharmacy | Active |
| `/laboratory` | Laboratory | Active |
| `/monitoring` | Monitoring | Active |
| `/discharge` | Discharge | Active |
| `/billing` | Billing | Active |
| `/inventory` | Inventory | Active |
| `/philhealth` or `/philhealth-claims` | PhilHealthClaims | Active |
| `/compliance` | Compliance | Active |
| `/settings` or `/control-panel` | Settings | Active |
| `/account-settings` | AccountSettings | Active |
| `/appointments` | Coming Soon | Planned |
| `/statistics` | Coming Soon | Planned |
| `/erp` | Coming Soon | Planned |
| `*` | NotFound | 404 page |

---

## Frontend - Component Architecture

### Component Directories (`src/components/`)

| Directory | Purpose |
|-----------|---------|
| `admission/` | Admission workflow components |
| `billing/` | Billing, invoices, claims components |
| `chatbot/` | Chatbot functionality |
| `discharge/` | Discharge workflow components |
| `help/` | Help & documentation |
| `inventory/` | Inventory management |
| `laboratory/` | Lab tests and results |
| `layout/` | ModernLayout, navigation, sidebar |
| `monitoring/` | Vital signs, observations |
| `patients/` | Patient registration, details, modals |
| `pharmacy/` | Medication management |
| `philhealth/` | PhilHealth claims |
| `settings/` | System configuration |
| `ui/` | Shared shadcn-ui components |

### Key Patient Components
- `PatientRegistrationModal` — New patient registration form
- `PatientDetailsModal` — View patient details
- `EditPatientModal` — Edit existing patient
- `DeletePatientModal` — Delete confirmation
- `PatientTable` — Patient list table
- `PatientFilters` — Filter controls

---

## Role-Based Access Control

### Roles & Access Levels

| Role | Level | Module Access |
|------|-------|--------------|
| **Administrator** | 4 | All modules — full system access |
| **Doctor** | 3 | Dashboard, Patients, Admission, Laboratory, Monitoring, Discharge, Appointments, PhilHealth, Settings |
| **Nurse** | 3 | Dashboard, Patients, Admission, Monitoring, Laboratory (view), Pharmacy (view), Inventory, Appointments, Settings |
| **Lab Technician** | 2 | Dashboard, Laboratory, Monitoring, Patients (limited), Compliance, Settings |
| **Pharmacist** | 2 | Dashboard, Pharmacy, Inventory, Patients (allergies/history), Compliance, Settings |
| **Billing Clerk** | 1 | Dashboard, Billing, PhilHealth, ERP, Patients (billing info), Settings |

### Security Features
- JWT authentication with automatic token refresh
- Role-based module access (frontend `RoleContext` + backend permissions)
- No manual role switching (security measure)
- Admin mode for elevated privileges (admin only)

---

## WAH4PC Integration

### Overview
Minimal integration with the WAH4PC (Work at Home for Primary Care) gateway for cross-provider patient data exchange.

### Gateway
- **URL**: `https://wah4pc.echosphere.cfd`
- **Protocol**: REST API with webhook callbacks

### Endpoints

#### 1. Fetch Patient from External Provider
```
POST /api/patients/wah4pc/fetch
Content-Type: application/json

{
  "targetProviderId": "uuid-of-target-provider",
  "philHealthId": "12-345678901-2"
}
```
Sends a request to the WAH4PC gateway. Response is delivered asynchronously via webhook.

#### 2. Receive Webhook Callback
```
POST /api/patients/webhooks/receive
X-Gateway-Auth: {GATEWAY_AUTH_KEY}
Content-Type: application/json

{
  "transactionId": "uuid",
  "status": "SUCCESS",
  "data": { FHIR Patient resource }
}
```
Validates the `X-Gateway-Auth` header, converts FHIR Patient data to local fields, and stores in session.

### Backend Files
- `patients/wah4pc.py` — Gateway client (`request_patient`) and FHIR converter (`fhir_to_dict`)
- `patients/api/views.py` — `fetch_wah4pc` and `webhook_receive` views
- `patients/urls.py` — Route registration

### Required Environment Variables (Backend)
```
WAH4PC_API_KEY=wah_xxx           # API key for gateway authentication
WAH4PC_PROVIDER_ID=uuid          # This provider's ID
GATEWAY_AUTH_KEY=secret           # Key to validate incoming webhooks
```

### Frontend
The Patient Registration page includes a WAH4PC fetch section with:
- PhilHealth ID input
- Target Provider ID input
- "Fetch from WAH4PC" button

---

## Environment Configuration

### Frontend `.env`
```env
LOCAL_8000=http://127.0.0.1:8000/
BACKEND_PHARMACY=http://127.0.0.1:8000/api/pharmacy/
BACKEND_ADMISSIONS=http://127.0.0.1:8000/api/admissions/
BACKEND_BILLING=http://127.0.0.1:8000/api/billing/
BACKEND_DISCHARGE=http://127.0.0.1:8000/api/discharge/
BACKEND_ACCOUNTS=http://127.0.0.1:8000/accounts/
BACKEND_PATIENTS=http://127.0.0.1:8000/api/patients/
BACKEND_MONITORING=http://127.0.0.1:8000/api/
BACKEND_LABORATORY=http://127.0.0.1:8000/api/laboratory/
STURDY_ADVENTURE_BASE=http://127.0.0.1:8000
```

### Backend Environment Variables (for WAH4PC)
```
WAH4PC_API_KEY=<your-api-key>
WAH4PC_PROVIDER_ID=<your-provider-uuid>
GATEWAY_AUTH_KEY=<webhook-auth-secret>
```

---

## Running the Application

### Backend
```bash
cd wah4h-backend
python manage.py runserver
# Runs at http://127.0.0.1:8000/
```

### Frontend
```bash
cd Frontend/wah4hospitals-clinic-hub-79-main
npm run dev
# Runs at http://localhost:3000/
```

### Default Credentials
Refer to the team for initial admin credentials or create a superuser:
```bash
cd wah4h-backend
python manage.py createsuperuser
```
