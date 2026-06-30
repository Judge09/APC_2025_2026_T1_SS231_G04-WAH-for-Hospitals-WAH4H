import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; otp?: string }>({});
  const navigate = useNavigate();
  const { loginInitiate, loginVerify, isLoading } = useAuth();

  const validateCredentials = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Please enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOtp = () => {
    const newErrors: { otp?: string } = {};
    if (!otp) newErrors.otp = 'OTP is required';
    else if (!/^[0-9]{6}$/.test(otp)) newErrors.otp = 'Enter a valid 6-digit code';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCredentials() || isLoading) return;

    const result = await loginInitiate(email, password);
    if (result.ok) {
      // If OTP is disabled on backend, loginInitiate already completed auth
      if ((result as any).otpDisabled) {
        navigate('/dashboard');
        return;
      }

      setStep('otp');
      return;
    }
    if (result.error?.errors) {
      setErrors({
        email: result.error.errors.email,
        password: result.error.errors.password,
      });
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOtp() || isLoading) return;

    const result = await loginVerify(email, otp);
    if (result.ok) {
      navigate('/dashboard');
      return;
    }
    if (result.error?.errors) {
      setErrors({
        otp: result.error.errors.otp,
      });
    }
  };

  const handleDemoLogin = async () => {
    if (isLoading) return;
    const demoEmail = 'doctor@gmail.com';
    const demoPassword = 'password123';
    setEmail(demoEmail);
    setPassword(demoPassword);
    const result = await loginInitiate(demoEmail, demoPassword);
    if (result.ok) {
      if ((result as any).otpDisabled) {
        navigate('/dashboard');
        return;
      }

      setStep('otp');
      return;
    }
    if (result.error?.errors) {
      setErrors({
        email: result.error.errors.email,
        password: result.error.errors.password,
      });
    }
  };

  const handleForgotPassword = () => {
    navigate('/reset-password');
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setOtp('');
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-slate-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <img src="/wah_logo.png" alt="WAH4Hospitals Logo" className="w-12 h-12" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <p className="text-slate-600">Sign in to WAH4H</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                  placeholder="Enter your email"
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${errors.password ? 'border-red-500 ' : ''}pr-10 [&::-ms-reveal]:hidden`}
                    placeholder="Enter your password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </Button>
                </div>
                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between">
                <Button type="button" variant="link" className="p-0 h-auto text-sm" onClick={handleForgotPassword}>
                  Forgot password?
                </Button>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={errors.otp ? 'border-red-500' : ''}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
                {errors.otp && <p className="text-sm text-red-500">{errors.otp}</p>}
              </div>

              <div className="flex items-center justify-between">
                <Button type="button" variant="link" className="p-0 h-auto text-sm" onClick={handleBackToCredentials}>
                  Back
                </Button>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>
            </form>
          )}

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleDemoLogin} disabled={isLoading}>
            Try Demo Account
          </Button>

          <div className="text-center mt-2">
            <Button variant="link" onClick={() => navigate('/register')}>
              Don't have an account? Register here
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
