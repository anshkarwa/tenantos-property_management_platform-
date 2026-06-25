// Auth context — manages landlord login state throughout the app
import React, { createContext, useContext, useState, useCallback } from 'react';
import { api, setTokens, clearTokens, setStoredLandlord, getStoredLandlord, isLoggedIn } from '../lib/api';
import toast from 'react-hot-toast';

interface Landlord {
  id: string;
  name: string;
  email: string;
  phone: string;
  kyc_status: string;
  onboarding_done: boolean;
  preferred_lang: string;
  upi_id?: string;
  subscription_tier?: string;
}

interface AuthContextType {
  landlord: Landlord | null;
  loggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginOTP: (phone: string, otp: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  refreshLandlord: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  landlord: null,
  loggedIn: false,
  login: async () => false,
  loginOTP: async () => false,
  logout: () => {},
  loading: false,
  refreshLandlord: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [landlord, setLandlord] = useState<Landlord | null>(getStoredLandlord);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/landlord/login', { email, password });
      const { landlord: l, accessToken, refreshToken } = res.data.data;
      setTokens(accessToken, refreshToken);
      setStoredLandlord(l);
      setLandlord(l);
      toast.success(`Welcome back, ${l.name.split(' ')[0]}! 👋`);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Invalid email or password';
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginOTP = useCallback(async (phone: string, otp: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/landlord/verify-otp', { phone, otp });
      const { landlord: l, accessToken, refreshToken } = res.data.data;
      setTokens(accessToken, refreshToken);
      setStoredLandlord(l);
      setLandlord(l);
      toast.success(`Welcome back, ${l.name.split(' ')[0]}! 👋`);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Invalid or expired OTP';
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setLandlord(null);
  }, []);

  const refreshLandlord = useCallback(async () => {
    try {
      const res = await api.get('/api/auth/landlord/me');
      const l = res.data.data;
      setStoredLandlord(l);
      setLandlord(l);
    } catch {
      // silently fail — user is still logged in
    }
  }, []);

  return (
    <AuthContext.Provider value={{ landlord, loggedIn: isLoggedIn(), login, loginOTP, logout, loading, refreshLandlord }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
