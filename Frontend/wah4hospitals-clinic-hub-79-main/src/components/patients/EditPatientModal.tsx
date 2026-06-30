/**
 * Edit Patient Modal - React Hook Form + Zod Validation
 * Provides comprehensive patient editing functionality
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, AlertCircle } from 'lucide-react';
import type { Patient, PatientFormData } from '../../types/patient';
import { patientFormDataSchema } from '../../schemas/patientSchema';
import {
  GENDER_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  PWD_TYPE_OPTIONS,
  RELIGION_OPTIONS,
  CONTACT_RELATIONSHIP_OPTIONS,
} from '../../constants/patientConstants';
import addressData from '../../data/addressData.json';

const API_URL = import.meta.env.BACKEND_PATIENTS as string;

interface EditPatientModalProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
  onSuccess?: (patient: Patient) => void;
  fetchPatients?: () => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export const EditPatientModal: React.FC<EditPatientModalProps> = ({
  isOpen,
  patient,
  onClose,
  onSuccess,
  fetchPatients,
  isLoading = false,
  error,
}) => {
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientFormDataSchema),
    mode: 'onChange',
  });

  const [apiError, setApiError] = useState('');

  // Watch address fields for cascading selects
  const selectedRegion = watch('address_state');
  const selectedProvince = watch('address_district');
  const selectedCity = watch('address_city');

  // Clear API error and repopulate form whenever the modal opens with a new patient
  useEffect(() => {
    if (patient && isOpen) {
      setApiError('');
      reset({
        patient_id: patient.patient_id,
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        middle_name: patient.middle_name || '',
        suffix_name: patient.suffix_name || '',
        gender: patient.gender || undefined,
        birthdate: patient.birthdate || '',
        civil_status: patient.civil_status || undefined,
        nationality: patient.nationality || '',
        religion: patient.religion || '',
        race: patient.race || '',
        mobile_number: patient.mobile_number || '',
        philhealth_id: patient.philhealth_id || '',
        blood_type: patient.blood_type || undefined,
        pwd_type: patient.pwd_type || undefined,
        occupation: patient.occupation || '',
        education: patient.education || '',
        address_line: patient.address_line || '',
        address_city: patient.address_city || '',
        address_district: patient.address_district || '',
        address_state: patient.address_state || '',
        address_country: patient.address_country || '',
        address_postal_code: patient.address_postal_code || '',
        contact_first_name: patient.contact_first_name || '',
        contact_last_name: patient.contact_last_name || '',
        contact_mobile_number: patient.contact_mobile_number || '',
        contact_relationship: patient.contact_relationship || '',
        indigenous_flag: patient.indigenous_flag || false,
        indigenous_group: patient.indigenous_group || '',
        consent_flag: patient.consent_flag || false,
      });
    }
  }, [patient, isOpen, reset]);

  const onSubmit = async (formData: PatientFormData) => {
    if (!patient) return;
    setApiError('');
    try {
      // PATCH /api/patients/{id}/ — numeric DB primary key, not the WAH-XXXX string
      await axios.patch(`${API_URL}${patient.id}/`, formData);
      // Refresh the patient list in the parent so the table shows updated data
      if (fetchPatients) await fetchPatients();
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      const message =
        data && typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : String(data ?? err.message ?? 'Failed to update patient.');
      setApiError(message);
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Patient - {String(patient.patient_id || '').toUpperCase()}</DialogTitle>
            <Button variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Prop-level error (e.g. passed by parent) */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* API error from the PATCH call */}
        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* SECTION 1: Personal Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Last Name *"
                error={errors.last_name}
                {...register('last_name')}
                placeholder="e.g., Dela Cruz"
              />
              <FormField
                label="First Name *"
                error={errors.first_name}
                {...register('first_name')}
                placeholder="e.g., Juan"
              />
              <FormField
                label="Middle Name"
                error={errors.middle_name}
                {...register('middle_name')}
                placeholder="e.g., Santos"
              />
              <FormField
                label="Suffix"
                error={errors.suffix_name}
                {...register('suffix_name')}
                placeholder="e.g., Jr, III"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <SelectField
                label="Gender"
                error={errors.gender}
                {...register('gender')}
                options={[{ value: '', label: 'Select Gender' }, ...GENDER_OPTIONS]}
              />
              <FormField
                label="Date of Birth"
                type="date"
                error={errors.birthdate}
                {...register('birthdate')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                label="Nationality"
                error={errors.nationality}
                {...register('nationality')}
                placeholder="e.g., Filipino"
              />
              <SelectField
                label="Civil Status"
                error={errors.civil_status}
                {...register('civil_status')}
                options={[{ value: '', label: 'Select Status' }, ...MARITAL_STATUS_OPTIONS]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <SelectField
                label="Religion"
                error={errors.religion}
                {...register('religion')}
                options={[{ value: '', label: 'Select Religion' }, ...RELIGION_OPTIONS]}
              />
              <FormField
                label="Race"
                error={errors.race}
                {...register('race')}
                placeholder="e.g., Tagalog"
              />
            </div>
          </div>

          {/* SECTION 2: Contact & Address */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4">Contact & Address</h3>
            <FormField
              label="Mobile Number"
              error={errors.mobile_number}
              inputMode="numeric"
              maxLength={11}
              {...register('mobile_number')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                e.target.value = digits;
                setValue('mobile_number', digits, { shouldValidate: true });
              }}
              placeholder="e.g., 09123456789"
            />

            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-4">Address (PSGC)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Region — value must be the region CODE (NCR, III…) not the array index */}
                <SelectField
                  label="Region"
                  error={errors.address_state}
                  value={selectedRegion || ''}
                  {...register('address_state', {
                    onChange: () => {
                      setValue('address_district', '');
                      setValue('address_city', '');
                      setValue('address_line', '');
                    },
                  })}
                  options={[
                    { value: '', label: 'Select Region' },
                    ...Object.values(addressData.regions || {}).map((r: any) => ({
                      value: r.code,
                      label: r.name,
                    })),
                  ]}
                />
                {/* Province — options derive from watched region */}
                <SelectField
                  label="Province"
                  error={errors.address_district}
                  value={selectedProvince || ''}
                  {...register('address_district', {
                    onChange: () => {
                      setValue('address_city', '');
                      setValue('address_line', '');
                    },
                  })}
                  options={[
                    { value: '', label: selectedRegion ? 'Select Province' : 'Select a region first' },
                    ...(selectedRegion && addressData.provinces?.[selectedRegion]
                      ? addressData.provinces[selectedRegion].map((p: any) => ({
                          value: p.code,
                          label: p.name,
                        }))
                      : []),
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* City — options derive from watched province */}
                <SelectField
                  label="City/Municipality"
                  error={errors.address_city}
                  value={selectedCity || ''}
                  {...register('address_city', {
                    onChange: () => {
                      setValue('address_line', '');
                    },
                  })}
                  options={[
                    { value: '', label: selectedProvince ? 'Select City/Municipality' : 'Select a province first' },
                    ...(selectedProvince && addressData.cities?.[selectedProvince]
                      ? addressData.cities[selectedProvince].map((c: any) => ({
                          value: c.code,
                          label: c.name,
                        }))
                      : []),
                  ]}
                />
                {/* Barangay — options derive from watched city */}
                <SelectField
                  label="Barangay"
                  error={errors.address_line}
                  value={watch('address_line') || ''}
                  {...register('address_line')}
                  options={[
                    { value: '', label: selectedCity ? 'Select Barangay' : 'Select a city first' },
                    ...(selectedCity && addressData.barangays?.[selectedCity]
                      ? addressData.barangays[selectedCity].map((b: any) => ({
                          value: b,
                          label: b,
                        }))
                      : []),
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField
                  label="Postal Code"
                  error={errors.address_postal_code}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  {...register('address_postal_code', {
                    onChange: (e: any) => {
                      const v = (e.target.value || '').replace(/\D/g, '').slice(0, 4);
                      e.target.value = v;
                    },
                  })}
                  placeholder="e.g., 1234"
                />
                <FormField
                  label="Country"
                  error={errors.address_country}
                  {...register('address_country')}
                  placeholder="e.g., Philippines"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Health Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4">Health Information</h3>
            <FormField
              label="PhilHealth ID"
              error={errors.philhealth_id}
              inputMode="numeric"
              maxLength={14}
              {...register('philhealth_id')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                let masked = digits;
                if (digits.length > 11) {
                  masked = digits.slice(0, 2) + '-' + digits.slice(2, 11) + '-' + digits.slice(11);
                } else if (digits.length > 2) {
                  masked = digits.slice(0, 2) + '-' + digits.slice(2);
                }
                e.target.value = masked;
                setValue('philhealth_id', masked, { shouldValidate: true });
              }}
              placeholder="12-345678901-2"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <SelectField
                label="Blood Type"
                error={errors.blood_type}
                {...register('blood_type')}
                options={[{ value: '', label: 'Select Blood Type' }, ...BLOOD_TYPE_OPTIONS]}
              />
              <SelectField
                label="PWD Type"
                error={errors.pwd_type}
                {...register('pwd_type')}
                options={[{ value: '', label: 'Select PWD Type' }, ...PWD_TYPE_OPTIONS]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                label="Occupation"
                error={errors.occupation}
                {...register('occupation')}
                placeholder="e.g., Teacher, Engineer"
              />
              <FormField
                label="Education"
                error={errors.education}
                {...register('education')}
                placeholder="e.g., Bachelor's Degree"
              />
            </div>
          </div>

          {/* SECTION 4: Emergency Contact */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Contact First Name"
                error={errors.contact_first_name}
                {...register('contact_first_name')}
                placeholder="e.g., Maria"
              />
              <FormField
                label="Contact Last Name"
                error={errors.contact_last_name}
                {...register('contact_last_name')}
                placeholder="e.g., Dela Cruz"
              />
              <FormField
                label="Contact Mobile Number"
                error={errors.contact_mobile_number}
                {...register('contact_mobile_number')}
                placeholder="e.g., 09123456789"
              />
              <SelectField
                label="Relationship"
                error={errors.contact_relationship}
                {...register('contact_relationship')}
                options={[{ value: '', label: 'Select Relationship' }, ...CONTACT_RELATIONSHIP_OPTIONS]}
              />
            </div>
          </div>

          {/* SECTION 5: Special Requirements & Consent */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Special Requirements</h3>
            <div className="space-y-3">
              <CheckboxField
                label="Indigenous Person"
                {...register('indigenous_flag')}
              />
              <FormField
                label="Indigenous Group"
                error={errors.indigenous_group}
                {...register('indigenous_group')}
                placeholder="e.g., Ilocano, Bicolano"
              />
              <CheckboxField
                label="Consent to Data Processing"
                {...register('consent_flag')}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading || isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading || isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// REUSABLE FORM FIELDS
// ============================================================================
const FormField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: any }
>(({ label, error, className, ...props }, ref) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <Input
      ref={ref}
      className={error ? 'border-red-500' : ''}
      {...props}
    />
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
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-500">{error.message}</p>}
  </div>
));
SelectField.displayName = 'SelectField';

const CheckboxField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: any }
>(({ label, error, ...props }, ref) => (
  <div className="flex items-center space-x-2">
    <input
      ref={ref}
      type="checkbox"
      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      {...props}
    />
    <label className="text-sm font-medium text-gray-700">{label}</label>
    {error && <p className="text-xs text-red-500">{error.message}</p>}
  </div>
));
CheckboxField.displayName = 'CheckboxField';
