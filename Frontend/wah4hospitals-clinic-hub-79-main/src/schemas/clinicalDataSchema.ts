/**
 * Clinical Data Validation Schemas
 * Using Zod for runtime validation (Condition, AllergyIntolerance, Immunization)
 */
import { z } from 'zod';

// ============================================================================
// CONDITION SCHEMA
// ============================================================================

export const conditionFormSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required').max(100),
  clinical_status: z.string().max(100).optional(),
  verification_status: z.string().max(100).optional(),
  category: z.string().max(255).optional(),
  severity: z.string().max(255).optional(),
  code: z.string().min(1, 'Condition code is required').max(100),
  patient: z.number().min(1, 'Patient ID is required'),
  encounter_id: z.number().min(1, 'Encounter ID is required'),
  body_site: z.string().max(255).optional(),
  onset_datetime: z.string().optional(),
  recorded_date: z.string().optional(),
  note: z.string().optional(),
});

export type ConditionFormData = z.infer<typeof conditionFormSchema>;

// ============================================================================
// ALLERGY INTOLERANCE SCHEMA
// ============================================================================

export const allergyFormSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required').max(100),
  clinical_status: z.string().max(100).optional(),
  verification_status: z.string().max(100).optional(),
  type: z.string().max(100).optional(),
  category: z.string().max(255).optional(),
  criticality: z.string().max(255).optional(),
  code: z.string().min(1, 'Allergen code is required').max(100),
  patient: z.number().min(1, 'Patient ID is required'),
  encounter_id: z.number().min(1, 'Encounter ID is required'),
  onset_datetime: z.string().optional(),
  recorded_date: z.string().optional(),
  reaction_description: z.string().optional(),
  reaction_severity: z.string().max(255).optional(),
  note: z.string().optional(),
});

export type AllergyFormData = z.infer<typeof allergyFormSchema>;

// ============================================================================
// IMMUNIZATION SCHEMA
// ============================================================================

export const immunizationFormSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required').max(100),
  status: z.enum(['completed', 'entered-in-error', 'not-done'], {
    errorMap: () => ({ message: 'Please select a valid status' }),
  }),
  vaccine_code: z.string().max(100).optional(),
  vaccine_display: z.string().max(100).optional(),
  patient: z.number().min(1, 'Patient ID is required'),
  encounter_id: z.number().min(1, 'Encounter ID is required'),
  occurrence_datetime: z.string().optional(),
  recorded_datetime: z.string().optional(),
  lot_number: z.string().max(255).optional(),
  expiration_date: z.string().optional(),
  site_code: z.string().max(10).optional(),
  route_code: z.string().max(10).optional(),
  dose_quantity_value: z.string().optional(),
  dose_quantity_unit: z.string().max(50).optional(),
  performer_name: z.string().max(255).optional(),
  note: z.string().optional(),
});

export type ImmunizationFormData = z.infer<typeof immunizationFormSchema>;
