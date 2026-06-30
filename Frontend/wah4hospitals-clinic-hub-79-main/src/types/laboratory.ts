// Lab Request Types
export type LabTestType =
  // Hematology
  | 'cbc' | 'blood_typing'
  // Clinical Microscopy
  | 'urinalysis' | 'fecalysis'
  // Blood Chemistry
  | 'fbs' | 'rbs' | 'glucose_panel';
export type LabPriority = 'routine' | 'urgent' | 'stat';
export type LabStatus =
  | 'active' | 'requested' | 'verified' | 'completed'
  | 'registered' | 'preliminary' | 'partial' | 'final' | 'amended' | 'corrected' | 'cancelled';
export type LabInterpretation = 'normal' | 'high' | 'low';

// Test Parameter
export interface TestParameter {
  id?: number;
  parameter_name: string;
  result_value: string;
  unit: string;
  reference_range: string;
  interpretation: LabInterpretation | '';
  created_at?: string;
}

export interface TestParameterFormData {
  parameter_name: string;
  result_value: string;
  unit?: string;
  reference_range?: string;
  interpretation?: LabInterpretation | '';
}

// Lab Result
export interface LabResult {
  id: number;
  request_id: string;
  lab_request: number;
  patient_name: string;
  doctor_name: string | null;
  test_type: string;
  medical_technologist: string;
  prc_number: string;
  remarks: string;
  performed_by: number | null;
  parameters: TestParameter[];
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabResultFormData {
  lab_request: number;
  medical_technologist: string;
  prc_number: string;
  remarks?: string;
  performed_by?: number;
  parameters?: TestParameterFormData[];
}

// Serialized Result (from DiagnosticReportResultSerializer)
export interface SerializedResult {
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag?: string;
  interpretation?: string;
}

// Lab Request
export interface LabRequest {
  id: number;
  request_id: string;
  admission: number;
  admission_id: string;
  patient_id: string;
  patient_name: string;
  ward_room_bed: string;
  admission_details?: {
    ward: string;
    room: string;
    bed: string;
  };
  patient_details?: {
    patient_id: string;
    full_name: string;
    date_of_birth: string | null;
    sex: string;
    mobile_number: string;
  };
  requesting_doctor: number | null;
  doctor_name: string | null;
  test_type: LabTestType;
  test_type_display: string;
  code_code?: string; // LOINC code (e.g., "58410-2" for CBC)
  code_display?: string; // Display name (e.g., "Complete Blood Count")
  priority: LabPriority;
  priority_display: string;
  clinical_reason: string;
  status: LabStatus;
  status_display: string;
  has_result?: boolean;
  result?: LabResult; // Valid for legacy/internal structure
  results?: SerializedResult[]; // Valid for API response structure
  created_at: string;
  updated_at: string;
  released_at?: string | null;
  released_by?: string | null;
}

export interface LabRequestFormData {
  subject_id: number;
  admission: number;
  requesting_doctor?: number | null;  // Optional - backend can set from current user
  test_type: LabTestType;
  priority: LabPriority;
  clinical_reason?: string;
  requester_name?: string; // Optional - allow frontend to specify requester name directly
}

// Dashboard Stats
// Dashboard Stats
export interface LabDashboardStats {
  pending: number;
  in_progress: number;
  to_release: number; // Completed but not released
  released_today: number; // Released today
}

// API Response Types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LabRequestListResponse extends PaginatedResponse<LabRequest> { }
export interface LabResultListResponse extends PaginatedResponse<LabResult> { }

// Filter/Search Params
export interface LabRequestFilters {
  status?: LabStatus;
  is_released?: boolean;
  priority?: LabPriority;
  test_type?: LabTestType;
  requesting_doctor?: number;
  subject_id?: number;  // Filter by patient ID
  encounter_id?: number;  // Filter by encounter/admission ID
  search?: string;
  ordering?: string;
  page?: number;
}