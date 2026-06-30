import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from './RoleContext';

const API_BASE_URL = import.meta.env.LOCAL_8000 || 'http://127.0.0.1:8000';

// Session idle timeout: 15 minutes (matches JWT access token lifetime)
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface RegisterData {
  // Personal Identity
  firstName: string;
  middleName?: string;
  lastName: string;
  suffixName?: string;
  mobile: string;
  email: string;
  gender: string;
  birthDate: string;
  language?: string;
  photoUrl?: string;
  role: UserRole | string;
  password: string;
  confirmPassword: string;

  // Address Information
  addressLine?: string;
  addressCity?: string;
  addressDistrict?: string;
  addressState?: string;
  addressPostalCode?: string;
  addressCountry?: string;

  // Professional Qualifications
  identifier: string; // PRC License
  qualificationCode?: string;
  qualificationIdentifier?: string;
  qualificationIssuer?: string;
  qualificationPeriodStart?: string;
  qualificationPeriodEnd?: string;
  organization?: string;
  roleCode?: string;
  specialtyCode?: string;
}

type AuthResult = {
  ok: boolean;
  error?: any;
  otpDisabled?: boolean;
};

interface AuthContextType {
  user: User | null;
  loginInitiate: (email: string, password: string) => Promise<AuthResult>;
  loginVerify: (email: string, otp: string) => Promise<AuthResult>;
  passwordResetInitiate: (email: string) => Promise<AuthResult>;
  passwordResetConfirm: (email: string, otp: string, newPassword: string, confirmPassword: string) => Promise<AuthResult>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<AuthResult>;
  changePasswordInitiate: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<AuthResult>;
  changePasswordVerify: (otp: string) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  registerInitiate: (data: RegisterData) => Promise<AuthResult>;
  registerVerify: (email: string, otp: string) => Promise<AuthResult>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore user from localStorage on mount so SPA refresh doesn't log out
  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) {
        const parsed: User = JSON.parse(raw);
        setUser(parsed);
      }
    } catch (err) {
      // If parsing fails, clear inconsistent storage
      localStorage.removeItem('currentUser');
    }
  }, []);

  // =========================================================================
  // IDLE TIMEOUT — Auto-logout after 15 minutes of inactivity
  // =========================================================================
  const performIdleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');

    toast({
      title: 'Session expired',
      description: 'You have been logged out due to inactivity.',
      variant: 'destructive',
    });
  }, [toast]);

  useEffect(() => {
    // Only run idle timer when user is authenticated AND not on auth pages
    const path = window.location.pathname.toLowerCase();
    const isAuthPage = path.includes('/login') || path.includes('/register') || path === '/';

    if (!user || isAuthPage) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(performIdleLogout, IDLE_TIMEOUT_MS);
    };

    // Activity events that reset the idle timer
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    // Start the timer and listen for activity
    resetIdleTimer();
    activityEvents.forEach((event) => window.addEventListener(event, resetIdleTimer));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      activityEvents.forEach((event) => window.removeEventListener(event, resetIdleTimer));
    };
  }, [user, performIdleLogout]);

  // Create axios instance with base configuration
  const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const getErrorData = (err: any) => err?.response?.data || { message: 'Request failed.' };

  // Request interceptor: Add auth token to all requests
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      // Avoid attaching token for auth endpoints to prevent 401s on expired tokens
      const isAuthEndpoint = config.url?.includes('/login/') || config.url?.includes('/register/');

      if (token && !isAuthEndpoint) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: Handle token refresh on 401
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest: any = error.config;

      // If 401 error and we haven't retried yet, attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_BASE_URL}/api/accounts/token/refresh/`, {
              refresh: refreshToken,
            });

            const { access } = response.data;
            localStorage.setItem('accessToken', access);

            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${access}`;
            return axiosInstance(originalRequest);
          } catch (refreshError: any) {
            // Token refresh failed - clear stale tokens and logout
            console.error('Token refresh failed - clearing stale tokens:', refreshError);

            // Clear all tokens (they might be stale/invalid)
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userRole');

            setUser(null);

            // Only show toast if not already on login page
            if (!window.location.pathname.includes('/login')) {
              toast({
                title: 'Session expired',
                description: 'Please log in again.',
                variant: 'destructive',
              });
            }

            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token - clear everything
          logout();
        }
      }

      return Promise.reject(error);
    }
  );

  /**
   * Login Initiate - Step 1: Validate credentials and send OTP
   */
  const loginInitiate = async (email: string, password: string): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.post('/api/accounts/login/initiate/', {
        email,
        password,
      });

      // If backend returned tokens (OTP disabled), perform auto-login client-side
      const tokens = res?.data?.data?.tokens;
      const rawUser = res?.data?.data?.user;

      if (tokens && rawUser) {
        // Store tokens
        localStorage.setItem('accessToken', tokens.access);
        localStorage.setItem('refreshToken', tokens.refresh);

        const userObj: User = {
          id: String(rawUser.id),
          email: rawUser.email,
          firstName: rawUser.first_name || rawUser.firstName || '',
          lastName: rawUser.last_name || rawUser.lastName || '',
          role: rawUser.role as UserRole,
        };

        setUser(userObj);
        // Persist minimal user info so page refresh can restore session state
        try {
          localStorage.setItem('currentUser', JSON.stringify(userObj));
          localStorage.setItem('userRole', String(userObj.role));
        } catch (err) {
          console.warn('Failed to persist currentUser to localStorage', err);
        }

        toast({
          title: 'Welcome back!',
          description: `Logged in as ${userObj.firstName} ${userObj.lastName} (${userObj.role})`,
        });

        return { ok: true, otpDisabled: true };
      }

      // Default OTP flow
      toast({
        title: 'Verification code sent',
        description: 'Please check your email for the login code.',
      });

      return { ok: true };
    } catch (err: any) {
      const errorData = getErrorData(err);
      console.error('Login initiate error:', errorData);

      toast({
        title: 'Login failed',
        description: errorData?.message || errorData?.detail || 'Invalid email or password. Please try again.',
        variant: 'destructive',
      });
      return { ok: false, error: errorData };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login Verify - Step 2: Verify OTP and store authentication tokens
   */
  const loginVerify = async (email: string, otp: string): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.post('/api/accounts/login/verify/', {
        email,
        otp,
      });

      const { tokens, user: rawUser } = res.data.data;

      // Store authentication tokens
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);

      // Map backend user data to frontend User interface
      const userObj: User = {
        id: String(rawUser.id),
        email: rawUser.email,
        firstName: rawUser.first_name,
        lastName: rawUser.last_name,
        role: rawUser.role as UserRole,
      };

      setUser(userObj);
      // Persist minimal user info so page refresh can restore session state
      try {
        localStorage.setItem('currentUser', JSON.stringify(userObj));
        localStorage.setItem('userRole', String(userObj.role));
      } catch (err) {
        console.warn('Failed to persist currentUser to localStorage', err);
      }

      toast({
        title: 'Welcome back!',
        description: `Logged in as ${userObj.firstName} ${userObj.lastName} (${userObj.role})`,
      });

      return { ok: true };
    } catch (err: any) {
      const errorData = getErrorData(err);
      console.error('Login verify error:', errorData);

      toast({
        title: 'Verification failed',
        description: errorData?.message || errorData?.detail || 'Invalid or expired OTP. Please try again.',
        variant: 'destructive',
      });
      return { ok: false, error: errorData };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Password Reset Initiate - Step 1: Validate email and send OTP
   */
  const passwordResetInitiate = async (email: string): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      await axiosInstance.post('/api/accounts/password-reset/initiate/', {
        email,
      });

      toast({
        title: 'Reset code sent',
        description: 'Please check your email for the reset code.',
      });

      return { ok: true };
    } catch (err: any) {
      const errorData = getErrorData(err);
      console.error('Password reset initiate error:', errorData);

      toast({
        title: 'Reset failed',
        description: errorData?.message || errorData?.detail || 'Unable to send reset code. Please try again.',
        variant: 'destructive',
      });
      return { ok: false, error: errorData };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Password Reset Confirm - Step 2: Verify OTP and set new password
   */
  const passwordResetConfirm = async (
    email: string,
    otp: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      await axiosInstance.post('/api/accounts/password-reset/confirm/', {
        email,
        otp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      toast({
        title: 'Password updated',
        description: 'You can now sign in with your new password.',
      });

      return { ok: true };
    } catch (err: any) {
      const errorData = getErrorData(err);
      console.error('Password reset confirm error:', errorData);

      toast({
        title: 'Reset failed',
        description: errorData?.message || errorData?.detail || 'Unable to reset password. Please try again.',
        variant: 'destructive',
      });
      return { ok: false, error: errorData };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Change Password - Authenticated users change their password (legacy - no OTP)
   */
  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      await axiosInstance.post('/api/accounts/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      toast({
        title: 'Password changed',
        description: 'Your password has been changed successfully.',
      });

      return { ok: true };
    } catch (err: any) {
      const errorData = getErrorData(err);
      console.error('Change password error:', errorData);

      toast({
        title: 'Change failed',
        description: errorData?.message || errorData?.detail || 'Unable to change password. Please try again.',
        variant: 'destructive',
      });
      return { ok: false, error: errorData };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Change Password Initiate - Step 1: Validate passwords and send OTP
   */
  const changePasswordInitiate = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      await axiosInstance.post('/api/accounts/change-password/initiate/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      toast({
        title: 'OTP sent',
        description: 'Please check your email for the verification code.',
      });

      return { ok: true };
    } catch (err: any) {
      const errorData = getErrorData(err);
      console.error('Change password initiate error:', errorData);

      toast({
        title: 'Validation failed',
        description: errorData?.message || errorData?.detail || 'Unable to initiate password change.',
        variant: 'destructive',
      });
      return { ok: false, error: errorData };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Change Password Verify - Step 2: Verify OTP and complete password change
   */
  const changePasswordVerify = async (otp: string): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      await axiosInstance.post('/api/accounts/change-password/verify/', {
        otp: otp,
      });

      toast({
        title: 'Password changed',
        description: 'Your password has been changed successfully.',
      });

      return { ok: true };
    } catch (err: any) {
      const errorData = getErrorData(err);
      console.error('Change password verify error:', errorData);

      toast({
        title: 'Verification failed',
        description: errorData?.message || errorData?.detail || 'Invalid OTP. Please try again.',
        variant: 'destructive',
      });
      return { ok: false, error: errorData };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register Initiate - Step 1: Validate and cache registration data, send OTP
   */
  const registerInitiate = async (data: RegisterData): Promise<AuthResult> => {
    setIsLoading(true);

    try {
      await axiosInstance.post('/api/accounts/register/initiate/', {
        identifier: data.identifier,
        first_name: data.firstName,
        middle_name: data.middleName || '',
        last_name: data.lastName,
        suffix_name: data.suffixName || '',
        gender: data.gender,
        birth_date: data.birthDate || null,
        telecom: data.mobile,
        email: data.email,
        password: data.password,
        confirm_password: data.confirmPassword,
        role: data.role,
      });

      toast({
        title: 'OTP Sent',
        description: 'Please check your email for the verification code.',
      });

      return { ok: true };
    } catch (err: any) {
      const errorData = getErrorData(err);
      console.error('Registration initiate error:', errorData);

      toast({
        title: 'Registration failed',
        description: errorData?.message || 'Unable to initiate registration. Please try again.',
        variant: 'destructive',
      });

      return { ok: false, error: errorData };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register Verify - Step 2: Verify OTP and create account
   * Does NOT auto-login — user must log in via the login page.
   */
  const registerVerify = async (email: string, otp: string): Promise<AuthResult> => {
    setIsLoading(true);

    try {
      await axiosInstance.post('/api/accounts/register/verify/', {
        email,
        otp,
      });

      toast({
        title: 'Account created!',
        description: 'Your account has been created successfully. Please log in with your credentials.',
      });

      return { ok: true };
    } catch (err: any) {
      const errorData = getErrorData(err);
      console.error('Registration verify error:', errorData);

      toast({
        title: 'Verification failed',
        description: errorData?.message || 'Invalid or expired OTP. Please try again.',
        variant: 'destructive',
      });
      return { ok: false, error: errorData };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user account (Legacy method - kept for backward compatibility)
   * Creates account and provides appropriate user feedback
   */
  const register = async (data: RegisterData): Promise<AuthResult> => {
    setIsLoading(true);

    try {
      await axiosInstance.post('/api/accounts/register/', {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: data.password,
        confirm_password: data.confirmPassword,
        role: data.role,
      });

      toast({
        title: 'Registration successful',
        description: `Welcome ${data.firstName}! You can now log in with your credentials.`,
      });

      return { ok: true };
    } catch (err: any) {
      const errorData = getErrorData(err);
      console.error('Registration error:', errorData);

      toast({
        title: 'Registration failed',
        description: errorData?.message || 'Unable to complete registration. Please try again.',
        variant: 'destructive',
      });
      return { ok: false, error: errorData };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user and clear all authentication data
   */
  const logout = () => {
    setUser(null);

    // Clear all authentication and session data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');

    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        loginInitiate,
        loginVerify,
        passwordResetInitiate,
        passwordResetConfirm,
        changePassword,
        changePasswordInitiate,
        changePasswordVerify,
        register,
        registerInitiate,
        registerVerify,
        logout,
        isLoading,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
