/**
 * Role Utilities and Helper Functions
 * Provides validation, mapping, and display utilities for user roles
 */

import { UserRole, RoleLevel } from '@/contexts/RoleContext';

/**
 * Role display information for UI
 */
export interface RoleDisplayInfo {
  value: UserRole;
  label: string;
  description: string;
  category: string;
}

/**
 * All available roles with their display information
 * Aligned with Django backend ROLE_CHOICES
 */
export const ROLE_OPTIONS: RoleDisplayInfo[] = [
  {
    value: 'doctor',
    label: 'Doctor',
    description: 'Clinical care, diagnoses, and treatment decisions',
    category: 'Clinical Staff',
  },
  {
    value: 'nurse',
    label: 'Nurse',
    description: 'Patient care, monitoring, and medication administration',
    category: 'Clinical Staff',
  },
  {
    value: 'lab_technician',
    label: 'Laboratory Technician',
    description: 'Laboratory tests, specimen handling, and results',
    category: 'Technical Staff',
  },
  {
    value: 'pharmacist',
    label: 'Pharmacist',
    description: 'Medication dispensing and pharmaceutical management',
    category: 'Technical Staff',
  },
  {
    value: 'billing_clerk',
    label: 'Billing Clerk',
    description: 'Financial operations, invoicing, and insurance claims',
    category: 'Support Staff',
  },
];

/**
 * Get display information for a specific role
 */
export const getRoleDisplayInfo = (role: UserRole): RoleDisplayInfo | undefined => {
  return ROLE_OPTIONS.find((option) => option.value === role);
};

/**
 * Get role label for display
 */
export const getRoleLabel = (role: UserRole): string => {
  const info = getRoleDisplayInfo(role);
  return info ? info.label : role;
};

/**
 * Get role description
 */
export const getRoleDescription = (role: UserRole): string => {
  const info = getRoleDisplayInfo(role);
  return info ? info.description : '';
};

/**
 * Validate if a string is a valid UserRole
 */
export const isValidRole = (role: string): role is UserRole => {
  return ROLE_OPTIONS.some((option) => option.value === role);
};

/**
 * Get roles by category
 */
export const getRolesByCategory = (category: string): RoleDisplayInfo[] => {
  return ROLE_OPTIONS.filter((option) => option.category === category);
};

/**
 * Get all unique categories
 */
export const getRoleCategories = (): string[] => {
  return [...new Set(ROLE_OPTIONS.map((option) => option.category))];
};

/**
 * Role hierarchy comparison
 * Returns true if roleA has higher or equal level than roleB
 */
export const hasHigherOrEqualLevel = (
  roleA: UserRole,
  roleB: UserRole,
  roleHierarchy: Record<UserRole, RoleLevel>
): boolean => {
  return roleHierarchy[roleA] >= roleHierarchy[roleB];
};

/**
 * Format role for backend API (ensure consistency)
 */
export const formatRoleForAPI = (role: UserRole): string => {
  return role;
};

/**
 * Parse role from API response
 */
export const parseRoleFromAPI = (role: string): UserRole | null => {
  if (isValidRole(role)) {
    return role;
  }
  console.error(`Invalid role received from API: ${role}`);
  return null;
};
