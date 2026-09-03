// All React Query hooks for landlord-side data
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, tenantApi } from '../lib/api';
import toast from 'react-hot-toast';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  total_properties: number;
  total_units: number;
  occupied_units: number;
  occupancy_rate: number;
  rent_collected_this_month: number;
  rent_due_this_month: number;
  overdue_amount: number;
  overdue_count: number;
  active_leases: number;
  expiring_soon: number;
  open_maintenance: number;
}

export interface ActivityItem {
  id: string;
  type: 'payment' | 'maintenance' | 'lease' | 'tenant' | 'property' | 'system';
  message: string;
  entity_id?: string;
  created_at: string;
}

export interface RevenuePoint {
  month: string;
  collected: number;
  due: number;
}

export interface Property {
  id: string;
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  property_type: string;
  total_units: number;
  occupied_units: number;
  gst_applicable: boolean;
  gst_rate: number;
  amenities?: Record<string, boolean>;
  units?: Unit[];
  created_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  unit_type: string;
  floor: number;
  area_sqft?: number;
  monthly_rent: number;
  security_deposit: number;
  status: 'occupied' | 'vacant' | 'under_maintenance';
  furnishing: string;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email?: string;
  aadhaar_verified: boolean;
  pan?: string;
  profession?: string;
  unit?: string;
  property?: string;
  lease_status?: string;
  monthly_rent?: number;
  police_verification_status: string;
  whatsapp_opted_in: boolean;
  emergency_contact?: { name: string; phone: string; relation: string };
  created_at: string;
}

export interface Lease {
  id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  rent_due_day: number;
  status: string;
  esign_status: string;
  annual_escalation_pct: number;
  notice_period_days: number;
  agreement_clauses: string[];
  tenant?: Tenant;
  unit?: Unit & { property?: Property };
  co_tenant_splits?: Array<{ name: string; phone?: string; share_pct: number; amount: number }>;
}

export interface RentCollection {
  id: string;
  lease_id: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  payment_method?: string;
  upi_ref?: string;
  receipt_number?: string;
  late_fee_applied: number;
  paid_at?: string;
  lease?: { tenant?: Tenant; unit?: { unit_number: string; property?: { name: string } } };
}

export interface MaintenanceRequest {
  id: string;
  unit_id: string;
  tenant_id?: string;
  category: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  vendor_id?: string;
  repair_cost?: number;
  vendor_rating?: number;
  whatsapp_sent: boolean;
  created_at: string;
  tenant?: Tenant;
  unit?: { unit_number: string; property?: { name: string } };
  vendor?: { name: string; phone: string; rating: number };
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  phone: string;
  city?: string;
  rating: number;
  total_jobs: number;
  verified: boolean;
}

// ─── Helper ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unwrap = (res: any) => res.data.data;

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export const useDashboardKPIs = () =>
  useQuery<DashboardKPIs>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/dashboard').then(unwrap),
  });

export const useActivityLog = () =>
  useQuery<ActivityItem[]>({
    queryKey: ['activity'],
    queryFn: () => api.get('/api/dashboard/activity').then(unwrap),
  });

export const useRevenueData = () =>
  useQuery<RevenuePoint[]>({
    queryKey: ['revenue'],
    queryFn: () => api.get('/api/dashboard/revenue').then(unwrap),
  });

export const usePendingApplications = () =>
  useQuery<any[]>({
    queryKey: ['applications', 'pending'],
    queryFn: () =>
      api.get('/api/applications').then((res) => {
        const all = res.data.data || [];
        return all.filter((a: any) => a.status === 'pending');
      }),
    refetchInterval: 60_000, // refresh every 60 s so the banner stays fresh
  });

// ─── Properties ────────────────────────────────────────────────────────────────

export const useProperties = () =>
  useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/api/properties').then(unwrap),
  });

export const useProperty = (id: string) =>
  useQuery<Property>({
    queryKey: ['properties', id],
    queryFn: () => api.get(`/api/properties/${id}`).then(unwrap),
    enabled: !!id,
  });

export const useCreateProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Property>) => api.post('/api/properties', data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['properties'] }); toast.success('Property created!'); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed to create property'),
  });
};

export const useCreateUnit = (propertyId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Unit>) => api.post(`/api/properties/${propertyId}/units`, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['properties'] }); toast.success('Unit added!'); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed to add unit'),
  });
};

// ─── Tenants ───────────────────────────────────────────────────────────────────

export const useTenants = (search?: string) =>
  useQuery<Tenant[]>({
    queryKey: ['tenants', search],
    queryFn: () => api.get('/api/tenants', { params: { search } }).then(unwrap),
  });

export const useTenant = (id: string) =>
  useQuery<Tenant>({
    queryKey: ['tenants', id],
    queryFn: () => api.get(`/api/tenants/${id}`).then(unwrap),
    enabled: !!id,
  });

export const useCreateTenant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Tenant>) => api.post('/api/tenants', data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); toast.success('Tenant added!'); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed to add tenant'),
  });
};

export const useUpdateTenant = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Tenant>) => api.put(`/api/tenants/${id}`, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); toast.success('Tenant updated!'); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed to update tenant'),
  });
};

// ─── Leases ────────────────────────────────────────────────────────────────────

export const useLeases = (status?: string) =>
  useQuery<Lease[]>({
    queryKey: ['leases', status],
    queryFn: () => api.get('/api/leases', { params: { status } }).then(unwrap),
  });

export const useCreateLease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Lease>) => api.post('/api/leases', data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leases'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Lease created!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed to create lease'),
  });
};

export const useTerminateLease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.post(`/api/leases/${id}/terminate`, { status }).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leases'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Lease terminated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed'),
  });
};

// ─── Rent ──────────────────────────────────────────────────────────────────────

export const useRentCollections = (params?: { status?: string; month?: string }) =>
  useQuery<RentCollection[]>({
    queryKey: ['rent', params],
    queryFn: () => api.get('/api/rent', { params }).then(unwrap),
  });

export const useRecordPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RentCollection>) => api.post('/api/rent/record', data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rent'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Payment recorded!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed to record payment'),
  });
};

export const useUpdateRent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<RentCollection>) =>
      api.put(`/api/rent/${id}`, data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rent'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Payment updated!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed'),
  });
};

// ─── Maintenance ───────────────────────────────────────────────────────────────

export const useMaintenance = (params?: { status?: string; category?: string }) =>
  useQuery<MaintenanceRequest[]>({
    queryKey: ['maintenance', params],
    queryFn: () => api.get('/api/maintenance', { params }).then(unwrap),
  });

export const useVendors = (category?: string) =>
  useQuery<Vendor[]>({
    queryKey: ['vendors', category],
    queryFn: () => api.get('/api/maintenance/vendors/list', { params: { category } }).then(unwrap),
  });

export const useCreateMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MaintenanceRequest>) => api.post('/api/maintenance', data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance'] }); toast.success('Request created!'); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed'),
  });
};

export const useUpdateMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<MaintenanceRequest>) =>
      api.put(`/api/maintenance/${id}`, data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Updated!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed'),
  });
};

// ─── Tenant Portal API ─────────────────────────────────────────────────────────

export const useCreateRentOrder = () => {
  return useMutation({
    mutationFn: (data: { collection_id: string }) => 
      tenantApi.post('/api/tenant/pay/create-order', data).then(unwrap),
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed to initialize payment'),
  });
};

export const useVerifyRentPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => 
      tenantApi.post('/api/tenant/pay/verify', data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rent-receipts'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Payment verification failed'),
  });
};

export const useCreateMembershipOrder = () => {
  return useMutation({
    mutationFn: (data: { plan_id: string }) => 
      tenantApi.post('/api/tenant/membership/create-order', data).then(unwrap),
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed to initialize payment'),
  });
};

export const useVerifyMembership = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => 
      tenantApi.post('/api/tenant/membership/verify', data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-profile'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Membership verification failed'),
  });
};
