# WAH4H — WAH For Hospital

> A comprehensive, FHIR-compliant Hospital Information System (HIS) built for Philippine Local Government Unit (LGU) hospitals.

[![Backend CI/CD](https://github.com/APC-SoCIT/APC_2025_2026_T1_SS231_G04-WAH-for-Hospitals-WAH4H/actions/workflows/2026_quibin_final_merge-interops_to_system_wah4h-backend.yml/badge.svg)](https://github.com/APC-SoCIT/APC_2025_2026_T1_SS231_G04-WAH-for-Hospitals-WAH4H/actions)
![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)
![Django](https://img.shields.io/badge/Django-6.0-green?logo=django)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-Academic-lightgrey)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [User Roles](#user-roles)
- [WAH4PC Gateway Integration](#wah4pc-gateway-integration)
- [Deployment](#deployment)
  - [Backend — Azure App Service](#backend--azure-app-service)
  - [Frontend — Vercel](#frontend--vercel)
- [Security](#security)
- [Team](#team)

---

## Overview

**WAH4H** is a full-stack Hospital Information System tailored for LGU hospitals in the Philippines. It digitalizes and streamlines core hospital workflows — from patient registration and admission through pharmacy, laboratory, monitoring, billing, and discharge — all within a single integrated platform.

The system is built to comply with **FHIR (Fast Healthcare Interoperability Resources)** standards, enabling structured healthcare data exchange and interoperability with external systems via the **WAH4PC Gateway**.

### Key Highlights

- FHIR-compliant data models across all clinical modules
- JWT-based authentication with token rotation and OTP support
- Role-based access control for 6 distinct hospital staff roles
- Real-time inter-hospital data exchange via WAH4PC Gateway
- PhilHealth insurance claims integration
- Rate-limited, OWASP-compliant API security
- Deployed on Azure (backend) and Vercel (frontend)

---

## Features

| Module | Features |
|---|---|
| **Authentication** | JWT login, OTP 2-step verification, password reset via email, session idle timeout |
| **Patient Management** | Registration, demographics, conditions, allergies, immunizations, PHCORE compliance |
| **Admission** | Encounter creation, procedure tracking, admission history |
| **Pharmacy** | Drug inventory management, medication requests, administration records |
| **Laboratory** | Lab test definitions, specimen tracking, diagnostic reports, imaging studies |
| **Monitoring** | Vital signs, clinical observations, charge item tracking |
| **Billing** | Invoices, PhilHealth claims, payment reconciliation, billing accounts |
| **Discharge** | Discharge documentation and patient exit workflow |
| **WAH4PC Integration** | Push/pull patient records to/from the inter-hospital gateway |
| **Dashboard** | System-wide analytics and activity overview |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                      │
│              React 18 + Vite + TypeScript               │
│         (Vercel — wah4h-frontend.vercel.app)            │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS / REST API (JWT)
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

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 5.4 | Build tool |
| Tailwind CSS | 3.4 | Utility-first styling |
| shadcn/ui + Radix UI | latest | Accessible component library |
| React Router | v6 | Client-side routing |
| TanStack Query | v5 | Data fetching & caching |
| Axios | latest | HTTP client |
| React Hook Form + Zod | latest | Form validation |
| Recharts | latest | Data visualization |
| Lucide React | latest | Icon library |
| react-idle-timer | latest | Session timeout management |
| Sonner | latest | Toast notifications |
| next-themes | latest | Dark mode support |

### Backend

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

---

## Project Structure

```
WAH-for-Hospitals-WAH4H/
│
├── .github/
│   └── workflows/
│       └── 2026_quibin_final_merge-interops_to_system_wah4h-backend.yml
│
├── docs/
│   ├── SYSTEM_DOCUMENTATION.md
│   ├── ROLE_SYSTEM_DOCUMENTATION.md
│   ├── ROLE_QUICK_REFERENCE.md
│   └── examples/
│
├── Frontend/
│   └── wah4hospitals-clinic-hub-79-main/
│       ├── src/
│       │   ├── components/        # UI components (by module)
│       │   ├── contexts/          # AuthContext, RoleContext
│       │   ├── hooks/             # Custom React hooks
│       │   ├── pages/             # Route-level page components
│       │   ├── schemas/           # Zod validation schemas
│       │   ├── services/          # Axios API service layer
│       │   ├── types/             # TypeScript interfaces
│       │   ├── utils/             # Utility functions
│       │   ├── App.tsx            # Root component with routing
│       │   └── main.tsx           # Application entry point
│       ├── public/
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       └── tsconfig.json
│
└── wah4h-backend/
    ├── wah4h/                 # Django project settings & URLs
    ├── core/                  # Shared abstract models (FHIR base)
    ├── accounts/              # Authentication & user management
    ├── patients/              # Patient records + WAH4PC gateway
    ├── admission/             # Encounters & procedures
    ├── pharmacy/              # Medication management
    ├── laboratory/            # Lab tests & diagnostics
    ├── monitoring/            # Vital signs & observations
    ├── billing/               # Invoices, claims, payments
    ├── discharge/             # Discharge workflow
    ├── templates/             # Email templates
    ├── manage.py
    ├── requirements.txt
    ├── env.txt                # Environment variable template
    └── startup.sh             # Gunicorn startup script
```

---

## Getting Started

### Prerequisites

- **Python** 3.12+
- **Node.js** 18+ (or Bun)
- **PostgreSQL** (for production) — SQLite3 works for local development
- **Git**

---

### Backend Setup

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
# Edit .env with your actual values (see Environment Variables section)

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

---

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd Frontend/wah4hospitals-clinic-hub-79-main

# 2. Install dependencies
npm install
# or with Bun:
bun install

# 3. Create your environment file
# Create a .env file in the frontend root directory:
# STURDY_ADVENTURE_BASE_8000=http://localhost:8000

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

---

## Environment Variables

### Backend — `wah4h-backend/.env`

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

> See `wah4h-backend/env.txt` for the full template with comments.

### Frontend — `.env` (in `Frontend/wah4hospitals-clinic-hub-79-main/`)

```env
# Backend API URL — use one of the following prefixes (VITE_, LOCAL_, BACKEND_, STURDY_)
STURDY_ADVENTURE_BASE_8000=http://localhost:8000
```

> Vite only exposes variables with the prefixes: `VITE_`, `LOCAL_`, `BACKEND_`, `STURDY_`.

---

## API Reference

All endpoints are prefixed with `/api/`.

### Authentication — `/api/accounts/`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/accounts/register/` | Register a new user |
| POST | `/api/accounts/login/` | Login and receive JWT tokens |
| POST | `/api/accounts/token/refresh/` | Refresh access token |
| POST | `/api/accounts/logout/` | Logout (blacklist refresh token) |
| POST | `/api/accounts/password-reset/` | Request password reset email |
| POST | `/api/accounts/password-reset/confirm/` | Confirm password reset |

### Patients — `/api/patients/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/patients/` | List / create patients |
| GET/PUT/DELETE | `/api/patients/{id}/` | Retrieve / update / delete patient |
| GET/POST | `/api/patients/conditions/` | Patient conditions |
| GET/POST | `/api/patients/allergies/` | Patient allergies |
| GET/POST | `/api/patients/immunizations/` | Patient immunizations |
| POST | `/api/patients/wah4pc/fetch` | Fetch patient from WAH4PC Gateway |
| POST | `/api/patients/wah4pc/send` | Send patient to WAH4PC Gateway |

### Admission — `/api/admission/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/admission/encounters/` | List / create encounters |
| GET/PUT/DELETE | `/api/admission/encounters/{id}/` | Manage encounter |
| GET/POST | `/api/admission/procedures/` | List / create procedures |

### Pharmacy — `/api/pharmacy/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/pharmacy/inventory/` | Medication inventory |
| GET/POST | `/api/pharmacy/requests/` | Medication requests |
| GET/POST | `/api/pharmacy/administrations/` | Medication administrations |

### Laboratory — `/api/laboratory/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/laboratory/reports/` | Diagnostic reports |
| GET/POST | `/api/laboratory/test-definitions/` | Lab test definitions |
| GET/POST | `/api/laboratory/specimens/` | Specimen records |
| GET/POST | `/api/laboratory/imaging-studies/` | Imaging studies |

### Monitoring — `/api/monitoring/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/monitoring/observations/` | Vital signs & observations |
| GET/POST | `/api/monitoring/charge-items/` | Charge items |
| GET/POST | `/api/monitoring/charge-item-definitions/` | Charge item definitions |

### Billing — `/api/billing/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/billing/accounts/` | Billing accounts |
| GET/POST | `/api/billing/invoices/` | Invoices |
| GET/POST | `/api/billing/claims/` | Insurance claims (PhilHealth) |
| GET/POST | `/api/billing/payments/` | Payment reconciliation |
| GET/POST | `/api/billing/payment-notices/` | Payment notices |

### Discharge — `/api/discharge/`

| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/discharge/discharges/` | Discharge records |
| GET/PUT/DELETE | `/api/discharge/discharges/{id}/` | Manage discharge |

### API Behavior

- **Authentication:** Include `Authorization: Bearer <access_token>` header on all protected endpoints.
- **Pagination:** 50 items per page. Use `?page=2` to paginate.
- **Filtering:** Supports `?field=value` query parameters via DjangoFilterBackend.
- **Search:** Use `?search=keyword` for full-text search where supported.
- **Ordering:** Use `?ordering=field` or `?ordering=-field` (descending).

### Rate Limits

| Scope | Limit |
|---|---|
| Anonymous | 20 requests/minute |
| Authenticated | 100 requests/minute |
| Login endpoint | 60 requests/minute |
| Password reset | 3 requests/minute |

---

## User Roles

The system implements role-based access control with 6 roles:

| Role | Access Scope |
|---|---|
| **Administrator** | Full system access, user management, settings |
| **Doctor** | Patient records, encounters, procedures, prescriptions, lab orders |
| **Nurse** | Admissions, monitoring (vital signs), medication administration |
| **Pharmacist** | Pharmacy inventory, medication requests and dispensing |
| **Laboratory Technician** | Lab test management, diagnostic reports, specimen tracking |
| **Billing Officer** | Invoices, claims, payments, PhilHealth processing |

> For detailed permission matrices, see [docs/ROLE_SYSTEM_DOCUMENTATION.md](docs/ROLE_SYSTEM_DOCUMENTATION.md) and [docs/ROLE_QUICK_REFERENCE.md](docs/ROLE_QUICK_REFERENCE.md).

---

## WAH4PC Gateway Integration

WAH4H integrates with the **WAH4PC Gateway** (`wah4pc.echosphere.cfd`) for inter-hospital patient data exchange, enabling records to be shared across participating LGU hospitals.

### Webhook Endpoints (Incoming from Gateway)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/fhir/process-query` | Process incoming data queries from gateway |
| POST | `/fhir/receive-results` | Receive patient data query results |
| POST | `/fhir/receive-push` | Receive pushed patient data |

### Patient Gateway Actions (Outgoing)

| Action | Frontend | API |
|---|---|---|
| Fetch patient from network | Patients page → "Fetch from Gateway" | `POST /api/patients/wah4pc/fetch` |
| Push patient to network | Patients page → "Send to Gateway" | `POST /api/patients/wah4pc/send` |

### Configuration

Set the following in your `.env`:

```env
WAH4PC_GATEWAY_URL=https://wah4pc.echosphere.cfd
WAH4PC_API_KEY=wah_your-api-key
WAH4PC_PROVIDER_ID=your-provider-uuid
GATEWAY_AUTH_KEY=your-gateway-auth-key
```

---

## Deployment

### Backend — Azure App Service

The backend is deployed to **Azure App Service** (`wah4h-backend-apc`) via GitHub Actions.

**Trigger:** Push to branch `2026_Quibin_final_merge/interops_to_system`

**Workflow:** [`.github/workflows/2026_quibin_final_merge-interops_to_system_wah4h-backend.yml`](.github/workflows/2026_quibin_final_merge-interops_to_system_wah4h-backend.yml)

**Required GitHub Secrets:**

| Secret | Description |
|---|---|
| `AZUREAPPSERVICE_CLIENTID_*` | Azure Service Principal Client ID |
| `AZUREAPPSERVICE_TENANTID_*` | Azure AD Tenant ID |
| `AZUREAPPSERVICE_SUBSCRIPTIONID_*` | Azure Subscription ID |

**Manual deployment (production server):**

```bash
cd wah4h-backend
source venv/bin/activate
gunicorn wah4h.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
# or use the included startup script:
bash startup.sh
```

---

### Frontend — Vercel

The frontend is deployed to **Vercel** as a static Vite build.

#### Step 1: Create `vercel.json` for client-side routing

Create this file at `Frontend/wah4hospitals-clinic-hub-79-main/vercel.json`:

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

#### Step 4: Deploy via CLI

```bash
npm install -g vercel
cd Frontend/wah4hospitals-clinic-hub-79-main
vercel --prod
```

#### CORS Configuration

After deploying the frontend, add the Vercel URL to your backend's `CORS_ALLOWED_ORIGINS`:

```env
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
```

---

## Security

WAH4H follows OWASP security best practices:

| Feature | Implementation |
|---|---|
| **Authentication** | JWT with 15-min access tokens and 7-day rotating refresh tokens |
| **Token Rotation** | Refresh tokens blacklisted after each use |
| **OTP Verification** | 2-step email OTP for registration, login, and password reset |
| **Password Policy** | Min. 12 characters, blocks common and numeric-only passwords |
| **Session Timeout** | 15-minute idle timeout on the frontend |
| **CORS** | Restricted to configured allowed origins only |
| **Rate Limiting** | Per-endpoint throttling to prevent brute-force attacks |
| **SQL Injection** | Prevented via Django ORM parameterized queries |
| **CSRF** | Django CSRF middleware enabled |
| **Clickjacking** | `X-Frame-Options` header enforced |
| **HTTPS** | Enforced in production via Azure and Vercel |
| **Secrets Management** | All secrets via environment variables, never committed to Git |

> **Note:** OTP is currently disabled (`LOGIN_USE_OTP = False`) for testing/development. Set to `True` in production.

---

## Team

**Asia Pacific College — APC 2025–2026 | T1 | SS231 | Group 04**

| Name | Role |
|---|---|
| John Kenneth Jajurie | Full-Stack Developer |
| Mariyah Vanna Monique Chavez | Full-Stack Developer |
| Jhon Lloyd Nicolas | Full-Stack Developer |
| Elijah Josh Quibin | Full-Stack Developer |

**Repository:**
- Organization: [APC-SoCIT](https://github.com/APC-SoCIT/APC_2025_2026_T1_SS231_G04-WAH-for-Hospitals-WAH4H)
- Fork: [Judge09](https://github.com/Judge09/APC_2025_2026_T1_SS231_G04-WAH-for-Hospitals-WAH4H)

---

> For additional documentation, see the [`docs/`](docs/) directory. For frontend module development guides, see [`Frontend/HOW_TO_ADD_MODULE.md`](Frontend/wah4hospitals-clinic-hub-79-main/HOW_TO_ADD_MODULE.md) and [`Frontend/HOW_TO_CREATE_FORM_AND_API.md`](Frontend/wah4hospitals-clinic-hub-79-main/HOW_TO_CREATE_FORM_AND_API.md).
