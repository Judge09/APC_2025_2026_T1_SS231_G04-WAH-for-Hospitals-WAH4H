import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  UserPlus, 
  User, 
  MapPin, 
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Check
} from 'lucide-react';
import { UserRole } from '@/contexts/RoleContext';
import { cn } from '@/lib/utils';
import api from '@/services/api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RegistrationFormData {
  // Step 1: Personal Identity + Account Security
  firstName: string;
  middleName: string;
  lastName: string;
  suffixName: string;
  mobile: string;
  email: string;
  gender: string;
  birthDate: string;
  language: string;
  photoUrl: string;
  role: UserRole | '';
  password: string;
  confirmPassword: string;

  // Step 2: Address Information
  addressLine: string;
  addressCity: string;
  addressDistrict: string;
  addressState: string;
  addressPostalCode: string;
  addressCountry: string;

  // Step 3: Professional Qualifications + Hospital Assignment
  identifier: string; // PRC License
  qualificationCode: string;
  qualificationIdentifier: string;
  qualificationIssuer: string;
  qualificationPeriodStart: string;
  qualificationPeriodEnd: string;
  organization: string;
  roleCode: string;
  specialtyCode: string;
}

interface Organization {
  organization_id: number;
  name: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'tl', label: 'Tagalog' },
  { value: 'ceb', label: 'Cebuano' },
  { value: 'ilo', label: 'Ilocano' },
  { value: 'war', label: 'Waray' },
  { value: 'pam', label: 'Kapampangan' },
  { value: 'zh', label: 'Mandarin' },
];

const QUALIFICATION_OPTIONS = [
  { value: 'MD', label: 'Doctor of Medicine (MD)' },
  { value: 'RN', label: 'Registered Nurse (RN)' },
  { value: 'RMT', label: 'Registered Medical Technologist (RMT)' },
  { value: 'RPh', label: 'Registered Pharmacist (RPh)' },
  { value: 'Staff', label: 'Support Staff' },
];

const SPECIALTY_OPTIONS = [
  { value: 'internal-medicine', label: 'Internal Medicine' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'ob-gyn', label: 'Obstetrics & Gynecology' },
  { value: 'family-medicine', label: 'Family Medicine' },
  { value: 'radiology', label: 'Radiology' },
  { value: 'anesthesiology', label: 'Anesthesiology' },
  { value: 'emergency-medicine', label: 'Emergency Medicine' },
  { value: 'psychiatry', label: 'Psychiatry' },
  { value: 'none', label: 'None / Other' },
];

const ROLE_CARDS = [
  {
    value: 'doctor' as UserRole,
    label: 'Doctor',
    description: 'Medical practitioner with prescribing authority',
    icon: 'DR',
  },
  {
    value: 'nurse' as UserRole,
    label: 'Nurse',
    description: 'Registered healthcare professional providing patient care',
    icon: 'RN',
  },
  {
    value: 'pharmacist' as UserRole,
    label: 'Pharmacist',
    description: 'Medication expert managing pharmacy operations',
    icon: 'PH',
  },
  {
    value: 'lab_technician' as UserRole,
    label: 'Lab Technician',
    description: 'Laboratory specialist conducting diagnostic tests',
    icon: 'LT',
  },
  {
    value: 'billing_clerk' as UserRole,
    label: 'Billing Staff',
    description: 'Financial staff handling billing and payments',
    icon: 'BL',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Register = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [orgsLoaded, setOrgsLoaded] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyError, setPrivacyError] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Password strength requirements state
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  // Track last-checked values so handleNext skips duplicate API calls on back/forward
  const lastCheckedEmailRef = useRef('');
  const lastCheckedMobileRef = useRef('');

  const navigate = useNavigate();
  const { registerInitiate, registerVerify, isLoading } = useAuth();

  // Form data state
  const [formData, setFormData] = useState<RegistrationFormData>({
    // Step 1
    firstName: '',
    middleName: '',
    lastName: '',
    suffixName: '',
    mobile: '',
    email: '',
    gender: '',
    birthDate: '',
    language: 'en',
    photoUrl: '',
    role: '',
    password: '',
    confirmPassword: '',

    // Step 2
    addressLine: '',
    addressCity: '',
    addressDistrict: '',
    addressState: '',
    addressPostalCode: '',
    addressCountry: 'Philippines',

    // Step 3
    identifier: '',
    qualificationCode: '',
    qualificationIdentifier: '',
    qualificationIssuer: '',
    qualificationPeriodStart: '',
    qualificationPeriodEnd: '',
    organization: '',
    roleCode: '',
    specialtyCode: '',
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Maximum selectable birth date (today minus 18 years) to prevent under-18 registration
  const maxBirthDate = new Date();
  maxBirthDate.setFullYear(maxBirthDate.getFullYear() - 18);
  const maxBirthDateStr = maxBirthDate.toISOString().split('T')[0];

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  const fetchOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      // 1. Get the public backend URL from the .env file
      // Fallback to local development URL if undefined
      const apiBase = import.meta.env.LOCAL_8000 || '';

      // 2. Construct the full URL
      // We assume the endpoint is at /api/accounts/organizations/
      // Ensure there are no double slashes except after the protocol
      const normalizedBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      const url = `${normalizedBase}/api/accounts/organizations/`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data || []);
        setOrgsLoaded(true);
      } else {
        console.error('Server returned error:', response.status);
        // Optional: Log the text response if it's not JSON (helps debugging 404s)
        const text = await response.text();
        console.error('Response body:', text);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setOrganizations([]);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  useEffect(() => {
    if (!orgsLoaded || !formData.organization) {
      return;
    }

    const organizationExists = organizations.some(
      (org) => String(org.organization_id) === formData.organization
    );

    if (!organizationExists) {
      setFormData((prev) => ({ ...prev, organization: '' }));
    }
  }, [formData.organization, organizations, orgsLoaded]);

  // ============================================================================
  // VALIDATION FUNCTIONS
  // ============================================================================

  const validatePhilippineMobile = (phone: string): boolean => {
    // Format: 09XX-XXX-XXXX (11 digits)
    const cleanPhone = phone.replace(/[-\s]/g, '');
    return /^09\d{9}$/.test(cleanPhone);
  };

  const validatePRCLicense = (license: string): boolean => {
    // Exactly 7 digits numeric
    return /^\d{7}$/.test(license);
  };

  // OWASP-Compliant Password Validation (No External Libraries)
  const checkPasswordRequirements = (password: string) => {
    return {
      minLength: password.length >= 12,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
  };

  const validatePassword = (password: string): boolean => {
    const requirements = checkPasswordRequirements(password);
    return Object.values(requirements).every((req) => req === true);
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    // Mobile validation
    if (!formData.mobile) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!validatePhilippineMobile(formData.mobile)) {
      newErrors.mobile = 'Invalid format. Use 09XX-XXX-XXXX (11 digits)';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Gender validation
    if (!formData.gender) newErrors.gender = 'Gender is required';

    // Birth date validation: required, must be in the past, and must be at least 18 years old
    if (!formData.birthDate) {
      newErrors.birthDate = 'Birth date is required';
    } else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();

      // Calculate age in years accurately
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 0) {
        newErrors.birthDate = 'Birth date must be in the past';
      } else if (age < 18) {
        newErrors.birthDate = 'You must be 18 years or older to be able to work';
      }
    }

    // Role validation
    if (!formData.role) newErrors.role = 'Please select your role';

    // Password validation - OWASP Compliant
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must meet all security requirements below';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.addressLine.trim()) newErrors.addressLine = 'Address line is required';
    if (!formData.addressCity.trim()) newErrors.addressCity = 'City is required';
    if (!formData.addressState.trim()) newErrors.addressState = 'Province is required';
    if (!formData.addressPostalCode.trim()) {
      newErrors.addressPostalCode = 'Postal code is required';
    } else if (!/^\d{4}$/.test(formData.addressPostalCode)) {
      newErrors.addressPostalCode = 'Postal code must be 4 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};

    // PRC License validation
    if (!formData.identifier) {
      newErrors.identifier = 'PRC License is required';
    } else if (!validatePRCLicense(formData.identifier)) {
      newErrors.identifier = 'PRC License must be exactly 7 digits';
    }

    // Qualification code validation
    if (!formData.qualificationCode) {
      newErrors.qualificationCode = 'Qualification is required';
    }

    // Qualification end date validation
    if (!formData.qualificationPeriodEnd) {
      newErrors.qualificationPeriodEnd = 'License expiry date is required';
    } else {
      const expiryDate = new Date(formData.qualificationPeriodEnd);
      const today = new Date();
      if (expiryDate <= today) {
        newErrors.qualificationPeriodEnd = 'Expiry date must be in the future';
      }
    }

    // Organization validation
    if (!formData.organization) {
      newErrors.organization = 'Hospital/Organization is required';
    }

    // Position validation
    if (!formData.roleCode.trim()) {
      newErrors.roleCode = 'Position is required';
    }

    // Specialty validation
    if (!formData.specialtyCode) {
      newErrors.specialtyCode = 'Specialty is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleInputChange = (field: keyof RegistrationFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Real-time password strength checking
    if (field === 'password') {
      setPasswordRequirements(checkPasswordRequirements(value));
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEmailBlur = async () => {
    const email = formData.email;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (email === lastCheckedEmailRef.current) return;
    try {
      const resp = await api.get(`/api/accounts/check-email/?email=${encodeURIComponent(email)}`);
      const available = resp?.data?.data?.available;
      lastCheckedEmailRef.current = email;
      if (available === false) {
        setErrors((prev) => ({ ...prev, email: resp?.data?.data?.message || 'Email is already registered. Please use a different email.' }));
      }
    } catch {
      // Silent — email check is best-effort on blur; Next will retry if needed
    }
  };

  const handleMobileChange = (value: string) => {
    // Auto-format Philippine mobile: 09XX-XXX-XXXX
    let cleaned = value.replace(/\D/g, '');
    
    // Limit to 11 digits
    if (cleaned.length > 11) {
      cleaned = cleaned.slice(0, 11);
    }

    // Format with hyphens
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }
    if (cleaned.length > 7) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }

    handleInputChange('mobile', formatted);
  };

  const handleNext = async () => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      let isValid = false;

      if (currentStep === 1) {
        isValid = validateStep1();
        if (!privacyAccepted) {
          setPrivacyError('You must acknowledge the Privacy Statement to create an account.');
          return;
        }

        if (isValid && formData.email && formData.email !== lastCheckedEmailRef.current) {
          try {
            const resp = await api.get(`/api/accounts/check-email/?email=${encodeURIComponent(formData.email)}`);
            const available = resp?.data?.data?.available;
            lastCheckedEmailRef.current = formData.email;
            if (available === false) {
              setErrors((prev) => ({ ...prev, email: resp?.data?.data?.message || 'Email is already registered. Please use a different email.' }));
              return;
            }
          } catch (err) {
            console.error('Email availability check failed:', err);
          }
        }

        if (isValid && formData.mobile && formData.mobile !== lastCheckedMobileRef.current) {
          try {
            const cleaned = formData.mobile.replace(/\D/g, '');
            const resp = await api.get('/api/accounts/practitioners/');
            let data: any = resp.data;
            if (data.results && Array.isArray(data.results)) data = data.results;
            lastCheckedMobileRef.current = formData.mobile;

            const conflict = (data || []).find((p: any) => {
              const telecom = (p.telecom || '').toString().replace(/\D/g, '');
              return telecom === cleaned;
            });

            if (conflict) {
              setErrors((prev) => ({ ...prev, mobile: 'Mobile number is already in use by another account.' }));
              return;
            }
          } catch (err) {
            console.error('Pre-check practitioners failed:', err);
          }
        }
      } else if (currentStep === 2) {
        isValid = validateStep2();
      }

      if (isValid) {
        setCurrentStep((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setIsNavigating(false);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => prev - 1);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep3()) return;

    const result = await registerInitiate({
      ...formData,
      role: formData.role as UserRole,
    });

    if (result.ok) {
      if (result.otpDisabled) {
        // Backend has OTP disabled — account created and auto-logged in, go to dashboard
        navigate('/dashboard');
      } else {
        // OTP flow: show verification modal
        setShowOTPModal(true);
      }
      return;
    }

    const validationErrors = result.error?.errors || result.error || {};
    console.error('Validation errors:', validationErrors);

    // Normalize backend error formats (arrays or objects) into simple strings for display
    const formattedErrors: Record<string, string> = {};
    Object.entries(validationErrors).forEach(([k, v]) => {
      if (Array.isArray(v)) formattedErrors[k] = v.join(' ');
      else if (typeof v === 'object' && v !== null) formattedErrors[k] = JSON.stringify(v);
      else formattedErrors[k] = String(v);
    });

    // Map backend field names to steps
    const step1Fields = ['firstName', 'first_name', 'lastName', 'last_name', 'email', 'mobile', 'telecom', 'gender', 'birthDate', 'birth_date', 'password', 'confirm_password', 'role', 'identifier'];
    const step2Fields = ['addressLine', 'address_line', 'addressCity', 'address_city', 'addressDistrict', 'address_district', 'addressState', 'address_state', 'addressPostalCode', 'address_postal_code', 'addressCountry', 'address_country'];

    // Check which step has the error
    const errorFields = Object.keys(formattedErrors);

    if (errorFields.some((field) => step1Fields.includes(field))) {
      setCurrentStep(1);
      setErrors(formattedErrors);
    } else if (errorFields.some((field) => step2Fields.includes(field))) {
      setCurrentStep(2);
      setErrors(formattedErrors);
    } else {
      // Error is in step 3, stay on current step
      setErrors(formattedErrors);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOTPVerification = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP code' });
      return;
    }

    setIsVerifying(true);
    setErrors({});

    try {
      const result = await registerVerify(formData.email, otpCode);

      if (result.ok) {
        // registerVerify does NOT auto-login — navigate to login so user can sign in
        navigate('/login');
      } else {
        const errMsg =
          result.error?.message ||
          result.error?.detail ||
          (result.error?.otp ? result.error.otp[0] : undefined) ||
          'Invalid or expired OTP. Please try again.';
        setErrors({ otp: errMsg });
      }
    } catch (error: any) {
      setErrors({ otp: error?.message || 'Verification failed. Please try again.' });
    } finally {
      setIsVerifying(false);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-10">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors',
              currentStep === step
                ? 'bg-blue-600 text-white shadow-sm'
                : currentStep > step
                ? 'bg-green-600 text-white'
                : 'bg-slate-200 text-slate-600'
            )}
          >
            {currentStep > step ? <Check className="w-5 h-5" /> : step}
          </div>
          {step < 3 && (
            <div
              className={cn(
                'w-16 h-1 mx-2 rounded-full transition-colors',
                currentStep > step ? 'bg-green-600' : 'bg-slate-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Personal Identity Section */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <User className="w-5 h-5" />
          Personal Identity
        </h3>

        <div className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={errors.firstName ? 'border-red-500' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="middleName">
                Middle Name <span className="text-gray-400 text-xs">(Optional)</span>
              </Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => handleInputChange('middleName', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={errors.lastName ? 'border-red-500' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="suffixName">
                Suffix <span className="text-gray-400 text-xs">(Optional)</span>
              </Label>
              <Input
                id="suffixName"
                value={formData.suffixName}
                onChange={(e) => handleInputChange('suffixName', e.target.value)}
                placeholder="Jr., Sr., III"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mobile">
                Mobile Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => handleMobileChange(e.target.value)}
                placeholder="09XX-XXX-XXXX"
                className={errors.mobile ? 'border-red-500' : ''}
                maxLength={13}
              />
              {errors.mobile && (
                <p className="text-sm text-red-500 mt-1">{errors.mobile}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={handleEmailBlur}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Demographics */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="gender">
                Gender <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.gender}
                onValueChange={(v) => handleInputChange('gender', v)}
              >
                <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-sm text-red-500 mt-1">{errors.gender}</p>
              )}
            </div>

            <div>
              <Label htmlFor="birthDate">
                Birth Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                max={maxBirthDateStr}
                className={errors.birthDate ? 'border-red-500' : ''}
              />
              {errors.birthDate && (
                <p className="text-sm text-red-500 mt-1">{errors.birthDate}</p>
              )}
            </div>

            <div>
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.language}
                onValueChange={(v) => handleInputChange('language', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Photo URL */}
          <div>
            <Label htmlFor="photoUrl">
              Photo URL <span className="text-gray-400 text-xs">(Optional)</span>
            </Label>
            <Input
              id="photoUrl"
              type="url"
              value={formData.photoUrl}
              onChange={(e) => handleInputChange('photoUrl', e.target.value)}
              placeholder="https://example.com/photo.jpg"
            />
          </div>
        </div>
      </div>

      {/* Account Security Section */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-4">Account Security</h3>

        <div className="space-y-4">
          {/* Role Selection - Grid of Cards */}
          <div>
            <Label>
              Select Your Role <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {ROLE_CARDS.map((roleCard) => (
                <button
                  key={roleCard.value}
                  type="button"
                  onClick={() => handleInputChange('role', roleCard.value)}
                  className={cn(
                    'p-4 border rounded-xl text-left transition-all bg-white hover:shadow-md',
                    formData.role === roleCard.value
                      ? 'border-blue-600 ring-2 ring-blue-100 bg-blue-50/60'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {roleCard.icon}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{roleCard.label}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        {roleCard.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {errors.role && (
              <p className="text-sm text-red-500 mt-2">{errors.role}</p>
            )}
          </div>

          {/* Password Fields */}
          <div>
            <Label htmlFor="password">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={cn(
                  'pr-10 [appearance:textfield] [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-credentials-auto-fill-button]:hidden',
                  errors.password ? 'border-red-500' : ''
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password}</p>
            )}
            
            {/* Password Strength Requirements Checklist */}
            <div className="mt-3 space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2">Password Requirements:</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center",
                    passwordRequirements.minLength ? "bg-green-500" : "bg-slate-300"
                  )}>
                    {passwordRequirements.minLength && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn(
                    "text-xs",
                    passwordRequirements.minLength ? "text-green-700 font-medium" : "text-slate-600"
                  )}>
                    At least 12 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center",
                    passwordRequirements.hasUppercase ? "bg-green-500" : "bg-slate-300"
                  )}>
                    {passwordRequirements.hasUppercase && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn(
                    "text-xs",
                    passwordRequirements.hasUppercase ? "text-green-700 font-medium" : "text-slate-600"
                  )}>
                    At least 1 uppercase letter (A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center",
                    passwordRequirements.hasLowercase ? "bg-green-500" : "bg-slate-300"
                  )}>
                    {passwordRequirements.hasLowercase && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn(
                    "text-xs",
                    passwordRequirements.hasLowercase ? "text-green-700 font-medium" : "text-slate-600"
                  )}>
                    At least 1 lowercase letter (a-z)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center",
                    passwordRequirements.hasNumber ? "bg-green-500" : "bg-slate-300"
                  )}>
                    {passwordRequirements.hasNumber && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn(
                    "text-xs",
                    passwordRequirements.hasNumber ? "text-green-700 font-medium" : "text-slate-600"
                  )}>
                    At least 1 number (0-9)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center",
                    passwordRequirements.hasSpecialChar ? "bg-green-500" : "bg-slate-300"
                  )}>
                    {passwordRequirements.hasSpecialChar && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn(
                    "text-xs",
                    passwordRequirements.hasSpecialChar ? "text-green-700 font-medium" : "text-slate-600"
                  )}>
                    At least 1 special character (!@#$%^&*)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={cn(
                  'pr-10 [appearance:textfield] [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-credentials-auto-fill-button]:hidden',
                  errors.confirmPassword ? 'border-red-500' : ''
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5" />
        Address Information
      </h3>

      <div className="space-y-4">
        {/* Address Line */}
        <div>
          <Label htmlFor="addressLine">
            Street Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="addressLine"
            value={formData.addressLine}
            onChange={(e) => handleInputChange('addressLine', e.target.value)}
            placeholder="House/Unit No., Street Name"
            className={errors.addressLine ? 'border-red-500' : ''}
          />
          {errors.addressLine && (
            <p className="text-sm text-red-500 mt-1">{errors.addressLine}</p>
          )}
        </div>

        {/* City, District */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="addressCity">
              City <span className="text-red-500">*</span>
            </Label>
            <Input
              id="addressCity"
              value={formData.addressCity}
              onChange={(e) => handleInputChange('addressCity', e.target.value)}
              className={errors.addressCity ? 'border-red-500' : ''}
            />
            {errors.addressCity && (
              <p className="text-sm text-red-500 mt-1">{errors.addressCity}</p>
            )}
          </div>

          <div>
            <Label htmlFor="addressDistrict">
              Barangay <span className="text-gray-400 text-xs">(Optional)</span>
            </Label>
            <Input
              id="addressDistrict"
              value={formData.addressDistrict}
              onChange={(e) => handleInputChange('addressDistrict', e.target.value)}
            />
          </div>
        </div>

        {/* Province, Postal Code */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="addressState">
              Province <span className="text-red-500">*</span>
            </Label>
            <Input
              id="addressState"
              value={formData.addressState}
              onChange={(e) => handleInputChange('addressState', e.target.value)}
              className={errors.addressState ? 'border-red-500' : ''}
            />
            {errors.addressState && (
              <p className="text-sm text-red-500 mt-1">{errors.addressState}</p>
            )}
          </div>

          <div>
            <Label htmlFor="addressPostalCode">
              Postal Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="addressPostalCode"
              value={formData.addressPostalCode}
              onChange={(e) => handleInputChange('addressPostalCode', e.target.value)}
              placeholder="4 digits"
              maxLength={4}
              className={errors.addressPostalCode ? 'border-red-500' : ''}
            />
            {errors.addressPostalCode && (
              <p className="text-sm text-red-500 mt-1">{errors.addressPostalCode}</p>
            )}
          </div>
        </div>

        {/* Country */}
        <div>
          <Label htmlFor="addressCountry">Country</Label>
          <Input
            id="addressCountry"
            value={formData.addressCountry}
            readOnly
            className="bg-gray-50"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
        <Briefcase className="w-5 h-5" />
        Professional Qualifications
      </h3>

      <div className="space-y-4">
        {/* PRC License */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="identifier">
              PRC License Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="identifier"
              value={formData.identifier}
              onChange={(e) => handleInputChange('identifier', e.target.value.replace(/\D/g, ''))}
              placeholder="7 digits"
              maxLength={7}
              className={errors.identifier ? 'border-red-500' : ''}
            />
            {errors.identifier && (
              <p className="text-sm text-red-500 mt-1">{errors.identifier}</p>
            )}
          </div>

          <div>
            <Label htmlFor="qualificationCode">
              Qualification <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.qualificationCode}
              onValueChange={(v) => handleInputChange('qualificationCode', v)}
            >
              <SelectTrigger className={errors.qualificationCode ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {QUALIFICATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.qualificationCode && (
              <p className="text-sm text-red-500 mt-1">{errors.qualificationCode}</p>
            )}
          </div>
        </div>

        {/* Certificate Number, Issuer */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="qualificationIdentifier">
              Certificate Number <span className="text-gray-400 text-xs">(Optional)</span>
            </Label>
            <Input
              id="qualificationIdentifier"
              value={formData.qualificationIdentifier}
              onChange={(e) => handleInputChange('qualificationIdentifier', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="qualificationIssuer">
              Issuing Organization <span className="text-gray-400 text-xs">(Optional)</span>
            </Label>
            <Select
              value={formData.qualificationIssuer}
              onValueChange={(v) => handleInputChange('qualificationIssuer', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select or leave empty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None / PRC</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.organization_id} value={String(org.organization_id)}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Validity Period */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="qualificationPeriodStart">
              License Start Date <span className="text-gray-400 text-xs">(Optional)</span>
            </Label>
            <Input
              id="qualificationPeriodStart"
              type="date"
              value={formData.qualificationPeriodStart}
              onChange={(e) => handleInputChange('qualificationPeriodStart', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="qualificationPeriodEnd">
              License Expiry Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="qualificationPeriodEnd"
              type="date"
              value={formData.qualificationPeriodEnd}
              onChange={(e) => handleInputChange('qualificationPeriodEnd', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={errors.qualificationPeriodEnd ? 'border-red-500' : ''}
            />
            {errors.qualificationPeriodEnd && (
              <p className="text-sm text-red-500 mt-1">{errors.qualificationPeriodEnd}</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Hospital Assignment</h3>

        <div className="space-y-4">
          {/* Organization */}
          <div>
            <Label htmlFor="organization">
              Hospital / Organization <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.organization}
              onValueChange={(v) => handleInputChange('organization', v)}
              disabled={isLoadingOrgs}
            >
              <SelectTrigger className={errors.organization ? 'border-red-500' : ''}>
                <SelectValue placeholder={isLoadingOrgs ? 'Loading...' : 'Select hospital'} />
              </SelectTrigger>
              <SelectContent>
                {organizations.length > 0 ? (
                  organizations.map((org) => (
                    <SelectItem key={org.organization_id} value={String(org.organization_id)}>
                      {org.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No organizations available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.organization && (
              <p className="text-sm text-red-500 mt-1">{errors.organization}</p>
            )}
          </div>

          {/* Position, Specialty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="roleCode">
                Position <span className="text-red-500">*</span>
              </Label>
              <Input
                id="roleCode"
                value={formData.roleCode}
                onChange={(e) => handleInputChange('roleCode', e.target.value)}
                placeholder="e.g., Resident III, Head Nurse"
                className={errors.roleCode ? 'border-red-500' : ''}
              />
              {errors.roleCode && (
                <p className="text-sm text-red-500 mt-1">{errors.roleCode}</p>
              )}
            </div>

            <div>
              <Label htmlFor="specialtyCode">
                Specialty <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.specialtyCode}
                onValueChange={(v) => handleInputChange('specialtyCode', v)}
              >
                <SelectTrigger className={errors.specialtyCode ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.specialtyCode && (
                <p className="text-sm text-red-500 mt-1">{errors.specialtyCode}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div
      data-lov-id="register-shell"
      className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-100 flex items-center justify-center p-6 sm:p-8"
    >
      <Card className="w-full max-w-4xl border border-slate-200/80 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="text-center px-8 pt-8 pb-6 bg-white/70">
          <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-sm">
            <UserPlus className="text-white w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-semibold text-slate-900">
            Create Professional Account
          </CardTitle>
          <p className="text-sm text-slate-600">Join WAH4H Healthcare System</p>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          {renderStepIndicator()}

          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {currentStep === 1 && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="privacyAccepted"
                    checked={privacyAccepted}
                    onCheckedChange={(checked) => {
                      setPrivacyAccepted(Boolean(checked));
                      setPrivacyError('');
                    }}
                  />
                  <Label htmlFor="privacyAccepted" className="text-sm font-normal text-slate-700">
                    I acknowledge the{' '}
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-700 underline underline-offset-4"
                      onClick={() => setShowPrivacyModal(true)}
                    >
                      Privacy Statement
                    </button>
                    .
                  </Label>
                </div>
                {privacyError && (
                  <p className="text-sm text-red-600 mt-2">{privacyError}</p>
                )}
              </div>
            )}

            {/* Navigation Buttons */}

            <div className="flex justify-between mt-8 pt-6 border-t">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isLoading}
                  className="rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isNavigating}
                  className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {isNavigating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 rounded-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending verification code...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Complete Registration
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>

          <div className="text-center mt-6">
            <Button variant="link" onClick={() => navigate('/login')}>
              Already have an account? Sign in
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6">
          <div className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-2xl">
            <div className="flex-none flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policy</p>
                <h2 className="text-lg font-bold text-slate-900">
                  Privacy Statement
                </h2>
                <p className="text-sm text-slate-600">Effective Date: February 8, 2026</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setShowPrivacyModal(false)}
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-700">
              <div className="space-y-4">
                <section className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                  <h3 className="font-bold text-slate-900 text-base">1. Introduction</h3>
                  <p className="mt-2">
                    Wireless Access for Health (WAH) provides the WAH4H Hospital Management System. By using
                    WAH4H, you agree to the collection and use of information in accordance with this policy.
                  </p>
                </section>
                <section className="rounded-xl border border-slate-200/80 bg-white p-4">
                  <h3 className="font-bold text-slate-900 text-base">2. Data We Collect</h3>
                  <p className="mt-2">We collect only the information necessary to validate your identity and role:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Full Name & Contact Details</li>
                    <li>PRC License Number (for practitioners)</li>
                    <li>Organizational Role & Employment Details</li>
                    <li>System Usage Logs</li>
                  </ul>
                </section>
                <section className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                  <h3 className="font-bold text-slate-900 text-base">3. Purpose of Collection</h3>
                  <p className="mt-2">Your data is used strictly for:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Authentication: Verifying your identity as a healthcare provider.</li>
                    <li>Security: Preventing unauthorized access via 2-Factor Authentication.</li>
                    <li>Compliance: Meeting DOH and LGU reporting requirements.</li>
                  </ul>
                </section>
                <section className="rounded-xl border border-slate-200/80 bg-white p-4">
                  <h3 className="font-bold text-slate-900 text-base">4. Retention & Disposal</h3>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Active Accounts: Retained indefinitely while active.</li>
                    <li>Inactive Accounts: Deleted after 15 years of inactivity (per Health Information Exchange Guidelines).</li>
                  </ul>
                </section>
                <section className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                  <h3 className="font-bold text-slate-900 text-base">5. Information Sharing</h3>
                  <p className="mt-2">We do not sell your data. We share only when:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Legally required by court order or subpoena.</li>
                    <li>Necessary for system operations (e.g., SMS Gateways, Cloud Hosting).</li>
                    <li>Required for anonymized public health reporting (DOH).</li>
                  </ul>
                </section>
                <section className="rounded-xl border border-slate-200/80 bg-white p-4">
                  <h3 className="font-bold text-slate-900 text-base">6. Security Measures</h3>
                  <p className="mt-2">
                    We employ Role-Based Access Control (RBAC), Encryption (at rest and in transit), and OTP
                    verification. Note: Users are responsible for keeping their credentials confidential.
                  </p>
                </section>
                <section className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
                  <h3 className="font-bold text-slate-900 text-base">7. Contact Us</h3>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <p className="mt-2">Project Leader: Jhon Lloyd Nicolas (Pseudoers)</p>
                    <p className="mt-2">Email: wah4h@gmail.com</p>
                    <p className="mt-2">Address: 3 Humabon Place, Magallanes, Makati City (Asia Pacific College)</p>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Verify Your Email</CardTitle>
              <p className="text-sm text-gray-600 text-center mt-2">
                We've sent a 6-digit verification code to:
                <br />
                <strong>{formData.email}</strong>
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(value);
                      setErrors({});
                    }}
                    maxLength={6}
                    className={cn(
                      'text-center text-2xl tracking-widest font-mono',
                      errors.otp && 'border-red-500'
                    )}
                    autoFocus
                  />
                  {errors.otp && (
                    <p className="text-sm text-red-500 mt-1">{errors.otp}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowOTPModal(false);
                      setOtpCode('');
                      setErrors({});
                    }}
                    disabled={isVerifying}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleOTPVerification}
                    disabled={isVerifying || otpCode.length !== 6}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Verify & Continue
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-600">
                  <p>Didn't receive the code?</p>
                  <Button
                    type="button"
                    variant="link"
                    className="text-blue-600 p-0 h-auto"
                    onClick={async () => {
                      const result = await registerInitiate({
                        ...formData,
                        role: formData.role as UserRole,
                      });
                      if (!result.ok) {
                        console.error('Failed to resend OTP:', result.error);
                      }
                    }}
                  >
                    Resend verification code
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Register;
