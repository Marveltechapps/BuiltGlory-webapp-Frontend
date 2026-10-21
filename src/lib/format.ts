export const cx = (...a: Array<string | false | null | undefined | 0>) => a.filter(Boolean).join(' ');

export const formatINR = (n: number) => {
  if (n >= 10000000) return `₹ ${(n / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  if (n >= 100000) return `₹ ${(n / 100000).toFixed(2).replace(/\.00$/, '')} L`;
  return `₹ ${Math.round(n).toLocaleString('en-IN')}`;
};

export const formatRupees = (n: number) => `₹ ${Math.round(n).toLocaleString('en-IN')}`;

// Indicative EMI shown on the property sidebar: 80% loan, 8.5% p.a., 20 years.
export const emi = (price: number) => {
  const P = price * 0.8, r = 0.085 / 12, n = 240;
  const e = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return Math.round(e);
};

export const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase();

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const toDate = (value?: string | Date | null) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "Jun 20" */
export const shortDate = (value?: string | Date | null) => {
  const d = toDate(value);
  return d ? `${MONTHS_SHORT[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}` : '';
};

/** "June 20, 2026" */
export const longDate = (value?: string | Date | null) => {
  const d = toDate(value);
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : '';
};

/** "Jun 20 · 9:14 AM" */
export const dateTime = (value?: string | Date | null) => {
  const d = toDate(value);
  if (!d) return '';
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} · ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}`;
};

/** "10 Aug, 2026" */
export const dayLabel = (value?: string | Date | null) => {
  const d = toDate(value);
  return d ? `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${d.getFullYear()}` : '';
};

/** "12:14 PM" */
export const timeLabel = (value?: string | Date | null) => {
  const d = toDate(value);
  return d ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase() : '';
};

/** "2h", "3d", "1w" — compact relative age used in notification rows. */
export const ageShort = (value?: string | Date | null) => {
  const d = toDate(value);
  if (!d) return '';
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
};

/** "2 days ago" */
export const timeAgo = (value?: string | Date | null) => {
  const d = toDate(value);
  if (!d) return '';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? '1 month ago' : `${months} months ago`;
};

export const isToday = (value?: string | Date | null) => {
  const d = toDate(value);
  if (!d) return false;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

/** Local calendar date as YYYY-MM-DD (the API's visitDate format). */
export const isoDay = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export const digits = (value: string) => value.replace(/\D/g, '');

/** Strip the +91 / 91 prefix and keep the 10-digit mobile number. */
export const localMobile = (value?: string | null) => {
  const d = digits(value ?? '');
  return d.length > 10 ? d.slice(-10) : d;
};

export const prettyMobile = (value?: string | null) => {
  const d = localMobile(value);
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
};

export const titleCase = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
