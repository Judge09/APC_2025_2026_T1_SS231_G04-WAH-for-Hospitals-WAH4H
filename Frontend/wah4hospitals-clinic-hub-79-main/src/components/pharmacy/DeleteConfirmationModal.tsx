import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { InventoryItem } from '@/types/pharmacy';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  onDeleteSuccess: (itemId: number) => void;
}

const API_BASE = (
  import.meta.env.BACKEND_PHARMACY_8000 ||
  import.meta.env.BACKEND_PHARMACY ||
  'http://localhost:8000/api/pharmacy'
).replace(/\/$/, '');

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  item,
  onDeleteSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await axios.delete(`${API_BASE}/inventory/${item.id}/`);

      toast.success('Inventory item deactivated successfully');
      onDeleteSuccess(item.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.error || 'Failed to delete inventory item';
      toast.error(errorMsg);
      
      if (err.response?.data?.active_requests_count) {
        toast.warning(
          `This item has ${err.response.data.active_requests_count} active medication request(s)`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Confirm Deactivation
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-gray-700 mb-4">
            Are you sure you want to deactivate this inventory item?
          </p>
          
          <div className="bg-gray-50 p-4 rounded-md space-y-2">
            <div>
              <span className="font-semibold">Medicine:</span>{' '}
              {item.generic_name}
              {item.brand_name && ` (${item.brand_name})`}
            </div>
            <div>
              <span className="font-semibold">Batch:</span> {item.batch_number}
            </div>
            <div>
              <span className="font-semibold">Current Stock:</span> {item.quantity} units
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            <strong>Note:</strong> This will mark the item as inactive. It will no longer be
            available for new medication requests but existing records will be preserved.
          </p>

          {item.quantity > 0 && (
            <p className="text-sm text-orange-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Warning: This item still has {item.quantity} units in stock
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
            disabled={isLoading}
          >
            {isLoading ? 'Deactivating...' : 'Deactivate Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationModal;
