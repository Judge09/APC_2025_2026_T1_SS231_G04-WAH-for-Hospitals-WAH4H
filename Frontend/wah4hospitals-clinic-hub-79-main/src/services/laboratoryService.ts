import api from './api';
import {
  LabRequest,
  LabResult,
  LabRequestFormData,
  LabResultFormData,
  LabDashboardStats,
  LabRequestListResponse,
  LabRequestFilters,
} from '../types/laboratory';

const LABORATORY_BASE_URL = '/api/laboratory';

/**
 * Centrally parse API error responses
 */
export const parseApiError = (error: any): string => {
  if (error.response?.data) {
    const data = error.response.data;

    // Fallback if data is a string
    if (typeof data === 'string') return data;

    // Handle DRF validation errors (objects)
    if (typeof data === 'object') {
      // Check for 'detail' or 'error' keys first
      if (data.detail) return data.detail;
      if (data.error) return data.error;

      // Map through validation errors
      const messages = Object.entries(data).map(([key, value]) => {
        const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
        const fieldErrors = Array.isArray(value) ? value.join(', ') : value;
        return `${fieldName}: ${fieldErrors}`;
      });

      if (messages.length > 0) return messages.join(' | ');
    }
  }
  return error.message || "An unexpected error occurred.";
};

// Helper to normalize results from backend (handles both legacy array and new JSON object)
const normalizeResults = (rawResults: any): any[] => {
  if (!rawResults) return [];

  let parameters: any[] = [];

  if (Array.isArray(rawResults)) {
    if (rawResults.length === 0) return [];
    if (rawResults[0].parameter) {
      return rawResults;
    }
    parameters = rawResults;
  } else if (typeof rawResults === 'object') {
    parameters = rawResults.parameters || [];
  }

  return parameters.map((p: any) => ({
    parameter: p.parameter || p.parameter_name,
    value: p.value || p.result_value,
    unit: p.unit,
    referenceRange: p.referenceRange || p.reference_range,
    flag: p.flag || p.interpretation,
    interpretation: p.interpretation
  }));
};

/**
 * Laboratory Service
 * Handles all API calls for the Laboratory module
 */
export const laboratoryService = {
  // ========== Lab Requests ==========

  getLabRequests: async (filters?: LabRequestFilters): Promise<LabRequestListResponse> => {
    const params = new URLSearchParams();

    if (filters?.status) {
      if (filters.status === 'active' || (filters.status as string) === 'pending') {
        // Consolidated 'Active' tab: everything from verified to preliminary
        // 'requested' is now excluded because it's waiting for Nurse approval in Monitoring
        params.append('status__in', 'verified,registered,preliminary,partial,in-progress');
      } else if (filters.status === 'completed' || filters.status === 'final') {
        params.append('status__in', 'completed,final,amended,corrected');
      } else {
        params.append('status', filters.status);
      }
    }

    if (filters?.is_released !== undefined) {
      params.append('issued_datetime__isnull', (!filters.is_released).toString());
    }

    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.requesting_doctor) params.append('performer_id', filters.requesting_doctor.toString());
    if (filters?.subject_id) params.append('subject_id', filters.subject_id.toString());
    if (filters?.encounter_id) params.append('encounter_id', filters.encounter_id.toString());

    const response = await api.get(`${LABORATORY_BASE_URL}/reports/?${params.toString()}`);

    const mappedResults = response.data.results.map((report: any) => ({
      id: report.diagnostic_report_id,
      request_id: report.identifier || report.diagnostic_report_id.toString(),
      admission: report.encounter_id,
      admission_id: report.encounter?.identifier || report.encounter_id?.toString() || '',
      patient_id: report.subject_patient_id || report.subject_id?.toString() || '',
      patient_name: report.subject_display || 'Unknown Patient',
      ward_room_bed: '',
      requesting_doctor: report.requester_id || null,
      doctor_name: report.orderedBy || null,
      test_type: report.code_code || 'cbc',
      test_type_display: report.code_display || report.code_code || 'Lab Test',
      priority: report.priority || 'routine',
      priority_display: report.priority === 'stat' ? 'STAT' : report.priority === 'urgent' ? 'Urgent' : 'Routine',
      clinical_reason: report.conclusion || '',
      status: mapBackendStatusToFrontend(report.status),
      status_display: report.status,
      created_at: report.created_at,
      updated_at: report.updated_at,
      released_at: report.issued_datetime || null,
      released_by: report.releasedBy || null,
      results: normalizeResults(report.results)
    }));

    return {
      count: response.data.count,
      next: response.data.next,
      previous: response.data.previous,
      results: mappedResults
    };
  },

  getLabRequest: async (id: number | string): Promise<LabRequest> => {
    const response = await api.get(`${LABORATORY_BASE_URL}/reports/${id}/`);
    const report = response.data;

    return {
      id: report.diagnostic_report_id,
      request_id: report.identifier || report.diagnostic_report_id.toString(),
      admission: report.encounter_id,
      admission_id: report.encounter?.identifier || report.encounter_id?.toString() || '',
      patient_id: report.subject_patient_id || report.subject_id?.toString() || '',
      patient_name: report.subject_display || 'Unknown Patient',
      ward_room_bed: '',
      patient_details: report.subject ? {
        patient_id: report.subject.patient_id,
        full_name: report.subject.name,
        date_of_birth: report.subject.date_of_birth || null,
        sex: report.subject.sex || '',
        mobile_number: report.subject.mobile_number || ''
      } : undefined,
      requesting_doctor: report.requester_id || null,
      doctor_name: report.orderedBy || null,
      test_type: report.code_code || 'cbc',
      test_type_display: report.code_display || report.code_code || 'Lab Test',
      priority: report.priority || 'routine',
      priority_display: report.priority === 'stat' ? 'STAT' : report.priority === 'urgent' ? 'Urgent' : 'Routine',
      clinical_reason: report.conclusion || '',
      status: mapBackendStatusToFrontend(report.status),
      status_display: report.status,
      has_result: report.status === 'final',
      created_at: report.created_at,
      updated_at: report.updated_at,
      released_at: report.issued_datetime || null,
      results: normalizeResults(report.results)
    };
  },

  createLabRequest: async (data: LabRequestFormData): Promise<LabRequest> => {
    const identifier = `LAB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const payload = {
      identifier: identifier,
      subject_id: data.subject_id,
      encounter_id: data.admission,
      requester_id: data.requesting_doctor,
      code_code: data.test_type,
      code_display: getTestTypeDisplay(data.test_type),
      category_code: 'LAB',
      priority: data.priority,
      status: 'requested',
      conclusion: data.clinical_reason || '',
      requester_name: data.requester_name // Pass explicit name if available
    };

    const response = await api.post(`${LABORATORY_BASE_URL}/reports/`, payload);
    const report = response.data;

    return {
      id: report.diagnostic_report_id,
      request_id: report.identifier || report.diagnostic_report_id.toString(),
      admission: report.encounter_id,
      admission_id: report.encounter_id?.toString() || '',
      patient_id: report.subject_id?.toString() || '',
      patient_name: report.subject?.name || '',
      ward_room_bed: '',
      requesting_doctor: report.performer_id,
      doctor_name: report.performer?.name || null,
      test_type: report.code_code,
      test_type_display: report.code_display,
      priority: data.priority,
      priority_display: data.priority === 'stat' ? 'STAT' : 'Routine',
      clinical_reason: report.conclusion,
      status: 'requested',
      status_display: report.status,
      created_at: report.created_at,
      updated_at: report.updated_at,
      released_at: report.issued_datetime || null
    };
  },

  updateLabRequest: async (id: number, data: Partial<LabRequestFormData>): Promise<LabRequest> => {
    const payload: any = {};
    if (data.subject_id) payload.subject_id = data.subject_id;
    if (data.admission) payload.encounter_id = data.admission;
    if (data.requesting_doctor) payload.performer_id = data.requesting_doctor;
    if (data.test_type) {
      payload.code_code = data.test_type;
      payload.code_display = getTestTypeDisplay(data.test_type);
    }
    if (data.clinical_reason !== undefined) payload.conclusion = data.clinical_reason;

    const response = await api.patch(`${LABORATORY_BASE_URL}/reports/${id}/`, payload);
    return laboratoryService.getLabRequest(id);
  },

  deleteLabRequest: async (id: number | string): Promise<void> => {
    await api.delete(`${LABORATORY_BASE_URL}/reports/${id}/`);
  },

  getDashboardStats: async (): Promise<LabDashboardStats> => {
    const response = await api.get(`${LABORATORY_BASE_URL}/reports/dashboard_stats/`);
    return response.data;
  },

  // startProcessing removed: workflow now skips manual 'Receive' step

  verifyLabRequest: async (id: number | string): Promise<LabRequest> => {
    await api.patch(`${LABORATORY_BASE_URL}/reports/${id}/update_status/`, {
      status: 'verified'
    });
    return laboratoryService.getLabRequest(id);
  },

  getLabResults: async (): Promise<LabResult[]> => {
    const response = await api.get(`${LABORATORY_BASE_URL}/reports/?status=final`);
    const reports = response.data.results || response.data;

    return reports.map((report: any) => {
      const rawResults = report.results;
      let parameters = [];
      let meta = { medical_technologist: '', prc_number: '' };

      if (Array.isArray(rawResults)) {
        parameters = rawResults;
      } else if (rawResults && typeof rawResults === 'object') {
        parameters = rawResults.parameters || [];
        meta = rawResults.meta || meta;
      }

      return {
        id: report.diagnostic_report_id,
        request_id: report.identifier || report.diagnostic_report_id.toString(),
        lab_request: report.diagnostic_report_id,
        patient_name: report.subject?.name || 'Unknown Patient',
        doctor_name: report.performer?.name || null,
        test_type: report.code_display || report.code_code || 'Lab Test',
        medical_technologist: meta.medical_technologist || '',
        prc_number: meta.prc_number || '',
        remarks: report.conclusion || '',
        performed_by: report.performer_id,
        parameters: parameters,
        finalized_at: report.issued_datetime,
        created_at: report.created_at,
        updated_at: report.updated_at
      };
    });
  },

  getLabResult: async (id: number): Promise<LabResult> => {
    const response = await api.get(`${LABORATORY_BASE_URL}/reports/${id}/`);
    const report = response.data;

    const rawResults = report.results;
    let parameters = [];
    let meta = { medical_technologist: '', prc_number: '' };

    if (Array.isArray(rawResults)) {
      parameters = rawResults;
    } else if (rawResults && typeof rawResults === 'object') {
      parameters = rawResults.parameters || [];
      meta = rawResults.meta || meta;
    }

    return {
      id: report.diagnostic_report_id,
      request_id: report.identifier || report.diagnostic_report_id.toString(),
      lab_request: report.diagnostic_report_id,
      patient_name: report.subject?.name || 'Unknown Patient',
      doctor_name: report.performer?.name || null,
      test_type: report.code_display || report.code_code || 'Lab Test',
      medical_technologist: meta.medical_technologist || '',
      prc_number: meta.prc_number || '',
      remarks: report.conclusion || '',
      performed_by: report.performer_id,
      parameters: parameters,
      finalized_at: report.issued_datetime,
      created_at: report.created_at,
      updated_at: report.updated_at
    };
  },

  createLabResult: async (data: LabResultFormData): Promise<LabResult> => {
    const resultPayload = {
      parameters: data.parameters,
      meta: {
        medical_technologist: data.medical_technologist,
        prc_number: data.prc_number,
        remarks: data.remarks
      }
    };

    await api.patch(`${LABORATORY_BASE_URL}/reports/${data.lab_request}/update_status/`, {
      status: 'final',
      conclusion: data.remarks || '',
      results: resultPayload
    });

    return laboratoryService.getLabResult(data.lab_request);
  },

  updateLabResult: async (id: number, data: Partial<LabResultFormData>): Promise<LabResult> => {
    const payload: any = {};
    if (data.remarks !== undefined) payload.conclusion = data.remarks;
    if (data.parameters !== undefined) payload.results = data.parameters;

    await api.patch(`${LABORATORY_BASE_URL}/reports/${id}/`, payload);
    return laboratoryService.getLabResult(id);
  },

  releaseLabResult: async (id: number): Promise<LabRequest> => {
    await api.post(`${LABORATORY_BASE_URL}/reports/${id}/finalize/`);
    return laboratoryService.getLabRequest(id);
  },

  finalizeResult: async (id: number): Promise<LabResult> => {
    try {
      await api.post(`${LABORATORY_BASE_URL}/reports/${id}/finalize/`);
    } catch (error) {
      // fallback
    }
    return laboratoryService.getLabResult(id);
  },

  parseApiError: parseApiError
};

/**
 * Map backend status to frontend status
 */
function mapBackendStatusToFrontend(backendStatus: string): 'requested' | 'verified' | 'completed' {
  switch (backendStatus) {
    case 'requested':
    case 'draft':
      return 'requested';
    case 'verified':
    case 'registered':
    case 'preliminary':
    case 'partial':
      return 'verified';
    case 'completed':
    case 'final':
    case 'amended':
    case 'corrected':
      return 'completed';
    default:
      return 'requested';
  }
}

/**
 * Get display name for test type
 */
function getTestTypeDisplay(testType: string): string {
  const displayMap: Record<string, string> = {
    'cbc': 'Complete Blood Count',
    'platelet_count': 'Platelet Count',
    'blood_typing': 'Blood Typing',
    'clotting_time': 'Clotting Time',
    'bleeding_time': 'Bleeding Time',
    'urinalysis': 'Urinalysis',
    'fecalysis': 'Fecalysis',
    'pregnancy_test': 'Pregnancy Test',
    'fbs': 'Fasting Blood Sugar',
    'rbs': 'Random Blood Sugar',
    'lipid_profile': 'Lipid Profile',
    'creatinine': 'Creatinine',
    'bua': 'Blood Uric Acid',
    'bun': 'Blood Urea Nitrogen',
    'sgpt': 'SGPT / ALT',
    'sgot': 'SGOT / AST',
    'electrolytes': 'Electrolytes',
    'blood_chemistry': 'Blood Chemistry Package',
    'hbsag': 'HBsAg (Hepatitis B)',
    'syphilis': 'Syphilis Test',
    'dengue_duo': 'Dengue Duo Test',
    'typhoid': 'Typhoid Test',
    'gram_stain': 'Gram Stain',
    'afb_stain': 'AFB Stain',
    'lipid_panel': 'Lipid Panel'
  };
  return displayMap[testType] || testType.toUpperCase();
}

export default laboratoryService;
