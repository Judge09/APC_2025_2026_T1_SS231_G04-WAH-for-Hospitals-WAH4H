// src/types/admission.ts

export interface Admission {
    id: number | string;
    encounter_id?: number;
    identifier?: string;
    admissionNo: string;
    status: string;
    priority: 'routine' | 'urgent' | 'emergency';
    patientId: string;
    patientName: string;
    location: {
        building: string;
        ward: string;
        room: string;
        bed: string;
    };
    location_ids?: (string | number)[];
    physician: string;
    participant_individual_id?: number;
    physicianId?: number; // Legacy, prefer participant_individual_id
    serviceType: string;
    admissionDate: string;
    admissionTime?: string;
    dischargeDate?: string | null;
    updated_at?: string;

    // UI Aligned Fields
    encounterType: 'IMP' | 'EMER' | 'AMB' | 'HH';
    reasonForAdmission: string;
    admitSource: string;
    preAdmissionIdentifier?: string;
    isReadmission: boolean;
    dietPreference: string[];
    specialArrangements: string[];
    specialCourtesy: string[];

    // Technical/Admin Fields (connected to model)
    type: string;

    diagnosis_rank: string;
    diagnosis_use: string;

    // Backend Raw fields (optional)
    class_field?: string;
    reason_code?: string;
    admit_source?: string;
    discharge_disposition?: string;
    period_start?: string;
    period_end?: string;
    diet_preference?: string;
    special_courtesy?: string;
    special_arrangement?: string;
    re_admission?: boolean;
    procedures?: any[];

    subject_id?: number;
    patient_summary?: any;
    location_summary?: any;
    practitioner_summary?: any;
    created_at?: string;
}

export interface NewAdmission {
    patientId: string; // Internal Patient ID or Subject ID
    patientName: string;
    admissionDate: string;
    physician: string; // Name
    participant_individual_id?: number;
    physicianId?: number; // Legacy
    serviceType: string;
    priority: 'routine' | 'urgent' | 'emergency';
    location: {
        building: string;
        ward: string;
        room: string;
        bed: string;
    };
    location_ids?: (string | number)[];
    admitSource: string;
    dietPreference: string[];
    specialArrangements: string[];
    specialCourtesy: string[];

    // Technical/Admin Fields
    type: string;

    diagnosis_rank: string;
    diagnosis_use: string;

    // Expanded fields for UI match
    encounterType: 'IMP' | 'EMER' | 'AMB' | 'HH';
    admissionTime: string;
    preAdmissionIdentifier?: string;
    isReadmission: boolean;
    reasonForAdmission?: string;

    // Backend mapping fields
    subject_id?: number;
}

