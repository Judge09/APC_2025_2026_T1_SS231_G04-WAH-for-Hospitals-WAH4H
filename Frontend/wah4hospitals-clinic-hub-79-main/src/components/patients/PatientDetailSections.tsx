/**
 * Patient Detail Section Cards
 * Reusable card components for displaying patient information
 * Used in PatientDetailsModal with 6-card grid layout
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Phone,
  Briefcase,
  Heart,
  Users,
  Shield,
  LucideIcon,
  AlertCircle,
} from 'lucide-react';
import type { Patient } from '../../types/patient';
import {
  GENDER_MAP,
  BLOOD_TYPE_MAP,
  MARITAL_STATUS_MAP,
  PWD_TYPE_MAP,
} from '../../constants/patientConstants';

// ============================================================================
// GENERIC CARD WRAPPER & UTILITIES
// ============================================================================

interface DetailCardProps {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  children: React.ReactNode;
  badge?: string;
}

const DetailCard: React.FC<DetailCardProps> = ({
  title,
  icon: Icon,
  iconColor,
  children,
  badge,
}) => (
  <Card className="h-full">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
        {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
      </div>
    </CardHeader>
    <CardContent className="text-sm">{children}</CardContent>
  </Card>
);

interface DetailItemProps {
  label: string;
  value: string | number | null | undefined | boolean;
  className?: string;
  icon?: React.ReactNode;
}

const DetailItem: React.FC<DetailItemProps> = ({
  label,
  value,
  className = 'font-medium',
  icon,
}) => (
  <div className="space-y-1 pb-2 last:pb-0">
    <span className="text-gray-600 text-xs font-medium">{label}</span>
    <div className="flex items-center gap-2">
      {icon}
      <p className={className}>{formatValue(value)}</p>
    </div>
  </div>
);

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

// Utility: Calculate age
const calculateAge = (dob: string | undefined) => {
  if (!dob) return 'N/A';
  try {
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  } catch {
    return 'N/A';
  }
};

// Utility: Format full address
const formatAddress = (patient: Patient) => {
  const parts: string[] = [];
  if (patient.address_line) parts.push(patient.address_line);
  if (patient.address_city) parts.push(patient.address_city);
  if (patient.address_district) parts.push(patient.address_district);
  if (patient.address_state) parts.push(patient.address_state);
  return parts.join(', ') || 'N/A';
};

// ============================================================================
// CARD 1: PERSONAL INFORMATION
// ============================================================================
export const PersonalInfoCard: React.FC<{ patient: Patient }> = ({ patient }) => {
  const genderLabel = patient.gender ? GENDER_MAP[patient.gender] : 'N/A';
  const civilStatusLabel = patient.civil_status ? MARITAL_STATUS_MAP[patient.civil_status] : 'N/A';

  return (
    <DetailCard
      title="Personal Information"
      icon={Calendar}
      iconColor="text-blue-600"
      badge={genderLabel}
    >
      <div className="space-y-2">
        <DetailItem
          label="Full Name"
          value={`${patient.last_name}, ${patient.first_name} ${patient.middle_name ?? ''}`.trim()}
          className="font-semibold"
        />
        <DetailItem label="Date of Birth" value={patient.birthdate} />
        <DetailItem label="Age" value={`${calculateAge(patient.birthdate)} years`} />
        <DetailItem label="Civil Status" value={civilStatusLabel} />
        {patient.race && <DetailItem label="Race/Ethnicity" value={patient.race} />}
      </div>
    </DetailCard>
  );
};

// ============================================================================
// CARD 2: CONTACT INFORMATION
// ============================================================================
export const ContactInfoCard: React.FC<{ patient: Patient }> = ({ patient }) => (
  <DetailCard
    title="Contact Information"
    icon={Phone}
    iconColor="text-green-600"
  >
    <div className="space-y-2">
      <DetailItem label="Mobile Number" value={patient.mobile_number} />
      <DetailItem
        label="Address"
        value={formatAddress(patient)}
        className="text-xs"
      />
      {patient.address_postal_code && (
        <DetailItem label="Postal Code" value={patient.address_postal_code} />
      )}
      {patient.address_country && (
        <DetailItem label="Country" value={patient.address_country} />
      )}
    </div>
  </DetailCard>
);

// ============================================================================
// CARD 3: OCCUPATION & EDUCATION
// ============================================================================
export const OccupationCard: React.FC<{ patient: Patient }> = ({ patient }) => (
  <DetailCard
    title="Occupation & Education"
    icon={Briefcase}
    iconColor="text-purple-600"
  >
    <div className="space-y-2">
      <DetailItem label="Occupation" value={patient.occupation || 'Not specified'} />
      <DetailItem label="Education" value={patient.education || 'Not specified'} />
    </div>
  </DetailCard>
);

// ============================================================================
// CARD 4: HEALTH INSURANCE & IDENTIFIERS (NEW)
// ============================================================================
export const HealthInsuranceCard: React.FC<{ patient: Patient }> = ({
  patient,
}) => {
  const bloodTypeLabel = patient.blood_type
    ? BLOOD_TYPE_MAP[patient.blood_type]
    : 'N/A';

  return (
    <DetailCard
      title="Health Insurance & ID"
      icon={Heart}
      iconColor="text-red-600"
      badge={bloodTypeLabel}
    >
      <div className="space-y-2">
        <DetailItem
          label="PhilHealth ID"
          value={patient.philhealth_id || 'Not registered'}
          className="font-mono text-xs"
        />
        <DetailItem label="Blood Type" value={bloodTypeLabel} />
        {patient.nationality && (
          <DetailItem label="Nationality" value={patient.nationality} />
        )}
        {patient.religion && (
          <DetailItem label="Religion" value={patient.religion} />
        )}
      </div>
    </DetailCard>
  );
};

// ============================================================================
// CARD 5: EMERGENCY CONTACT (NEW)
// ============================================================================
export const EmergencyContactCard: React.FC<{ patient: Patient }> = ({
  patient,
}) => {
  const hasEmergencyContact =
    patient.contact_first_name || patient.contact_last_name;

  if (!hasEmergencyContact) {
    return (
      <DetailCard
        title="Emergency Contact"
        icon={Users}
        iconColor="text-orange-600"
      >
        <p className="text-gray-500 italic text-sm">No emergency contact provided</p>
      </DetailCard>
    );
  }

  return (
    <DetailCard
      title="Emergency Contact"
      icon={Users}
      iconColor="text-orange-600"
    >
      <div className="space-y-2">
        <DetailItem
          label="Name"
          value={`${patient.contact_first_name} ${patient.contact_last_name}`.trim()}
          className="font-semibold"
        />
        {patient.contact_relationship && (
          <DetailItem label="Relationship" value={patient.contact_relationship} />
        )}
        {patient.contact_mobile_number && (
          <DetailItem label="Mobile Number" value={patient.contact_mobile_number} />
        )}
      </div>
    </DetailCard>
  );
};

// ============================================================================
// CARD 6: PWD & INDIGENOUS STATUS (NEW)
// ============================================================================
export const PWDAndIndigenousCard: React.FC<{ patient: Patient }> = ({
  patient,
}) => {
  const pwdTypeLabel = patient.pwd_type ? PWD_TYPE_MAP[patient.pwd_type] : 'N/A';
  const hasPWDInfo = patient.pwd_type;
  const hasIndigenousInfo = patient.indigenous_flag && patient.indigenous_group;

  if (!hasPWDInfo && !hasIndigenousInfo) {
    return (
      <DetailCard
        title="Special Status"
        icon={Shield}
        iconColor="text-indigo-600"
      >
        <p className="text-gray-500 italic text-sm">
          No PWD or indigenous status registered
        </p>
      </DetailCard>
    );
  }

  return (
    <DetailCard
      title="Special Status"
      icon={Shield}
      iconColor="text-indigo-600"
      badge={hasPWDInfo ? 'PWD' : hasIndigenousInfo ? 'Indigenous' : undefined}
    >
      <div className="space-y-2">
        {hasPWDInfo && (
          <>
            <DetailItem label="PWD Status" value="Registered" />
            <DetailItem label="Disability Type" value={pwdTypeLabel} />
          </>
        )}
        {hasIndigenousInfo && (
          <>
            <DetailItem label="Indigenous Status" value="Yes" />
            <DetailItem label="Indigenous Group" value={patient.indigenous_group} />
          </>
        )}
        {patient.consent_flag && (
          <div className="flex items-center gap-1 mt-2 pt-2 border-t text-xs text-green-600">
            <AlertCircle className="w-4 h-4" />
            <span>Data Processing Consent Given</span>
          </div>
        )}
      </div>
    </DetailCard>
  );
};
