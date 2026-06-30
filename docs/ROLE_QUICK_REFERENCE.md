# Role System Quick Reference

## Available Roles

| Role | Backend Key | Level | Category |
|------|-------------|-------|----------|
| System Administrator | `admin` | 4 | Administrative |
| Doctor | `doctor` | 3 | Clinical |
| Nurse | `nurse` | 3 | Clinical |
| Lab Technician | `lab_technician` | 2 | Technical |
| Pharmacist | `pharmacist` | 2 | Technical |
| Billing Clerk | `billing_clerk` | 1 | Support |

## Module Access Matrix

| Module | Admin | Doctor | Nurse | Lab Tech | Pharmacist | Billing |
|--------|:-----:|:------:|:-----:|:--------:|:----------:|:-------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Patients | ✅ | ✅ | ✅ | Limited | Limited | Limited |
| Admission | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Laboratory | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Monitoring | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Discharge | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Pharmacy | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Inventory | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Appointments | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Billing | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| PhilHealth | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Compliance | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| ERP | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Statistics | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Common Use Cases

### Register New User
```typescript
import { useAuth } from '@/contexts/AuthContext';

const { register } = useAuth();

await register({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@hospital.com',
  password: 'securePassword123',
  confirmPassword: 'securePassword123',
  role: 'doctor', // Use exact backend key
});
```

### Check Access to Module
```typescript
import { useRole } from '@/contexts/RoleContext';

const { hasAccess } = useRole();

if (hasAccess('laboratory')) {
  // Render laboratory module
}
```

### Check Modification Permission
```typescript
import { useRole } from '@/contexts/RoleContext';

const { canModify } = useRole();

if (canModify('patient-records')) {
  // Show edit buttons
}
```

### Get Current User Role
```typescript
import { useRole } from '@/contexts/RoleContext';

const { currentRole, roleLevel } = useRole();

console.log(`Current role: ${currentRole}, Level: ${roleLevel}`);
```

### Check if User is Admin
```typescript
import { useRole } from '@/contexts/RoleContext';

const { isAdmin } = useRole();

if (isAdmin()) {
  // Show admin-only features
}
```

## Role-Based Workflows

### Doctor Workflow
1. Login → Dashboard (view patient alerts)
2. Patients → Access medical records
3. Admission → Admit new patients
4. Laboratory → Order tests, review results
5. Monitoring → Track patient progress
6. Discharge → Discharge patients with summary

### Nurse Workflow
1. Login → Dashboard (view assignments)
2. Patients → Access care information
3. Monitoring → Record vital signs
4. Pharmacy → View medication orders
5. Inventory → Manage supplies
6. Admission → Assist with intake

### Lab Technician Workflow
1. Login → Dashboard (view pending orders)
2. Laboratory → Process tests, enter results
3. Monitoring → Check patient status
4. Compliance → Quality control checks

### Pharmacist Workflow
1. Login → Dashboard (view medication orders)
2. Pharmacy → Dispense medications
3. Inventory → Manage drug stock
4. Patients → Check allergies and history
5. Compliance → Drug regulations

### Billing Clerk Workflow
1. Login → Dashboard (view billing summaries)
2. Billing → Create invoices, process payments
3. PhilHealth → File insurance claims
4. ERP → Financial reporting
5. Patients → Access billing information

## Important Notes

⚠️ **Security Notes:**
- Roles are determined by backend authentication
- Cannot manually switch roles (security measure)
- Admin mode requires admin role
- All API calls include authentication tokens
- Tokens automatically refresh on expiration

⚠️ **Backend Alignment:**
- Always use exact backend role keys
- Frontend roles MUST match Django ROLE_CHOICES
- Current roles: `admin`, `doctor`, `nurse`, `lab_technician`, `pharmacist`, `billing_clerk`

⚠️ **Development:**
- Test all role permissions thoroughly
- Update both frontend and backend when adding roles
- Keep documentation synchronized
- Log security-related events

## Troubleshooting

### User Can't Access Module
1. Check role assignment in database
2. Verify `roleAccessConfig` in RoleContext.tsx
3. Check if using `hasAccess()` utility
4. Verify authentication token is valid

### Role Not Showing in Register
1. Check ROLE_OPTIONS in roleUtils.ts
2. Verify backend ROLE_CHOICES includes role
3. Check Register.tsx imports roleUtils

### Login Issues
1. Verify credentials are correct
2. Check backend is running
3. Verify API_BASE_URL is configured
4. Check browser console for errors

## File Locations

- **RoleContext:** `Frontend/src/contexts/RoleContext.tsx`
- **AuthContext:** `Frontend/src/contexts/AuthContext.tsx`
- **Role Utils:** `Frontend/src/lib/roleUtils.ts`
- **Backend Models:** `wah4h-backend/accounts/models.py`
- **Backend Serializers:** `wah4h-backend/accounts/serializers.py`
- **Backend Views:** `wah4h-backend/accounts/views.py`

## Support

For technical issues, refer to:
- [Full Documentation](./ROLE_SYSTEM_DOCUMENTATION.md)
- Project README
- Development team
