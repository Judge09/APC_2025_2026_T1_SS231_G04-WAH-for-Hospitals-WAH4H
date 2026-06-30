import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

/**
 * User Roles - Strictly aligned with Django backend ROLE_CHOICES
 * Source: wah4h-backend/accounts/models.py
 */
export type UserRole =
  | 'doctor'          // Doctor - Clinical care and medical decisions
  | 'nurse'           // Nurse - Patient care and monitoring
  | 'lab_technician'  // Lab Technician - Laboratory tests and results
  | 'pharmacist'      // Pharmacist - Medication dispensing and management
  | 'billing_clerk';  // Billing Clerk - Financial and billing operations

/**
 * Role hierarchy levels for permission management
 */
export enum RoleLevel {
  CLINICAL = 3,     // Clinical staff (doctors, nurses)
  TECHNICAL = 2,    // Technical staff (lab, pharmacy)
  SUPPORT = 1,      // Support staff (billing)
}

export interface RoleContextType {
  currentRole: UserRole;
  availableTabs: string[];
  roleLevel: RoleLevel;
  setCurrentRole: (role: UserRole) => void;
  hasAccess: (module: string) => boolean;
  canModify: (resourceType: string) => boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
};

/**
 * Role hierarchy mapping for permission levels
 */
const roleHierarchy: Record<UserRole, RoleLevel> = {
  doctor: RoleLevel.CLINICAL,
  nurse: RoleLevel.CLINICAL,
  lab_technician: RoleLevel.TECHNICAL,
  pharmacist: RoleLevel.TECHNICAL,
  billing_clerk: RoleLevel.SUPPORT,
};

/**
 * Role-based Module Access Configuration
 * Based on real-world hospital departmental responsibilities and workflows
 * 
 * Dashboard: Overview and analytics
 * Patients: Patient records and information
 * Admission: Patient admission and registration
 * Laboratory: Lab tests and results
 * Monitoring: Vital signs and patient monitoring
 * Discharge: Patient discharge process
 * Pharmacy: Medication management and dispensing
 * Inventory: Stock and supplies management
 * Appointments: Scheduling and appointment management
 * Billing: Financial transactions and billing
 * Philhealth: Insurance and PhilHealth claims
 * Compliance: Regulatory compliance and reporting
 * ERP: Enterprise resource planning
 * Statistics: Analytics and reporting
 * Settings: User preferences and system configuration
 */
const roleAccessConfig: Record<UserRole, string[]> = {
  // ========== DOCTOR: Clinical care and medical decisions ==========
  // Doctors need access to patient care, diagnostics, treatment, and discharge
  doctor: [
    'dashboard',      // View patient statistics and alerts
    'patients',       // Access patient medical records
    'admission',      // Admit patients and create care plans
    'laboratory',     // Order and review lab tests
    'monitoring',     // Monitor patient vital signs and progress
    'discharge',      // Discharge patients and create discharge summaries
    'discharge',      // Discharge patients and create discharge summaries
    'settings',       // Personal settings
  ],

  // ========== NURSE: Patient care coordination and monitoring ==========
  // Nurses handle direct patient care, medication administration, and monitoring
  nurse: [
    'dashboard',      // View patient assignments and alerts
    'patients',       // Access patient records for care delivery
    'admission',      // Assist with patient intake and documentation
    'monitoring',     // Record vital signs and patient observations
    'laboratory',     // View lab results for patient care
    'pharmacy',       // View medication orders for administration
    'inventory',      // Manage medical supplies and equipment
    'settings',       // Personal settings
  ],

  // ========== LAB TECHNICIAN: Laboratory operations ==========
  // Lab technicians perform tests, manage specimens, and report results
  lab_technician: [
    'dashboard',      // View pending lab orders
    'laboratory',     // Process lab tests and enter results
    'monitoring',     // View patient status for test prioritization
    'patients',       // Limited access to verify patient information
    'compliance',     // Quality control and regulatory compliance
    'settings',       // Personal settings
  ],

  // ========== PHARMACIST: Medication management ==========
  // Pharmacists dispense medications, check interactions, and manage inventory
  pharmacist: [
    'dashboard',      // View medication orders and alerts
    'pharmacy',       // Dispense medications and verify prescriptions
    'inventory',      // Manage pharmaceutical inventory
    'patients',       // Access patient allergies and medication history
    'compliance',     // Drug regulatory compliance
    'settings',       // Personal settings
  ],

  // ========== BILLING CLERK: Financial operations ==========
  // Billing clerks handle invoicing, payments, and insurance claims
  billing_clerk: [
    'dashboard',      // View billing summaries and pending claims
    'billing',        // Create and manage invoices
    'billing',        // Create and manage invoices
    'patients',       // Access patient information for billing
    'settings',       // Personal settings
  ],
};

/**
 * Resource modification permissions by role
 * Defines what types of data each role can create, edit, or delete
 */
const modificationPermissions: Record<UserRole, string[]> = {

  doctor: [
    'patient-records',
    'diagnoses',
    'treatments',
    'prescriptions',
    'lab-orders',
    'discharge-summary',
    'medical-notes',
  ],
  
  nurse: [
    'vital-signs',
    'nursing-notes',
    'medication-administration',
    'patient-care-logs',
    'inventory-usage',
  ],
  
  lab_technician: [
    'lab-results',
    'specimen-tracking',
    'test-reports',
  ],
  
  pharmacist: [
    'medication-dispensing',
    'pharmacy-inventory',
    'prescription-verification',
    'drug-interactions',
  ],
  
  billing_clerk: [
    'invoices',
    'payments',
    'insurance-claims',
    'billing-records',
  ],
};

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const { user } = useAuth();

  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('userRole') as UserRole | null;
    return (savedRole || (user?.role as UserRole) || 'billing_clerk');
  });

  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [roleLevel, setRoleLevel] = useState<RoleLevel>(RoleLevel.SUPPORT);

  // Sync role with authenticated user
  useEffect(() => {
    if (user?.role) {
      const userRole = user.role as UserRole;
      setCurrentRoleState(userRole);
      localStorage.setItem('userRole', userRole);
      setRoleLevel(roleHierarchy[userRole] || RoleLevel.SUPPORT);
    } else {
      // Reset to minimal access when no authenticated user
      setCurrentRoleState('billing_clerk');
      setRoleLevel(RoleLevel.SUPPORT);
    }
  }, [user]);

  // Update available tabs based on role
  useEffect(() => {
    setAvailableTabs(roleAccessConfig[currentRole] || []);
  }, [currentRole]);

  /**
   * Check if current role has access to a specific module
   */
  const hasAccess = (module: string): boolean => {
    return availableTabs.includes(module);
  };

  /**
   * Check if current role can modify a specific resource type
   */
  const canModify = (resourceType: string): boolean => {
    const permissions = modificationPermissions[currentRole] || [];
    return permissions.includes(resourceType);
  };

  /**
   * Set current role (security: prevents unauthorized role switching)
   */
  const setCurrentRole = (role: UserRole) => {
    // Role is dictated by authentication; prevent manual override
    if (user?.role && role !== user.role) {
      console.error('Security violation: Role is determined by authentication.');
      return;
    }
    setCurrentRoleState(role);
    localStorage.setItem('userRole', role);
    setRoleLevel(roleHierarchy[role] || RoleLevel.SUPPORT);
  };

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        availableTabs,
        roleLevel,
        setCurrentRole,
        hasAccess,
        canModify,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export default RoleProvider;
