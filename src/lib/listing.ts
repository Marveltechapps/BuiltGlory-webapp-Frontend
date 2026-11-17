// Display helpers for a seller's listing (sell request), shared by My Listings, Listing Status and Sold.
import type { SellRequest } from '../types/sellRequest';
import { typeLabel } from './catalog';

/** "Expected live" shown for listings still in verification: submission + the 7-day verification window. */
export const GO_LIVE_DAYS = 7;

export const listingArea = (r: SellRequest) => {
  const s = r.specifications ?? {};
  const a = s.builtUpArea || s.plotArea || s.area;
  return a ? `${Number(a).toLocaleString('en-IN')} sq.ft` : null;
};

export const listingConfig = (r: SellRequest) => {
  const bhk = r.specifications?.bhk;
  if (bhk) return /bhk|studio/i.test(String(bhk)) ? String(bhk) : `${bhk} BHK`;
  return r.specifications?.subType || null;
};

export const listingFloor = (r: SellRequest) => {
  const { floor, totalFloors } = r.specifications ?? {};
  if (floor === null || floor === undefined || floor === '') return null;
  return totalFloors ? `${floor} of ${totalFloors}` : String(floor);
};

export const listingChips = (r: SellRequest) =>
  [typeLabel(r.propertyType), listingConfig(r), listingArea(r), r.specifications?.facing ? `${r.specifications.facing} facing` : null].filter(Boolean) as string[];

export const expectedLive = (r: SellRequest) => {
  if (!r.submittedAt) return null;
  const d = new Date(r.submittedAt);
  d.setDate(d.getDate() + GO_LIVE_DAYS);
  return d;
};

export const daysBetween = (a?: string | null, b?: string | null) =>
  (a && b ? Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)) : null);
