import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit } from 'lucide-react';
import { toast } from 'sonner';
import pharmacyService from '@/services/pharmacyService';
import { InventoryItem } from '@/types/pharmacy';

interface EditInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  onUpdateSuccess: (updatedItem: InventoryItem) => void;
}

export const EditInventoryModal: React.FC<EditInventoryModalProps> = ({
  isOpen,
  onClose,
  item,
  onUpdateSuccess,
}) => {
  const [formData, setFormData] = useState({
    generic_name: '',
    item_code: '',
    brand_name: '',
    description: '',
    category: '',
    form: '',
    quantity: 0,
    minimum_stock_level: 10,
    unit_of_measure: 'tablet',
    unit_price: 0,
    batch_number: '',
    expiry_date: '',
    manufacturer: '',
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        generic_name: item.generic_name || '',
        item_code: item.item_code || '',
        brand_name: item.brand_name || '',
        description: item.description || '',
        category: item.category || '',
        form: item.form || '',
        quantity: item.quantity || 0,
        minimum_stock_level: item.minimum_stock_level || 10,
        unit_of_measure: item.unit_of_measure || '',
        unit_price: item.unit_price || 0,
        batch_number: item.batch_number || '',
        expiry_date: item.expiry_date || '',
        manufacturer: item.manufacturer || '',
        is_active: item.is_active ?? true,
      });
    }
  }, [item]);

  const handleUpdate = async () => {
    // Validation
    if (!formData.generic_name || !formData.batch_number || !formData.expiry_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.quantity < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }

    if (new Date(formData.expiry_date) <= new Date()) {
      toast.error('Expiry date must be in the future');
      return;
    }

    setIsLoading(true);
    try {
      const updatedItem = await pharmacyService.updateInventoryItem(item.id, formData);

      toast.success('Inventory item updated successfully');
      onUpdateSuccess(updatedItem);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update inventory item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-600" />
            Edit Inventory Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="generic_name">
                Generic Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="generic_name"
                value={formData.generic_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, generic_name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand_name">Brand Name</Label>
              <Input
                id="brand_name"
                value={formData.brand_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, brand_name: e.target.value }))
                }
              />
            </div>
          </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value }))
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="item_code">ATC Code</Label>
              <Input
                id="item_code"
                value={formData.item_code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, item_code: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form">Form</Label>
              <select
                id="form"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.form}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, form: e.target.value }))
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
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, manufacturer: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_of_measure">Unit of Measure</Label>
              <Input
                id="unit_of_measure"
                value={formData.unit_of_measure}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, unit_of_measure: e.target.value }))
                }
              />
            </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min={0}
                value={formData.quantity}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, quantity: Number(e.target.value) }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_stock_level">Min Stock Level</Label>
              <Input
                id="minimum_stock_level"
                type="number"
                min={0}
                value={formData.minimum_stock_level}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    minimum_stock_level: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price (₱)</Label>
              <Input
                id="unit_price"
                type="number"
                min={0}
                step="0.01"
                value={formData.unit_price}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, unit_price: Number(e.target.value) }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_number">
                Batch Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="batch_number"
                value={formData.batch_number}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, batch_number: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry_date">
              Expiry Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, expiry_date: e.target.value }))
              }
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
              }
              className="w-4 h-4"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Active (available for dispensing)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditInventoryModal;
