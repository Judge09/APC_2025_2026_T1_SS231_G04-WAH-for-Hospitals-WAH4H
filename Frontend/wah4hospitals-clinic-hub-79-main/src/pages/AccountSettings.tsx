
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, BadgeCheck, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const AccountSettings = () => {
  const { user, changePasswordInitiate, changePasswordVerify } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State for editable fields
  const [mobileNumber, setMobileNumber] = useState('');
  
  // State for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // OTP State
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');

  // Password strength requirements state
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  // Format role for display (e.g., "billing_clerk" -> "Billing Clerk")
  const formatRole = (role: string | undefined) => {
    if (!role) return 'N/A';
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  const validatePhilippineMobile = (phone: string): boolean => {
    // Format: 09XX-XXX-XXXX (11 digits)
    const cleanPhone = phone.replace(/[-\s]/g, '');
    return /^09\d{9}$/.test(cleanPhone);
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

    setMobileNumber(formatted);
  };

  const handleSaveProfile = async () => {
    // Validate mobile number if provided
    if (mobileNumber && !validatePhilippineMobile(mobileNumber)) {
      toast({
        title: 'Validation error',
        description: 'Invalid mobile format. Use 09XX-XXX-XXXX (11 digits).',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check uniqueness: fetch practitioners and ensure no other practitioner uses this telecom
      const cleanedNew = mobileNumber.replace(/\D/g, '');
      const resp = await api.get('/api/accounts/practitioners/');
      let data: any = resp.data;
      if (data.results && Array.isArray(data.results)) data = data.results;

      const conflict = (data || []).find((p: any) => {
        const telecom = (p.telecom || '').toString().replace(/\D/g, '');
        return telecom === cleanedNew && String(p.practitioner_id) !== String(user?.id);
      });

      if (conflict) {
        toast({
          title: 'Validation error',
          description: 'Mobile number is already in use by another account.',
          variant: 'destructive',
        });
        return;
      }

      // Persist change via practitioner PATCH endpoint
      // Endpoint: /api/accounts/practitioners/{id}/ supports PUT/PATCH
      await api.patch(`/api/accounts/practitioners/${user?.id}/`, {
        telecom: mobileNumber,
      });

      toast({
        title: 'Profile updated',
        description: 'Your mobile number has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleChangePassword = async () => {
    // If OTP input is showing, verify OTP
    if (showOtpInput) {
      if (!otp || otp.length !== 6) {
        toast({
          title: 'Validation error',
          description: 'Please enter a valid 6-digit OTP code.',
          variant: 'destructive',
        });
        return;
      }

      try {
        const result = await changePasswordVerify(otp);
        
        if (result.ok) {
          // Clear all fields on success
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setOtp('');
          setShowOtpInput(false);
          setPasswordRequirements({
            minLength: false,
            hasUppercase: false,
            hasLowercase: false,
            hasNumber: false,
            hasSpecialChar: false,
          });
          
          toast({
            title: 'Success',
            description: 'Your password has been changed successfully.',
          });
        } else {
          // Display specific error messages from backend
          const errors = result.error?.errors;
          if (errors?.otp) {
            toast({
              title: 'Verification error',
              description: errors.otp,
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('Password verify error:', error);
      }
      return;
    }

    // Initial validation for password change initiate
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Validation error',
        description: 'All password fields are required.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Validation error',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (!validatePassword(newPassword)) {
      toast({
        title: 'Validation error',
        description: 'Password must meet all security requirements below.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await changePasswordInitiate(currentPassword, newPassword, confirmPassword);
      
      if (result.ok) {
        // Show OTP input field
        setShowOtpInput(true);
        toast({
          title: 'OTP Sent',
          description: 'Please check your email for the verification code.',
        });
      } else {
        // Display specific error messages from backend
        const errors = result.error?.errors;
        if (errors) {
          if (errors.current_password) {
            toast({
              title: 'Validation error',
              description: errors.current_password,
              variant: 'destructive',
            });
          } else if (errors.new_password) {
            toast({
              title: 'Validation error',
              description: errors.new_password,
              variant: 'destructive',
            });
          } else if (errors.confirm_password) {
            toast({
              title: 'Validation error',
              description: errors.confirm_password,
              variant: 'destructive',
            });
          }
        }
      }
    } catch (error) {
      console.error('Password change error:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading user information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1">
              Manage your personal account information and security settings
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Profile Information */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b border-gray-100 bg-slate-50">
            <CardTitle className="flex items-center text-lg">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {/* Display Name - READ ONLY */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-medium text-gray-700">
                Display Name
              </Label>
              <Input
                id="displayName"
                value={`${user.firstName} ${user.lastName}`}
                disabled
                className="bg-slate-50 border-slate-200 text-gray-700 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">
                Contact your administrator to update your name
              </p>
            </div>

            {/* First Name - READ ONLY */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                First Name
              </Label>
              <Input
                id="firstName"
                value={user.firstName}
                disabled
                className="bg-slate-50 border-slate-200 text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Last Name - READ ONLY */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={user.lastName}
                disabled
                className="bg-slate-50 border-slate-200 text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Email - READ ONLY */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-slate-50 border-slate-200 text-gray-700 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">
                Primary email for account notifications
              </p>
            </div>

            {/* Role/Designation - READ ONLY */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium text-gray-700 flex items-center">
                <BadgeCheck className="w-4 h-4 mr-1 text-blue-600" />
                Role / Designation
              </Label>
              <Input
                id="role"
                value={formatRole(user.role)}
                disabled
                className="bg-slate-50 border-slate-200 text-gray-700 cursor-not-allowed font-medium"
              />
              <p className="text-xs text-gray-500">
                Your role determines system access and permissions
              </p>
            </div>

            {/* PRC License - READ ONLY (if available) */}
            <div className="space-y-2">
              <Label htmlFor="prcLicense" className="text-sm font-medium text-gray-700">
                PRC License Number
              </Label>
              <Input
                id="prcLicense"
                value={(user as any).identifier || 'N/A'}
                disabled
                className="bg-slate-50 border-slate-200 text-gray-700 cursor-not-allowed font-mono"
              />
              <p className="text-xs text-gray-500">
                Professional Regulation Commission identifier
              </p>
            </div>

            {/* Mobile Number - EDITABLE */}
            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-sm font-medium text-gray-900">
                Mobile Number
              </Label>
              <Input
                id="mobile"
                type="tel"
                placeholder="09XX-XXX-XXXX"
                value={mobileNumber || (user as any).mobile || ''}
                onChange={(e) => handleMobileChange(e.target.value)}
                maxLength={13}
                className="bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <p className="text-xs text-blue-600 font-medium">
                ✓ You can update this field (Format: 09XX-XXX-XXXX)
              </p>
            </div>

            <Button 
              onClick={handleSaveProfile} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Save Profile Changes
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: Change Password */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b border-gray-100 bg-slate-50">
            <CardTitle className="flex items-center text-lg">
              <Lock className="w-5 h-5 mr-2 text-blue-600" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-gray-600 mb-4">
              Ensure your account is using a strong, unique password to stay secure.
            </p>

            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPass" className="text-sm font-medium text-gray-900">
                Current Password
              </Label>
              <Input
                id="currentPass"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={showOtpInput}
                className="bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPass" className="text-sm font-medium text-gray-900">
                New Password
              </Label>
              <Input
                id="newPass"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordRequirements(checkPasswordRequirements(e.target.value));
                }}
                disabled={showOtpInput}
                className="bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
              
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

            {/* Confirm New Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPass" className="text-sm font-medium text-gray-900">
                Confirm New Password
              </Label>
              <Input
                id="confirmPass"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={showOtpInput}
                className="bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* OTP Input - Only shown after password validation */}
            {showOtpInput && (
              <div className="space-y-2 animate-in slide-in-from-bottom-4">
                <Label htmlFor="otp" className="text-sm font-medium text-gray-900">
                  Verification Code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="bg-white border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-mono text-lg tracking-widest text-center"
                />
                <p className="text-xs text-blue-600">
                  📧 We sent a verification code to <strong>{user?.email}</strong>. Check your inbox.
                </p>
              </div>
            )}

            <Button 
              onClick={handleChangePassword} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {showOtpInput ? 'Verify OTP & Change Password' : 'Change Password'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSettings;
