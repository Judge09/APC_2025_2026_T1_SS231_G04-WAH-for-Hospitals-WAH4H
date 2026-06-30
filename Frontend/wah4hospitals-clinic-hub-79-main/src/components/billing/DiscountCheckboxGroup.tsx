import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export type DiscountType = 'senior' | 'pwd' | 'philhealth' | null;

interface DiscountCheckboxGroupProps {
  selectedDiscount: DiscountType;
  onDiscountChange: (discount: DiscountType) => void;
  disabled?: boolean;
}

export const DiscountCheckboxGroup: React.FC<DiscountCheckboxGroupProps> = ({
  selectedDiscount,
  onDiscountChange,
  disabled = false
}) => {
  const [error, setError] = useState<string>('');

  // Clear error when selection changes to valid state
  useEffect(() => {
    if (selectedDiscount !== null) {
      setError('');
    }
  }, [selectedDiscount]);

  const handleCheckboxChange = (discountType: DiscountType, checked: boolean) => {
    if (disabled) return;

    if (checked) {
      // If trying to check when another is already selected
      if (selectedDiscount !== null && selectedDiscount !== discountType) {
        setError('You can only select one discount at a time');
        return;
      }
      onDiscountChange(discountType);
      setError('');
    } else {
      // Unchecking the currently selected discount
      if (selectedDiscount === discountType) {
        onDiscountChange(null);
        setError('');
      }
    }
  };

  return (
    <div>
      <h3 className="font-semibold mb-2">Discounts & Coverage</h3>
      <div className="flex flex-wrap gap-4 mb-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="senior"
            checked={selectedDiscount === 'senior'}
            onCheckedChange={(checked) => handleCheckboxChange('senior', checked === true)}
            disabled={disabled}
          />
          <Label
            htmlFor="senior"
            className={disabled ? 'text-gray-400' : 'cursor-pointer'}
          >
            Senior Citizen
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="pwd"
            checked={selectedDiscount === 'pwd'}
            onCheckedChange={(checked) => handleCheckboxChange('pwd', checked === true)}
            disabled={disabled}
          />
          <Label
            htmlFor="pwd"
            className={disabled ? 'text-gray-400' : 'cursor-pointer'}
          >
            PWD
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="philhealth"
            checked={selectedDiscount === 'philhealth'}
            onCheckedChange={(checked) => handleCheckboxChange('philhealth', checked === true)}
            disabled={disabled}
          />
          <Label
            htmlFor="philhealth"
            className={disabled ? 'text-gray-400' : 'cursor-pointer'}
          >
            PhilHealth Member
          </Label>
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
