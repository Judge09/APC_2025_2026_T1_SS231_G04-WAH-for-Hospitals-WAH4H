// src/services/dischargeService.ts
import axios, { AxiosInstance } from "axios";
import type {
  DischargeRecord,
  PendingPatient,
  DischargedPatient,
  DischargeForm,
  NewDischargeRecord,
  DischargeRequirements,
} from "@/types/discharge";

// Create an Axios instance
const api: AxiosInstance = axios.create({
  baseURL:
    import.meta.env.BACKEND_DISCHARGE_8000
      ? `${import.meta.env.BACKEND_DISCHARGE_8000}discharges/`
      : import.meta.env.LOCAL_8000
        ? `${import.meta.env.LOCAL_8000}/api/discharge/discharges/`
        : import.meta.env.BACKEND_DISCHARGE
          ? `${import.meta.env.BACKEND_DISCHARGE}discharges/`
          : undefined,
  headers: {
    "Content-Type": "application/json",
  },
});

const handleError = (error: any) => {
  console.error("DischargeService error:", error);
  throw error;
};

/**
 * Mapper to align backend camelCase response with frontend snake_case types.
 * This ensures consistency with other modules (Admission, Pharmacy, etc.)
 * and fixes the empty dashboard issue.
 */
const mapToDischargeRecord = (d: any): DischargeRecord => ({
  id: d.id,
  patient_id: d.patient,
  encounter_id: d.admission,
  patient_name: d.patientName || "Unknown Patient",
  room: d.room || "Unassigned",
  admission_date: d.admissionDate || d.admission_date,
  discharge_date: d.dischargeDate || d.discharge_date,
  condition: d.condition || "Stable",
  status: d.status,
  physician_name: d.physician || "Dr. On-Duty",
  department: d.department || "General",
  age: d.age || 0,
  birthdate: d.birthdate,
  estimated_discharge: d.estimatedDischarge,
  requirements: d.requirements,
  final_diagnosis: d.finalDiagnosis,
  discharge_summary: d.dischargeSummary,
  follow_up_required: d.followUpRequired,
  follow_up_plan: d.followUpPlan,
  created_at: d.created_at,
  updated_at: d.updated_at,
});

const mapToPendingPatient = (d: any): PendingPatient => ({
  id: d.id,
  patient_name: d.patientName || "Unknown Patient",
  room: d.room || "Unassigned",
  admission_date: d.admissionDate || d.admission_date,
  condition: d.condition || "Stable",
  status: d.status,
  physician_name: d.physician || "Dr. On-Duty",
  department: d.department || "General",
  age: d.age || 0,
  birthdate: d.birthdate,
  estimated_discharge: d.estimatedDischarge,
  requirements: d.requirements,
});

const mapToDischargedPatient = (d: any): DischargedPatient => ({
  id: d.id,
  patient_name: d.patientName || "Unknown Patient",
  room: d.room || "Unassigned",
  admission_date: d.admissionDate || d.admission_date,
  discharge_date: d.dischargeDate || d.discharge_date,
  condition: d.condition || "Stable",
  physician_name: d.physician || "Dr. On-Duty",
  department: d.department || "General",
  age: d.age || 0,
  birthdate: d.birthdate,
  final_diagnosis: d.finalDiagnosis,
  discharge_summary: d.dischargeSummary,
  follow_up_required: d.followUpRequired,
  follow_up_plan: d.followUpPlan,
});

export const dischargeService = {
  // Get all discharge records
  getAll: async (): Promise<DischargeRecord[]> => {
    try {
      const { data } = await api.get<any[]>("");
      return Array.isArray(data) ? data.map(mapToDischargeRecord) : [];
    } catch (error) {
      handleError(error);
      return [];
    }
  },

  // Get a single discharge record by ID
  getById: async (id: number): Promise<DischargeRecord> => {
    try {
      const { data } = await api.get<any>(`${id}/`);
      return mapToDischargeRecord(data);
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  // Get pending discharges (pending or ready status)
  getPending: async (): Promise<PendingPatient[]> => {
    try {
      const { data } = await api.get<any[]>("pending/");
      return Array.isArray(data) ? data.map(mapToPendingPatient) : [];
    } catch (error) {
      handleError(error);
      return [];
    }
  },

  // Get discharged patients
  getDischarged: async (): Promise<DischargedPatient[]> => {
    try {
      const { data } = await api.get<any[]>("discharged/");
      return Array.isArray(data) ? data.map(mapToDischargedPatient) : [];
    } catch (error) {
      handleError(error);
      return [];
    }
  },

  // Create a new discharge record
  create: async (discharge: NewDischargeRecord): Promise<DischargeRecord> => {
    try {
      const { data } = await api.post<DischargeRecord>("", discharge);
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  // Update a discharge record
  update: async (id: number, discharge: Partial<DischargeRecord>): Promise<DischargeRecord> => {
    try {
      const { data } = await api.put<DischargeRecord>(`${id}/`, discharge);
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  // Partial update of a discharge record
  patch: async (id: number, discharge: Partial<DischargeRecord>): Promise<DischargeRecord> => {
    try {
      const { data } = await api.patch<DischargeRecord>(`${id}/`, discharge);
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  // Delete a discharge record
  delete: async (id: number): Promise<void> => {
    try {
      await api.delete(`${id}/`);
    } catch (error) {
      handleError(error);
    }
  },

  // Process discharge (submit discharge form)
  processDischarge: async (id: number, form: DischargeForm): Promise<DischargeRecord> => {
    try {
      const { data } = await api.post<DischargeRecord>(`${id}/process_discharge/`, form);
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  // Update discharge requirements checklist
  updateRequirements: async (
    id: number,
    requirements: Partial<DischargeRequirements>
  ): Promise<DischargeRecord> => {
    try {
      const { data } = await api.patch<DischargeRecord>(`${id}/update_requirements/`, {
        requirements,
      });
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  // Search/filter discharge records
  search: async (params: {
    status?: string;
    department?: string;
    condition?: string;
    search?: string;
  }): Promise<DischargeRecord[]> => {
    try {
      const { data } = await api.get<DischargeRecord[]>("", { params });
      return data;
    } catch (error) {
      handleError(error);
      return [];
    }
  },

  // Get patients from billing records eligible for discharge
  getFromBilling: async (): Promise<any> => {
    try {
      const { data } = await api.get("from_billing/");
      return data;
    } catch (error) {
      handleError(error);
      return { count: 0, patients: [] };
    }
  },

  // Create discharge records from billing records
  createFromBilling: async (billingIds: number[]): Promise<any> => {
    try {
      const { data } = await api.post("from_billing/", { billing_ids: billingIds });
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  // Sync admitted patients from admissions module
  syncFromAdmissions: async (): Promise<any> => {
    try {
      const { data } = await api.post("sync_from_admissions/");
      return data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
};
