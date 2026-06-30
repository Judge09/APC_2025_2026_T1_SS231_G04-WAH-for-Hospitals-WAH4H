export type PatientStatus = 'Stable' | 'Critical' | 'Observation' | 'Recovering';

/* =========================
   VITAL SIGNS
   ========================= */
export interface VitalSign {
    id: string;
    admissionId: string;          // maps to backend: admission
    dateTime: string;             // maps to backend: date_time
    bloodPressure: string;
    heartRate: number;
    respiratoryRate: number;
    temperature: number;
    oxygenSaturation: number;
    staffName: string;            // maps to backend: staff_name
}

/* =========================
   CLINICAL NOTES
   ========================= */
export interface ClinicalNote {
    id: string;
    admissionId: string;          // backend: admission
    dateTime: string;             // backend: date_time
    type: 'SOAP' | 'Progress';    // 🔑 aligned with NOTE_TYPES
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    providerName: string;         // backend: provider_name
}

/* =========================
   DIETARY ORDERS
   ========================= */
export interface DietaryOrder {
    id?: string;
    admissionId: string;          // backend: admission (OneToOne)
    dietType: string;
    allergies: string[];
    npoResponse: boolean;
    activityLevel: string;
    orderedBy: string;            // backend: ordered_by
    lastUpdated: string;          // backend: last_updated
}

/* =========================
   HISTORY / TIMELINE
   ========================= */
export interface HistoryEvent {
    id: string;
    admissionId: string;          // backend: admission
    dateTime: string;             // backend: date_time
    category: 'Admission' | 'Vitals' | 'Note' | 'Procedure' | 'Medication' | 'Lab';
    description: string;
    details?: string;
}

/* =========================
   LABORATORY REQUESTS
   ========================= 
   NOTE: Laboratory operations should use laboratoryService.ts
   These types are kept for monitoring UI compatibility only.
   For actual lab operations, import from laboratory types.
   */
import { LabTestType, LabPriority, LabStatus } from './laboratory';

export interface LabRequest {
    id: string;
    admissionId: string;
    testName: string;
    testCode: LabTestType;                // LOINC code / Internal Code
    priority: LabPriority;
    notes: string;
    lifecycleStatus: LabStatus;
    status_display?: string; // Backend raw status (e.g. 'draft', 'registered')
    orderedBy: string;
    orderedAt: string;
    patient_name: string;
    patient_id: string;
    requestedBy?: string;
    requestedAt?: string;
    completedAt?: string;
    // Backend returns 'results' which is an array of result objects
    results?: {
        parameter: string;
        value: string;
        unit: string;
        referenceRange: string;
        flag?: string;
        interpretation?: string;
    }[];
}

export interface LabResult {
    findings?: string;
    results: {
        parameter: string;
        value: string;
        unit: string;
        referenceRange: string;
        flag?: string;
        interpretation?: string;
    }[];
    interpretation?: string;
    reportedBy: string;
    reportedAt: string;
}

/* =========================
   MEDICATION REQUESTS (Lifecycle-enabled)
   ========================= */
export interface MedicationRequest {
    id: number;
    admissionId: string;
    medicationName: string;
    quantity: number;
    dosage: string;
    route: string;
    frequency: string;
    notes: string;

    // Lifecycle fields (from reference implementation)
    lifecycleStatus: 'prescribed' | 'requested' | 'ready-for-admin' | 'administered';
    intent: 'order' | 'proposal';

    // Timestamps and actors
    prescribedBy: string;
    prescribedAt: string;
    requestedBy?: string;
    requestedAt?: string;
    dispensedAt?: string;
    administeredBy?: string;
    administeredAt?: string;
}

/* =========================
   MONITORING ADMISSION (UI AGGREGATE TYPE)
   ========================= */
export interface MonitoringAdmission {
    id: number;                   // admission.id
    patientId: number;
    patientName: string;
    room: string;
    doctorName: string;
    status: PatientStatus;
    encounterType: string;
    admittingDiagnosis: string;
    reasonForAdmission: string;
    admissionCategory: string;
    modeOfArrival: string;
    admissionDate: string;
    attendingPhysician: string;
    ward: string;

    // Derived / related data
    lastVitals?: VitalSign;
    lastNote?: ClinicalNote;
    dietary?: DietaryOrder;
    history?: HistoryEvent[];
}
