// Mock data for the tenant-facing portal (logged-in experience) — Extended for Indian Market

export interface TenantProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  profession: string;
  aadhaar_status: 'verified' | 'pending' | 'not_started';
  aadhaar_number_masked: string | null;
  pan: string | null;
  member_since: string;
  current_city: string;
  preferred_cities: string[];
  rental_score: number;
  months_on_time: number;
  total_months_rented: number;
  properties_rented: number;
  membership_status: 'active' | 'inactive' | 'expired';
  membership_expiry: string;
  referral_code: string;
  referral_count: number;
  referral_rewards_earned: number;
  deposit_vault_balance: number;
  upi_autopay_active: boolean;
  upi_autopay_id: string | null;
  upi_id: string | null;
  whatsapp_opted_in: boolean;
}

export interface TenantApplication {
  id: string;
  listing_id: string;
  property_name: string;
  unit_number: string;
  unit_type: string;
  locality: string;
  city: string;
  monthly_rent: number;
  applied_at: string;
  status: 'pending' | 'viewed' | 'scheduled' | 'rejected' | 'accepted';
  landlord_note?: string | null;
  visit_date?: string;
}

export interface TenantLease {
  id: string;
  property_name: string;
  unit_number: string;
  unit_type: string;
  address: string;
  city: string;
  state: string;
  monthly_rent: number;
  security_deposit: number;
  start_date: string;
  end_date: string;
  rent_due_day: number;
  landlord_name: string;
  landlord_phone: string;
  landlord_pan: string;
  landlord_upi_id: string;
  status: 'active' | 'notice' | 'expired';
  esign_status: 'pending' | 'completed' | 'not_required';
  annual_escalation_pct: number;
  notice_period_days: number;
  tds_applicable: boolean;
  state_template: string;
  agreement_clauses: string[];
}

export interface TenantRentRecord {
  id: string;
  month: string;
  due_date: string;
  amount: number;
  tds_deducted: number;
  net_payable: number;
  paid_at: string | null;
  method: string | null;
  upi_ref: string | null;
  status: 'paid' | 'pending' | 'overdue';
  receipt_number: string | null;
  hra_eligible: boolean;
}

export interface TenantMaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  landlord_note: string | null;
  vendor_name: string | null;
  vendor_phone: string | null;
  vendor_rating: number | null;
}

export interface DepositDeduction {
  id: string;
  category: 'painting' | 'cleaning' | 'repairs' | 'utility_bills' | 'damage' | 'other';
  description: string;
  amount: number;
  approved: boolean;
}

// ─── Mocked logged-in tenant ───────────────────────────────────────────────

export const mockTenantProfile: TenantProfile = {
  id: 'tp-001',
  name: 'Priya Menon',
  phone: '+919845612378',
  email: 'priya.menon@company.com',
  profession: 'Software Engineer',
  aadhaar_status: 'verified',
  aadhaar_number_masked: 'XXXX-XXXX-3421',
  pan: 'BMNPM1234C',
  member_since: '2024-05-01',
  current_city: 'Bangalore',
  preferred_cities: ['Bangalore', 'Hyderabad'],
  rental_score: 87,
  months_on_time: 14,
  total_months_rented: 15,
  properties_rented: 2,
  membership_status: 'active',
  membership_expiry: '2027-05-01',
  referral_code: 'PRIYA-K4T9',
  referral_count: 3,
  referral_rewards_earned: 600,
  deposit_vault_balance: 75000,
  upi_autopay_active: true,
  upi_autopay_id: 'UPI-ENACH-20240601-98765',
  upi_id: 'priya.menon@okicici',
  whatsapp_opted_in: true,
};

export const mockTenantApplications: TenantApplication[] = [
  {
    id: 'app-001',
    listing_id: 'lst-003',
    property_name: 'Green Valley Apartments',
    unit_number: 'GV-304',
    unit_type: '2bhk',
    locality: 'HSR Layout',
    city: 'Bangalore',
    monthly_rent: 28000,
    applied_at: '2026-05-31T10:00:00Z',
    status: 'scheduled',
    landlord_note: 'Please visit on the confirmed date. Bring your Aadhaar and latest salary slip.',
    visit_date: '2026-06-10T11:00:00Z',
  },
  {
    id: 'app-002',
    listing_id: 'lst-007',
    property_name: 'Kalpataru Residency',
    unit_number: '403',
    unit_type: '2bhk',
    locality: 'Wakad',
    city: 'Pune',
    monthly_rent: 24000,
    applied_at: '2026-05-28T14:00:00Z',
    status: 'viewed',
    landlord_note: null,
  },
  {
    id: 'app-003',
    listing_id: 'lst-005',
    property_name: 'Oberoi Gardens',
    unit_number: 'B-501',
    unit_type: '2bhk',
    locality: 'Bandra West',
    city: 'Mumbai',
    monthly_rent: 52000,
    applied_at: '2026-05-25T09:00:00Z',
    status: 'rejected',
    landlord_note: 'Unit has been rented to another applicant. Thank you for your interest.',
  },
  {
    id: 'app-004',
    listing_id: 'lst-009',
    property_name: 'Prestige Heights',
    unit_number: 'D-201',
    unit_type: '1bhk',
    locality: 'Kondapur',
    city: 'Hyderabad',
    monthly_rent: 16000,
    applied_at: '2026-06-02T08:00:00Z',
    status: 'pending',
    landlord_note: null,
  },
];

export const mockTenantLease: TenantLease = {
  id: 'le-001',
  property_name: 'Sharma Residency Block A',
  unit_number: 'A-101',
  unit_type: '2bhk',
  address: '45, 12th Cross, Indiranagar, Near Metro Station, Bangalore - 560038',
  city: 'Bangalore',
  state: 'Karnataka',
  monthly_rent: 25000,
  security_deposit: 75000,
  start_date: '2024-06-01',
  end_date: '2025-05-31',
  rent_due_day: 5,
  landlord_name: 'Ansh K.',
  landlord_phone: '+919876543210',
  landlord_pan: 'ABCPS1234A',
  landlord_upi_id: 'ansh.karwa@hdfcbank',
  status: 'active',
  esign_status: 'completed',
  annual_escalation_pct: 8,
  notice_period_days: 30,
  tds_applicable: false,
  state_template: 'Karnataka',
  agreement_clauses: [
    '11-month renewable lease',
    '30-day notice period required',
    '8% annual rent escalation on renewal',
    'Security deposit refundable within 30 days of exit clearance',
    'No subletting or commercial use permitted',
    'Tenant responsible for minor repairs up to ₹500',
    'Pets not allowed',
  ],
};

export const mockTenantRentHistory: TenantRentRecord[] = [
  { id: 'rh-001', month: 'June 2026',     due_date: '2026-06-05', amount: 25000, tds_deducted: 0, net_payable: 25000, paid_at: null,                   method: null,  upi_ref: null, status: 'pending', receipt_number: null, hra_eligible: true },
  { id: 'rh-002', month: 'May 2026',      due_date: '2026-05-05', amount: 25000, tds_deducted: 0, net_payable: 25000, paid_at: '2026-05-04T16:20:00Z', method: 'UPI', upi_ref: 'UPI2605041620112233', status: 'paid',    receipt_number: 'RC-2026-00045', hra_eligible: true },
  { id: 'rh-003', month: 'April 2026',    due_date: '2026-04-05', amount: 25000, tds_deducted: 0, net_payable: 25000, paid_at: '2026-04-05T10:00:00Z', method: 'UPI', upi_ref: 'UPI2604051000234567', status: 'paid',    receipt_number: 'RC-2026-00038', hra_eligible: true },
  { id: 'rh-004', month: 'March 2026',    due_date: '2026-03-05', amount: 25000, tds_deducted: 0, net_payable: 25000, paid_at: '2026-03-07T09:00:00Z', method: 'UPI', upi_ref: 'UPI2603070900345678', status: 'paid',    receipt_number: 'RC-2026-00031', hra_eligible: true },
  { id: 'rh-005', month: 'February 2026', due_date: '2026-02-05', amount: 25000, tds_deducted: 0, net_payable: 25000, paid_at: '2026-02-05T11:30:00Z', method: 'UPI', upi_ref: 'UPI2602051130456789', status: 'paid',    receipt_number: 'RC-2026-00024', hra_eligible: true },
  { id: 'rh-006', month: 'January 2026',  due_date: '2026-01-05', amount: 25000, tds_deducted: 0, net_payable: 25000, paid_at: '2026-01-06T14:00:00Z', method: 'NEFT', upi_ref: null, status: 'paid',    receipt_number: 'RC-2026-00017', hra_eligible: true },
];

export const mockTenantMaintenance: TenantMaintenanceRequest[] = [
  {
    id: 'tm-001',
    title: 'Kitchen sink leaking',
    description: 'The kitchen sink has been dripping constantly since yesterday. Water is pooling under the cabinet.',
    category: 'Plumbing',
    priority: 'high',
    status: 'in_progress',
    created_at: '2026-05-28T08:00:00Z',
    resolved_at: null,
    landlord_note: 'Vendor assigned — Quick Fix Plumbing will visit on June 6.',
    vendor_name: 'Quick Fix Plumbing',
    vendor_phone: '+919900112211',
    vendor_rating: null,
  },
  {
    id: 'tm-002',
    title: 'Bathroom exhaust fan not working',
    description: 'The exhaust fan in the master bathroom stopped working two weeks ago.',
    category: 'Electrical',
    priority: 'low',
    status: 'open',
    created_at: '2026-06-01T10:00:00Z',
    resolved_at: null,
    landlord_note: null,
    vendor_name: null,
    vendor_phone: null,
    vendor_rating: null,
  },
  {
    id: 'tm-003',
    title: 'Geyser trip switch keeps tripping',
    description: 'The bathroom geyser MCB trips every time it is switched on.',
    category: 'Electrical',
    priority: 'medium',
    status: 'resolved',
    created_at: '2026-04-12T09:00:00Z',
    resolved_at: '2026-04-15T14:00:00Z',
    landlord_note: 'Fixed. Geyser element replaced by electrician.',
    vendor_name: 'Spark Electricals',
    vendor_phone: '+919900223322',
    vendor_rating: 5,
  },
];

export const mockDepositDeductions: DepositDeduction[] = [
  { id: 'dd-001', category: 'painting', description: 'Full flat repainting (3 rooms)', amount: 8000, approved: false },
  { id: 'dd-002', category: 'repairs', description: 'Door latch replacement (2 doors)', amount: 800, approved: false },
  { id: 'dd-003', category: 'utility_bills', description: 'Pending electricity bill (Mar)', amount: 1200, approved: false },
];
