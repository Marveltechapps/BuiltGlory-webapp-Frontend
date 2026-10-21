import type { Property } from '../types/property';
import type { User } from '../types/user';

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const propertyId = (p: { _id?: string; id?: string }) => p._id || p.id || '';

export const propertyArea = (p: Property) => {
  const s = p.specs ?? {};
  return num(s.builtUpArea) || num(s.carpetArea) || num(s.plotArea) || num(s.area);
};

export const propertyBhk = (p: Property) => {
  const raw = p.specs?.bhk;
  if (raw === undefined || raw === null || raw === '') return 0;
  return num(raw);
};

export const pricePerSqft = (p: Property) => {
  const area = propertyArea(p);
  return area ? Math.round(p.price / area) : 0;
};

export const propertyPhotos = (p: Property) => {
  const photos = (p.media?.photos ?? []).filter(Boolean);
  const cover = p.media?.coverPhoto;
  return cover && !photos.includes(cover) ? [cover, ...photos] : photos;
};

export const propertyLocality = (p: Property) => p.address?.locality || p.address?.line1 || '';
export const propertyCity = (p: Property) => p.address?.city || '';
export const propertyLocation = (p: Property) => [propertyLocality(p), propertyCity(p)].filter(Boolean).join(', ');

/** The backend treats `verified=true` as `status: "available"` (properties/repository.js buildFilter). */
export const isVerified = (p: Property) => p.status === 'available';

export const unitNumber = (p: Property) => String(p.specs?.unitNo ?? p.specs?.unitNumber ?? '') || '';

export const floorLabel = (p: Property) => {
  const f = p.specs?.floor;
  const t = p.specs?.totalFloors;
  if (f === undefined || f === null || f === '') return '—';
  return t ? `${f} of ${t}` : String(f);
};

export const isSavedBy = (p: Property, user: User | null) => {
  if (!user) return false;
  return (p.savedByUsers ?? []).some((id) => String(id) === String(user._id));
};

export const mapsUrl = (p: Property) => {
  const { latitude, longitude } = p.address ?? {};
  if (typeof latitude === 'number' && typeof longitude === 'number') return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.address?.line1, propertyLocation(p), p.address?.pincode].filter(Boolean).join(', '))}`;
};

/** Spec rows for the "Specifications" tab: every scalar value the listing carries, except the ones shown elsewhere. */
const SPEC_SKIP = new Set(['bhk', 'builtUpArea', 'carpetArea', 'plotArea', 'area', 'floor', 'totalFloors', 'unitNo', 'unitNumber']);
export const specRows = (p: Property): Array<[string, string]> =>
  Object.entries(p.specs ?? {})
    .filter(([k, v]) => !SPEC_SKIP.has(k) && v !== null && v !== undefined && v !== '' && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'))
    .map(([k, v]) => [k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)]);
