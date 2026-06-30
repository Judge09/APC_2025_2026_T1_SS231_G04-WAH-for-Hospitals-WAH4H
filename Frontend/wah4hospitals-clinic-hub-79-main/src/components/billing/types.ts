export interface Patient {
    id: number;
    patientName: string;
    room: string;
    admissionDate: string;
    condition: string;
    physician: string;
    department: string;
    age: number;
    status: 'pending' | 'ready' | 'discharged';
    dischargeDate?: string;
}


