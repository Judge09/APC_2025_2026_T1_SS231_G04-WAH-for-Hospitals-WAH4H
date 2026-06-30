export interface InventoryItem {
  id: number;
  generic_name: string;
  item_code?: string;
  brand_name: string;
  description?: string;
  quantity: number;
  minimum_stock_level: number;
  unit_price: number;
  expiry_date: string; // ISO string
  batch_number: string;
  manufacturer?: string;
  category?: string;
  form?: string;
  unit_of_measure?: string;
  is_active: boolean;
  is_expired: boolean;
  is_expiring_soon: boolean;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  status_indicators: StatusIndicator[];
  created_at: string;
  updated_at: string;
}

export interface StatusIndicator {
  type: 'expired' | 'expiring_soon' | 'low_stock' | 'out_of_stock';
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface MedicationRequest {
  id: number;
  admission: number; // FK to Admission
  admission_info?: {
    id: number;
    patient_name: string;
    admission_date: string;
  };
  inventory_item: number; // ID only
  inventory_item_detail?: InventoryItem; // full inventory info, read-only
  quantity: number;
  status: 'prescribed' | 'draft' | 'pending' | 'active' | 'approved' | 'denied' | 'dispensed' | 'cancelled' | 'completed';
  notes?: string;
  requested_by?: string;
  approved_by?: string;
  requested_at: string;
  updated_at: string;
  patient_name?: string;
  practitioner_name?: string;
}
