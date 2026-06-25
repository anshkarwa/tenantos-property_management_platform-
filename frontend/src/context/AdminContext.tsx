import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface AdminUser { id: string; name: string; email: string; }

interface AdminContextType {
  admin: AdminUser | null;
  adminToken: string | null;
  adminLogin: (email: string, password: string) => Promise<void>;
  adminLogout: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin]           = useState<AdminUser | null>(() => {
    try { return JSON.parse(sessionStorage.getItem('adminUser') || 'null'); } catch { return null; }
  });
  const [adminToken, setAdminToken] = useState<string | null>(
    () => sessionStorage.getItem('adminToken')
  );

  const adminLogin = async (email: string, password: string) => {
    const res = await axios.post(`${BASE_URL}/api/admin/login`, { email, password });
    const { token, admin: adminData } = res.data.data;
    sessionStorage.setItem('adminToken', token);
    sessionStorage.setItem('adminUser', JSON.stringify(adminData));
    setAdminToken(token);
    setAdmin(adminData);
  };

  const adminLogout = () => {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminUser');
    setAdminToken(null);
    setAdmin(null);
  };

  return (
    <AdminContext.Provider value={{ admin, adminToken, adminLogin, adminLogout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}

// Axios instance that attaches admin JWT
export const adminApi = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } });
adminApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
