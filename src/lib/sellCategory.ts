/** Sell categories follow sellRequests/validationRules.js `sellTypeCategory`. */

export type SellKind = 'home' | 'plot' | 'commercial' | 'fractional' | 'interior';

export const AREA_MIN = 50;
export const PRICE_MIN = 50_000;

export function sellKind(api?: string): SellKind {
  if (api === 'plot' || api === 'land') return 'plot';
  if (api === 'commercial') return 'commercial';
  if (api === 'fractional') return 'fractional';
  if (api === 'interior') return 'interior';
  return 'home';
}

export interface SellChecks {
  title: string;
  bhk: string;
  builtup: string;
  plotArea: string;
  floor: string;
  share: string;
  totalValue: string;
  scope: string;
  ownership: string;
  furnishing: string;
  furnishDetails: string;
  parking: number;
  parkingType: string;
}

const digits = (v: string) => parseInt(v.replace(/\D/g, ''), 10) || 0;
const shareOf = (v: string) => {
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export function basicReady(kind: SellKind, f: SellChecks, titleMin: number) {
  if (f.title.trim().length < titleMin) return false;
  if (kind === 'home') return Boolean(f.bhk) && digits(f.builtup) >= AREA_MIN;
  if (kind === 'plot') return digits(f.plotArea) >= AREA_MIN;
  if (kind === 'commercial') return digits(f.builtup) >= AREA_MIN || digits(f.plotArea) >= AREA_MIN;
  if (kind === 'fractional') return shareOf(f.share) >= 0.01 && shareOf(f.share) <= 100 && digits(f.totalValue) >= PRICE_MIN;
  return f.scope.trim().length >= 2;
}

export function detailsReady(kind: SellKind, f: SellChecks) {
  if (kind === 'interior') return true;
  if (!f.ownership) return false;
  const furnished = f.furnishing && f.furnishing.toLowerCase() !== 'unfurnished';
  if ((kind === 'home' || kind === 'commercial') && furnished && f.furnishDetails.trim().length < 2) return false;
  if ((kind === 'home' || kind === 'commercial') && f.parking > 0 && !f.parkingType) return false;
  return true;
}
