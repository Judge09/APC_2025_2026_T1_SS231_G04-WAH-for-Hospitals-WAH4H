import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Search,
  PackagePlus,
  Edit,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RestockModal from '@/components/pharmacy/RestockModal';
import EditInventoryModal from '@/components/pharmacy/EditInventoryModal';
import DeleteConfirmationModal from '@/components/pharmacy/DeleteConfirmationModal';
import { DispenseModal } from '@/components/pharmacy/DispenseModal';
import { InventoryItem, MedicationRequest } from '@/types/pharmacy';
import pharmacyService from '@/services/pharmacyService';
import { sortMedicationRequests, filterMedicationRequests, filterByStatus, type RequestSortOption } from '@/utils/medicationFilters';

const API_BASE = (
  import.meta.env.BACKEND_PHARMACY_8000 ||
  import.meta.env.BACKEND_PHARMACY ||
  'http://localhost:8000/api/pharmacy'
).replace(/\/$/, '');

const Pharmacy: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'requests'>('inventory');

  // Inventory State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpired, setShowExpired] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loadingInventory, setLoadingInventory] = useState(true);

  // Medication Requests State
  const [requests, setRequests] = useState<MedicationRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MedicationRequest[]>([]);
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [requestSortBy, setRequestSortBy] = useState<RequestSortOption>('filo');
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Modal State
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [dispenseRequest, setDispenseRequest] = useState<MedicationRequest | null>(null);

  // ==================== Fetch Inventory ====================
  const fetchInventory = async () => {
    try {
      setLoadingInventory(true);
      const data = await pharmacyService.getInventory();
      setInventory(data);
      // Logic for filtering and sorting will be handled by useEffect
    } catch (err) {
      console.error(err);
      toast.error('Failed to load inventory');
      setInventory([]);
      setFilteredInventory([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  // ==================== Fetch Medication Requests ====================
  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const data = await pharmacyService.getRequests('pending');
      setRequests(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pending requests');
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchRequests();
  }, []);

  // ==================== Filter and Sort Requests ====================
  useEffect(() => {
    let result = [...requests];

    // Apply search filter
    result = filterMedicationRequests(result, requestSearchQuery);

    // Apply sorting
    result = sortMedicationRequests(result, requestSortBy);

    setFilteredRequests(result);
  }, [requests, requestSearchQuery, requestSortBy]);

  // ==================== Filter and Sort Inventory ====================
  useEffect(() => {
    let result = [...inventory];

    // Show/Hide Expired
    if (showExpired) {
      // If filter is ON, show ONLY expired items
      result = result.filter(item => item.is_expired);
    } else {
      // If filter is OFF, show ONLY active (non-expired) items
      result = result.filter(item => !item.is_expired);
    }

    // Search Filter (Name only)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.generic_name.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      const nameA = a.generic_name.toLowerCase();
      const nameB = b.generic_name.toLowerCase();
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });

    setFilteredInventory(result);
  }, [searchQuery, inventory, sortOrder, showExpired]);

  // ==================== Handlers ====================
  const handleInventoryAdd = (item: InventoryItem) => {
    setInventory((prev) => [item, ...prev]);
  };

  const handleInventoryUpdate = (updatedItem: InventoryItem) => {
    const updateList = (list: InventoryItem[]) =>
      list.map((item) => (item.id === updatedItem.id ? updatedItem : item));
    setInventory(updateList);
  };

  const handleInventoryDelete = (itemId: number) => {
    const filterList = (list: InventoryItem[]) => list.filter((item) => item.id !== itemId);
    setInventory(filterList);
  };

  const handleDispenseSuccess = () => {
    // Optimistically remove the dispensed/rejected request from UI
    if (dispenseRequest) {
      setRequests(prev => prev.filter(req => req.id !== dispenseRequest.id));
    }
    // Then refresh from server to ensure consistency
    // Re-fetch pending requests to confirm they are removed from the list
    fetchRequests();
    fetchInventory();
  };

  // ==================== Render Status Badges ====================
  const renderStatusBadges = (item: InventoryItem) => {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {item.status_indicators?.filter(i => i.type !== 'expiring_soon').map((indicator, idx) => (
          <span
            key={idx}
            className={`text-xs px-2 py-1 rounded-full font-medium ${indicator.severity === 'critical'
                ? 'bg-red-100 text-red-700'
                : indicator.severity === 'warning'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
          >
            {indicator.message}
          </span>
        ))}
      </div>
    );
  };

  // ==================== Statistics ====================
  const stats = {
    total: inventory.length,
    lowStock: inventory.filter((i) => i.is_low_stock).length,
    expired: inventory.filter((i) => i.is_expired).length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Pharmacy Management</h1>
        <p className="text-gray-600 mt-1">Manage inventory and medication requests</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600">Total Items</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <div className="text-sm text-yellow-700 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Low Stock
          </div>
          <div className="text-2xl font-bold text-yellow-900">{stats.lowStock}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
          <div className="text-sm text-red-700 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Expired
          </div>
          <div className="text-2xl font-bold text-red-900">{stats.expired}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === 'inventory'
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory Management
        </button>
        <button
          className={`px-6 py-2 rounded-lg font-medium transition-colors relative ${activeTab === 'requests'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          onClick={() => setActiveTab('requests')}
        >
          Medication Requests
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {/* ==================== INVENTORY TAB ==================== */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              >
                <option value="asc">Name A-Z</option>
                <option value="desc">Name Z-A</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExpired(!showExpired)}
                className={showExpired ? 'bg-gray-200' : ''}
              >
                <Filter className="w-4 h-4 mr-1" />
                {showExpired ? 'Hide' : 'Show'} Expired
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchInventory}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>

              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setIsRestockOpen(true)}
              >
                <PackagePlus className="w-4 h-4 mr-2" />
                Add New Item
              </Button>
            </div>
          </div>

          {/* Inventory Table */}
          {loadingInventory ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">Loading inventory...</p>
            </div>
          ) : filteredInventory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Medicine
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Batch / Expiry
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInventory.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 ${!item.is_active ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{item.generic_name}</div>
                        <div className="text-xs text-gray-500">
                          {item.item_code} • {item.form} • {item.category}
                        </div>
                        {item.manufacturer && (
                          <div className="text-xs text-gray-500">Mfr: {item.manufacturer}</div>
                        )}
                        {item.description && (
                          <div className="text-xs text-gray-400 italic truncate max-w-[200px]">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">Batch: {item.batch_number}</div>
                        <div className="text-sm text-gray-600">
                          Exp: {new Date(item.expiry_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{item.quantity}</div>
                        <div className="text-xs text-gray-500">Min: {item.minimum_stock_level}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">₱{item.unit_price}</div>
                      </td>
                      <td className="px-4 py-3">
                        {renderStatusBadges(item)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditItem(item)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteItem(item)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <PackagePlus className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">
                {searchQuery ? 'No items match your search' : 'No inventory items yet'}
              </p>
              {!searchQuery && (
                <Button
                  className="mt-4 bg-green-600 hover:bg-green-700"
                  onClick={() => setIsRestockOpen(true)}
                >
                  Add First Item
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== REQUESTS TAB ==================== */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Medication Requests</h2>
            <Button variant="outline" size="sm" onClick={fetchRequests}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by medication..."
                value={requestSearchQuery}
                onChange={(e) => setRequestSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort By */}
            <select
              value={requestSortBy}
              onChange={(e) => setRequestSortBy(e.target.value as RequestSortOption)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="filo">Newest First (FILO)</option>
              <option value="fifo">Oldest First (FIFO)</option>
              <option value="patient-name">Patient Name (A-Z)</option>
              <option value="medication-name">Medication Name (A-Z)</option>
              <option value="quantity-high">Quantity (High to Low)</option>
              <option value="quantity-low">Quantity (Low to High)</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredRequests.length} of {requests.length} requests
          </div>

          {loadingRequests ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">Loading requests...</p>
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-3">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-lg">
                        {req.inventory_item_detail?.generic_name || 'Unknown Medicine'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 space-y-1">
                        <p><span className="font-medium">Brand:</span> {req.inventory_item_detail?.brand_name || 'N/A'} | <span className="font-medium">Batch:</span> {req.inventory_item_detail?.batch_number || 'N/A'}</p>
                        <p><span className="font-medium">Patient:</span> {req.admission_info?.patient_name || 'N/A'}</p>
                        <p><span className="font-medium">Prescribed by:</span> {req.requested_by || 'Unknown'}</p>
                      </div>
                      <div className="flex gap-4 mt-2">
                        <span className="text-sm">
                          <strong>Requested Qty:</strong> {req.quantity}
                        </span>
                        <span className="text-sm">
                          <strong>Available:</strong>{' '}
                          {req.inventory_item_detail?.quantity || 0}
                        </span>
                      </div>
                      {req.notes && (
                        <div className="text-sm text-gray-600 mt-1 italic">
                          Notes: {req.notes}
                        </div>
                      )}
                    </div>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => setDispenseRequest(req)}
                    >
                      Process Request
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No pending medication requests</p>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODALS ==================== */}
      <RestockModal
        isOpen={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        onInventoryUpdate={handleInventoryAdd}
      />

      {editItem && (
        <EditInventoryModal
          isOpen={!!editItem}
          onClose={() => setEditItem(null)}
          item={editItem}
          onUpdateSuccess={handleInventoryUpdate}
        />
      )}

      {deleteItem && (
        <DeleteConfirmationModal
          isOpen={!!deleteItem}
          onClose={() => setDeleteItem(null)}
          item={deleteItem}
          onDeleteSuccess={handleInventoryDelete}
        />
      )}

      {dispenseRequest && (
        <DispenseModal
          isOpen={!!dispenseRequest}
          onClose={() => setDispenseRequest(null)}
          medicationRequest={dispenseRequest}
          onDispenseSuccess={handleDispenseSuccess}
        />
      )}
    </div>
  );
};

export default Pharmacy;
