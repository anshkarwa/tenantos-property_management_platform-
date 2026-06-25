// TenantOS — Axios API Client
// Attaches JWT token to every request, handles 401 auto-logout

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401 (but skip for auth routes like login where 401 means invalid credentials)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthRoute = err.config?.url?.includes('/auth/');
    if (err.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('landlord');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('landlord');
};

export const getStoredLandlord = () => {
  try {
    return JSON.parse(localStorage.getItem('landlord') || 'null');
  } catch { return null; }
};

export const setStoredLandlord = (landlord: object) => {
  localStorage.setItem('landlord', JSON.stringify(landlord));
};

export const isLoggedIn = () => !!localStorage.getItem('accessToken');

// ─── Tenant API client (uses tenant JWT) ──────────────────────────────────────

export const tenantApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

tenantApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('tenantAccessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
