/**
 * Allergy Intolerance Modal Component
 * For creating and editing patient allergies (FHIR-compliant)
 */
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Allergy } from '../../types/patient';
import { allergyFormSchema, type AllergyFormData } from '../../schemas/clinicalDataSchema';
import {
  CLINICAL_STATUS_OPTIONS,
  VERIFICATION_STATUS_OPTIONS,
  ALLERGY_TYPE_OPTIONS,
  ALLERGY_CATEGORY_OPTIONS,
  CRITICALITY_OPTIONS,
  REACTION_SEVERITY_OPTIONS,
  COMMON_ALLERGENS,
} from '../../constants/clinicalDataConstants';
import { createAllergy, updateAllergy } from '../../services/patientsService';

interface AllergyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allergy?: Allergy | null;
  patientId: number;
  encounterId: number;
}

export const AllergyModal: React.FC<AllergyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  allergy,
  patientId,
  encounterId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditing = !!allergy;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AllergyFormData>({
    resolver: zodResolver(allergyFormSchema),
    defaultValues: allergy
      ? {
          identifier: allergy.identifier || '',
          clinical_status: allergy.clinical_status || '',
          verification_status: allergy.verification_status || '',
          type: allergy.type || '',
          category: allergy.category || '',
          criticality: allergy.criticality || '',
          code: allergy.code || '',
          patient: patientId,
          encounter_id: encounterId,
          onset_datetime: allergy.onset_datetime || '',
          recorded_date: allergy.created_at?.split('T')[0] || '',
          reaction_description: allergy.reaction_description || '',
          reaction_severity: allergy.reaction_severity || '',
          note: allergy.note || '',
        }
      : {
          identifier: `ALRG-${Date.now()}`,
          patient: patientId,
          encounter_id: encounterId,
        },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
      setError('');
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: AllergyFormData) => {
    setIsLoading(true);
    setError('');
    try {
      if (isEditing && allergy) {
        await updateAllergy(allergy.allergy_id, data);
      } else {
        await createAllergy(data);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save allergy';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Allergy' : 'Add New Allergy'}</DialogTitle>
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
            placeholder="e.g., ALRG-12345"
          />

          {/* Allergen Code */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Allergen *</label>
            <select
              {...register('code')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Allergen</option>
              {COMMON_ALLERGENS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
            <p className="text-xs text-gray-500">Or enter custom allergen code</p>
            <Input
              {...register('code')}
              placeholder="Custom allergen code"
              className={errors.code ? 'border-red-500' : ''}
            />
          </div>

          {/* Type and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              label="Type"
              error={errors.type}
              {...register('type')}
              options={[{ value: '', label: 'Select Type' }, ...ALLERGY_TYPE_OPTIONS]}
            />
            <SelectField
              label="Category"
              error={errors.category}
              {...register('category')}
              options={[{ value: '', label: 'Select Category' }, ...ALLERGY_CATEGORY_OPTIONS]}
            />
          </div>

          {/* Status Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField
              label="Clinical Status"
              error={errors.clinical_status}
              {...register('clinical_status')}
              options={[{ value: '', label: 'Select Status' }, ...CLINICAL_STATUS_OPTIONS]}
            />
            <SelectField
              label="Verification Status"
              error={errors.verification_status}
              {...register('verification_status')}
              options={[{ value: '', label: 'Select Status' }, ...VERIFICATION_STATUS_OPTIONS]}
            />
            <SelectField
              label="Criticality"
              error={errors.criticality}
              {...register('criticality')}
              options={[{ value: '', label: 'Select Criticality' }, ...CRITICALITY_OPTIONS]}
            />
          </div>

          {/* Reaction Information */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Reaction Details</h4>
            <div className="space-y-4">
              <SelectField
                label="Reaction Severity"
                error={errors.reaction_severity}
                {...register('reaction_severity')}
                options={[{ value: '', label: 'Select Severity' }, ...REACTION_SEVERITY_OPTIONS]}
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Reaction Description</label>
                <textarea
                  {...register('reaction_description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the allergic reaction..."
                />
                {errors.reaction_description && (
                  <p className="text-xs text-red-500">{errors.reaction_description.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Onset Date/Time"
              type="datetime-local"
              error={errors.onset_datetime}
              {...register('onset_datetime')}
            />
            <FormField
              label="Recorded Date"
              type="date"
              error={errors.recorded_date}
              {...register('recorded_date')}
            />
          </div>

          {/* Note */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Clinical Notes</label>
            <textarea
              {...register('note')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes..."
            />
            {errors.note && <p className="text-xs text-red-500">{errors.note.message}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? 'Saving...' : isEditing ? 'Update Allergy' : 'Add Allergy'}
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
