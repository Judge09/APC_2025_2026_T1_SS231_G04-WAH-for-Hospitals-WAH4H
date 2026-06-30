/**
 * Patient Registration Constants
 * Aligned with Philippine LGU requirements and PHCORE Data Dictionary
 */

// ============================================================================
// GENDER OPTIONS
// ============================================================================
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
];

export const GENDER_MAP: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  unknown: 'Unknown',
  M: 'Male',
  F: 'Female',
};

// ============================================================================
// BLOOD TYPE OPTIONS
// ============================================================================
export const BLOOD_TYPE_OPTIONS = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

export const BLOOD_TYPE_MAP: Record<string, string> = {
  'A+': 'A+', 'A-': 'A-', 'B+': 'B+', 'B-': 'B-',
  'AB+': 'AB+', 'AB-': 'AB-', 'O+': 'O+', 'O-': 'O-',
};

// ============================================================================
// MARITAL STATUS / CIVIL STATUS OPTIONS
// ============================================================================
export const MARITAL_STATUS_OPTIONS = [
  { value: 'S', label: 'Single' },
  { value: 'M', label: 'Married' },
  { value: 'D', label: 'Divorced' },
  { value: 'W', label: 'Widowed' },
  { value: 'L', label: 'Legally Separated' },
];

export const MARITAL_STATUS_MAP: Record<string, string> = {
  S: 'Single',
  M: 'Married',
  D: 'Divorced',
  W: 'Widowed',
  L: 'Legally Separated',
};

// ============================================================================
// PWD TYPE OPTIONS
// ============================================================================
export const PWD_TYPE_OPTIONS = [
  { value: 'visual', label: 'Visual Disability' },
  { value: 'hearing', label: 'Hearing Disability' },
  { value: 'mobility', label: 'Mobility Disability' },
  { value: 'mental', label: 'Mental Disability' },
  { value: 'intellectual', label: 'Intellectual Disability' },
  { value: 'speech', label: 'Speech Disability' },
  { value: 'multiple', label: 'Multiple Disabilities' },
  { value: 'other', label: 'Other' },
];

export const PWD_TYPE_MAP: Record<string, string> = {
  visual: 'Visual Disability', hearing: 'Hearing Disability',
  mobility: 'Mobility Disability', mental: 'Mental Disability',
  intellectual: 'Intellectual Disability', speech: 'Speech Disability',
  multiple: 'Multiple Disabilities', other: 'Other',
};

// ============================================================================
// NATIONALITY OPTIONS (Common)
// ============================================================================
export const NATIONALITY_OPTIONS = [
  { value: 'Filipino', label: 'Filipino' },
  { value: 'American', label: 'American' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Other', label: 'Other' },
];

// ============================================================================
// RELIGION OPTIONS (Philippine Common Religions)
// ============================================================================
export const RELIGION_OPTIONS = [
  { value: 'Roman Catholic', label: 'Roman Catholic' },
  { value: 'Islam', label: 'Islam' },
  { value: 'Iglesia ni Cristo', label: 'Iglesia ni Cristo' },
  { value: 'Protestant', label: 'Protestant' },
  { value: 'Born Again Christian', label: 'Born Again Christian' },
  { value: 'Baptist', label: 'Baptist' },
  { value: 'Seventh-day Adventist', label: 'Seventh-day Adventist' },
  { value: 'Aglipayan', label: 'Aglipayan' },
  { value: 'Buddhism', label: 'Buddhism' },
  { value: 'Hinduism', label: 'Hinduism' },
  { value: 'None', label: 'None' },
  { value: 'Other', label: 'Other' },
];

// ============================================================================
// CONTACT RELATIONSHIP OPTIONS
// ============================================================================
export const CONTACT_RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'relative', label: 'Relative' },
  { value: 'friend', label: 'Friend' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
];

// ============================================================================
// REGISTRATION STEPS (4-Step Wizard)
// ============================================================================
export const REGISTRATION_STEPS = [
  {
    step: 1,
    title: 'Basic Info',
    description: 'Name, birthdate, gender, civil status, blood type, PWD, indigenous status',
  },
  {
    step: 2,
    title: 'Contact & Address',
    description: 'Mobile number, PSGC-compliant address',
  },
  {
    step: 3,
    title: 'Emergency Contact',
    description: 'Emergency contact name, number, and relationship',
  },
  {
    step: 4,
    title: 'Additional Info',
    description: 'Nationality, religion, occupation, education, PhilHealth, consent',
  },
];
