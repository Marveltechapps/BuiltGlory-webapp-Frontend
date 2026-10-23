import { apiGet } from './api';

export interface ReverseGeocode {
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  street?: string;
  locality?: string;
  pincode?: string;
}

const WEB_CITY: Record<string, string> = { Bangalore: 'Bengaluru', Delhi: 'Delhi NCR' };
const cityName = (city?: string) => (city ? WEB_CITY[city] || city : '');

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  city?: string;
  town?: string;
  municipality?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

const cleanLocality = (value?: string) => (value || '').replace(/^Zone\s+\d+\s+/i, '').trim();

function fromNominatim(address: NominatimAddress): Partial<ReverseGeocode> {
  const street = [address.house_number, address.road || address.pedestrian].filter(Boolean).join(' ').trim();
  const locality = [address.suburb, address.neighbourhood, address.quarter, address.city_district].map(cleanLocality).find(Boolean) || '';
  const city = address.city || address.town || address.municipality || address.village || '';
  const digits = (address.postcode || '').replace(/\D/g, '');
  return {
    street: street || undefined,
    locality: locality || undefined,
    city: cityName(city) || undefined,
    state: address.state,
    country: address.country,
    pincode: digits.length === 6 ? digits : undefined,
  };
}

/** Browser lookup used when the API only knows the nearest city. */
async function nominatim(latitude: number, longitude: number) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '18');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'Accept-Language': 'en' } });
    if (!response.ok) throw new Error('Geocoder unavailable');
    const body = await response.json() as { address?: NominatimAddress };
    return fromNominatim(body.address ?? {});
  } finally {
    clearTimeout(timer);
  }
}

/** GET /geo/reverse, enriched with street, area and pincode for the clicked map point. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocode> {
  let mapped: ReverseGeocode | null = null;
  try {
    const place = await apiGet<ReverseGeocode>('/geo/reverse', { latitude, longitude });
    mapped = { ...place, city: cityName(place.city) || place.city, latitude, longitude };
    if (mapped.street || mapped.locality || mapped.pincode) return mapped;
  } catch { /* the map lookup below still fills the address */ }
  const details = await nominatim(latitude, longitude);
  if (!details.city && !details.locality && !details.street && !details.pincode && !mapped) throw new Error('Geocoder unavailable');
  return {
    city: details.city || mapped?.city || '',
    state: details.state || mapped?.state || '',
    country: details.country || mapped?.country || 'India',
    latitude,
    longitude,
    street: details.street,
    locality: details.locality,
    pincode: details.pincode,
  };
}
