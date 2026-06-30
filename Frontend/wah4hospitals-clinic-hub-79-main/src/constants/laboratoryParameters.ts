/**
 * Laboratory Test Parameters
 * Predefined parameters for each test type based on real-life clinical laboratory standards
 */

export interface LabParameterTemplate {
  parameter_name: string;
  unit: string;
  reference_range: string;
}

export const LAB_PARAMETERS: Record<string, LabParameterTemplate[]> = {
  cbc: [
    { parameter_name: 'Hemoglobin', unit: 'g/dL', reference_range: 'M: 13.5-17.5, F: 12.0-15.5' },
    { parameter_name: 'Hematocrit', unit: '%', reference_range: 'M: 39-49, F: 36-44' },
    { parameter_name: 'Red Blood Cell Count', unit: 'x10¹²/L', reference_range: 'M: 4.5-5.5, F: 4.0-5.0' },
    { parameter_name: 'White Blood Cell Count', unit: 'x10⁹/L', reference_range: '4.0-11.0' },
    { parameter_name: 'Platelet Count', unit: 'x10⁹/L', reference_range: '150-400' },
    { parameter_name: 'MCV (Mean Corpuscular Volume)', unit: 'fL', reference_range: '80-100' },
    { parameter_name: 'MCH (Mean Corpuscular Hemoglobin)', unit: 'pg', reference_range: '27-32' },
    { parameter_name: 'MCHC (Mean Corpuscular Hb Concentration)', unit: 'g/dL', reference_range: '32-36' },
    { parameter_name: 'Neutrophils', unit: '%', reference_range: '40-70' },
    { parameter_name: 'Lymphocytes', unit: '%', reference_range: '20-40' },
    { parameter_name: 'Monocytes', unit: '%', reference_range: '2-8' },
    { parameter_name: 'Eosinophils', unit: '%', reference_range: '1-4' },
    { parameter_name: 'Basophils', unit: '%', reference_range: '0-1' },
  ],

  urinalysis: [
    { parameter_name: 'Color', unit: '', reference_range: 'Yellow to Amber' },
    { parameter_name: 'Appearance', unit: '', reference_range: 'Clear' },
    { parameter_name: 'pH', unit: '', reference_range: '4.5-8.0' },
    { parameter_name: 'Specific Gravity', unit: '', reference_range: '1.005-1.030' },
    { parameter_name: 'Protein', unit: '', reference_range: 'Negative' },
    { parameter_name: 'Glucose', unit: '', reference_range: 'Negative' },
    { parameter_name: 'Ketones', unit: '', reference_range: 'Negative' },
    { parameter_name: 'Blood', unit: '', reference_range: 'Negative' },
    { parameter_name: 'Bilirubin', unit: '', reference_range: 'Negative' },
    { parameter_name: 'Urobilinogen', unit: '', reference_range: 'Normal' },
    { parameter_name: 'Nitrite', unit: '', reference_range: 'Negative' },
    { parameter_name: 'Leukocyte Esterase', unit: '', reference_range: 'Negative' },
    { parameter_name: 'WBC', unit: '/HPF', reference_range: '0-5' },
    { parameter_name: 'RBC', unit: '/HPF', reference_range: '0-3' },
    { parameter_name: 'Epithelial Cells', unit: '/HPF', reference_range: 'Few' },
    { parameter_name: 'Bacteria', unit: '', reference_range: 'None to Few' },
    { parameter_name: 'Casts', unit: '', reference_range: 'None' },
    { parameter_name: 'Crystals', unit: '', reference_range: 'None to Few' },
  ],

  fecalysis: [
    { parameter_name: 'Color', unit: '', reference_range: 'Brown' },
    { parameter_name: 'Consistency', unit: '', reference_range: 'Formed' },
    { parameter_name: 'pH', unit: '', reference_range: '7.0-7.5' },
    { parameter_name: 'Occult Blood', unit: '', reference_range: 'Negative' },
    { parameter_name: 'RBC', unit: '/HPF', reference_range: 'None' },
    { parameter_name: 'WBC', unit: '/HPF', reference_range: '0-2' },
    { parameter_name: 'Bacteria', unit: '', reference_range: 'Few to Moderate' },
    { parameter_name: 'Fat Globules', unit: '', reference_range: 'None' },
    { parameter_name: 'Parasites (Ova)', unit: '', reference_range: 'None Seen' },
    { parameter_name: 'Parasites (Cyst)', unit: '', reference_range: 'None Seen' },
    { parameter_name: 'Parasites (Trophozoites)', unit: '', reference_range: 'None Seen' },
  ],

  blood_chemistry: [
    { parameter_name: 'Fasting Blood Sugar (FBS)', unit: 'mg/dL', reference_range: '70-100' },
    { parameter_name: 'Random Blood Sugar (RBS)', unit: 'mg/dL', reference_range: '70-140' },
    { parameter_name: 'HbA1c', unit: '%', reference_range: '<5.7' },
    { parameter_name: 'Total Cholesterol', unit: 'mg/dL', reference_range: '<200' },
    { parameter_name: 'Triglycerides', unit: 'mg/dL', reference_range: '<150' },
    { parameter_name: 'HDL Cholesterol', unit: 'mg/dL', reference_range: 'M: >40, F: >50' },
    { parameter_name: 'LDL Cholesterol', unit: 'mg/dL', reference_range: '<100' },
    { parameter_name: 'Creatinine', unit: 'mg/dL', reference_range: 'M: 0.7-1.3, F: 0.6-1.1' },
    { parameter_name: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', reference_range: '7-20' },
    { parameter_name: 'Uric Acid', unit: 'mg/dL', reference_range: 'M: 3.5-7.2, F: 2.6-6.0' },
    { parameter_name: 'SGPT (ALT)', unit: 'U/L', reference_range: '7-56' },
    { parameter_name: 'SGOT (AST)', unit: 'U/L', reference_range: '10-40' },
    { parameter_name: 'Alkaline Phosphatase', unit: 'U/L', reference_range: '44-147' },
    { parameter_name: 'Total Bilirubin', unit: 'mg/dL', reference_range: '0.3-1.2' },
    { parameter_name: 'Direct Bilirubin', unit: 'mg/dL', reference_range: '0.0-0.3' },
    { parameter_name: 'Indirect Bilirubin', unit: 'mg/dL', reference_range: '0.2-0.8' },
    { parameter_name: 'Total Protein', unit: 'g/dL', reference_range: '6.0-8.0' },
    { parameter_name: 'Albumin', unit: 'g/dL', reference_range: '3.5-5.0' },
    { parameter_name: 'Globulin', unit: 'g/dL', reference_range: '2.0-3.5' },
    { parameter_name: 'Sodium (Na)', unit: 'mmol/L', reference_range: '136-145' },
    { parameter_name: 'Potassium (K)', unit: 'mmol/L', reference_range: '3.5-5.1' },
    { parameter_name: 'Chloride (Cl)', unit: 'mmol/L', reference_range: '98-107' },
  ],
};

/**
 * Get parameter templates for a specific test type
 */
export const getParametersForTestType = (testType: string): LabParameterTemplate[] => {
  return LAB_PARAMETERS[testType] || [];
};

/**
 * Get test type display name
 */
export const TEST_TYPE_NAMES: Record<string, string> = {
  cbc: 'Complete Blood Count (CBC)',
  urinalysis: 'Urinalysis',
  fecalysis: 'Fecalysis',
  blood_chemistry: 'Blood Chemistry',
  lipid_panel: 'Lipid Panel',
};
