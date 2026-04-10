// src/components/pharmacy/DispenseModal.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { InventoryItem, MedicationRequest } from '@/types/pharmacy';
import pharmacyService from '@/services/pharmacyService';

interface DispenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicationRequest: MedicationRequest; // full request object
  onDispenseSuccess: () => void;
}

const API_BASE = (
  import.meta.env.BACKEND_PHARMACY_8000 ||
  import.meta.env.BACKEND_PHARMACY ||
  'http://localhost:8000/api/pharmacy'
).replace(/\/$/, ''); // Remove trailing slash if present

export const DispenseModal: React.FC<DispenseModalProps> = ({
  isOpen,
  onClose,
  medicationRequest,
  onDispenseSuccess,
}) => {
  const [quantity, setQuantity] = useState<number>(medicationRequest.quantity);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // ------------------ Fetch inventory for this medicine ------------------
  const fetchInventoryItem = async () => {
    try {
      // Use pharmacyService to get all inventory
      const allInventory = await pharmacyService.getInventory();
      
      // Filter by matching generic name (case-insensitive)
      const filtered = allInventory.filter((item) => {
        const itemName = item.generic_name?.toLowerCase().trim();
        const requestName = medicationRequest.inventory_item_detail?.generic_name?.toLowerCase().trim();
        return itemName === requestName;
      });
      
      setInventory(filtered);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      toast.error('Failed to fetch inventory');
      setInventory([]);
    }
  };

  useEffect(() => {
    setQuantity(medicationRequest.quantity);
    setRejectionReason('');
    fetchInventoryItem();
  }, [medicationRequest]);

  // ------------------ Handle Dispense ------------------
  const handleDispense = async () => {
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    const totalStock = inventory.reduce((acc, i) => acc + i.quantity, 0);
    if (quantity > totalStock) {
      toast.error(`Not enough stock. Available: ${totalStock}`);
      return;
    }

    try {
      // Update the medication request status to 'completed' (dispensed)
      const payload = {
          status: 'completed', // FHIR standard for dispensed
          quantity: quantity // Send the actual quantity being dispensed
      };

      await axios.post(
        `${API_BASE}/requests/${medicationRequest.id}/update-status/`,
        payload
      );

      toast.success('Medication dispensed successfully');
      onDispenseSuccess(); // refresh parent state
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to dispense medication');
    }
  };

  // ------------------ Handle Reject ------------------
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      // Update the medication request status to 'cancelled' (rejected)
      await axios.post(
        `${API_BASE}/requests/${medicationRequest.id}/update-status/`,
        { 
          status: 'cancelled', // FHIR standard for denied/rejected
          note: rejectionReason
        }
      );

      toast.success('Medication request rejected');
      onDispenseSuccess(); // refresh parent state
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to reject request');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Process Medication Request</DialogTitle>
          <p className="text-sm text-gray-500">
            Approve and dispense, or reject this medication request.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Medicine</Label>
            <div className="font-semibold">
              {medicationRequest.inventory_item_detail
                ? `${medicationRequest.inventory_item_detail.generic_name} (${medicationRequest.inventory_item_detail.brand_name})`
                : 'Unknown Medicine'}
            </div>
          </div>

          <div>
            <Label>Patient</Label>
            <div className="text-sm text-gray-700">
              {medicationRequest.admission_info?.patient_name || 'Unknown Patient'}
            </div>
          </div>

          <div>
            <Label>Requested Quantity</Label>
            <div className="text-sm text-gray-700">
              {medicationRequest.quantity}
            </div>
          </div>

          {medicationRequest.notes && (
            <div>
              <Label>Request Notes</Label>
              <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                {medicationRequest.notes}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <div>
              <Label>Quantity to dispense</Label>
              <Input
                type="number"
                min={1}
                max={inventory.reduce((acc, i) => acc + i.quantity, 0) || 1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              {inventory.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Available stock: {inventory.reduce((acc, i) => acc + i.quantity, 0)}
                </p>
              )}
            </div>

            <div className="mt-3">
              <Label>Inventory Batches</Label>
              <ul className="text-sm text-gray-500 list-disc ml-4 mt-1">
                {inventory.length > 0 ? (
                  inventory.map((item) => (
                    <li key={item.id}>
                      Batch {item.batch_number} - Qty: {item.quantity} - Exp: {item.expiry_date}
                    </li>
                  ))
                ) : (
                  <li className="text-red-500">No stock available</li>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label>Rejection Reason (if rejecting)</Label>
            <textarea
              className="w-full border border-gray-300 rounded-md p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter reason for rejection (required if rejecting)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              Reject
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleDispense}
              disabled={
                inventory.length === 0 ||
                quantity <= 0 ||
                quantity > inventory.reduce((acc, i) => acc + i.quantity, 0)
              }
            >
              Approve & Dispense
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
