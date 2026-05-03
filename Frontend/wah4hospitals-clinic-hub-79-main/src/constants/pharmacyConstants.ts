/**
 * Pharmacy / Medication Constants
 * Aligned with FHIR R4, SNOMED CT (dose form), WHO ATC (category), and UCUM (units)
 */

// ============================================================================
// MEDICATION DOSE FORM (SNOMED CT / EDQM Standard Terms)
// Source: SNOMED CT pharmaceutical dose form hierarchy
// ============================================================================
export const MEDICATION_FORM_OPTIONS = [
  // Solid oral
  { value: 'Tablet',            label: 'Tablet',                    snomed: '385055001' },
  { value: 'Capsule',           label: 'Capsule',                   snomed: '385049006' },
  { value: 'Chewable Tablet',   label: 'Chewable Tablet',           snomed: '66076007'  },
  { value: 'Effervescent Tablet',label: 'Effervescent Tablet',      snomed: '764780005' },
  { value: 'Sublingual Tablet', label: 'Sublingual Tablet',         snomed: '385060000' },
  { value: 'Powder',            label: 'Powder for Reconstitution', snomed: '420699003' },
  // Liquid oral
  { value: 'Syrup',             label: 'Oral Syrup',                snomed: '385023001' },
  { value: 'Suspension',        label: 'Oral Suspension',           snomed: '47625008'  },
  { value: 'Solution',          label: 'Oral Solution',             snomed: '385024007' },
  { value: 'Drops',             label: 'Oral Drops',                snomed: '421886006' },
  // Parenteral
  { value: 'Injection',         label: 'Solution for Injection',    snomed: '385219001' },
  { value: 'IV Infusion',       label: 'IV Infusion Solution',      snomed: '385229008' },
  // Topical
  { value: 'Cream',             label: 'Cream',                     snomed: '385099005' },
  { value: 'Ointment',          label: 'Ointment',                  snomed: '385101003' },
  { value: 'Gel',               label: 'Gel',                       snomed: '385100002' },
  { value: 'Patch',             label: 'Transdermal Patch',         snomed: '36875001'  },
  // Inhalation
  { value: 'Inhaler',           label: 'Pressurised Inhalation',    snomed: '385111005' },
  { value: 'Nebuliser Solution',label: 'Nebuliser Solution',        snomed: '385122003' },
  // Ophthalmic / otic
  { value: 'Eye Drops',         label: 'Eye Drops',                 snomed: '385125001' },
  { value: 'Ear Drops',         label: 'Ear Drops',                 snomed: '385136004' },
  // Rectal / vaginal
  { value: 'Suppository',       label: 'Suppository',               snomed: '385194003' },
  { value: 'Vaginal Cream',     label: 'Vaginal Cream',             snomed: '385198000' },
];

// ============================================================================
// MEDICATION CATEGORY (WHO ATC first-level + common pharmacy categories)
// Source: WHO Anatomical Therapeutic Chemical (ATC) classification
// ============================================================================
export const MEDICATION_CATEGORY_OPTIONS = [
  { value: 'Analgesic/Antipyretic',       label: 'Analgesic / Antipyretic',         atc: 'N02' },
  { value: 'Antibiotic',                  label: 'Antibiotic / Antimicrobial',       atc: 'J01' },
  { value: 'Antifungal',                  label: 'Antifungal',                       atc: 'J02' },
  { value: 'Antiviral',                   label: 'Antiviral',                        atc: 'J05' },
  { value: 'Antiparasitic',               label: 'Antiparasitic / Antiprotozoal',    atc: 'P01' },
  { value: 'Antihypertensive',            label: 'Antihypertensive (Cardiovascular)',atc: 'C02' },
  { value: 'Antidiabetic',                label: 'Antidiabetic',                     atc: 'A10' },
  { value: 'Anticoagulant',               label: 'Anticoagulant / Antiplatelet',     atc: 'B01' },
  { value: 'Respiratory',                 label: 'Respiratory (Bronchodilator/Corticosteroid)', atc: 'R03' },
  { value: 'Gastrointestinal',            label: 'Gastrointestinal',                 atc: 'A02' },
  { value: 'Diuretic',                    label: 'Diuretic',                         atc: 'C03' },
  { value: 'Psychotropic',                label: 'Psychotropic / CNS',               atc: 'N05' },
  { value: 'Anticonvulsant',              label: 'Anticonvulsant / Antiepileptic',   atc: 'N03' },
  { value: 'Vitamin/Supplement',          label: 'Vitamin / Dietary Supplement',     atc: 'A11' },
  { value: 'Vaccine',                     label: 'Vaccine / Immunological',          atc: 'J07' },
  { value: 'Hormone',                     label: 'Hormone Preparation',              atc: 'H01' },
  { value: 'Topical/Dermatological',      label: 'Topical / Dermatological',         atc: 'D'   },
  { value: 'Ophthalmological',            label: 'Ophthalmological',                 atc: 'S01' },
  { value: 'Electrolyte/IV Fluid',        label: 'Electrolyte / IV Fluid',           atc: 'B05' },
  { value: 'Medical Supply',              label: 'Medical Supply (Non-drug)',         atc: ''    },
  { value: 'Other',                       label: 'Other',                            atc: ''    },
];

// ============================================================================
// UNIT OF MEASURE (UCUM — Unified Code for Units of Measure)
// Source: http://unitsofmeasure.org / FHIR Medication.amount
// ============================================================================
export const UNIT_OF_MEASURE_OPTIONS = [
  // Count units (solid dosage forms)
  { value: 'tablet',      label: 'Tablet (tab)',         ucum: 'TAB' },
  { value: 'capsule',     label: 'Capsule (cap)',        ucum: 'CAP' },
  { value: 'suppository', label: 'Suppository',          ucum: 'SUPP' },
  { value: 'patch',       label: 'Patch',                ucum: 'PATCH' },
  { value: 'vial',        label: 'Vial',                 ucum: 'VIAL' },
  { value: 'ampule',      label: 'Ampule',               ucum: 'AMP' },
  { value: 'unit',        label: 'Unit (IU)',            ucum: '[IU]' },
  // Volume units
  { value: 'mL',          label: 'Milliliter (mL)',      ucum: 'mL' },
  { value: 'L',           label: 'Liter (L)',            ucum: 'L' },
  // Mass units
  { value: 'mg',          label: 'Milligram (mg)',       ucum: 'mg' },
  { value: 'g',           label: 'Gram (g)',             ucum: 'g' },
  // Packaging
  { value: 'bottle',      label: 'Bottle',               ucum: '' },
  { value: 'box',         label: 'Box',                  ucum: '' },
  { value: 'sachet',      label: 'Sachet',               ucum: '' },
  { value: 'tube',        label: 'Tube',                 ucum: '' },
  { value: 'pack',        label: 'Pack',                 ucum: '' },
  { value: 'strip',       label: 'Strip (blister)',      ucum: '' },
];
