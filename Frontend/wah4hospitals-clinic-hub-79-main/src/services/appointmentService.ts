// src/services/appointmentService.ts
import api from './api';
import type {
  Appointment,
  NewAppointment,
  Schedule,
  NewSchedule,
  Slot,
  NewSlot,
} from '@/types/appointment';

const unpage = <T>(data: any): T[] => {
  if (data?.results && Array.isArray(data.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
};

export const appointmentService = {

  // ── Appointments ─────────────────────────────────────────────────────────

  async getAll(params?: Record<string, string>): Promise<Appointment[]> {
    try {
      const response = await api.get('/api/admission/appointments/', { params });
      return unpage<Appointment>(response.data);
    } catch (e) {
      console.error('Failed to fetch appointments', e);
      return [];
    }
  },

  async getById(identifier: string): Promise<Appointment> {
    const { data } = await api.get<Appointment>(`/api/admission/appointments/${identifier}/`);
    return data;
  },

  async create(payload: NewAppointment): Promise<Appointment> {
    const { data } = await api.post<Appointment>('/api/admission/appointments/', payload);
    return data;
  },

  async update(identifier: string, payload: Partial<NewAppointment>): Promise<Appointment> {
    const { data } = await api.patch<Appointment>(
      `/api/admission/appointments/${identifier}/`,
      payload,
    );
    return data;
  },

  async cancel(
    identifier: string,
    reason?: { cancellation_reason_code?: string; cancellation_reason_display?: string },
  ): Promise<Appointment> {
    const { data } = await api.post<Appointment>(
      `/api/admission/appointments/${identifier}/cancel/`,
      reason ?? {},
    );
    return data;
  },

  async arrive(identifier: string): Promise<Appointment> {
    const { data } = await api.post<Appointment>(
      `/api/admission/appointments/${identifier}/arrive/`,
      {},
    );
    return data;
  },

  async fulfill(identifier: string, resulting_encounter_id?: number): Promise<Appointment> {
    const { data } = await api.post<Appointment>(
      `/api/admission/appointments/${identifier}/fulfill/`,
      resulting_encounter_id != null ? { resulting_encounter_id } : {},
    );
    return data;
  },

  async delete(identifier: string): Promise<void> {
    await api.delete(`/api/admission/appointments/${identifier}/`);
  },

  async searchPatients(query: string) {
    try {
      const response = await api.get(`/api/admission/appointments/search_patients/?q=${encodeURIComponent(query)}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (e) {
      console.error('Patient search failed', e);
      return [];
    }
  },

  // ── WAH4PC gateway — fetch from WAH4Patient mobile app ───────────────────

  /**
   * Request appointments for a patient from the WAH4PC gateway.
   * Mirrors the patient fetch flow: returns a transactionId immediately;
   * the gateway delivers the FHIR Appointment Bundle asynchronously via
   * webhook, which auto-imports appointments into the local system.
   */
  async fetchFromGateway(
    targetProviderId: string,
    philHealthId: string,
    options?: { reason?: string; notes?: string },
  ): Promise<{ transactionId: string; [key: string]: unknown }> {
    const { data } = await api.post(
      '/api/admission/appointments/wah4pc/fetch/',
      {
        targetProviderId,
        philHealthId,
        ...(options?.reason ? { reason: options.reason } : {}),
        ...(options?.notes  ? { notes:  options.notes  } : {}),
      },
    );
    return data;
  },

  // ── Schedules ─────────────────────────────────────────────────────────────

  async getSchedules(params?: Record<string, string>): Promise<Schedule[]> {
    try {
      const response = await api.get('/api/admission/schedules/', { params });
      return unpage<Schedule>(response.data);
    } catch (e) {
      console.error('Failed to fetch schedules', e);
      return [];
    }
  },

  async createSchedule(payload: NewSchedule): Promise<Schedule> {
    const { data } = await api.post<Schedule>('/api/admission/schedules/', payload);
    return data;
  },

  async updateSchedule(identifier: string, payload: Partial<NewSchedule>): Promise<Schedule> {
    const { data } = await api.patch<Schedule>(`/api/admission/schedules/${identifier}/`, payload);
    return data;
  },

  async deleteSchedule(identifier: string): Promise<void> {
    await api.delete(`/api/admission/schedules/${identifier}/`);
  },

  async getScheduleSlots(scheduleIdentifier: string, status?: string): Promise<Slot[]> {
    try {
      const params = status ? { status } : undefined;
      const response = await api.get(`/api/admission/schedules/${scheduleIdentifier}/slots/`, { params });
      return unpage<Slot>(response.data);
    } catch (e) {
      console.error('Failed to fetch schedule slots', e);
      return [];
    }
  },

  // ── Slots ─────────────────────────────────────────────────────────────────

  async getAvailableSlots(params?: {
    practitioner_id?: number;
    location_id?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<Slot[]> {
    try {
      const response = await api.get('/api/admission/slots/available/', { params: params as any });
      return unpage<Slot>(response.data);
    } catch (e) {
      console.error('Failed to fetch available slots', e);
      return [];
    }
  },

  async createSlot(payload: NewSlot): Promise<Slot> {
    const { data } = await api.post<Slot>('/api/admission/slots/', payload);
    return data;
  },

  async updateSlot(identifier: string, payload: Partial<NewSlot & { status: string }>): Promise<Slot> {
    const { data } = await api.patch<Slot>(`/api/admission/slots/${identifier}/`, payload);
    return data;
  },

  async deleteSlot(identifier: string): Promise<void> {
    await api.delete(`/api/admission/slots/${identifier}/`);
  },

  // ── Shared helpers ────────────────────────────────────────────────────────

  async getPractitioners(role?: string) {
    try {
      const url = role
        ? `/api/accounts/practitioners/?role=${encodeURIComponent(role)}`
        : '/api/accounts/practitioners/';
      const response = await api.get(url);
      return unpage<any>(response.data);
    } catch (e) {
      console.error('Failed to fetch practitioners', e);
      return [];
    }
  },
};
