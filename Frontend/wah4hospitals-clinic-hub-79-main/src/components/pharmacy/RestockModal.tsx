import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { InventoryItem } from '@/types/pharmacy';
import pharmacyService from '@/services/pharmacyService';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInventoryUpdate: (item: InventoryItem) => void; // Updated type: full InventoryItem
}

const API_BASE = (
  import.meta.env.BACKEND_PHARMACY_8000 ||
  import.meta.env.BACKEND_PHARMACY ||
  'http://localhost:8000/api/pharmacy'
).replace(/\/$/, ''); // Remove trailing slash if present

const INITIAL_STATE = {
  generic_name: '',
  item_code: '',
  category: '',
  form: 'Tablet',
  brand_name: '',
  description: '',
  quantity: '',
  minimum_stock_level: '10',
  unit_of_measure: 'tablet',
  unit_price: '',
  batch_number: '',
  expiry_date: '',
  manufacturer: '',
};

export const RestockModal: React.FC<RestockModalProps> = ({
  isOpen,
  onClose,
  onInventoryUpdate,
}) => {
  const [itemData, setItemData] = useState(INITIAL_STATE);

  useEffect(() => {
    if (!isOpen) {
      setItemData(INITIAL_STATE);
    }
  }, [isOpen]);

  const handleRestock = async () => {
    const quantity = Number(itemData.quantity);

    // Validation
    if (!itemData.generic_name || !itemData.item_code || !itemData.category || !itemData.batch_number || !itemData.expiry_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    if (new Date(itemData.expiry_date) <= new Date()) {
      toast.error('Expiry date must be in the future');
      return;
    }

    try {
      const newItem = await pharmacyService.addInventoryItem({
        generic_name: itemData.generic_name,
        item_code: itemData.item_code,
        category: itemData.category,
        form: itemData.form,
        brand_name: itemData.brand_name,
        description: itemData.description,
        quantity,
        minimum_stock_level: Number(itemData.minimum_stock_level),
        unit_of_measure: itemData.unit_of_measure,
        unit_price: Number(itemData.unit_price),
        batch_number: itemData.batch_number,
        expiry_date: itemData.expiry_date,
        manufacturer: itemData.manufacturer,
      });

      // Notify parent to update inventory state
      onInventoryUpdate(newItem);

      toast.success('Stock added successfully');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to add stock');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-green-600" />
            Add New Medication to Inventory
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="generic_name">Medication Name *</Label>
            <Input
              id="generic_name"
              placeholder="e.g., Paracetamol 500mg"
              value={itemData.generic_name}
              onChange={(e) =>
                setItemData((prev) => ({ ...prev, generic_name: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_code">ATC Code *</Label>
              <Input
                id="item_code"
                placeholder="e.g., N02BE01"
                value={itemData.item_code}
                onChange={(e) =>
                  setItemData((prev) => ({ ...prev, item_code: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                placeholder="e.g., Analgesic, Antibiotic"
                value={itemData.category}
                onChange={(e) =>
                  setItemData((prev) => ({ ...prev, category: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="form">Form *</Label>
              <select
                id="form"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={itemData.form}
                onChange={(e) =>
                  setItemData((prev) => ({ ...prev, form: e.target.value }))
                }
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Cream">Cream</option>
                <option value="Drops">Drops</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer (Optional)</Label>
              <Input
                id="manufacturer"
                placeholder="e.g., PharmaCorp Inc."
                value={itemData.manufacturer}
                onChange={(e) =>
                  setItemData((prev) => ({ ...prev, manufacturer: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch_number">Batch Number *</Label>
              <Input
                id="batch_number"
                placeholder="e.g., LOT-2024-001"
                value={itemData.batch_number}
                onChange={(e) =>
                  setItemData((prev) => ({ ...prev, batch_number: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date *</Label>
              <Input
                id="expiry_date"
                type="date"
                value={itemData.expiry_date}
                onChange={(e) =>
                  setItemData((prev) => ({ ...prev, expiry_date: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Initial Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={0}
                value={itemData.quantity}
                onChange={(e) =>
                  setItemData((prev) => ({ ...prev, quantity: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_stock_level">Min Stock Level *</Label>
              <Input
                id="minimum_stock_level"
                type="number"
                min={0}
                value={itemData.minimum_stock_level}
                onChange={(e) =>
                  setItemData((prev) => ({ ...prev, minimum_stock_level: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_of_measure">Unit of Measure *</Label>
              <Input
                id="unit_of_measure"
                placeholder="e.g., tablet, bottle"
                value={itemData.unit_of_measure}
                onChange={(e) =>
                  setItemData((prev) => ({ ...prev, unit_of_measure: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price (₱) *</Label>
              <Input
                id="unit_price"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={itemData.unit_price}
                onChange={(e) =>
                  setItemData((prev) => ({ ...prev, unit_price: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleRestock}
            className="bg-green-600 hover:bg-green-700"
          >
            Add to Inventory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RestockModal;
