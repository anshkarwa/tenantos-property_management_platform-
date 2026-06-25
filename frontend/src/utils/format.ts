// ─── TenantOS Utilities — Extended for Indian Market ───────────────────────

// Format INR currency using Indian number system (##,##,###)
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format large INR amounts with lakhs/crores abbreviations
export function formatINRCompact(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount}`;
}

// Format date for Indian locale (DD/MM/YYYY)
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

// Format date strictly as DD/MM/YYYY string for forms and receipts
export function formatDateIN(date: string | Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// Format phone number for display (+91 XXXXX XXXXX)
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

// Get time of day greeting key
export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// Percentage display
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// classname merge helper
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Indian Compliance Validators ──────────────────────────────────────────

/** Validates a PAN card number format: AAAAA9999A */
export function isValidPAN(pan: string | null | undefined): boolean {
  if (!pan) return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase().trim());
}

/** Validates an Aadhaar number (12 digits, no spaces) */
export function isValidAadhaar(aadhaar: string): boolean {
  const cleaned = aadhaar.replace(/\s/g, '');
  return /^\d{12}$/.test(cleaned);
}

/** Validates a GSTIN format: 22AAAAA0000A1Z5 */
export function isValidGSTIN(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase().trim());
}

/** Validates an Indian mobile number */
export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s+\-()]/g, '');
  return /^(91)?[6-9]\d{9}$/.test(cleaned);
}

/** Validates a valid UPI ID format */
export function isValidUPIId(upiId: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim());
}

// ─── Indian Tax Computations ────────────────────────────────────────────────

/** TDS threshold under Section 194-IB: ₹50,000/month */
export const TDS_THRESHOLD = 50000;
export const TDS_RATE = 0.05;
export const GST_RATE_COMMERCIAL = 0.18;

/** Calculates TDS amount for a given monthly rent */
export function calcTDS(monthlyRent: number): number {
  if (monthlyRent > TDS_THRESHOLD) {
    return Math.round(monthlyRent * TDS_RATE);
  }
  return 0;
}

/** Calculates GST amount for commercial properties */
export function calcGST(amount: number, isCommercial: boolean): number {
  if (!isCommercial) return 0;
  return Math.round(amount * GST_RATE_COMMERCIAL);
}

/** Generates a UPI payment deep link */
export function generateUPILink(params: {
  upiId: string;
  name: string;
  amount: number;
  note: string;
  transactionRef?: string;
}): string {
  const base = 'upi://pay';
  const query = new URLSearchParams({
    pa: params.upiId,
    pn: params.name,
    am: params.amount.toString(),
    tn: params.note,
    cu: 'INR',
    ...(params.transactionRef ? { tr: params.transactionRef } : {}),
  });
  return `${base}?${query.toString()}`;
}

/** Generates a BharatQR-style QR string (merchant-facing) */
export function generateBharatQRString(params: {
  upiId: string;
  name: string;
  amount: number;
  note: string;
}): string {
  // BharatQR is based on the UPI URI spec
  return generateUPILink(params);
}

/** Returns payment app deep links for GPay, PhonePe, Paytm */
export function getPaymentAppLinks(upiId: string, amount: number, note: string) {
  const encoded = encodeURIComponent;
  return {
    gpay: `tez://upi/pay?pa=${encoded(upiId)}&pn=TenantOS&am=${amount}&tn=${encoded(note)}&cu=INR`,
    phonepe: `phonepe://pay?pa=${encoded(upiId)}&pn=TenantOS&am=${amount}&tn=${encoded(note)}&cu=INR`,
    paytm: `paytmmp://pay?pa=${encoded(upiId)}&pn=TenantOS&am=${amount}&tn=${encoded(note)}&cu=INR`,
  };
}

/** Calculate HRA exemption (simplified for display only) */
export function calcHRAExemption(params: {
  basicSalary: number;
  hra_received: number;
  rent_paid: number;
  is_metro_city: boolean;
}): number {
  const { basicSalary, hra_received, rent_paid, is_metro_city } = params;
  // Min of: (a) HRA received, (b) 50%/40% of basic, (c) Rent paid - 10% of basic
  const a = hra_received;
  const b = basicSalary * (is_metro_city ? 0.5 : 0.4);
  const c = rent_paid - basicSalary * 0.1;
  return Math.max(0, Math.min(a, b, c));
}

/** Returns financial year string from a date */
export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  if (month >= 3) {
    // April (3) to December
    return `${year}-${String(year + 1).slice(2)}`;
  }
  return `${year - 1}-${String(year).slice(2)}`;
}
