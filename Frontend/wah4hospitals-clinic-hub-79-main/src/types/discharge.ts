// src/types/discharge.ts

export interface DischargeRequirements {
  finalDiagnosis: boolean;
  physicianSignature: boolean;
  medicationReconciliation: boolean;
  dischargeSummary: boolean;
  billingClearance: boolean;
  nursingNotes: boolean;
  followUpScheduled: boolean;
}

export interface DischargeRecord {
  id: number;
  patient_id: number;
  encounter_id: number;
  patient_name: string;
  room: string;
  admission_date: string;
  discharge_date: string;
  condition: string;
  status: 'pending' | 'ready' | 'discharged';
  physician_name: string;
  department: string;
  age: number | string;
  birthdate?: string;
  estimated_discharge?: string;
  requirements: DischargeRequirements;
  final_diagnosis?: string;
  discharge_summary?: string;
  follow_up_required?: boolean;
  follow_up_plan?: string;
  created_at: string;
  updated_at: string;
}

export interface PendingPatient {
  id: number;
  patient_name: string;
  room: string;
  admission_date: string;
  condition: string;
  status: 'pending' | 'ready' | 'discharged';
  physician_name: string;
  department: string;
  age: number | string;
  birthdate?: string;
  estimated_discharge?: string;
  requirements: DischargeRequirements;
}

export interface DischargedPatient {
  id: number;
  patient_name: string;
  room: string;
  admission_date: string;
  discharge_date: string;
  condition: string;
  physician_name: string;
  department: string;
  age: number | string;
  birthdate?: string;
  final_diagnosis?: string;
  discharge_summary?: string;
  follow_up_required?: boolean;
  follow_up_plan?: string;
}

export interface DischargeForm {
  patientId: number;
  finalDiagnosis: string;
  hospitalStaySummary: string;
  dischargeMedications: string;
  dischargeInstructions: string;
  followUpPlan?: string;
  billingStatus: string;
  pendingItems?: string;
}

export interface NewDischargeRecord {
  patient_id: number;
  encounter_id?: number;
  patient_name: string;
  room: string;
  admission_date: string;
  condition: string;
  status?: 'pending' | 'ready' | 'discharged';
  physician_name: string;
  department: string;
  age: number;
  estimated_discharge?: string;
}
