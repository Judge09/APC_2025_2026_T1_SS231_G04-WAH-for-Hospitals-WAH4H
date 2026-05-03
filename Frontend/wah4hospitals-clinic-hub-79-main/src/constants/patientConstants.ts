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
  { value: 'A', label: 'Annulled' },
  { value: 'T', label: 'Domestic Partner / Live-in' },
];

export const MARITAL_STATUS_MAP: Record<string, string> = {
  S: 'Single',
  M: 'Married',
  D: 'Divorced',
  W: 'Widowed',
  L: 'Legally Separated',
  A: 'Annulled',
  T: 'Domestic Partner / Live-in',
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
  { value: 'Indian', label: 'Indian' },
  { value: 'British', label: 'British' },
  { value: 'Australian', label: 'Australian' },
  { value: 'Canadian', label: 'Canadian' },
  { value: 'Other', label: 'Other' },
];

// ============================================================================
// RACE / ETHNOLINGUISTIC OPTIONS (PHCore R4 — Philippine ethnic groups)
// ============================================================================
export const RACE_OPTIONS = [
  { value: 'Tagalog', label: 'Tagalog' },
  { value: 'Cebuano', label: 'Cebuano / Bisaya' },
  { value: 'Ilocano', label: 'Ilocano' },
  { value: 'Hiligaynon', label: 'Hiligaynon / Ilonggo' },
  { value: 'Bikol', label: 'Bikol' },
  { value: 'Waray', label: 'Waray' },
  { value: 'Kapampangan', label: 'Kapampangan' },
  { value: 'Pangasinense', label: 'Pangasinense' },
  { value: 'Maranao', label: 'Maranao' },
  { value: 'Maguindanao', label: 'Maguindanao' },
  { value: 'Tausug', label: 'Tausug' },
  { value: 'Igorot', label: 'Igorot' },
  { value: 'Lumad', label: 'Lumad' },
  { value: 'Aeta', label: 'Aeta / Agta / Negrito' },
  { value: 'Mangyan', label: 'Mangyan' },
  { value: 'T\'boli', label: "T'boli" },
  { value: 'Bajau', label: 'Bajau' },
  { value: 'Chinese-Filipino', label: 'Chinese-Filipino' },
  { value: 'Mixed', label: 'Mixed' },
  { value: 'Other', label: 'Other' },
];

// ============================================================================
// INDIGENOUS GROUP OPTIONS (Philippine ethnolinguistic groups)
// ============================================================================
export const INDIGENOUS_GROUP_OPTIONS = [
  { value: 'Aeta/Agta', label: 'Aeta / Agta / Negrito' },
  { value: 'Igorot', label: 'Igorot (Cordillera)' },
  { value: 'Kalinga', label: 'Kalinga' },
  { value: 'Bontoc', label: 'Bontoc' },
  { value: 'Ifugao', label: 'Ifugao' },
  { value: 'Benguet', label: 'Benguet / Kankanaey' },
  { value: 'Mangyan', label: 'Mangyan (Mindoro)' },
  { value: 'Palawan', label: 'Palawan (Tagbanwa/Batak)' },
  { value: 'Lumad', label: 'Lumad (Mindanao)' },
  { value: 'Maranao', label: 'Maranao' },
  { value: 'Maguindanao', label: 'Maguindanao' },
  { value: 'Tausug', label: 'Tausug' },
  { value: 'T\'boli', label: "T'boli" },
  { value: 'Bajau', label: 'Bajau / Sama' },
  { value: 'Blaan', label: "B'laan" },
  { value: 'Subanon', label: 'Subanon' },
  { value: 'Other', label: 'Other' },
];

// ============================================================================
// EDUCATION OPTIONS (PSCED — Philippine Standard Classification of Education)
// Values match _EDUCATION_CODE keys in wah4pc.py for FHIR PHCore coding
// ============================================================================
export const EDUCATION_OPTIONS = [
  { value: 'No Formal Education',            label: 'No Formal Education' },
  { value: 'Elementary (incomplete)',        label: 'Elementary — Incomplete' },
  { value: 'Elementary (complete)',          label: 'Elementary — Complete' },
  { value: 'Junior High School (incomplete)',label: 'Junior High School — Incomplete' },
  { value: 'Junior High School (complete)',  label: 'Junior High School — Complete' },
  { value: 'Senior High School',             label: 'Senior High School (K-12)' },
  { value: 'Vocational/Technical',           label: 'Vocational / Technical / TESDA' },
  { value: 'College (incomplete)',           label: 'College — Incomplete' },
  { value: 'College (complete)',             label: "College — Complete (Bachelor's Degree)" },
  { value: 'Post-Graduate (Master)',         label: "Post-Graduate — Master's Degree" },
  { value: 'Post-Graduate (Doctorate)',      label: 'Post-Graduate — Doctorate' },
];

// ============================================================================
// OCCUPATION OPTIONS (PSOC — Philippine Standard Occupational Classification)
// Values match _OCCUPATION_CODE keys in wah4pc.py; PSOC code shown in parens
// ============================================================================
export const OCCUPATION_OPTIONS = [
  { value: 'Healthcare Professional',  label: 'Healthcare Professional (PSOC 2)',       psoc: '2' },
  { value: 'Engineer/Architect',       label: 'Engineer / Architect (PSOC 2)',           psoc: '2' },
  { value: 'Teacher/Educator',         label: 'Teacher / Educator (PSOC 2)',             psoc: '2' },
  { value: 'Lawyer/Legal Professional',label: 'Lawyer / Legal Professional (PSOC 2)',    psoc: '2' },
  { value: 'Accountant/Finance',       label: 'Accountant / Finance Professional (PSOC 2)', psoc: '2' },
  { value: 'Business Owner',           label: 'Business Owner / Manager (PSOC 1)',       psoc: '1' },
  { value: 'Government Employee',      label: 'Government Employee (PSOC 2)',            psoc: '2' },
  { value: 'Technician',               label: 'Technician / Associate Professional (PSOC 3)', psoc: '3' },
  { value: 'Office/Clerical Worker',   label: 'Office / Clerical Worker (PSOC 4)',       psoc: '4' },
  { value: 'Sales/Service Worker',     label: 'Sales / Service Worker (PSOC 5)',         psoc: '5' },
  { value: 'Farmer/Fisherman',         label: 'Farmer / Fisherman (PSOC 6)',             psoc: '6' },
  { value: 'Driver/Transport',         label: 'Driver / Transport Worker (PSOC 8)',      psoc: '8' },
  { value: 'Laborer/Worker',           label: 'Laborer / Elementary Worker (PSOC 9)',    psoc: '9' },
  { value: 'Military/Police',          label: 'Military / Police / Armed Forces (PSOC 0)', psoc: '0' },
  { value: 'OFW',                      label: 'Overseas Filipino Worker (OFW)',          psoc: '2' },
  { value: 'Student',                  label: 'Student',                                 psoc: ''  },
  { value: 'Unemployed',               label: 'Unemployed',                              psoc: ''  },
  { value: 'Retired',                  label: 'Retired',                                 psoc: ''  },
  { value: 'Homemaker',                label: 'Homemaker',                               psoc: ''  },
  { value: 'Other',                    label: 'Other',                                   psoc: ''  },
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
// Values are display strings (used as FHIR Patient.contact.relationship display)
// Aligned with HL7 v3-RoleCode / v2-0131 — see wah4pc.py patient_to_fhir
// ============================================================================
export const CONTACT_RELATIONSHIP_OPTIONS = [
  { value: 'Spouse',            label: 'Spouse',                    fhirCode: 'SPO'     },
  { value: 'Parent',            label: 'Parent',                    fhirCode: 'PRN'     },
  { value: 'Child',             label: 'Child',                     fhirCode: 'CHILD'   },
  { value: 'Sibling',           label: 'Sibling',                   fhirCode: 'SIB'     },
  { value: 'Relative',          label: 'Relative / Family Member',  fhirCode: 'FAMMEMB' },
  { value: 'Friend',            label: 'Friend',                    fhirCode: 'FRND'    },
  { value: 'Guardian',          label: 'Guardian',                  fhirCode: 'GUARD'   },
  { value: 'Emergency Contact', label: 'Emergency Contact',         fhirCode: 'C'       },
  { value: 'Employer',          label: 'Employer',                  fhirCode: 'E'       },
  { value: 'Other',             label: 'Other',                     fhirCode: 'O'       },
];

// ============================================================================
// COUNTRY OPTIONS (ISO 3166-1 alpha-2)
// Used for patient address_country — FHIR requires ISO 3166-1 alpha-2 codes
// ============================================================================
export const COUNTRY_OPTIONS = [
  { value: 'PH', label: 'Philippines' },
  { value: 'US', label: 'United States' },
  { value: 'CN', label: 'China' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'IN', label: 'India' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SG', label: 'Singapore' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'ID', label: 'Indonesia' },
  { value: 'TH', label: 'Thailand' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'TW', label: 'Taiwan' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'OTHER', label: 'Other' },
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
