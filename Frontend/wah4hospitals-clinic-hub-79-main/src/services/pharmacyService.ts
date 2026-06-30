
import api from './api';
import { InventoryItem, MedicationRequest } from '@/types/pharmacy';

const PHARMACY_BASE_URL = '/api/pharmacy';

class PharmacyService {

  // ==================== INVENTORY ====================

  /**
   * Fetch all inventory items mapping backend fields to frontend types
   */
  async getInventory(params?: { show_expired?: boolean; show_inactive?: boolean }): Promise<InventoryItem[]> {
    try {
      const response = await api.get(`${PHARMACY_BASE_URL}/inventory/`, { params });
      const items = Array.isArray(response.data) ? response.data : (response.data.results || []);
      
      // Map backend fields to frontend InventoryItem interface
      return items.map((item: any) => {
        try {
          return {
            id: item.inventory_id,
            item_code: item.item_code,
            generic_name: item.item_name,
            brand_name: item.item_name,
            description: item.description,
            category: item.category,
            form: item.form,
            quantity: item.current_stock,
            minimum_stock_level: item.reorder_level,
            unit_price: parseFloat(item.unit_cost),
            expiry_date: item.expiry_date,
            batch_number: item.batch_number,
            unit_of_measure: item.unit_of_measure,
            manufacturer: item.manufacturer,
            is_active: item.status === 'active',
            // Derived status flags logic
            is_expired: new Date(new Date().setHours(0,0,0,0)) > new Date(new Date(item.expiry_date).setHours(0,0,0,0)),
            is_expiring_soon: false, 
            is_low_stock: item.current_stock <= item.reorder_level,
            is_out_of_stock: item.current_stock === 0,
            status_indicators: [], 
            created_at: item.created_at,
            updated_at: item.updated_at
          };
        } catch (mapError) {
          console.error('Error mapping inventory item:', item, mapError);
          throw mapError;
        }
      });
    } catch (error) {
      console.error('Error in getInventory:', error);
      throw error;
    }
  }

  /**
   * Create a new inventory item
   */
  async addInventoryItem(data: any): Promise<InventoryItem> {
    // Transform frontend data to backend expected format
    const payload = {
      item_code: data.item_code || `MED-${Date.now()}`,
      item_name: data.generic_name,
      category: data.category,
      form: data.form,
      manufacturer: data.manufacturer,
      description: data.description,
      batch_number: data.batch_number,
      current_stock: data.quantity,
      reorder_level: data.minimum_stock_level,
      unit_of_measure: data.unit_of_measure,
      unit_cost: data.unit_price,
      status: 'active',
      expiry_date: data.expiry_date,
      last_restocked_datetime: new Date().toISOString(),
      created_by: 'System' // Should be user ID in real app
    };

    const response = await api.post(`${PHARMACY_BASE_URL}/inventory/`, payload);
    return this.mapToInventoryItem(response.data);
  }

  /**
   * Update an existing inventory item
   */
  async updateInventoryItem(id: number, data: any): Promise<InventoryItem> {
    const payload = {
      item_code: data.item_code,
      item_name: data.generic_name,
      category: data.category,
      form: data.form,
      manufacturer: data.manufacturer,
      description: data.description,
      batch_number: data.batch_number,
      current_stock: data.quantity,
      reorder_level: data.minimum_stock_level,
      unit_of_measure: data.unit_of_measure,
      unit_cost: data.unit_price,
      status: data.is_active ? 'active' : 'inactive',
      expiry_date: data.expiry_date,
    };

    const response = await api.put(`${PHARMACY_BASE_URL}/inventory/${id}/`, payload);
    return this.mapToInventoryItem(response.data);
  }

  // ==================== MEDICATION REQUESTS ====================

  /**
   * Fetch medication requests
   */
  async getRequests(statusFilter: string = 'active'): Promise<MedicationRequest[]> {
     // Backend status: active, on-hold, cancelled, completed, entered-in-error, stopped, draft, unknown
     // Frontend status: pending, approved, denied, dispensed
     
     // Mapping 'pending' (frontend) -> 'active' (backend)
     // Mapping 'prescribed' (frontend) -> 'draft' (backend)
     let backendStatus = statusFilter;
     if (statusFilter === 'pending') backendStatus = 'active';
     if (statusFilter === 'prescribed') backendStatus = 'draft';

     const response = await api.get(`${PHARMACY_BASE_URL}/requests/`, {
         params: { status: backendStatus }
     });
     
     const requests = Array.isArray(response.data) ? response.data : (response.data.results || []);

     // Fetch inventory to match with requests
     const inventory = await this.getInventory();

     return requests.map((req: any) => {
         // Find matching inventory item by medication name
         const inventoryItem = inventory.find(
             item => item.generic_name?.toLowerCase() === req.medication_display?.toLowerCase()
         );

         return {
             id: req.medication_request_id,
             admission: req.encounter_id,
             admission_info: {
                 id: req.encounter_id,
                 patient_name: req.patient_name || `Patient #${req.subject_id}`,
                 admission_date: req.authored_on
             },
             inventory_item: inventoryItem?.id || 0,
             inventory_item_detail: inventoryItem || {
                 id: 0,
                 generic_name: req.medication_display || req.medication_code,
                 brand_name: 'N/A',
                 description: 'Unknown',
                 quantity: 0,
                 minimum_stock_level: 0,
                 unit_price: 0,
                 expiry_date: new Date().toISOString(),
                 batch_number: 'N/A',
                 manufacturer: 'Unknown',
                 is_active: false,
                 is_expired: false,
                 is_expiring_soon: false,
                 is_low_stock: true,
                 is_out_of_stock: true,
                 status_indicators: [],
                 created_at: req.authored_on,
                 updated_at: req.updated_at
             },
             quantity: req.dispense_quantity || 0,
             status: req.status === 'active' ? 'pending' : (req.status === 'draft' ? 'prescribed' : req.status),
             notes: req.note,
             requested_by: req.practitioner_name || `Practitioner #${req.requester_id}`,
             requested_at: req.authored_on,
             updated_at: req.updated_at,
             patient_name: req.patient_name,
             practitioner_name: req.practitioner_name
         };
     });
  }

  /**
   * Fetch requests by admission (encounter)
   */
  async getRequestsByAdmission(admissionId: number): Promise<MedicationRequest[]> {
     const response = await api.get(`${PHARMACY_BASE_URL}/requests/by-encounter/`, {
         params: { encounter_id: admissionId }
     });
     
     const requestList = Array.isArray(response.data) ? response.data : (response.data.results || []);
     
     // Fetch inventory to match with requests
     const inventory = await this.getInventory();
     
     return requestList.map((req: any) => {
         // Find matching inventory item by medication name
         const inventoryItem = inventory.find(
             item => item.generic_name?.toLowerCase() === req.medication_display?.toLowerCase()
         );

         return {
             id: req.medication_request_id,
             admission: req.encounter_id,
             admission_info: {
                 id: req.encounter_id,
                 patient_name: req.patient_name || `Patient #${req.subject_id}`,
                 admission_date: req.authored_on
             },
             inventory_item: inventoryItem?.id || 0,
             inventory_item_detail: inventoryItem || {
                 id: 0,
                 generic_name: req.medication_display || req.medication_code,
                 brand_name: 'N/A',
                 description: 'Unknown',
                 quantity: 0,
                 minimum_stock_level: 0,
                 unit_price: 0,
                 expiry_date: new Date().toISOString(),
                 batch_number: 'N/A',
                 manufacturer: 'Unknown',
                 is_active: false,
                 is_expired: false,
                 is_expiring_soon: false,
                 is_low_stock: true,
                 is_out_of_stock: true,
                 status_indicators: [],
                 created_at: req.authored_on,
                 updated_at: req.updated_at
             },
             quantity: req.dispense_quantity || 0,
             status: req.status === 'active' ? 'pending' : (req.status === 'draft' ? 'prescribed' : req.status),
             notes: req.note,
             requested_by: req.practitioner_name || `Practitioner #${req.requester_id}`,
             requested_at: req.authored_on,
             updated_at: req.updated_at,
             patient_name: req.patient_name,
             practitioner_name: req.practitioner_name
         };
     });
  }

  /**
   * Create a new medication request
   */
  async createRequest(data: {
      admission: number;
      subject_id: number; // Patient ID
      requester_id: number; // Practitioner ID
      inventory_item?: number;
      inventory_item_detail?: InventoryItem; // Pass actual inventory details
      quantity: number;
      notes?: string;
      medication_code?: string;
      medication_display?: string;
  }): Promise<MedicationRequest> {
     // Generate unique identifier for the medication request
     const identifier = `MR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
     
     // Transform frontend data to backend expected format
     const payload = {
         identifier: identifier,
         status: 'draft',
         intent: 'order',
         priority: 'routine',
         subject_id: data.subject_id,
         encounter_id: data.admission,
         requester_id: data.requester_id,
         medication_code: data.medication_code || 'MED-UNKNOWN',
         medication_display: data.medication_display || 'Unknown Medication',
         dispense_quantity: data.quantity,
         authored_on: new Date().toISOString(),
         note: data.notes || ''
     };

     try {
       const response = await api.post(`${PHARMACY_BASE_URL}/requests/`, payload);
       
       // Return mapped object similar to getRequests
       const req = response.data;
       return {
           id: req.medication_request_id,
           admission: req.encounter_id,
           admission_info: { id: req.encounter_id, patient_name: 'Unknown', admission_date: req.authored_on },
           inventory_item: data.inventory_item || 0, 
           inventory_item_detail: data.inventory_item_detail || {
               id: 0,
               generic_name: req.medication_display || req.medication_code,
               brand_name: req.medication_display || req.medication_code,
               description: 'Pending Request',
               quantity: 0,
               minimum_stock_level: 0,
               unit_price: 0,
               expiry_date: new Date().toISOString(),
               batch_number: 'N/A',
               manufacturer: 'Unknown',
               is_active: true,
               is_expired: false,
               is_expiring_soon: false,
               is_low_stock: false,
               is_out_of_stock: true,
               status_indicators: [],
               created_at: new Date().toISOString(),
               updated_at: new Date().toISOString()
           },
           quantity: req.dispense_quantity || 0,
           status: req.status === 'active' ? 'pending' : (req.status === 'draft' ? 'prescribed' : req.status),
           notes: req.note,
           requested_by: `Practitioner #${req.requester_id}`,
           requested_at: req.authored_on,
           updated_at: req.updated_at
       };
     } catch (error: any) {
       console.error('Error creating medication request:', error);
       console.error('Error response:', error.response?.data);
       console.error('Error status:', error.response?.status);
       
       // Throw a more descriptive error
       const errorMessage = error.response?.data?.error 
         || error.response?.data?.message 
         || error.response?.data 
         || 'Failed to create medication request';
       
       throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
     }
  }

  /**
   * Delete a medication request
   */
  async deleteRequest(id: number): Promise<void> {
    try {
      await api.delete(`${PHARMACY_BASE_URL}/requests/${id}/`);
    } catch (error: any) {
      console.error('Error deleting medication request:', error);
       const errorMessage = error.response?.data?.error 
         || error.response?.data?.message 
         || error.response?.data 
         || 'Failed to delete medication request';
       
       throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  }

  // Helper
  private mapToInventoryItem(item: any): InventoryItem {
      return {
          id: item.inventory_id,
          item_code: item.item_code,
          generic_name: item.item_name,
          brand_name: item.item_name,
          description: item.description,
          category: item.category,
          form: item.form,
          quantity: item.current_stock,
          minimum_stock_level: item.reorder_level,
          unit_price: parseFloat(item.unit_cost),
          expiry_date: item.expiry_date,
          batch_number: item.batch_number,
          unit_of_measure: item.unit_of_measure,
          manufacturer: item.manufacturer,
          is_active: item.status === 'active',
          is_expired: new Date(item.expiry_date) < new Date(),
          is_expiring_soon: false,
          is_low_stock: item.current_stock <= item.reorder_level,
          is_out_of_stock: item.current_stock === 0,
          status_indicators: [],
          created_at: item.created_at,
          updated_at: item.updated_at
      };
  }
    /**
     * Update medication request status
     */
    async updateRequestStatus(id: number, status: string): Promise<MedicationRequest> {
        try {
            const response = await api.patch(`${PHARMACY_BASE_URL}/requests/${id}/`, { status });
            // Re-fetch to return full object with inventory details
            const updated = await this.getRequests(); // Inefficient but safe for now, better to get by ID
            return updated.find(r => r.id === id) as MedicationRequest;
        } catch (error: any) {
             console.error('Error updating medication request status:', error);
             throw new Error(error.response?.data?.message || 'Failed to update status');
        }
    }
}

export default new PharmacyService();
