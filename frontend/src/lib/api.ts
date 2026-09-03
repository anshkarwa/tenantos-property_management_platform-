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

// Auto-refresh on 401, logout only if refresh also fails
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isAuthRoute = err.config?.url?.includes('/auth/');
    if (err.response?.status === 401 && !isAuthRoute && !err.config?._retry) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // No refresh token — hard logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('landlord');
        window.location.reload();
        return Promise.reject(err);
      }

      if (isRefreshing) {
        // Queue up requests while a refresh is in progress
        return new Promise((resolve) => {
          refreshQueue.push((newToken: string) => {
            err.config.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(err.config));
          });
        });
      }

      err.config._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
        localStorage.setItem('accessToken', newAccess);
        localStorage.setItem('refreshToken', newRefresh);
        // Flush queue
        refreshQueue.forEach((cb) => cb(newAccess));
        refreshQueue = [];
        err.config.headers.Authorization = `Bearer ${newAccess}`;
        return api(err.config);
      } catch {
        // Refresh failed — hard logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('landlord');
        window.location.reload();
      } finally {
        isRefreshing = false;
      }
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
