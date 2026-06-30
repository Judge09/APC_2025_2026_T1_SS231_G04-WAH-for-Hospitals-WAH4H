// ============================================================================
// GENDER TYPES
// ============================================================================
export type Gender = 'male' | 'female' | 'other' | 'unknown';

// ============================================================================
// BLOOD TYPES
// ============================================================================
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

// ============================================================================
// CIVIL STATUS / MARITAL STATUS
// ============================================================================
export type MaritalStatus = 'S' | 'M' | 'D' | 'W' | 'L';

// ============================================================================
// PWD TYPES
// ============================================================================
export type PWDType =
  | 'visual'
  | 'hearing'
  | 'mobility'
  | 'mental'
  | 'intellectual'
  | 'speech'
  | 'multiple'
  | 'other';

// ============================================================================
// PATIENT
// ============================================================================
export type Patient = {
  /** Django primary key */
  id: number;

  /** Hospital-generated ID */
  patient_id?: string;

  /** Name fields */
  first_name: string;
  last_name: string;
  middle_name?: string;
  suffix_name?: string;

  /** Demographics */
  gender?: Gender;
  birthdate?: string; // YYYY-MM-DD
  age?: number;
  civil_status?: MaritalStatus;
  nationality?: string;
  religion?: string;
  race?: string;

  /** Health Identifiers */
  philhealth_id?: string;
  blood_type?: BloodType;
  pwd_type?: PWDType;

  /** Socio-economic */
  occupation?: string;
  education?: string;

  /** Contact */
  mobile_number?: string;

  /** Address */
  address_line?: string;
  address_city?: string;
  address_district?: string;
  address_state?: string;
  address_country?: string;
  address_postal_code?: string;

  /** Emergency Contact */
  contact_first_name?: string;
  contact_last_name?: string;
  contact_mobile_number?: string;
  contact_relationship?: string;

  /** PWD & Indigenous */
  indigenous_flag?: boolean;
  indigenous_group?: string;

  /** Consent & Media */
  consent_flag?: boolean;
  image_url?: string | null;

  /** System */
  active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PatientFormData = {
  /** Optional for creation, required for updates */
  patient_id?: string;

  /** Name fields */
  first_name: string;
  last_name: string;
  middle_name?: string;
  suffix_name?: string;

  /** Demographics */
  gender?: Gender;
  birthdate?: string;
  civil_status?: MaritalStatus;
  nationality?: string;
  religion?: string;
  race?: string;

  /** Health Identifiers */
  philhealth_id?: string;
  blood_type?: BloodType;
  pwd_type?: PWDType;

  /** Socio-economic */
  occupation?: string;
  education?: string;

  /** Contact */
  mobile_number?: string;

  /** Address */
  address_line?: string;
  address_city?: string;
  address_district?: string;
  address_state?: string;
  address_country?: string;
  address_postal_code?: string;

  /** Emergency Contact */
  contact_first_name?: string;
  contact_last_name?: string;
  contact_mobile_number?: string;
  contact_relationship?: string;

  /** PWD & Indigenous */
  indigenous_flag?: boolean;
  indigenous_group?: string;

  /** Consent & Media */
  consent_flag?: boolean;
  image_url?: string;
};

// ============================================================================
// CONDITIONS
// ============================================================================

export interface Condition {
  condition_id: number;
  identifier?: string;
  clinical_status?: string;
  verification_status?: string;
  category?: string;
  severity?: string;
  code?: string;
  patient_id?: number;
  patient_identifier?: string;
  encounter_id?: number;
  body_site?: string;
  onset_datetime?: string;
  recorded_date?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// ALLERGIES
// ============================================================================

export interface Allergy {
  allergy_id: number;
  identifier?: string;
  clinical_status?: string;
  verification_status?: string;
  type?: string;
  category?: string;
  criticality?: string;
  code?: string;
  patient_id?: number;
  patient_identifier?: string;
  encounter_id?: number;
  reaction_description?: string;
  reaction_severity?: string;
  note?: string;
  onset_datetime?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// IMMUNIZATIONS
// ============================================================================

export interface Immunization {
  immunization_id: number;
  identifier?: string;
  status: string;
  vaccine_code?: string;
  vaccine_display?: string;
  patient_id?: number;
  patient_identifier?: string;
  encounter_id?: number;
  occurrence_datetime?: string;
  lot_number?: string;
  expiration_date?: string;
  site_code?: string;
  route_code?: string;
  dose_quantity_value?: string;
  dose_quantity_unit?: string;
  performer_name?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}
