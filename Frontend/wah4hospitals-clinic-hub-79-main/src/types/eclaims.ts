// src/types/eclaims.ts

export interface EClaimPatient {
  id: number;
  patient_id: string;
  full_name: string;
  philhealth_id?: string;
  gender?: string;
  age?: number;
  contact?: string;
}

// ── Coverage ──────────────────────────────────────────────────────────────────

export interface Coverage {
  identifier: string;
  coverage_id: number;
  status: 'active' | 'cancelled' | 'draft' | 'entered-in-error';
  beneficiary_id: number;
  subscriber_id?: number;
  policy_holder_id?: number;
  payor_id?: number;
  subscriber_pin?: string;
  type_code?: string;
  type_display?: string;
  class_code?: string;
  class_name?: string;
  period_start?: string;
  period_end?: string;
  dependent?: string;
  relationship_code?: string;
  relationship_display?: string;
  order?: number;
  network?: string;
  cost_to_beneficiary?: string;
  patient_summary?: EClaimPatient;
  created_at?: string;
  updated_at?: string;
}

export interface NewCoverage {
  beneficiary_id: number;
  subscriber_pin?: string;
  type_code?: string;
  type_display?: string;
  class_code?: string;
  class_name?: string;
  period_start?: string;
  period_end?: string;
  relationship_code?: string;
  relationship_display?: string;
  network?: string;
  status?: string;
}

// ── Claim sub-resources ───────────────────────────────────────────────────────

export interface ClaimDiagnosis {
  id?: number;
  sequence?: string;
  diagnosisCodeableConcept?: string;
  diagnosisReference?: string;
  type?: string;
  onAdmission?: string;
  packageCode?: string;
}

export interface ClaimProcedure {
  id?: number;
  sequence?: string;
  type?: string;
  procedureCodeableConcept?: string;
  procedureReference?: string;
}

export interface ClaimCareTeam {
  id?: number;
  sequence?: string;
  provider_id?: number;
  responsible?: string;
  role?: string;
  qualification?: string;
}

export interface ClaimItem {
  id?: number;
  sequence?: string;
  productOrService?: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  net?: string;
  servicedDate?: string;
}

// ── EClaim (header) ───────────────────────────────────────────────────────────

export type EClaimStatus = 'draft' | 'active' | 'cancelled' | 'entered-in-error';

export interface EClaim {
  identifier: string;
  claim_id: number;
  status: EClaimStatus;
  type?: string;
  subType?: string;
  use?: string;
  subject_id: number;
  patient_summary?: EClaimPatient;
  insurer_id?: number;
  provider_id?: number;
  facility_id?: number;
  billablePeriod_start?: string;
  billablePeriod_end?: string;
  created?: string;
  priority?: string;
  total?: string | number;
  total_currency?: string;
  diagnoses: ClaimDiagnosis[];
  procedures: ClaimProcedure[];
  care_team: ClaimCareTeam[];
  items: ClaimItem[];
  created_at?: string;
  updated_at?: string;
}

export interface NewEClaim {
  subject_id: number;
  type?: string;
  use?: string;
  insurer_id?: number;
  provider_id?: number;
  facility_id?: number;
  billablePeriod_start?: string;
  billablePeriod_end?: string;
  priority?: string;
  total?: number;
  total_currency?: string;
  diagnoses?: Omit<ClaimDiagnosis, 'id'>[];
  procedures?: Omit<ClaimProcedure, 'id'>[];
  care_team?: Omit<ClaimCareTeam, 'id'>[];
  items?: Omit<ClaimItem, 'id'>[];
  status?: string;
}

// ── ClaimResponse ─────────────────────────────────────────────────────────────

export interface ClaimResponseTotal {
  id?: number;
  category?: string;
  amount?: number;
}

export interface ClaimResponse {
  identifier: string;
  claimResponse_id: number;
  status: string;
  subject_id: number;
  request_id?: number;
  outcome?: string;
  disposition?: string;
  preAuthRef?: string;
  preAuthPeriod_start?: string;
  preAuthPeriod_end?: string;
  payment_type?: string;
  payment_date?: string;
  totals: ClaimResponseTotal[];
  claim_summary?: { claim_id: number; identifier: string; status: string };
  created?: string;
  created_at?: string;
}
