import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Plus, Pill, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { InventoryItem, MedicationRequest } from '@/types/pharmacy';
import pharmacyService from '@/services/pharmacyService';

import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';

interface MedicationRequestTabProps {
  admissionId: string;
  patientId: string;
}

export const MedicationRequestTab: React.FC<MedicationRequestTabProps> = ({ admissionId, patientId }) => {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<MedicationRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [dosage, setDosage] = useState<string>('');
  const [route, setRoute] = useState<string>('Oral');
  const [frequency, setFrequency] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Set default filter based on role
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (currentRole === 'doctor') {
      setStatusFilter('prescribed');
    } else if (currentRole === 'nurse') {
      setStatusFilter('pending'); // 'pending' means Requested in frontend
    } else {
      setStatusFilter('all');
    }
  }, [currentRole]);
  const [requestToDelete, setRequestToDelete] = useState<number | null>(null);

  const API_BASE =
    import.meta.env.BACKEND_PHARMACY_8000 ||
      import.meta.env.LOCAL_8000
      ? `${import.meta.env.LOCAL_8000}/api/pharmacy`
      : import.meta.env.BACKEND_PHARMACY;

  const PHARMACY_API = `${API_BASE}/inventory/`;
  const REQUEST_API = `${API_BASE}/medication-requests/`;

  // Fetch inventory
  const fetchInventory = async () => {
    try {
      const data = await pharmacyService.getInventory();
      setInventory(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch inventory');
    }
  };

  // Fetch requests filtered by admission
  const fetchRequests = async () => {
    try {
      if (!admissionId) return;
      const data = await pharmacyService.getRequestsByAdmission(Number(admissionId));
      setRequests(data);
    } catch (err) {
      console.error(err);
      // toast.error('Failed to fetch medication requests'); // Suppress error for now if admission not found
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchRequests();
  }, [admissionId]);

  const handleRequest = async () => {
    if (!selectedInventoryId || quantity <= 0) {
      toast.error('Select medicine and quantity');
      return;
    }

    try {
      const selectedItem = inventory.find(i => i.id === selectedInventoryId);

      const requesterId = user ? Number(user.id) : 1;

      const payload = {
        admission: Number(admissionId),
        subject_id: Number(patientId),
        requester_id: requesterId,
        inventory_item: selectedInventoryId,
        inventory_item_detail: selectedItem, // Pass full inventory details
        quantity,
        notes,
        // Helper data for service to construct payload
        medication_code: selectedItem?.item_code || 'MED-UNKNOWN',
        medication_display: selectedItem?.generic_name
      };

      const completePayload = {
        ...payload,
        notes: JSON.stringify({
            dosage,
            route,
            frequency,
            instructions: notes
        })
      };

      const newReq = await pharmacyService.createRequest(completePayload);
      setRequests((prev) => [...prev, newReq]);
      toast.success('Prescription submitted successfully');

      setSelectedInventoryId(null);
      setQuantity(1);
      setDosage('');
      setFrequency('');
      setRoute('Oral');
      setNotes('');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to submit medication request:', err);
      const errorMessage = err.message || 'Failed to submit request';
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return;
    try {
      await pharmacyService.deleteRequest(requestToDelete);
      setRequests(prev => prev.filter(r => r.id !== requestToDelete));
      toast.success('Request deleted successfully');
    } catch (err: any) {
      toast.error('Failed to delete request: ' + (err.message || 'Unknown error'));
    } finally {
      setRequestToDelete(null);
    }
  };

  const handleRequestFromPharmacy = async (req: MedicationRequest) => {
      try {
          // If status is 'prescribed' (draft), update to 'active' (requested)
          // 'prescribed' in frontend maps to 'draft' in backend
          
          await pharmacyService.updateRequestStatus(req.id, 'active');
          
          // Optimistic update
          setRequests(prev => prev.map(r => 
              r.id === req.id ? { ...r, status: 'pending' as any } : r
          ));
          toast.success('Request sent to pharmacy');
      } catch (error) {
          toast.error('Failed to send request');
      }
  };

  const getStatusBadge = (status: MedicationRequest['status']) => {
    if (status === 'dispensed' || status === 'completed') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 font-semibold px-3 py-1">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Accepted
        </Badge>
      );
    }
    if (status === 'approved') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold px-3 py-1">
          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
          Approved
        </Badge>
      );
    }
    if (status === 'denied' || status === 'cancelled') {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 font-semibold px-3 py-1">
          <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
          Denied
        </Badge>
      );
    }
    if (status === 'pending' || status === 'active') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold px-3 py-1">
          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
          Requested
        </Badge>
      );
    }
    // Default / Prescribed
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 font-semibold px-3 py-1">
        <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
        Prescribed
      </Badge>
    );
  };

  const filteredRequests = requests.filter(req => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'denied') return req.status === 'cancelled' || req.status === 'denied';
    if (statusFilter === 'dispensed') return req.status === 'completed' || req.status === 'dispensed';
    return req.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-700">Filter Status:</Label>
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md text-sm p-2 focus:ring-2 focus:ring-purple-500 hover:border-purple-400 transition-colors"
                style={{ minWidth: '140px' }}
            >
                <option value="all">All Requests</option>
                <option value="prescribed">Prescribed (Draft)</option>
                <option value="pending">Requested (Active)</option>
                <option value="approved">Approved</option>
                <option value="dispensed">Accepted</option>
                <option value="denied">Denied</option>
            </select>
            <Button variant="outline" size="icon" onClick={fetchRequests} title="Reload Requests">
                <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          {currentRole === 'doctor' && (
              <Button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 shadow-md transition-all">
                <Plus className="w-4 h-4 mr-2" /> Prescribe Medication
              </Button>
          )}
      </div>

      {/* Empty state */}
      {requests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-lg dashed border border-gray-200">
          <div className="bg-purple-50 rounded-full p-4 mb-3">
            <Pill className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-md font-semibold text-gray-900 mb-1">No Requests Found</h3>
          <p className="text-sm text-gray-500 text-center max-w-sm">
             Start by requesting a medication for this patient.
          </p>
        </div>
      )}

      {/* Filtered Empty State */}
      {requests.length > 0 && filteredRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <p>No requests match the selected filter.</p>
              <Button variant="link" onClick={() => setStatusFilter('all')}>Clear Filter</Button>
          </div>
      )}

      {/* Requests list */}
      <div className="space-y-3">
        {filteredRequests.map((req) => {
            let structuredNotes: any = null;
            let displayNotes = req.notes;

            try {
                if (req.notes && req.notes.startsWith('{')) {
                    structuredNotes = JSON.parse(req.notes);
                    displayNotes = structuredNotes.instructions || '';
                }
            } catch (e) {
                // Not JSON, use as is
            }

            return (
            <Card key={req.id} className={`shadow-sm hover:shadow-md transition-all border-l-4 ${
                req.status === 'cancelled' || req.status === 'denied' ? 'border-l-red-500' :
                req.status === 'completed' || req.status === 'dispensed' ? 'border-l-green-500' :
                req.status === 'approved' ? 'border-l-blue-500' :
                'border-l-yellow-500'
            }`}>
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50/50 to-transparent">
                <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                    <Pill className={`w-5 h-5 ${
                         req.status === 'cancelled' ? 'text-red-500' : 'text-purple-600'
                    }`} />
                    <CardTitle className="text-md font-bold text-gray-900">
                        {req.inventory_item_detail?.generic_name || 'Unknown Medication'}
                    </CardTitle>
                    </div>
                    {req.inventory_item_detail?.brand_name && (
                    <p className="text-xs text-gray-600 ml-8 font-medium">
                        Brand: {req.inventory_item_detail.brand_name}
                    </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {getStatusBadge(req.status)}
                    {/* Nurse Action: Request from Pharmacy (for Prescribed items) */}
                    {currentRole === 'nurse' && (req.status === 'prescribed' || req.status === 'draft') && (
                        <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white ml-2"
                            onClick={() => handleRequestFromPharmacy(req)}
                        >
                            Request from Pharmacy
                        </Button>
                    )}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setRequestToDelete(req.id)}
                        title="Delete Request"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded p-2">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-bold block">Quantity</span>
                        <p className="text-sm font-semibold text-gray-900">{req.quantity}</p>
                    </div>
                    {structuredNotes && (
                        <>
                            {structuredNotes.dosage && (
                            <div className="bg-gray-50 rounded p-2">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wide font-bold block">Dosage</span>
                                <p className="text-sm font-semibold text-gray-900">{structuredNotes.dosage}</p>
                            </div>
                            )}
                            {structuredNotes.frequency && (
                            <div className="bg-gray-50 rounded p-2">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wide font-bold block">Frequency</span>
                                <p className="text-sm font-semibold text-gray-900">{structuredNotes.frequency}</p>
                            </div>
                            )}
                            {structuredNotes.route && (
                            <div className="bg-gray-50 rounded p-2">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wide font-bold block">Route</span>
                                <p className="text-sm font-semibold text-gray-900">{structuredNotes.route}</p>
                            </div>
                            )}
                        </>
                    )}
                    {!structuredNotes && (
                        <div className="bg-gray-50 rounded p-2">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide font-bold block">Request ID</span>
                            <p className="text-sm font-mono text-gray-900">#{req.id}</p>
                        </div>
                    )}
                </div>
                {displayNotes && displayNotes.trim() !== '' && (
                <div className="bg-blue-50 rounded p-3 border-l-2 border-blue-300 text-xs">
                    <span className="font-bold text-blue-700 block mb-1">Prescription Notes:</span>
                    <p className="text-gray-700">{displayNotes}</p>
                </div>
                )}
            </CardContent>
            <CardFooter className="pt-2 pb-2 bg-gray-50/80 text-[10px] text-center text-gray-400 flex justify-between px-4">
                <span>{req.requested_by ? `Prescribed by: ${req.requested_by}` : 'Prescriber Unknown'}</span>
                <span>{new Date(req.requested_at || '').toLocaleDateString()}</span>
            </CardFooter>
            </Card>
            );
        })}
      </div>

      {/* Request Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent aria-describedby="medication-request-description" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Pill className="w-6 h-6 text-purple-600" />
              Prescribe Medication
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            
            {/* Semantic Banner */}
            <div className="bg-purple-50 border border-purple-100 rounded-md p-3 flex items-center gap-2 text-sm text-purple-700 mb-4">
                <span dangerouslySetInnerHTML={{ __html: '&#128221;' }} /> 
                Creating FHIR MedicationRequest with intent: <span className="font-semibold">order (Prescription)</span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Select Medication</Label>
              <select
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                value={selectedInventoryId ?? ''}
                onChange={(e) => setSelectedInventoryId(Number(e.target.value))}
              >
                <option value="">-- Choose medication from inventory --</option>
                {inventory.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.generic_name} ({m.brand_name}) — Available: {m.quantity} units
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Dosage</Label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., 500mg"
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Route</Label>
                    <select
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                        value={route}
                        onChange={(e) => setRoute(e.target.value)}
                    >
                        <option value="Oral">Oral</option>
                        <option value="IV">IV (Intravenous)</option>
                        <option value="IM">IM (Intramuscular)</option>
                        <option value="SC">SC (Subcutaneous)</option>
                        <option value="Topical">Topical</option>
                        <option value="Inhalation">Inhalation</option>
                        <option value="Drops">Drops</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Frequency</Label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., TID, BID, QD"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Quantity</Label>
                    <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        min={1}
                    />
                </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Prescription Notes</Label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[100px]"
                placeholder="Add prescription instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequest} className="bg-purple-600 hover:bg-purple-700 text-white shadow-md">
              Submit Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the medication request from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
