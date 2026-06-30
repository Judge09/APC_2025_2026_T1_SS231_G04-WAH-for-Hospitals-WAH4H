/**
 * Clinical Data Constants
 * Aligned with FHIR Standards (Condition, AllergyIntolerance, Immunization)
 */

// ============================================================================
// CONDITION CONSTANTS
// ============================================================================

export const CLINICAL_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'recurrence', label: 'Recurrence' },
  { value: 'relapse', label: 'Relapse' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'remission', label: 'Remission' },
  { value: 'resolved', label: 'Resolved' },
];

export const VERIFICATION_STATUS_OPTIONS = [
  { value: 'unconfirmed', label: 'Unconfirmed' },
  { value: 'provisional', label: 'Provisional' },
  { value: 'differential', label: 'Differential' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'refuted', label: 'Refuted' },
  { value: 'entered-in-error', label: 'Entered in Error' },
];

export const CONDITION_CATEGORY_OPTIONS = [
  { value: 'problem-list-item', label: 'Problem List Item' },
  { value: 'encounter-diagnosis', label: 'Encounter Diagnosis' },
  { value: 'health-concern', label: 'Health Concern' },
];

export const SEVERITY_OPTIONS = [
  { value: 'severe', label: 'Severe' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'mild', label: 'Mild' },
];

// Common ICD-10 Codes (Philippines)
export const COMMON_CONDITION_CODES = [
  { value: 'E11', label: 'E11 - Type 2 Diabetes Mellitus' },
  { value: 'I10', label: 'I10 - Essential Hypertension' },
  { value: 'J00', label: 'J00 - Acute Nasopharyngitis (Common Cold)' },
  { value: 'A09', label: 'A09 - Gastroenteritis' },
  { value: 'J18', label: 'J18 - Pneumonia' },
  { value: 'K21', label: 'K21 - Gastro-esophageal Reflux Disease' },
  { value: 'M54', label: 'M54 - Dorsalgia (Back Pain)' },
  { value: 'R51', label: 'R51 - Headache' },
];

// ============================================================================
// ALLERGY INTOLERANCE CONSTANTS
// ============================================================================

export const ALLERGY_TYPE_OPTIONS = [
  { value: 'allergy', label: 'Allergy' },
  { value: 'intolerance', label: 'Intolerance' },
];

export const ALLERGY_CATEGORY_OPTIONS = [
  { value: 'food', label: 'Food' },
  { value: 'medication', label: 'Medication' },
  { value: 'environment', label: 'Environment' },
  { value: 'biologic', label: 'Biologic' },
];

export const CRITICALITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
  { value: 'unable-to-assess', label: 'Unable to Assess' },
];

export const REACTION_SEVERITY_OPTIONS = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

export const EXPOSURE_ROUTE_OPTIONS = [
  { value: 'oral', label: 'Oral' },
  { value: 'intravenous', label: 'Intravenous' },
  { value: 'topical', label: 'Topical' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'subcutaneous', label: 'Subcutaneous' },
  { value: 'intramuscular', label: 'Intramuscular' },
];

// Common Allergens (Philippines)
export const COMMON_ALLERGENS = [
  { value: 'peanut', label: 'Peanut' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'penicillin', label: 'Penicillin' },
  { value: 'aspirin', label: 'Aspirin' },
  { value: 'nsaid', label: 'NSAIDs' },
  { value: 'egg', label: 'Egg' },
  { value: 'milk', label: 'Milk' },
  { value: 'dust', label: 'Dust' },
  { value: 'pollen', label: 'Pollen' },
  { value: 'latex', label: 'Latex' },
];

// ============================================================================
// IMMUNIZATION CONSTANTS
// ============================================================================

export const IMMUNIZATION_STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'entered-in-error', label: 'Entered in Error' },
  { value: 'not-done', label: 'Not Done' },
];

export const STATUS_REASON_OPTIONS = [
  { value: 'immunity', label: 'Immunity' },
  { value: 'medical-precaution', label: 'Medical Precaution' },
  { value: 'product-out-of-stock', label: 'Product Out of Stock' },
  { value: 'patient-objection', label: 'Patient Objection' },
];

export const VACCINE_SITE_OPTIONS = [
  { value: 'LA', label: 'Left Arm' },
  { value: 'RA', label: 'Right Arm' },
  { value: 'LT', label: 'Left Thigh' },
  { value: 'RT', label: 'Right Thigh' },
  { value: 'LD', label: 'Left Deltoid' },
  { value: 'RD', label: 'Right Deltoid' },
];

export const VACCINE_ROUTE_OPTIONS = [
  { value: 'IM', label: 'Intramuscular' },
  { value: 'SC', label: 'Subcutaneous' },
  { value: 'ID', label: 'Intradermal' },
  { value: 'PO', label: 'Oral' },
  { value: 'NASINHL', label: 'Nasal Inhalation' },
];

// Philippines EPI Vaccines (Expanded Program on Immunization)
export const COMMON_VACCINES = [
  { value: 'BCG', label: 'BCG - Bacillus Calmette-Guérin' },
  { value: 'HepB', label: 'Hepatitis B' },
  { value: 'DPT', label: 'DPT - Diphtheria, Pertussis, Tetanus' },
  { value: 'OPV', label: 'OPV - Oral Polio Vaccine' },
  { value: 'IPV', label: 'IPV - Inactivated Polio Vaccine' },
  { value: 'Hib', label: 'Hib - Haemophilus Influenzae type B' },
  { value: 'PCV', label: 'PCV - Pneumococcal Conjugate Vaccine' },
  { value: 'MMR', label: 'MMR - Measles, Mumps, Rubella' },
  { value: 'Varicella', label: 'Varicella (Chickenpox)' },
  { value: 'Influenza', label: 'Influenza (Flu)' },
  { value: 'COVID-19', label: 'COVID-19 Vaccine' },
  { value: 'Rabies', label: 'Rabies' },
  { value: 'TT', label: 'Tetanus Toxoid' },
];

export const DOSE_UNIT_OPTIONS = [
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'mcg', label: 'Micrograms (mcg)' },
  { value: 'mg', label: 'Milligrams (mg)' },
  { value: 'IU', label: 'International Units (IU)' },
];

export const FUNDING_SOURCE_OPTIONS = [
  { value: 'private', label: 'Private' },
  { value: 'public', label: 'Public/Government' },
];
