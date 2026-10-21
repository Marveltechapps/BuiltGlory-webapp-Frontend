// Option lists defined by the design (labels, icons) and how each maps to the backend enums.
import type { ApiPropertyType } from '../types/property';
import type { SupportCategory } from '../types/misc';

export interface PropertyTypeOption {
  id: string;
  api: ApiPropertyType;
  label: string;
  sub: string;
  icon: string;
}

// 13 property types per spec (B-01 / SL-01).
export const PROPERTY_TYPES: PropertyTypeOption[] = [
  { id: 'plot', api: 'plot', label: 'Plot', sub: '', icon: 'map-pin' },
  { id: 'apartment', api: 'apartment', label: 'Apartment', sub: '', icon: 'building-2' },
  { id: 'villa', api: 'villa', label: 'Villa', sub: '', icon: 'home' },
  { id: 'commercial', api: 'commercial', label: 'Commercial', sub: '', icon: 'briefcase' },
  { id: 'land', api: 'land', label: 'Land', sub: 'Land Bank', icon: 'map' },
  { id: 'fractional', api: 'fractional', label: 'Fractional', sub: 'Ownership', icon: 'pie-chart' },
  { id: '3d-print', api: '3d_printing', label: '3D Print', sub: 'Home', icon: 'box' },
  { id: 'organic', api: 'organic_home', label: 'Organic', sub: 'Home', icon: 'leaf' },
  { id: 'ceo-mansion', api: 'ceo_mansion', label: 'CEO', sub: 'Mansion', icon: 'crown' },
  { id: 'holiday', api: 'holiday_home', label: 'Holiday', sub: 'Home', icon: 'umbrella' },
  { id: 'farmhouse', api: 'farmhouse', label: 'Farmhouse', sub: '', icon: 'warehouse' },
  { id: 'nri', api: 'nri', label: 'NRI', sub: 'Services', icon: 'globe' },
  { id: 'interior', api: 'interior', label: 'Interior', sub: '', icon: 'sofa' },
];

export const typeByApi = (api?: string) => PROPERTY_TYPES.find((t) => t.api === api);
export const typeById = (id?: string | null) => PROPERTY_TYPES.find((t) => t.id === id);
export const typeLabel = (api?: string) => {
  if (api === 'residential') return 'Residential';
  return typeByApi(api)?.label ?? (api ? api.replace(/_/g, ' ') : 'Property');
};

export interface SpecOption { label: string; icon: string }

export const SPECS: SpecOption[] = [
  { label: 'Lift', icon: 'arrow-up-down' },
  { label: 'Gym', icon: 'dumbbell' },
  { label: 'Pool', icon: 'waves' },
  { label: 'Garden', icon: 'trees' },
  { label: 'Parking', icon: 'car' },
  { label: 'Security', icon: 'circle-check-big' },
  { label: 'Power Backup', icon: 'zap' },
  { label: 'CCTV', icon: 'video' },
  { label: 'Club House', icon: 'users' },
  { label: 'Wifi', icon: 'wifi' },
  { label: 'Solar', icon: 'sun' },
  { label: 'EV Charger', icon: 'plug' },
  { label: 'Servants', icon: 'user' },
  { label: 'Lounge', icon: 'sofa' },
  { label: 'Library', icon: 'book-open' },
  { label: 'Play Area', icon: 'baby' },
  { label: 'Jogging Track', icon: 'footprints' },
  { label: 'Pet Friendly', icon: 'dog' },
  { label: 'Fire Safety', icon: 'flame' },
  { label: 'Rainwater', icon: 'cloud-rain' },
];

export const SELL_AMENITIES: SpecOption[] = [...SPECS,
  { label: 'Modular Kitchen', icon: 'cooking-pot' }, { label: 'Marble flooring', icon: 'grid-3x3' },
  { label: 'Wooden flooring', icon: 'layers' }, { label: 'AC', icon: 'air-vent' },
  { label: 'RO water', icon: 'droplets' }, { label: 'Geyser', icon: 'thermometer' },
  { label: 'Wardrobes', icon: 'archive' }, { label: 'Intercom', icon: 'phone-call' },
];

const AMEN_ICON: Record<string, string> = Object.fromEntries(SELL_AMENITIES.map((s) => [s.label.toLowerCase(), s.icon]));
export const amenityIcon = (label: string) => AMEN_ICON[label.toLowerCase()] ?? 'circle-check-big';

export const SUBTYPES: Record<string, string[]> = {
  apartment: ['Studio', 'Builder Floor', 'Penthouse', 'Standalone', 'Gated Community'],
  villa: ['Independent Villa', 'Row House', 'Twin Villa'],
  commercial: ['Office Space', 'Shop / Showroom', 'Warehouse', 'Co-working'],
  default: ['Standalone', 'Gated Community', 'Other'],
};
export const BHKS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK', 'Studio'];
export const AGES = ['Under Construction', '0–1 year', '1–5 years', '5–10 years', '10+ years'];
export const FACINGS = ['North', 'South', 'East', 'West'];
export const OWNERSHIPS = ['Freehold', 'Leasehold', 'Co-op', 'Power of Attorney'];
export const FURNISHINGS = ['Unfurnished', 'Semi-Furnished', 'Furnished'];

export const AUTH_FEATURES: Array<[string, string, string]> = [
  ['shield-check', 'Only verified homes', 'Every listing passes legal, title and on-site checks before it goes live.'],
  ['badge-indian-rupee', '0% brokerage', 'Buy or sell directly with Builtglory. No middlemen, no hidden fees.'],
  ['video', 'Tour from anywhere', '360° walkthroughs, aerial views and live NRI video calls.'],
];

export const ONBOARDING_SLIDES = [
  { icon: 'shield-check', tone: 'brand', title: 'Only verified homes', body: 'Every listing passes legal, title and on-site checks before you ever see it.' },
  { icon: 'badge-indian-rupee', tone: 'green', title: 'Zero brokerage', body: 'Buy or sell directly. No middlemen, no hidden commissions — ever.' },
  { icon: 'video', tone: 'violet', title: 'Tour from anywhere', body: '3D walkthroughs, aerial views and live NRI video visits, all in-app.' },
] as const;

export const CANCEL_REASONS = ['Changed my mind', 'Found another property', 'Price too high', 'No response from advisor', 'Other'];
export const DELETE_REASONS = ['I found a property already', 'I am not planning to buy or sell now', 'Too many calls or notifications', 'I have privacy concerns', 'I created a duplicate account', 'Other'];

// Raise-ticket categories shown in the design → supportTickets category enum.
export const TICKET_CATEGORIES: Array<{ label: string; api: SupportCategory }> = [
  { label: 'Enquiry', api: 'property_inquiry' },
  { label: 'Site visit', api: 'property_inquiry' },
  { label: 'Listing', api: 'general' },
  { label: 'Payment', api: 'payment' },
  { label: 'Documents', api: 'general' },
  { label: 'App issue', api: 'technical' },
];

export const TICKET_CATEGORY_LABEL: Record<SupportCategory, string> = {
  property_inquiry: 'Property enquiry', payment: 'Payment', technical: 'App issue', kyc: 'KYC', general: 'General', complaint: 'Complaint',
};

// Popular-city list from the onboarding design and their coordinates for nearest-city GPS matching.
export const CITY_COORDS: Record<string, [number, number]> = {
  Chennai: [13.08, 80.27], Bengaluru: [12.97, 77.59], Hyderabad: [17.38, 78.48], Mumbai: [19.07, 72.87], Pune: [18.52, 73.85], 'Delhi NCR': [28.61, 77.21],
};
export const CITIES = ['Chennai', 'Bengaluru', 'Hyderabad', 'Mumbai', 'Pune', 'Delhi NCR', 'Kolkata', 'Ahmedabad', 'Kochi', 'Coimbatore', 'Jaipur', 'Chandigarh'];
export const nearestCity = (lat: number, lon: number) => {
  let best = 'Chennai', min = Infinity;
  for (const [c, [la, lo]] of Object.entries(CITY_COORDS)) { const d = (la - lat) ** 2 + (lo - lon) ** 2; if (d < min) { min = d; best = c; } }
  return best;
};
