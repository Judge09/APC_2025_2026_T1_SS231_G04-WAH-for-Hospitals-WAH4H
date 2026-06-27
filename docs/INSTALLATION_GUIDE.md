# WAH4H – Installation Guide

> **Audience:** WAH (We Are Health) technical staff who need to run the WAH4H Hospital Information System on local hardware for testing or on-premises deployment.
>
> This guide covers two methods:
> - **Method A – Manual Setup** (recommended for development/testing)
> - **Method B – Docker** (recommended for on-premises deployment)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Get the Source Code](#2-get-the-source-code)
3. [Method A – Manual Setup](#method-a--manual-setup)
   - [3A. Backend Setup](#3a-backend-setup-django)
   - [4A. Frontend Setup](#4a-frontend-setup-react--vite)
4. [Method B – Docker Setup](#method-b--docker-setup)
5. [Verifying the Installation](#5-verifying-the-installation)
6. [Stopping the System](#6-stopping-the-system)
7. [Common Errors & Fixes](#7-common-errors--fixes)

---

## 1. Prerequisites

Install the following software on the machine **before** starting. All items are free and open-source.

### 1.1 Git

Used to download the project code.

| Platform | Download |
|----------|----------|
| Windows | https://git-scm.com/download/win (installer) |
| macOS | `brew install git` or Xcode Command Line Tools |
| Linux (Ubuntu/Debian) | `sudo apt install git` |

Verify:
```bash
git --version
# Expected: git version 2.x.x or higher
```

---

### 1.2 Python 3.12

Required for the backend (Django).

| Platform | Download |
|----------|----------|
| Windows | https://www.python.org/downloads/ — choose **Python 3.12.x** |
| macOS | `brew install python@3.12` |
| Linux (Ubuntu/Debian) | `sudo apt install python3.12 python3.12-venv python3.12-dev` |

> **Windows note:** During installation, tick **"Add Python to PATH"**.

Verify:
```bash
python --version
# or
python3 --version
# Expected: Python 3.12.x
```

---

### 1.3 Node.js 20 (LTS)

Required for the frontend (React + Vite).

| Platform | Download |
|----------|----------|
| All platforms | https://nodejs.org — choose **20.x LTS** |
| Using nvm (recommended) | `nvm install 20 && nvm use 20` |

Verify:
```bash
node --version
# Expected: v20.x.x

npm --version
# Expected: 10.x.x
```

---

### 1.4 PostgreSQL 15 or 16

The main database for the backend.

| Platform | Download |
|----------|----------|
| Windows | https://www.postgresql.org/download/windows/ (EDB installer) |
| macOS | `brew install postgresql@15` |
| Linux (Ubuntu/Debian) | `sudo apt install postgresql postgresql-contrib` |

> **During installation**, you will be asked to set a password for the `postgres` superuser. **Remember this password** — you will need it in Step 3A.

Start the PostgreSQL service:
```bash
# Linux / macOS (brew)
sudo service postgresql start
# or
brew services start postgresql@15

# Windows
# PostgreSQL starts automatically as a Windows Service after installation
```

Verify:
```bash
psql --version
# Expected: psql (PostgreSQL) 15.x or 16.x
```

---

### 1.5 Docker Desktop *(Method B only)*

Only needed if you choose the Docker route.

| Platform | Download |
|----------|----------|
| Windows / macOS | https://www.docker.com/products/docker-desktop |
| Linux | https://docs.docker.com/engine/install/ |

Verify:
```bash
docker --version
# Expected: Docker version 24.x or higher

docker compose version
# Expected: Docker Compose version v2.x
```

---

## 2. Get the Source Code

Open a terminal and clone the repository:

```bash
git clone https://github.com/APC-SoCIT/APC_2025_2026_T1_SS231_G04-WAH-for-Hospitals-WAH4H.git
cd APC_2025_2026_T1_SS231_G04-WAH-for-Hospitals-WAH4H
```

The project structure you will see:

```
APC_2025_2026_T1_SS231_G04-WAH-for-Hospitals-WAH4H/
├── wah4h-backend/         ← Django REST API
├── Frontend/
│   └── wah4hospitals-clinic-hub-79-main/  ← React frontend
├── deploy/                ← Docker Compose file
└── docs/                  ← Documentation
```

---

## Method A – Manual Setup

Use this method when you want to run the backend and frontend as separate processes on your machine (best for development and testing).

---

### 3A. Backend Setup (Django)

All commands in this section are run from the `wah4h-backend/` folder.

```bash
cd wah4h-backend
```

#### Step 1 – Create the PostgreSQL Database

Open a PostgreSQL shell:

```bash
# Linux / macOS
psql -U postgres

# Windows (run as Administrator in Command Prompt)
psql -U postgres
```

Inside the PostgreSQL shell, run:

```sql
CREATE DATABASE wah4h_db;
\q
```

#### Step 2 – Create a Python Virtual Environment

```bash
# Create the virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate

# On macOS / Linux:
source venv/bin/activate
```

Your terminal prompt will change to show `(venv)` — this means the virtual environment is active.

#### Step 3 – Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs Django, Django REST Framework, JWT authentication, PostgreSQL adapter, and all other backend packages.

#### Step 4 – Create the Environment File

Copy the template and fill in your values:

```bash
# macOS / Linux
cp env.txt .env

# Windows
copy env.txt .env
```

Open `.env` in any text editor and fill in the following values:

```env
# ── Django ──────────────────────────────────────────────────────────────────
# Generate a secret key with:
#   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=your-generated-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# ── Database ─────────────────────────────────────────────────────────────────
DATABASE_NAME=wah4h_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your-postgres-password-here
DATABASE_HOST=localhost
DATABASE_PORT=5432

# ── WAH4PC Gateway (inter-hospital data exchange) ────────────────────────────
# Leave these as-is for local testing. You only need real values for
# connecting to the national WAH4PC network.
WAH4PC_GATEWAY_URL=https://wah4pc-gateway.wah.ph
WAH4PC_API_KEY=wah_your-api-key
WAH4PC_PROVIDER_ID=your-provider-uuid
GATEWAY_AUTH_KEY=your-gateway-auth-key

# ── CORS (allows the frontend to talk to the backend) ────────────────────────
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# ── Public URL (for webhook callbacks — ngrok URL if testing locally) ────────
PUBLIC_BASE_URL=http://localhost:8000
```

> **How to generate a SECRET_KEY:**
> ```bash
> python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
> ```
> Copy the output and paste it as the `SECRET_KEY` value.

#### Step 5 – Run Database Migrations

```bash
python manage.py migrate
```

This creates all the database tables. You should see a list of applied migrations.

#### Step 6 – Seed Initial Data

```bash
# Load hospital organization data
python manage.py seed_hospitals

# Load laboratory test pricing data
python manage.py seed_lab_prices
```

#### Step 7 – Create a Superuser (Admin Account)

```bash
python manage.py createsuperuser
```

You will be prompted for a username, email, and password. Use these credentials to log into the system as an Administrator.

#### Step 8 – Start the Backend Server

```bash
python manage.py runserver
```

The backend is now running at: **http://localhost:8000**

You can test it by opening http://localhost:8000/api/health/ in your browser — you should see a JSON health status response.

> **Keep this terminal open.** Open a new terminal for the frontend setup below.

---

### 4A. Frontend Setup (React + Vite)

All commands in this section are run from the frontend folder.

```bash
cd Frontend/wah4hospitals-clinic-hub-79-main
```

#### Step 1 – Install Node.js Dependencies

```bash
npm install
```

This installs React, TypeScript, Vite, Tailwind CSS, and all other frontend packages. It may take 1–2 minutes.

#### Step 2 – Configure the Frontend Environment

Create a `.env` file in the frontend folder:

```bash
# macOS / Linux
touch .env

# Windows (Command Prompt)
type nul > .env
```

Open `.env` and add the following (pointing all API calls to your local backend):

```env
LOCAL_8000=http://localhost:8000
STURDY_ADVENTURE_BASE=http://localhost:8000
STURDY_ADVENTURE_BASE_8000=http://localhost:8000
BACKEND_PHARMACY=http://localhost:8000/api/pharmacy/
BACKEND_PHARMACY_8000=http://localhost:8000/api/pharmacy/
BACKEND_ADMISSIONS=http://localhost:8000/api/admissions/
BACKEND_ADMISSIONS_8000=http://localhost:8000/api/admissions/
BACKEND_BILLING=http://localhost:8000/api/billing/
BACKEND_BILLING_8000=http://localhost:8000/api/billing/
BACKEND_DISCHARGE=http://localhost:8000/api/discharge/
BACKEND_DISCHARGE_8000=http://localhost:8000/api/discharge/
BACKEND_ACCOUNTS=http://localhost:8000/accounts/
BACKEND_ACCOUNTS_8000=http://localhost:8000/accounts/
BACKEND_PATIENTS=http://localhost:8000/api/patients/
BACKEND_PATIENTS_8000=http://localhost:8000/api/patients/
BACKEND_MONITORING=http://localhost:8000/api/
BACKEND_MONITORING_8000=http://localhost:8000/api/
BACKEND_LABORATORY=http://localhost:8000/api/laboratory/
BACKEND_LABORATORY_8000=http://localhost:8000/api/laboratory/
```

#### Step 3 – Start the Frontend Development Server

```bash
npm run dev
```

The frontend is now running at: **http://localhost:5173**

Open this URL in your browser. You should see the WAH4H login page.

---

## Method B – Docker Setup

Use this method for a one-command setup. Docker handles the backend, frontend, and web server automatically.

> **Requirement:** Docker Desktop must be running before you proceed.

#### Step 1 – Set Up the Backend Environment File

```bash
cd wah4h-backend
cp env.txt .env
```

Edit `.env` with your values (same as Method A, Step 4). For Docker, the database is managed externally — make sure `DATABASE_HOST` points to your PostgreSQL server.

> If you want PostgreSQL inside Docker too, add a `db` service to `deploy/docker-compose.yml` and set `DATABASE_HOST=db`.

#### Step 2 – Build and Start All Services

```bash
cd deploy
docker compose up --build
```

This will:
- Build the Django backend image
- Build the React frontend image (Nginx serves it)
- Run migrations and seed data automatically
- Start everything and connect the services together

The first build takes 3–5 minutes. Subsequent starts are faster.

#### Step 3 – Access the Application

- **Frontend (UI):** http://localhost:80
- **Backend API:** accessible through the frontend's Nginx proxy at `/api/`

#### Stopping Docker

```bash
docker compose down
```

---

## 5. Verifying the Installation

After starting both services (either method), run these checks:

| Check | URL | Expected Result |
|-------|-----|-----------------|
| Backend health | http://localhost:8000/api/health/ | JSON with `"status": "ok"` |
| Backend ping | http://localhost:8000/api/health/ping/ | `"pong"` |
| Frontend loads | http://localhost:5173 (Method A) or http://localhost (Method B) | WAH4H login page |
| Login works | Use the superuser account created in Step 7 | Redirected to dashboard |

---

## 6. Stopping the System

### Method A (Manual)

Press `Ctrl + C` in each terminal window (backend and frontend) to stop the servers.

To deactivate the Python virtual environment:
```bash
deactivate
```

### Method B (Docker)

```bash
cd deploy
docker compose down
```

---

## 7. Common Errors & Fixes

### `psycopg2` installation fails (Windows)

If `pip install -r requirements.txt` fails on `psycopg2-binary`, install Microsoft C++ Build Tools:
- Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Select **"Desktop development with C++"** workload

Then retry `pip install -r requirements.txt`.

---

### `django.db.utils.OperationalError: connection refused`

The backend cannot connect to PostgreSQL.

**Fix:**
1. Make sure PostgreSQL is running:
   ```bash
   # Linux
   sudo service postgresql status

   # macOS
   brew services list | grep postgresql
   ```
2. Verify the credentials in `.env` match your PostgreSQL `postgres` user password.
3. Confirm the database exists:
   ```bash
   psql -U postgres -c "\l" | grep wah4h_db
   ```

---

### `CORS error` in the browser console

The frontend cannot reach the backend because the URL is wrong.

**Fix:** Check that your frontend `.env` file has `http://localhost:8000` (not `https://`) and that the backend is running on port 8000.

---

### `npm install` fails with Node version error

**Fix:** Make sure you are using Node.js 20:
```bash
node --version   # should be v20.x.x
```

If you have multiple Node versions, use `nvm`:
```bash
nvm use 20
npm install
```

---

### Port 5173 or 8000 already in use

Another process is using the port.

**Fix (find and kill the process):**
```bash
# Linux / macOS
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Windows (Command Prompt, as Administrator)
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F
```

---

### Backend migrations fail: `table already exists`

**Fix:** This usually means the database is in an inconsistent state. Reset it:
```bash
psql -U postgres -c "DROP DATABASE wah4h_db;"
psql -U postgres -c "CREATE DATABASE wah4h_db;"
python manage.py migrate
python manage.py seed_hospitals
python manage.py seed_lab_prices
```

---

## Summary: Quick-Start Commands (Method A)

```bash
# ── Terminal 1: Backend ──────────────────────────────────────
cd wah4h-backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.txt .env                                    # then edit .env with your values
python manage.py migrate
python manage.py seed_hospitals
python manage.py seed_lab_prices
python manage.py createsuperuser
python manage.py runserver

# ── Terminal 2: Frontend ─────────────────────────────────────
cd Frontend/wah4hospitals-clinic-hub-79-main
npm install
# create .env with localhost:8000 values (see Step 4A-2 above)
npm run dev
```

Open **http://localhost:5173** in your browser.

---

*Last updated: 2026-06-27 | System: WAH4H v1.0*
