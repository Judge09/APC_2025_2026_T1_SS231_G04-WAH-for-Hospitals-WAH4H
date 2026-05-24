// src/types/appointment.ts

// FHIR R4 / PHCore R4 resource representation (included alongside flat fields)
export interface FHIRResource {
  resourceType: string;
  id: string;
  meta?: { profile?: string[]; lastUpdated?: string };
  identifier?: Array<{ system: string; value: string; use?: string }>;
  [key: string]: unknown;
}

export interface PatientSummary {
  id: number;
  patient_id: string;
  full_name: string;
  gender?: string;
  age?: number;
  dob?: string;
  contact?: string;
  philhealth?: string;
}

export interface PractitionerSummary {
  practitioner_id: number;
  full_name: string;
  qualification_code?: string;
}

export interface SlotDetail {
  slot_id: number;
  status: string;
  start: string;
  end: string;
}

export interface ScheduleDetail {
  identifier: string;
  schedule_id: number;
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export interface Schedule {
  identifier: string;
  schedule_id: number;
  status: 'active' | 'inactive' | 'entered-in-error';
  actor_practitioner_id?: number;
  actor_location_id?: number;
  actor_organization_id?: number;
  actor_name?: string;
  service_type_code?: string;
  service_type_display?: string;
  specialty_code?: string;
  specialty_display?: string;
  planning_horizon_start?: string;
  planning_horizon_end?: string;
  comment?: string;
  created_at?: string;
  updated_at?: string;
  fhir?: FHIRResource;
}

export interface NewSchedule {
  actor_practitioner_id?: number;
  actor_location_id?: number;
  service_type_code?: string;
  service_type_display?: string;
  specialty_code?: string;
  specialty_display?: string;
  planning_horizon_start: string;
  planning_horizon_end: string;
  comment?: string;
  status?: string;
}

// ── Slot ──────────────────────────────────────────────────────────────────────

export interface Slot {
  identifier: string;
  slot_id: number;
  status: 'busy' | 'free' | 'busy-unavailable' | 'busy-tentative' | 'entered-in-error';
  schedule: number;
  schedule_detail?: ScheduleDetail;
  service_type_code?: string;
  service_type_display?: string;
  specialty_code?: string;
  specialty_display?: string;
  appointment_type_code?: string;
  appointment_type_display?: string;
  start: string;
  end: string;
  overbooked?: boolean;
  comment?: string;
  created_at?: string;
  updated_at?: string;
  fhir?: FHIRResource;
}

export interface NewSlot {
  schedule_id: number;
  start: string;
  end: string;
  service_type_code?: string;
  service_type_display?: string;
  appointment_type_code?: string;
  comment?: string;
  status?: string;
}

// ── Appointment ───────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'proposed'
  | 'pending'
  | 'booked'
  | 'arrived'
  | 'fulfilled'
  | 'cancelled'
  | 'noshow'
  | 'entered-in-error'
  | 'checked-in'
  | 'waitlist';

export interface Appointment {
  identifier: string;
  appointment_id: number;
  status: AppointmentStatus;
  patient_id: number;
  patient_summary?: PatientSummary;
  practitioner_id?: number;
  practitioner_summary?: PractitionerSummary;
  slot_id?: number;
  slot_detail?: SlotDetail;
  service_type_code?: string;
  service_type_display?: string;
  service_category_code?: string;
  service_category_display?: string;
  specialty_code?: string;
  specialty_display?: string;
  appointment_type_code?: string;
  appointment_type_display?: string;
  reason_code?: string;
  priority?: number;
  description?: string;
  start?: string;
  end?: string;
  created_datetime?: string;
  minutes_duration?: number;
  cancellation_reason_code?: string;
  cancellation_reason_display?: string;
  patient_participation_status?: string;
  practitioner_participation_status?: string;
  based_on_service_request_id?: number;
  resulting_encounter_id?: number;
  comment?: string;
  patient_instruction?: string;
  created_at?: string;
  updated_at?: string;
  fhir?: FHIRResource;
}

export interface NewAppointment {
  patient_id: number;
  practitioner_id?: number;
  location_id?: number;
  slot_id?: number;
  start?: string;
  end?: string;
  service_category_code?: string;
  service_category_display?: string;
  service_type_code?: string;
  service_type_display?: string;
  specialty_code?: string;
  specialty_display?: string;
  appointment_type_code?: string;
  appointment_type_display?: string;
  reason_code?: string;
  description?: string;
  minutes_duration?: number;
  comment?: string;
  patient_instruction?: string;
  status?: string;
}
