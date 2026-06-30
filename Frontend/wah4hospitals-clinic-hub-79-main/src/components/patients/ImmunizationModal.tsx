/**
 * Immunization Modal Component
 * For creating and editing patient immunizations (PHCORE-compliant)
 */
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Immunization } from '../../types/patient';
import { immunizationFormSchema, type ImmunizationFormData } from '../../schemas/clinicalDataSchema';
import {
  IMMUNIZATION_STATUS_OPTIONS,
  COMMON_VACCINES,
  VACCINE_SITE_OPTIONS,
  VACCINE_ROUTE_OPTIONS,
  DOSE_UNIT_OPTIONS,
} from '../../constants/clinicalDataConstants';
import { createImmunization, updateImmunization } from '../../services/patientsService';

interface ImmunizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  immunization?: Immunization | null;
  patientId: number;
  encounterId: number;
}

export const ImmunizationModal: React.FC<ImmunizationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  immunization,
  patientId,
  encounterId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditing = !!immunization;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ImmunizationFormData>({
    resolver: zodResolver(immunizationFormSchema),
    defaultValues: immunization
      ? {
          identifier: immunization.identifier || '',
          status: immunization.status as 'completed' | 'entered-in-error' | 'not-done',
          vaccine_code: immunization.vaccine_code || '',
          vaccine_display: immunization.vaccine_display || '',
          patient: patientId,
          encounter_id: encounterId,
          occurrence_datetime: immunization.occurrence_datetime || '',
          recorded_datetime: immunization.created_at || '',
          lot_number: immunization.lot_number || '',
          expiration_date: immunization.expiration_date || '',
          site_code: immunization.site_code || '',
          route_code: immunization.route_code || '',
          dose_quantity_value: immunization.dose_quantity_value || '',
          dose_quantity_unit: immunization.dose_quantity_unit || '',
          performer_name: immunization.performer_name || '',
          note: immunization.note || '',
        }
      : {
          identifier: `IMM-${Date.now()}`,
          status: 'completed',
          patient: patientId,
          encounter_id: encounterId,
        },
  });

  const selectedVaccine = watch('vaccine_code');

  useEffect(() => {
    if (!isOpen) {
      reset();
      setError('');
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: ImmunizationFormData) => {
    setIsLoading(true);
    setError('');
    try {
      if (isEditing && immunization) {
        await updateImmunization(immunization.immunization_id, data);
      } else {
        await createImmunization(data);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save immunization';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Immunization' : 'Add New Immunization'}</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Identifier */}
          <FormField
            label="Identifier *"
            error={errors.identifier}
            {...register('identifier')}
            placeholder="e.g., IMM-12345"
          />

          {/* Status */}
          <SelectField
            label="Status *"
            error={errors.status}
            {...register('status')}
            options={[{ value: '', label: 'Select Status' }, ...IMMUNIZATION_STATUS_OPTIONS]}
          />

          {/* Vaccine Selection */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Vaccine Name</label>
            <select
              {...register('vaccine_code')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Vaccine</option>
              {COMMON_VACCINES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Or enter a custom vaccine code/display below</p>
          </div>

          {/* Vaccine Display Name */}
          <FormField
            label="Vaccine Display Name"
            error={errors.vaccine_display}
            {...register('vaccine_display')}
            placeholder={selectedVaccine || 'e.g., COVID-19 Vaccine (Pfizer)'}
          />

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Occurrence Date/Time"
              type="datetime-local"
              error={errors.occurrence_datetime}
              {...register('occurrence_datetime')}
            />
            <FormField
              label="Recorded Date/Time"
              type="datetime-local"
              error={errors.recorded_datetime}
              {...register('recorded_datetime')}
            />
          </div>

          {/* Lot Number & Expiration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Lot Number"
              error={errors.lot_number}
              {...register('lot_number')}
              placeholder="e.g., LOT-2024-ABC123"
            />
            <FormField
              label="Expiration Date"
              type="date"
              error={errors.expiration_date}
              {...register('expiration_date')}
            />
          </div>

          {/* Site & Route */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Administration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Site"
                error={errors.site_code}
                {...register('site_code')}
                options={[{ value: '', label: 'Select Site' }, ...VACCINE_SITE_OPTIONS]}
              />
              <SelectField
                label="Route"
                error={errors.route_code}
                {...register('route_code')}
                options={[{ value: '', label: 'Select Route' }, ...VACCINE_ROUTE_OPTIONS]}
              />
            </div>
          </div>

          {/* Dose Information */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Dose Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Dose Quantity"
                type="number"
                step="0.01"
                error={errors.dose_quantity_value}
                {...register('dose_quantity_value')}
                placeholder="e.g., 0.5"
              />
              <SelectField
                label="Unit"
                error={errors.dose_quantity_unit}
                {...register('dose_quantity_unit')}
                options={[{ value: '', label: 'Select Unit' }, ...DOSE_UNIT_OPTIONS]}
              />
            </div>
          </div>

          {/* Administering Staff */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Administering Provider</h4>
            <FormField
              label="Staff / Doctor Name"
              error={errors.performer_name}
              {...register('performer_name')}
              placeholder="e.g., Dr. Juan dela Cruz"
            />
          </div>

          {/* Note */}
          <div className="border-t pt-4 space-y-1">
            <label className="block text-sm font-medium text-gray-700">Clinical Notes</label>
            <textarea
              {...register('note')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes about the immunization..."
            />
            {errors.note && <p className="text-xs text-red-500">{errors.note.message}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? 'Saving...' : isEditing ? 'Update Immunization' : 'Add Immunization'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// REUSABLE FORM COMPONENTS
// ============================================================================

const FormField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: any }
>(({ label, error, ...props }, ref) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <Input ref={ref} className={error ? 'border-red-500' : ''} {...props} />
    {error && <p className="text-xs text-red-500">{error.message}</p>}
  </div>
));
FormField.displayName = 'FormField';

const SelectField = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    label: string;
    error?: any;
    options: Array<{ value: string; label: string }>;
  }
>(({ label, error, options, ...props }, ref) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <select
      ref={ref}
      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      }`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="text-xs text-red-500">{error.message}</p>}
  </div>
));
SelectField.displayName = 'SelectField';
