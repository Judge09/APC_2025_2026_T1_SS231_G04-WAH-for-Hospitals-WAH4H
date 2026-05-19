/**
 * Patient Registration Modal - 3-Step Wizard
 * Aligned with Patient model (wah4h-backend/patients/models.py)
 *
 * Page 1: Basic Info + Additional Info
 * Page 2: Contact & Address
 * Page 3: Emergency Contact
 */
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { PatientFormData } from '../../types/patient';
import {
  patientStep1Schema,
  patientStep2Schema,
  patientStep3Schema,
  patientStep4Schema,
  patientFormDataSchema,
  type PatientStep1FormData,
  type PatientStep2FormData,
  type PatientStep3FormData,
  type PatientStep4FormData,
} from '../../schemas/patientSchema';
import {
  GENDER_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  PWD_TYPE_OPTIONS,
  NATIONALITY_OPTIONS,
  RELIGION_OPTIONS,
  CONTACT_RELATIONSHIP_OPTIONS,
  EDUCATION_OPTIONS,
  OCCUPATION_OPTIONS,
  INDIGENOUS_GROUP_OPTIONS,
  COUNTRY_OPTIONS,
  REGISTRATION_STEPS,
} from '../../constants/patientConstants';
import addressData from '../../data/addressData.json';

interface PatientRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (patient: any) => void;
  isLoading?: boolean;
  error?: string;
  /** When provided, pre-fills the form fields with data from a WAH4PC network search. */
  prefillData?: Partial<PatientFormData>;
}

export const PatientRegistrationModal: React.FC<PatientRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isLoading = false,
  error,
  prefillData,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [allStepsData, setAllStepsData] = useState<Partial<PatientFormData>>({});
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  // Unlock after 100ms to allow form to stabilize
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Safety: ensure currentStep never exceeds 3
  const normalizedStep = Math.min(currentStep, 3) as 1 | 2 | 3;

  // Step 1: Basic Info
  const step1Form = useForm<PatientStep1FormData>({
    resolver: zodResolver(patientStep1Schema),
    mode: 'onChange',
  });

  // Step 2: Contact & Address
  const step2Form = useForm<PatientStep2FormData>({
    resolver: zodResolver(patientStep2Schema),
    mode: 'onChange',
  });

  // Step 3: Emergency Contact + Consent
  const step3Form = useForm<PatientStep3FormData>({
    resolver: zodResolver(patientStep3Schema),
    mode: 'onChange',
    defaultValues: {
      contact_first_name: '',
      contact_last_name: '',
      contact_mobile_number: '',
      contact_relationship: '',
      consent_flag: false,
    },
  });

  // Pre-fill all three step forms when the modal opens with network-search data.
  React.useEffect(() => {
    if (!isOpen || !prefillData || Object.keys(prefillData).length === 0) return;
    // Seed the accumulated data so later steps inherit the values.
    setAllStepsData(prefillData);
    // Reset each step form with only the fields it owns.
    step1Form.reset({
      first_name:      prefillData.first_name      ?? '',
      last_name:       prefillData.last_name        ?? '',
      middle_name:     prefillData.middle_name,
      suffix_name:     prefillData.suffix_name,
      birthdate:       prefillData.birthdate        ?? '',
      gender:          prefillData.gender,
      civil_status:    prefillData.civil_status,
      blood_type:      prefillData.blood_type,
      pwd_type:        prefillData.pwd_type,
      indigenous_flag: prefillData.indigenous_flag,
      indigenous_group:prefillData.indigenous_group,
      nationality:     prefillData.nationality,
      religion:        prefillData.religion,
      occupation:      prefillData.occupation,
      education:       prefillData.education,
      philhealth_id:   prefillData.philhealth_id,
    });
    step2Form.reset({
      mobile_number:       prefillData.mobile_number       ?? '',
      address_line:        prefillData.address_line        ?? '',
      address_city:        prefillData.address_city        ?? '',
      address_district:    prefillData.address_district,
      address_state:       prefillData.address_state,
      address_postal_code: prefillData.address_postal_code,
      address_country:     prefillData.address_country,
    });
    step3Form.reset({
      contact_first_name:   prefillData.contact_first_name,
      contact_last_name:    prefillData.contact_last_name,
      contact_mobile_number:prefillData.contact_mobile_number ?? '',
      contact_relationship: prefillData.contact_relationship,
      consent_flag: false, // user must explicitly consent
    });
    setCurrentStep(1);
  }, [isOpen, prefillData]); // eslint-disable-line react-hooks/exhaustive-deps



  const handleNextStep = async () => {
    if (currentStep === 1) {
      const isValid = await step1Form.trigger();
      if (!isValid) return;
      const step1Data = step1Form.getValues();
      setAllStepsData(prev => ({
        ...prev,
        ...step1Data,
      }));
      // Lock BEFORE state change
      setIsTransitioning(true);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const isValid = await step2Form.trigger();
      if (!isValid) return;
      const step2Data = step2Form.getValues();
      setAllStepsData(prev => ({
        ...prev,
        ...step2Data,
      }));
      // Lock BEFORE state change - critical for step 3
      setIsTransitioning(true);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // SHOULD NEVER REACH HERE - step 3 has no "next" button
      console.error('[PatientRegistrationModal] handleNextStep called on step 3 - this should not happen!');
      return;
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // GUARD 1: Block submission during step transitions
    if (isTransitioning) {
      console.warn('[PatientRegistrationModal] Blocked submission - step transition in progress');
      return;
    }

    // GUARD 2: Only allow submission on step 3
    if (currentStep !== 3) {
      console.warn('[PatientRegistrationModal] Blocked submission - not on step 3');
      return;
    }

    // Validate step 3
    const isValid = await step3Form.trigger();
    if (!isValid) return;

    const rawFinal = {
      ...allStepsData,
      ...step3Form.getValues(),
      active: true,
      status: 'active',
    } as PatientFormData;

    // Strip non-digits from mobile numbers so the strict 09XXXXXXXXX regex passes
    if (rawFinal.mobile_number) {
      rawFinal.mobile_number = rawFinal.mobile_number.replace(/\D/g, '');
    }
    if (rawFinal.contact_mobile_number) {
      rawFinal.contact_mobile_number = rawFinal.contact_mobile_number.replace(/\D/g, '');
    }

    const finalData = rawFinal;

    // Validate complete form
    try {
      const validatedData = patientFormDataSchema.parse(finalData);

      if (onSuccess) {
        // Await the async API call - if it throws, we catch it below
        await onSuccess(validatedData);
      }

      // Only close modal if API call succeeded
      handleClose();
    } catch (err) {
      console.error('[PatientRegistrationModal] Submission error:', err);
      // Modal stays open on error so user can see the error message
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setAllStepsData({});
    step1Form.reset();
    step2Form.reset();
    step3Form.reset();
    onClose();
  };



  const getStepProgress = () => {
    // Progress: Step 1 = 0%, Step 2 = 50%, Step 3 = 100%
    return Math.round(((currentStep - 1) / 2) * 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Ensure explicit close triggers the modal cleanup
      if (!open) {
        handleClose();
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Register New Patient - Step {currentStep} of 3</DialogTitle>
          <DialogDescription>
            Complete the form to register a new patient. Use Next to proceed between sections.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{REGISTRATION_STEPS[currentStep - 1].title}</span>
            <span>{getStepProgress()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getStepProgress()}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">{REGISTRATION_STEPS[currentStep - 1].description}</p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e: React.KeyboardEvent<HTMLFormElement>) => {
            // Prevent accidental Enter-submits - only allow explicit button clicks
            if (e.key === 'Enter') {
              e.preventDefault();
              // If not on last step, go to next step
              if (currentStep < 3) {
                void handleNextStep();
              }
              // On step 3, do nothing - user must click "Register Patient" button
            }
          }}
          className="space-y-6"
        >
          {/* STEP 1: Basic Info */}
          {currentStep === 1 && <Step1Form form={step1Form} />}

          {/* STEP 2: Contact & Address */}
          {currentStep === 2 && <Step2Form form={step2Form} />}

          {/* STEP 3: Emergency Contact */}
          {currentStep === 3 && <Step3Form form={step3Form} />}

          {/* Action Buttons */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? handleClose : handlePreviousStep}
              disabled={isLoading}
            >
              {currentStep === 1 ? 'Cancel' : <><ChevronLeft className="w-4 h-4 mr-2" /> Previous</>}
            </Button>

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Creating Patient...' : 'Register Patient'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// STEP 1: BASIC INFO
// ============================================================================
const Step1Form = ({ form }: { form: any }) => {
  const { register, setValue, formState: { errors }, watch } = form;
  const indigenousFlag = watch('indigenous_flag');
  const pwdType = watch('pwd_type');

  return (
    <div className="space-y-4">
      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Last Name"
          required
          error={errors.last_name}
          {...register('last_name')}
          placeholder="e.g., Dela Cruz"
        />
        <FormField
          label="First Name"
          required
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
        <SelectField
          label="Suffix"
          error={errors.suffix_name}
          {...register('suffix_name')}
          options={[
            { value: '', label: 'None / N/A' },
            { value: 'Jr.', label: 'Jr.' },
            { value: 'Sr.', label: 'Sr.' },
            { value: 'II', label: 'II' },
            { value: 'III', label: 'III' },
            { value: 'IV', label: 'IV' },
          ]}
        />
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Date of Birth"
          required
          type="date"
          error={errors.birthdate}
          {...register('birthdate')}
        />
        <SelectField
          label="Gender"
          required
          error={errors.gender}
          {...register('gender')}
          options={[{ value: '', label: 'Select Gender' }, ...GENDER_OPTIONS]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SelectField
          label="Civil Status"
          error={errors.civil_status}
          {...register('civil_status')}
          options={[{ value: '', label: 'Select Status' }, ...MARITAL_STATUS_OPTIONS]}
        />
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
        {pwdType && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-1">
            Ensure the patient's PWD ID or certification document has been sighted before marking this status.
          </p>
        )}
      </div>

      {/* Indigenous */}
      <div className="pt-2 border-t">
        <CheckboxField
          label="Indigenous Person"
          {...register('indigenous_flag')}
        />
        {indigenousFlag && (
          <div className="mt-2">
            <SelectField
              label="Indigenous Group"
              error={errors.indigenous_group}
              {...register('indigenous_group')}
              options={[{ value: '', label: 'Select Indigenous Group' }, ...INDIGENOUS_GROUP_OPTIONS]}
            />
          </div>
        )}
      </div>
      {/* Additional info (moved from Step 4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Nationality"
          error={errors.nationality}
          {...register('nationality')}
          options={[{ value: '', label: 'Select Nationality' }, ...NATIONALITY_OPTIONS]}
        />
        <SelectField
          label="Religion"
          error={errors.religion}
          {...register('religion')}
          options={[{ value: '', label: 'Select Religion' }, ...RELIGION_OPTIONS]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Occupation"
          error={errors.occupation}
          {...register('occupation')}
          options={[{ value: '', label: 'Select Occupation' }, ...OCCUPATION_OPTIONS]}
        />
        <SelectField
          label="Educational Attainment"
          error={errors.education}
          {...register('education')}
          options={[{ value: '', label: 'Select Education Level' }, ...EDUCATION_OPTIONS]}
        />
      </div>

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

      <FormField
        label="Image URL"
        error={errors.image_url}
        {...register('image_url')}
        placeholder="e.g., https://example.com/photo.jpg"
      />

    </div>
  );
};

// ============================================================================
// STEP 2: CONTACT & ADDRESS
// ============================================================================
const Step2Form = ({ form }: { form: any }) => {
  const { register, formState: { errors }, watch, setValue } = form;
  const selectedRegion = watch('address_state');
  const selectedProvince = watch('address_district');
  const selectedCity = watch('address_city');

  // Check if cascading data exists for the selected values
  const regionArr = Array.isArray(addressData.regions) ? addressData.regions : [];
  const provinces = selectedRegion && (addressData.provinces as Record<string, any[]>)?.[selectedRegion];
  const cities = selectedProvince && (addressData.cities as Record<string, any[]>)?.[selectedProvince];
  const barangays = selectedCity && (addressData.barangays as Record<string, string[]>)?.[selectedCity];

  const hasProvinces = Array.isArray(provinces) && provinces.length > 0;
  const hasCities = Array.isArray(cities) && cities.length > 0;
  const hasBarangays = Array.isArray(barangays) && barangays.length > 0;

  return (
    <div className="space-y-4">
      <FormField
        label="Mobile Number"
        required
        error={errors.mobile_number}
        inputMode="tel"
        pattern="^(?:\\+63\\d{10}|0\\d{10})$"
        maxLength={13}
        {...register('mobile_number', {
          onChange: (e: any) => {
            const raw = e.target.value || '';
            const hadPlus = raw.startsWith('+');
            const digits = raw.replace(/\D/g, '');
            if (hadPlus) {
              // keep leading + and limit to country code + 10 digits (e.g. +639XXXXXXXXX)
              const trimmed = digits.slice(0, 12); // '63' + 10 digits = 12
              e.target.value = '+' + trimmed;
            } else {
              // local format: limit to 11 digits (e.g. 09123456789)
              e.target.value = digits.slice(0, 11);
            }
          },
        })}
        placeholder="e.g., 09123456789"
      />

      <div className="pt-4 border-t">
        <h4 className="text-sm font-semibold mb-4">Address (PSGC)</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <SelectField
            label="Region"
            error={errors.address_state}
            {...register('address_state', {
              onChange: () => {
                setValue('address_district', '');
                setValue('address_city', '');
                setValue('address_line', '');
              },
            })}
            options={[
              { value: '', label: 'Select Region' },
              ...regionArr.map((r: any) => ({
                value: r.code,
                label: r.name,
              })),
            ]}
          />
          {hasProvinces ? (
            <SelectField
              label="Province"
              error={errors.address_district}
              {...register('address_district', {
                onChange: () => {
                  setValue('address_city', '');
                  setValue('address_line', '');
                },
              })}
              options={[
                { value: '', label: 'Select Province' },
                ...provinces.map((p: any) => ({
                  value: p.code,
                  label: p.name,
                })),
              ]}
            />
          ) : (
            <FormField
              label="Province"
              error={errors.address_district}
              {...register('address_district')}
              placeholder="Enter province name"
              disabled={!selectedRegion}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hasCities ? (
            <SelectField
              label="City/Municipality"
              required
              error={errors.address_city}
              {...register('address_city', {
                onChange: () => {
                  setValue('address_line', '');
                },
              })}
              options={[
                { value: '', label: 'Select City/Municipality' },
                ...cities.map((c: any) => ({
                  value: c.code,
                  label: c.name,
                })),
              ]}
            />
          ) : (
            <FormField
              label="City/Municipality"
              required
              error={errors.address_city}
              {...register('address_city')}
              placeholder="Enter city/municipality name"
              disabled={!selectedProvince}
            />
          )}
          {hasBarangays ? (
            <SelectField
              label="Barangay"
              required
              error={errors.address_line}
              {...register('address_line')}
              options={[
                { value: '', label: 'Select Barangay' },
                ...barangays.map((b: string) => ({
                  value: b,
                  label: b,
                })),
              ]}
            />
          ) : (
            <FormField
              label="Barangay"
              required
              error={errors.address_line}
              {...register('address_line')}
              placeholder="Enter barangay name"
              disabled={!selectedCity}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <SelectField
          label="Country"
          error={errors.address_country}
          {...register('address_country')}
          options={[{ value: '', label: 'Select Country' }, ...COUNTRY_OPTIONS]}
        />
      </div>
    </div>
  );
};

// ============================================================================
// STEP 3: EMERGENCY CONTACT
// ============================================================================
const Step3Form = ({ form }: { form: any }) => {
  const { register, formState: { errors }, watch } = form;
  const consentFlag = watch('consent_flag');

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Emergency Contact Information (Optional)</h4>
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

      {/* Data Privacy Consent */}
      <div className="pt-4 border-t">
        <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-md">
          <input
            type="checkbox"
            id="consent_flag"
            {...register('consent_flag')}
            required
            className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="consent_flag" className="text-sm text-gray-700 flex-1">
            <span className="font-semibold">I consent to the collection and processing of my personal health data</span>
            <span className="text-red-500 ml-1">*</span>
            {' '}in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173) and its implementing rules and regulations.
          </label>
        </div>
        {errors.consent_flag && (
          <p className="text-xs text-red-500 mt-2">{errors.consent_flag.message}</p>
        )}
        {!consentFlag && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ Consent is required to proceed with patient registration
          </p>
        )}
      </div>
    </div>
  );
};



// ============================================================================
// REUSABLE FORM FIELDS
// ============================================================================
const FormField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: any }
>(({ label, error, className, required, ...props }, ref) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <Input
      ref={ref}
      className={error ? 'border-red-500' : ''}
      required={required}
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
>(({ label, error, options, className, required, ...props }, ref) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <select
      ref={ref}
      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      }`}
      required={required}
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
>(({ label, error, required, ...props }, ref) => (
  <div className="flex items-center space-x-2">
    <input
      ref={ref}
      type="checkbox"
      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      required={required}
      {...props}
    />
    <label className="text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {error && <p className="text-xs text-red-500">{error.message}</p>}
  </div>
));
CheckboxField.displayName = 'CheckboxField';
