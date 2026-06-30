# WAH4H Role System Documentation

## Overview
This document outlines the Role-Based Access Control (RBAC) system implemented in the WAH4H (Work at Home for Hospitals) platform. The system follows real-world hospital organizational structures and workflows to ensure proper access control and data security.

## Role Definitions

### 1. Admin (System Administrator)
- **Backend Key:** `admin`
- **Access Level:** Full System Access (Level 4)
- **Description:** System administrators with complete access to all modules and features
- **Responsibilities:**
  - System configuration and maintenance
  - User account management
  - Access control and security management
  - System-wide reporting and analytics
  - All clinical and administrative functions

**Module Access:**
- ✅ Dashboard
- ✅ Patient Management
- ✅ Admission
- ✅ Laboratory
- ✅ Monitoring
- ✅ Discharge
- ✅ Pharmacy
- ✅ Inventory
- ✅ Appointments
- ✅ Billing
- ✅ PhilHealth
- ✅ Compliance
- ✅ ERP
- ✅ Statistics
- ✅ Settings

---

### 2. Doctor
- **Backend Key:** `doctor`
- **Access Level:** Clinical Staff (Level 3)
- **Description:** Licensed physicians responsible for patient diagnosis, treatment, and medical decisions
- **Responsibilities:**
  - Patient examination and diagnosis
  - Treatment planning and prescription
  - Lab test ordering and result review
  - Patient admission and discharge
  - Medical documentation and notes

**Module Access:**
- ✅ Dashboard (patient statistics and alerts)
- ✅ Patient Management (medical records)
- ✅ Admission (admit patients, create care plans)
- ✅ Laboratory (order and review tests)
- ✅ Monitoring (track vital signs and progress)
- ✅ Discharge (discharge patients, summaries)
- ✅ Appointments (schedule management)
- ✅ PhilHealth (insurance coverage review)
- ✅ Settings

**Modification Permissions:**
- Patient records
- Diagnoses
- Treatments
- Prescriptions
- Lab orders
- Discharge summaries
- Medical notes

---

### 3. Nurse
- **Backend Key:** `nurse`
- **Access Level:** Clinical Staff (Level 3)
- **Description:** Registered nurses providing direct patient care and care coordination
- **Responsibilities:**
  - Patient care delivery and monitoring
  - Vital signs recording
  - Medication administration
  - Patient documentation
  - Medical supplies management
  - Care coordination

**Module Access:**
- ✅ Dashboard (patient assignments and alerts)
- ✅ Patient Management (care delivery access)
- ✅ Admission (intake and documentation)
- ✅ Monitoring (vital signs recording)
- ✅ Laboratory (view results)
- ✅ Pharmacy (view medication orders)
- ✅ Inventory (supplies management)
- ✅ Appointments (scheduling coordination)
- ✅ Settings

**Modification Permissions:**
- Vital signs
- Nursing notes
- Medication administration records
- Patient care logs
- Inventory usage

---

### 4. Lab Technician
- **Backend Key:** `lab_technician`
- **Access Level:** Technical Staff (Level 2)
- **Description:** Laboratory professionals performing diagnostic tests and managing specimens
- **Responsibilities:**
  - Specimen collection and processing
  - Laboratory test execution
  - Result recording and reporting
  - Equipment maintenance
  - Quality control compliance

**Module Access:**
- ✅ Dashboard (pending lab orders)
- ✅ Laboratory (test processing and results)
- ✅ Monitoring (patient status for prioritization)
- ✅ Patient Management (limited - verify info)
- ✅ Compliance (quality control)
- ✅ Settings

**Modification Permissions:**
- Lab results
- Specimen tracking
- Test reports

---

### 5. Pharmacist
- **Backend Key:** `pharmacist`
- **Access Level:** Technical Staff (Level 2)
- **Description:** Licensed pharmacists managing medication dispensing and pharmaceutical inventory
- **Responsibilities:**
  - Prescription verification and dispensing
  - Drug interaction checking
  - Pharmaceutical inventory management
  - Patient medication counseling
  - Regulatory compliance

**Module Access:**
- ✅ Dashboard (medication orders and alerts)
- ✅ Pharmacy (dispensing and verification)
- ✅ Inventory (pharmaceutical stock)
- ✅ Patient Management (allergies and history)
- ✅ Compliance (drug regulations)
- ✅ Settings

**Modification Permissions:**
- Medication dispensing records
- Pharmacy inventory
- Prescription verification
- Drug interaction warnings

---

### 6. Billing Clerk
- **Backend Key:** `billing_clerk`
- **Access Level:** Support Staff (Level 1)
- **Description:** Financial staff handling billing, invoicing, and insurance claims
- **Responsibilities:**
  - Invoice generation and management
  - Payment processing
  - Insurance claim filing
  - Financial record keeping
  - PhilHealth claim processing

**Module Access:**
- ✅ Dashboard (billing summaries)
- ✅ Billing (invoices and payments)
- ✅ PhilHealth (insurance claims)
- ✅ ERP (financial reporting)
- ✅ Patient Management (billing information)
- ✅ Settings

**Modification Permissions:**
- Invoices
- Payment records
- Insurance claims
- Billing records

---

## Role Hierarchy

The system implements a 4-level hierarchy for permission management:

```
Level 4: ADMIN (Full System Access)
  └── System Administrator

Level 3: CLINICAL (Clinical Staff)
  ├── Doctor
  └── Nurse

Level 2: TECHNICAL (Technical Staff)
  ├── Lab Technician
  └── Pharmacist

Level 1: SUPPORT (Support Staff)
  └── Billing Clerk
```

## Module Descriptions

### Core Modules

- **Dashboard:** Overview, analytics, and role-specific summaries
- **Patient Management:** Patient records, demographics, medical history
- **Admission:** Patient intake, registration, and admission processes
- **Laboratory:** Lab tests, specimen tracking, and results
- **Monitoring:** Vital signs, patient observations, progress tracking
- **Discharge:** Discharge planning, summaries, and documentation
- **Pharmacy:** Medication orders, dispensing, and inventory
- **Inventory:** Medical supplies and equipment management
- **Appointments:** Scheduling and appointment coordination
- **Billing:** Invoicing, payments, and financial transactions
- **PhilHealth:** Insurance claims and coverage management
- **Compliance:** Regulatory compliance and quality control
- **ERP:** Enterprise resource planning and integration
- **Statistics:** Analytics, reporting, and data insights
- **Settings:** User preferences and system configuration

## Security Features

### Authentication
- JWT (JSON Web Token) based authentication
- Secure token storage in localStorage
- Automatic token refresh on expiration
- Session management with timeout

### Authorization
- Role-based access control at module level
- Resource-level modification permissions
- Admin mode for elevated privileges (admin only)
- Prevention of unauthorized role switching

### Data Protection
- User roles are determined by backend authentication
- Frontend role cannot be manually changed
- All API requests include authentication headers
- Failed authentication triggers automatic logout

## Frontend Implementation

### RoleContext
Location: `src/contexts/RoleContext.tsx`

Key features:
- Centralized role management
- Module access control
- Permission checking utilities
- Role hierarchy management

API:
```typescript
interface RoleContextType {
  isAdminMode: boolean;
  currentRole: UserRole;
  availableTabs: string[];
  roleLevel: RoleLevel;
  setAdminMode: (enabled: boolean) => void;
  setCurrentRole: (role: UserRole) => void;
  hasAccess: (module: string) => boolean;
  canModify: (resourceType: string) => boolean;
  isAdmin: () => boolean;
}
```

### AuthContext
Location: `src/contexts/AuthContext.tsx`

Key features:
- User authentication (login/register)
- Token management
- Automatic token refresh
- User session management

API:
```typescript
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUserData: () => Promise<void>;
}
```

### Role Utilities
Location: `src/lib/roleUtils.ts`

Provides helper functions for:
- Role validation
- Display information
- Role formatting for API
- Category grouping

## Backend Implementation

### User Model
Location: `wah4h-backend/accounts/models.py`

- Custom user model extending AbstractUser
- Email-based authentication (no username)
- Role field with predefined choices
- JWT token support

### API Endpoints

- `POST /accounts/register/` - User registration
- `POST /accounts/login/` - User authentication
- `POST /accounts/token/refresh/` - Token refresh

## Usage Examples

### Checking Module Access
```typescript
const { hasAccess } = useRole();

if (hasAccess('laboratory')) {
  // Show laboratory module
}
```

### Checking Modification Permission
```typescript
const { canModify } = useRole();

if (canModify('patient-records')) {
  // Allow editing patient records
}
```

### Role-Based Rendering
```typescript
const { currentRole, isAdmin } = useRole();

return (
  <>
    {isAdmin() && <AdminPanel />}
    {currentRole === 'doctor' && <DoctorTools />}
    {currentRole === 'nurse' && <NursingStation />}
  </>
);
```

## Best Practices

1. **Always check permissions** before rendering sensitive components
2. **Use RoleContext utilities** instead of direct role comparisons
3. **Validate on both frontend and backend** for security
4. **Log security violations** for audit trails
5. **Keep role definitions synchronized** between frontend and backend
6. **Document any role changes** in this file
7. **Test access control** for each role thoroughly

## Future Enhancements

- [ ] Fine-grained permissions at data level
- [ ] Temporary role delegation
- [ ] Audit logging for sensitive operations
- [ ] Multi-factor authentication
- [ ] Role-based data filtering
- [ ] Department-based access control

## Support

For questions or issues related to the role system, contact the development team or refer to:
- Technical Lead: [Contact Info]
- Security Officer: [Contact Info]

---

Last Updated: January 8, 2026
Version: 1.0
