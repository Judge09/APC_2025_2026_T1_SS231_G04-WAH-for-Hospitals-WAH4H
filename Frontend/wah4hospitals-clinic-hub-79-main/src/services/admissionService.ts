// src/services/admissionService.ts
import api from "./api"; // Shared Axios instance
import type { Admission, NewAdmission } from "@/types/admission";

export interface CareTeamMember {
  id: number;
  practitioner_id: number;
  full_name: string;
  qualification: string;
  role_type: string;
  role_display: string;
  added_at: string;
}

export const admissionService = {

    /**
     * Get Practitioners (Physicians)
     * @param role Optional role to filter by (e.g., 'doctor')
     */
    async getPractitioners(role?: string) {
        try {
            const url = role ? `/api/accounts/practitioners/?role=${role}` : '/api/accounts/practitioners/';
            const response = await api.get(url);
            let data = response.data;
            if (data.results && Array.isArray(data.results)) {
                data = data.results;
            }
            return data;
        } catch (error) {
            console.error("Failed to fetch practitioners", error);
            return [];
        }
    },

    /**
     * Get Location Hierarchy
     */
    async getLocations() {
        try {
            const response = await api.get('/api/admission/encounters/locations/');
            return response.data;
        } catch (error) {
            console.error("Failed to fetch locations", error);
            return null;
        }
    },

    /**
     * List all encounters (admissions)
     */
    async getAll(): Promise<Admission[]> {
        try {
            const response = await api.get('/api/admission/encounters/');
            let data = response.data;

            // Handle pagination (DRF returns { count, next, previous, results })
            if (data.results && Array.isArray(data.results)) {
                data = data.results;
            }

            if (!Array.isArray(data)) return [];

            return data.map((d: any) => {
                const locString = d.location_status || '';
                const locParts = locString.split('|');
                const summaryName = d.location_name || '';

                return {
                    id: d.identifier,
                    encounter_id: d.encounter_id,
                    admissionNo: d.identifier || `ENC-${d.encounter_id}`,
                    patientId: d.patient_summary?.patient_id || d.subject_id?.toString() || "N/A",
                    patientName: d.patient_summary?.full_name || "Unknown Patient",
                    admissionDate: d.period_start?.split('T')[0] || '',
                    admissionTime: d.period_start?.split('T')[1]?.slice(0, 5) || '',
                    physician: d.practitioner_summary?.full_name || d.participant_name || "Unassigned",
                    serviceType: d.service_type || "General",
                    reasonForAdmission: d.reason_code || 'Pending',
                    priority: d.priority || 'routine',
                    encounterType: d.class_field || 'IMP',
                    status: d.status,
                    location: {
                        ward: d.ward || locParts[0] || '',
                        room: d.room || locParts[1] || '',
                        bed: d.bed || locParts[2] || '',
                        building: d.location_ids && d.location_ids.length > 0 ? d.location_ids[0] : ''
                    },
                    admitSource: d.admit_source || 'Physician Referral',
                    preAdmissionIdentifier: d.pre_admission_identifier,
                    isReadmission: !!d.re_admission,
                    dietPreference: d.diet_preference ? d.diet_preference.split(',').filter(Boolean) : [],
                    specialArrangements: d.special_arrangement ? d.special_arrangement.split(',').filter(Boolean) : [],
                    specialCourtesy: d.special_courtesy ? d.special_courtesy.split(',').filter(Boolean) : [],
                    type: d.type || 'admission',

                    diagnosis_rank: d.diagnosis_rank || '1',
                    diagnosis_use: d.diagnosis_use || 'admission',
                    location_ids: d.location_ids || [],
                    physicianId: d.participant_individual_id,
                    participant_individual_id: d.participant_individual_id,
                    subject_id: d.subject_id,
                    created_at: d.created_at,
                    updated_at: d.updated_at,
                    dischargeDate: d.period_end ? d.period_end : null,
                } as Admission;
            });
        } catch (error) {
            console.error("Failed to fetch admissions", error);
            return [];
        }
    },

    /**
     * Search Patients
     */
    async searchPatients(query: string) {
        try {
            const response = await api.get(`/api/admission/encounters/search_patients/?q=${query}`);
            return response.data;
        } catch (error) {
            console.error("Search failed", error);
            return [];
        }
    },

    /**
     * Create New Admission
     */
    async create(admission: NewAdmission) {
        const payload = {
            subject_id: admission.patientId,
            class_field: admission.encounterType,
            type: admission.type || 'admission',

            diagnosis_rank: admission.diagnosis_rank,
            diagnosis_use: admission.diagnosis_use,
            service_type: admission.serviceType,
            priority: admission.priority,
            // ✅ Fixed Code (Sends only YYYY-MM-DD)
            period_start: admission.admissionDate,
            reason_code: admission.reasonForAdmission,
            participant_individual_id: admission.participant_individual_id || admission.physicianId || null,
            location_id: null,
            location_ids: admission.location_ids,
            // Save standardized location string
            location_status: `${admission.location.ward}|${admission.location.room}|${admission.location.bed}`,
            ward: admission.location.ward,
            room: admission.location.room,
            bed: admission.location.bed,
            admit_source: admission.admitSource,
            pre_admission_identifier: admission.preAdmissionIdentifier,
            diet_preference: Array.isArray(admission.dietPreference) ? admission.dietPreference.join(',') : '',
            special_courtesy: Array.isArray(admission.specialCourtesy) ? admission.specialCourtesy.join(',') : '',
            special_arrangement: Array.isArray(admission.specialArrangements) ? admission.specialArrangements.join(',') : '',
            re_admission: admission.isReadmission
        };
        const response = await api.post('/api/admission/encounters/', payload);
        return response.data;
    },

    /**
     * Get Single Admission Details
     */
    getById: async (id: number | string): Promise<Admission> => {
        const { data } = await api.get<any>(`/api/admission/encounters/${id}/`);
        const locParts = data.location_status ? data.location_status.split('|') : [];

        return {
            ...data,
            id: data.identifier,
            encounter_id: data.encounter_id,
            admissionNo: data.identifier,
            status: data.status,
            priority: data.priority || 'routine',
            patientId: data.patient_summary?.patient_id || data.subject_id?.toString() || 'N/A',
            patientName: data.patient_summary?.full_name || "Unknown Patient",
            location: {
                ward: data.ward || locParts[0] || '',
                room: data.room || locParts[1] || '',
                bed: data.bed || locParts[2] || '',
                building: data.location_ids && data.location_ids.length > 0 ? data.location_ids[0] : ''
            },
            physician: data.practitioner_summary?.full_name || '',
            serviceType: data.service_type || '',
            admissionDate: data.period_start?.split('T')[0] || '',
            admissionTime: data.period_start?.split('T')[1]?.slice(0, 5) || '',
            reasonForAdmission: data.reason_code || 'Pending',
            encounterType: data.class_field || 'IMP',
            admitSource: data.admit_source || 'Physician Referral',
            preAdmissionIdentifier: data.pre_admission_identifier || '',
            isReadmission: !!data.re_admission,
            dietPreference: data.diet_preference ? data.diet_preference.split(',').filter(Boolean) : [],
            specialArrangements: data.special_arrangement ? data.special_arrangement.split(',').filter(Boolean) : [],
            specialCourtesy: data.special_courtesy ? data.special_courtesy.split(',').filter(Boolean) : [],
            type: data.type || 'admission',

            diagnosis_rank: data.diagnosis_rank || '1',
            diagnosis_use: data.diagnosis_use || 'admission',
            location_ids: data.location_ids || [],
            physicianId: data.participant_individual_id,
            participant_individual_id: data.participant_individual_id,
            subject_id: data.subject_id,
            created_at: data.created_at,
            updated_at: data.updated_at,
            dischargeDate: data.period_end ? data.period_end : null,
        } as Admission;
    },

    /**
     * Update Admission
     */
    async update(id: number | string, admission: Partial<Admission>): Promise<Admission> {
        try {
            const payload: any = { ...admission };

            // Map UI fields back to backend names if they exist
            if ('encounterType' in admission) payload.class_field = admission.encounterType;
            if ('serviceType' in admission) payload.service_type = admission.serviceType;
            if ('admitSource' in admission) payload.admit_source = admission.admitSource;
            if ('priority' in admission) payload.priority = admission.priority;
            if ('preAdmissionIdentifier' in admission) payload.pre_admission_identifier = admission.preAdmissionIdentifier;

            if ('reasonForAdmission' in admission) {
                payload.reason_code = admission.reasonForAdmission;
            }
            if ('isReadmission' in admission) payload.re_admission = admission.isReadmission;
            if ('dietPreference' in admission && Array.isArray(admission.dietPreference)) {
                payload.diet_preference = admission.dietPreference.join(',');
            }
            if ('specialArrangements' in admission && Array.isArray(admission.specialArrangements)) {
                payload.special_arrangement = admission.specialArrangements.join(',');
            }
            if ('specialCourtesy' in admission && Array.isArray(admission.specialCourtesy)) {
                payload.special_courtesy = admission.specialCourtesy.join(',');
            }
            if (admission.location) {
                payload.location_status = `${admission.location.ward}|${admission.location.room}|${admission.location.bed}`;
                payload.ward = admission.location.ward;
                payload.room = admission.location.room;
                payload.bed = admission.location.bed;
            }
            if (admission.location_ids) {
                payload.location_ids = admission.location_ids;
            }

            const response = await api.put(`/api/admission/encounters/${id}/`, payload);
            // Transform back to Admission type using existing logic structure
            const data = response.data;
            const locParts = data.location_status ? data.location_status.split('|') : [];

            return {
                ...data,
                id: data.identifier,
                encounter_id: data.encounter_id,
                admissionNo: data.identifier,
                status: data.status,
                priority: data.priority || 'routine',
                patientId: data.patient_summary?.patient_id || data.subject_id?.toString() || 'N/A',
                patientName: data.patient_summary?.full_name || "Unknown Patient",
                location: {
                    ward: data.ward || locParts[0] || '',
                    room: data.room || locParts[1] || '',
                    bed: data.bed || locParts[2] || '',
                    building: data.location_ids && data.location_ids.length > 0 ? data.location_ids[0] : ''
                },
                physician: data.practitioner_summary?.full_name || '',
                serviceType: data.service_type || '',
                admissionDate: data.period_start?.split('T')[0] || '',
                admissionTime: data.period_start?.split('T')[1]?.slice(0, 5) || '',
                reasonForAdmission: data.reason_code || 'Pending',
                encounterType: data.class_field || 'IMP',
                admitSource: data.admit_source || 'Physician Referral',
                preAdmissionIdentifier: data.pre_admission_identifier || '',
                isReadmission: !!data.re_admission,
                dietPreference: data.diet_preference ? data.diet_preference.split(',').filter(Boolean) : [],
                specialArrangements: data.special_arrangement ? data.special_arrangement.split(',').filter(Boolean) : [],
                specialCourtesy: data.special_courtesy ? data.special_courtesy.split(',').filter(Boolean) : [],
                type: data.type || 'admission',

                diagnosis_rank: data.diagnosis_rank || '1',
                diagnosis_use: data.diagnosis_use || 'admission',
                location_ids: data.location_ids || [],
                physicianId: data.participant_individual_id,
                participant_individual_id: data.participant_individual_id,
                subject_id: data.subject_id,
                created_at: data.created_at,
                updated_at: data.updated_at,
                dischargeDate: data.period_end ? data.period_end : null,
            } as Admission;
        } catch (error) {
            console.error("Error updating admission", error);
            throw error;
        }
    },

    /**
     * Discharge Patient
     */
    async discharge(id: number | string, dischargeData: { period_end: string; discharge_disposition?: string; discharge_destination_id?: number }): Promise<Admission> {
        const { data } = await api.post<Admission>(`/api/admission/encounters/${id}/discharge/`, dischargeData);
        return data;
    },

    /**
     * Delete Admission
     */
    async delete(id: number | string): Promise<void> {
        await api.delete(`/api/admission/encounters/${id}/`);
    },

    // ── Care Team ──────────────────────────────────────────────────────────

    async getCareTeam(encounterId: number | string): Promise<CareTeamMember[]> {
        const { data } = await api.get<CareTeamMember[]>(
            `/api/admission/encounters/${encounterId}/care_team/`,
        );
        return data;
    },

    async addCareTeamMember(
        encounterId: number | string,
        practitionerId: number,
        roleType: string,
    ): Promise<CareTeamMember> {
        const { data } = await api.post<CareTeamMember>(
            `/api/admission/encounters/${encounterId}/care_team/`,
            { practitioner_id: practitionerId, role_type: roleType },
        );
        return data;
    },

    async removeCareTeamMember(encounterId: number | string, memberId: number): Promise<void> {
        await api.delete(`/api/admission/encounters/${encounterId}/care_team/${memberId}/`);
    },
};
