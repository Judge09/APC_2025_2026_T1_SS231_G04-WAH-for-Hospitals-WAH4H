import api from './api';
import type { Patient, PatientFormData, Condition, Allergy, Immunization } from '../types/patient';
import type { ConditionFormData, AllergyFormData, ImmunizationFormData } from '../schemas/clinicalDataSchema';

// ============================================================================
// FHIR BUNDLE HELPERS
// ============================================================================

/** Map a single FHIR Immunization resource → flat Immunization UI model. */
function fhirResourceToImmunization(resource: any): Immunization {
  const dbPkEntry = resource.identifier?.find((i: any) => i.system === 'local-db-pk');
  const labelEntry = resource.identifier?.find((i: any) => !i.system);
  return {
    immunization_id: dbPkEntry ? parseInt(dbPkEntry.value, 10) : 0,
    identifier: labelEntry?.value,
    status: resource.status,
    vaccine_code: resource.vaccineCode?.coding?.[0]?.code,
    vaccine_display: resource.vaccineCode?.text ?? resource.vaccineCode?.coding?.[0]?.display,
    site_code: resource.site?.coding?.[0]?.code,
    route_code: resource.route?.coding?.[0]?.code,
    occurrence_datetime: resource.occurrenceDateTime,
    lot_number: resource.lotNumber,
    expiration_date: resource.expirationDate,
    dose_quantity_value: resource.doseQuantity?.value?.toString(),
    dose_quantity_unit: resource.doseQuantity?.unit,
    performer_name: resource.performer?.[0]?.actor?.display,
    note: resource.note?.[0]?.text,
  };
}

/** Parse a FHIR Bundle (collection) into a flat Immunization array. */
function parseFhirBundle(data: any): Immunization[] {
  if (data?.resourceType === 'Bundle' && Array.isArray(data?.entry)) {
    return data.entry.map((e: any) => fhirResourceToImmunization(e.resource));
  }
  // Fallback: already a plain array (older endpoint format)
  return Array.isArray(data) ? data : [];
}

// ============================================================================
// PATIENT SERVICES
// ============================================================================

/**
 * Fetch all patients
 */
export const getPatients = async (): Promise<Patient[]> => {
  const response = await api.get('/api/patients/');
  return response.data;
};

/**
 * Fetch a single patient by ID
 */
export const getPatient = async (id: number): Promise<Patient> => {
  const response = await api.get(`/api/patients/${id}/`);
  return response.data;
};

/**
 * Create a new patient
 */
export const createPatient = async (data: PatientFormData): Promise<Patient> => {
  const response = await api.post('/api/patients/', data);
  return response.data;
};

/**
 * Update an existing patient (full update)
 */
export const updatePatient = async (id: number, data: PatientFormData): Promise<Patient> => {
  const response = await api.put(`/api/patients/${id}/`, data);
  return response.data;
};

/**
 * Partial update an existing patient
 */
export const partialUpdatePatient = async (id: number, data: Partial<PatientFormData>): Promise<Patient> => {
  const response = await api.patch(`/api/patients/${id}/`, data);
  return response.data;
};

/**
 * Delete a patient
 */
export const deletePatient = async (id: number): Promise<void> => {
  const response = await api.delete(`/api/patients/${id}/`);
  return response.data;
};

/**
 * Search patients by query
 */
export const searchPatients = async (query: string, limit?: number): Promise<Patient[]> => {
  const response = await api.get('/api/patients/search/', {
    params: { q: query, limit: limit || 50 },
  });
  return response.data;
};

/**
 * Get patient conditions
 */
export const getPatientConditions = async (patientId: number): Promise<Condition[]> => {
  const response = await api.get(`/api/patients/${patientId}/conditions/`);
  return response.data;
};

/**
 * Get patient allergies
 */
export const getPatientAllergies = async (patientId: number): Promise<Allergy[]> => {
  const response = await api.get(`/api/patients/${patientId}/allergies/`);
  return response.data;
};

/**
 * Get patient immunizations — parses FHIR Bundle (collection) response.
 */
export const getPatientImmunizations = async (patientId: number): Promise<Immunization[]> => {
  const response = await api.get(`/api/patients/${patientId}/immunizations/`);
  return parseFhirBundle(response.data);
};

// ============================================================================
// CONDITIONS SERVICES
// ============================================================================

/**
 * Fetch all conditions
 */
export const getConditions = async (filters?: { patient?: number }): Promise<Condition[]> => {
  const response = await api.get('/api/patients/conditions/', { params: filters });
  return response.data;
};

/**
 * Fetch a single condition by ID
 */
export const getCondition = async (id: number): Promise<Condition> => {
  const response = await api.get(`/api/patients/conditions/${id}/`);
  return response.data;
};

/**
 * Create a new condition
 */
export const createCondition = async (data: ConditionFormData): Promise<Condition> => {
  const response = await api.post('/api/patients/conditions/', data);
  return response.data;
};

/**
 * Update a condition
 */
export const updateCondition = async (id: number, data: Partial<ConditionFormData>): Promise<Condition> => {
  const response = await api.put(`/api/patients/conditions/${id}/`, data);
  return response.data;
};

/**
 * Delete a condition
 */
export const deleteCondition = async (id: number): Promise<void> => {
  const response = await api.delete(`/api/patients/conditions/${id}/`);
  return response.data;
};

// ============================================================================
// ALLERGIES SERVICES
// ============================================================================

/**
 * Fetch all allergies
 */
export const getAllergies = async (filters?: { patient?: number }): Promise<Allergy[]> => {
  const response = await api.get('/api/patients/allergies/', { params: filters });
  return response.data;
};

/**
 * Fetch a single allergy by ID
 */
export const getAllergy = async (id: number): Promise<Allergy> => {
  const response = await api.get(`/api/patients/allergies/${id}/`);
  return response.data;
};

/**
 * Create a new allergy
 */
export const createAllergy = async (data: AllergyFormData): Promise<Allergy> => {
  const response = await api.post('/api/patients/allergies/', data);
  return response.data;
};

/**
 * Update an allergy
 */
export const updateAllergy = async (id: number, data: Partial<AllergyFormData>): Promise<Allergy> => {
  const response = await api.put(`/api/patients/allergies/${id}/`, data);
  return response.data;
};

/**
 * Delete an allergy
 */
export const deleteAllergy = async (id: number): Promise<void> => {
  const response = await api.delete(`/api/patients/allergies/${id}/`);
  return response.data;
};

// ============================================================================
// IMMUNIZATIONS SERVICES
// ============================================================================

/**
 * Fetch all immunizations
 */
export const getImmunizations = async (filters?: { patient?: number }): Promise<Immunization[]> => {
  const response = await api.get('/api/patients/immunizations/', { params: filters });
  return response.data;
};

/**
 * Fetch a single immunization by ID
 */
export const getImmunization = async (id: number): Promise<Immunization> => {
  const response = await api.get(`/api/patients/immunizations/${id}/`);
  return response.data;
};

/**
 * Create a new immunization
 */
export const createImmunization = async (data: ImmunizationFormData): Promise<Immunization> => {
  const response = await api.post('/api/patients/immunizations/', data);
  return response.data;
};

/**
 * Update an immunization
 */
export const updateImmunization = async (id: number, data: Partial<ImmunizationFormData>): Promise<Immunization> => {
  const response = await api.put(`/api/patients/immunizations/${id}/`, data);
  return response.data;
};

/**
 * Delete an immunization
 */
export const deleteImmunization = async (id: number): Promise<void> => {
  const response = await api.delete(`/api/patients/immunizations/${id}/`);
  return response.data;
};
