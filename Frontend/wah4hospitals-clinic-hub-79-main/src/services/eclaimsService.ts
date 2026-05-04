// src/services/eclaimsService.ts
import api from './api';
import type { EClaim, NewEClaim, Coverage, NewCoverage, ClaimResponse, EClaimPatient } from '@/types/eclaims';

const unpage = <T>(data: any): T[] => {
  if (data?.results && Array.isArray(data.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
};

export const eclaimsService = {

  // ── eClaims ───────────────────────────────────────────────────────────────

  async getAll(params?: Record<string, string>): Promise<EClaim[]> {
    try {
      const { data } = await api.get('/api/billing/eclaims/', { params });
      return unpage<EClaim>(data);
    } catch (e) {
      console.error('Failed to fetch eClaims', e);
      return [];
    }
  },

  async getById(identifier: string): Promise<EClaim> {
    const { data } = await api.get<EClaim>(`/api/billing/eclaims/${identifier}/`);
    return data;
  },

  async create(payload: NewEClaim): Promise<EClaim> {
    const { data } = await api.post<EClaim>('/api/billing/eclaims/', payload);
    return data;
  },

  async update(identifier: string, payload: Partial<NewEClaim>): Promise<EClaim> {
    const { data } = await api.patch<EClaim>(`/api/billing/eclaims/${identifier}/`, payload);
    return data;
  },

  async submit(identifier: string): Promise<EClaim> {
    const { data } = await api.post<EClaim>(`/api/billing/eclaims/${identifier}/submit/`, {});
    return data;
  },

  async void(identifier: string): Promise<EClaim> {
    const { data } = await api.post<EClaim>(`/api/billing/eclaims/${identifier}/void/`, {});
    return data;
  },

  async delete(identifier: string): Promise<void> {
    await api.delete(`/api/billing/eclaims/${identifier}/`);
  },

  async searchPatients(query: string): Promise<EClaimPatient[]> {
    try {
      const { data } = await api.get(`/api/billing/eclaims/search_patients/?q=${encodeURIComponent(query)}`);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('Patient search failed', e);
      return [];
    }
  },

  // ── Coverage ──────────────────────────────────────────────────────────────

  async getCoverageAll(params?: Record<string, string>): Promise<Coverage[]> {
    try {
      const { data } = await api.get('/api/billing/coverage/', { params });
      return unpage<Coverage>(data);
    } catch (e) {
      console.error('Failed to fetch coverage', e);
      return [];
    }
  },

  async getCoverageForPatient(patientId: number): Promise<Coverage[]> {
    try {
      const { data } = await api.get(`/api/billing/coverage/for_patient/?patient_id=${patientId}`);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('Failed to fetch patient coverage', e);
      return [];
    }
  },

  async createCoverage(payload: NewCoverage): Promise<Coverage> {
    const { data } = await api.post<Coverage>('/api/billing/coverage/', payload);
    return data;
  },

  async updateCoverage(identifier: string, payload: Partial<NewCoverage>): Promise<Coverage> {
    const { data } = await api.patch<Coverage>(`/api/billing/coverage/${identifier}/`, payload);
    return data;
  },

  async deleteCoverage(identifier: string): Promise<void> {
    await api.delete(`/api/billing/coverage/${identifier}/`);
  },

  // ── ClaimResponses ────────────────────────────────────────────────────────

  async getResponses(params?: Record<string, string>): Promise<ClaimResponse[]> {
    try {
      const { data } = await api.get('/api/billing/claim-responses/', { params });
      return unpage<ClaimResponse>(data);
    } catch (e) {
      console.error('Failed to fetch claim responses', e);
      return [];
    }
  },

  async createResponse(payload: Partial<ClaimResponse>): Promise<ClaimResponse> {
    const { data } = await api.post<ClaimResponse>('/api/billing/claim-responses/', payload);
    return data;
  },

  // ── Shared helpers ────────────────────────────────────────────────────────

  async getPractitioners() {
    try {
      const { data } = await api.get('/api/accounts/practitioners/?role=doctor');
      return (data?.results ?? data) as any[];
    } catch (e) {
      console.error('Failed to fetch practitioners', e);
      return [];
    }
  },
};
