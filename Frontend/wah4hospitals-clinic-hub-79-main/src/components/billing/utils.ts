import { Patient } from './types';
// import { BillingRecord as APIBillingRecord } from '@/services/billingService';

// --- API Fetchers ---

// --- API Fetchers ---
// (Legacy fetchers removed)

// --- Data Converters ---

// Legacy converter functions removed
export const convertAPIToLocal = (api: any): any => {
    return api;
};

export const convertLocalToAPI = (local: any, selectedDiscount: string | null): any => {
    return local;
};
