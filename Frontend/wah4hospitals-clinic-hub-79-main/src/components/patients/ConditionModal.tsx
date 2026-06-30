/**
 * Condition Modal Component
 * For creating and editing patient conditions (FHIR-compliant)
 */
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Condition } from '../../types/patient';
import { conditionFormSchema, type ConditionFormData } from '../../schemas/clinicalDataSchema';
import {
  CLINICAL_STATUS_OPTIONS,
  VERIFICATION_STATUS_OPTIONS,
  CONDITION_CATEGORY_OPTIONS,
  SEVERITY_OPTIONS,
  COMMON_CONDITION_CODES,
} from '../../constants/clinicalDataConstants';
import { createCondition, updateCondition } from '../../services/patientsService';

interface ConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  condition?: Condition | null;
  patientId: number;
  encounterId: number;
}

export const ConditionModal: React.FC<ConditionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  condition,
  patientId,
  encounterId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditing = !!condition;

  type ExtendedConditionForm = ConditionFormData & {
    selected_code?: string;
    custom_code?: string;
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ExtendedConditionForm>({
    resolver: zodResolver(conditionFormSchema),
    defaultValues: condition
      ? {
          identifier: condition.identifier || '',
          clinical_status: condition.clinical_status || '',
          verification_status: condition.verification_status || '',
          category: condition.category || '',
          severity: condition.severity || '',
          code: condition.code || '',
          selected_code: condition.code || '',
          custom_code: '',
          patient: patientId,
          encounter_id: encounterId,
          body_site: condition.body_site || '',
          onset_datetime: condition.onset_datetime || '',
          recorded_date: condition.recorded_date || '',
          note: condition.note || '',
        }
      : {
          identifier: `COND-${Date.now()}`,
          patient: patientId,
          encounter_id: encounterId,
          selected_code: '',
          custom_code: '',
        },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
      setError('');
    }
  }, [isOpen, reset]);

  // Keep canonical `code` field in sync with selected or custom inputs
  useEffect(() => {
    const subscription = watch((value) => {
      const selected = (value as any).selected_code || '';
      const custom = (value as any).custom_code || '';
      const final = (custom || selected || '').trim();
      setValue('code' as any, final, { shouldValidate: true, shouldDirty: true });
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  const onSubmit = async (data: ConditionFormData) => {
    setIsLoading(true);
    setError('');
    try {
      if (isEditing && condition) {
        await updateCondition(condition.condition_id, data);
      } else {
        await createCondition(data);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save condition';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Condition' : 'Add New Condition'}</DialogTitle>
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
            placeholder="e.g., COND-12345"
          />

          {/* Condition Code */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Condition Code *</label>
            <select
              {...register('selected_code')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select Condition Code</option>
              {COMMON_CONDITION_CODES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
            <p className="text-xs text-gray-500">Or enter custom ICD-10 code</p>
            <Input
              {...register('custom_code')}
              placeholder="Custom ICD-10 code (e.g., E11.9)"
              className={errors.code ? 'border-red-500' : ''}
            />
            {/* Hidden canonical field synced from selected/custom */}
            <input type="hidden" {...register('code')} />
          </div>

          {/* Status Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Category and Severity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              label="Category"
              error={errors.category}
              {...register('category')}
              options={[{ value: '', label: 'Select Category' }, ...CONDITION_CATEGORY_OPTIONS]}
            />
            <SelectField
              label="Severity"
              error={errors.severity}
              {...register('severity')}
              options={[{ value: '', label: 'Select Severity' }, ...SEVERITY_OPTIONS]}
            />
          </div>

          {/* Body Site */}
          <FormField
            label="Body Site"
            error={errors.body_site}
            {...register('body_site')}
            placeholder="e.g., Left arm, abdomen"
          />

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
              placeholder="Additional clinical notes..."
            />
            {errors.note && <p className="text-xs text-red-500">{errors.note.message}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? 'Saving...' : isEditing ? 'Update Condition' : 'Add Condition'}
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
