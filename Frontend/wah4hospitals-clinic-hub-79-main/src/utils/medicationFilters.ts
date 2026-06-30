import { MedicationRequest } from '@/types/pharmacy';

export type RequestSortOption = 'fifo' | 'filo' | 'patient-name' | 'medication-name' | 'quantity-high' | 'quantity-low';

/**
 * Sort medication requests based on selected option
 */
export const sortMedicationRequests = (
  requests: MedicationRequest[],
  sortBy: RequestSortOption
): MedicationRequest[] => {
  const sorted = [...requests];

  switch (sortBy) {
    case 'fifo': // First In First Out - Oldest first
      return sorted.sort((a, b) => 
        new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime()
      );

    case 'filo': // First In Last Out / LIFO - Newest first
      return sorted.sort((a, b) => 
        new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
      );

    case 'patient-name': // Alphabetical by patient name
      return sorted.sort((a, b) => {
        const nameA = a.admission_info?.patient_name || '';
        const nameB = b.admission_info?.patient_name || '';
        return nameA.localeCompare(nameB);
      });

    case 'medication-name': // Alphabetical by medication name
      return sorted.sort((a, b) => {
        const medA = a.inventory_item_detail?.generic_name || '';
        const medB = b.inventory_item_detail?.generic_name || '';
        return medA.localeCompare(medB);
      });

    case 'quantity-high': // Highest quantity first
      return sorted.sort((a, b) => b.quantity - a.quantity);

    case 'quantity-low': // Lowest quantity first
      return sorted.sort((a, b) => a.quantity - b.quantity);

    default:
      return sorted;
  }
};

/**
 * Filter medication requests by search query
 */
export const filterMedicationRequests = (
  requests: MedicationRequest[],
  searchQuery: string
): MedicationRequest[] => {
  if (!searchQuery.trim()) {
    return requests;
  }

  const query = searchQuery.toLowerCase();
  return requests.filter((req) =>
    req.inventory_item_detail?.generic_name?.toLowerCase().includes(query)
  );
};

/**
 * Filter medication requests by status
 */
export const filterByStatus = (
  requests: MedicationRequest[],
  status: string
): MedicationRequest[] => {
  if (!status || status === 'all') {
    return requests;
  }
  return requests.filter((req) => req.status === status);
};

/**
 * Get available status options from requests
 */
export const getAvailableStatuses = (requests: MedicationRequest[]): string[] => {
  const statuses = new Set(requests.map((req) => req.status));
  return Array.from(statuses);
};
