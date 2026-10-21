import { apiGet } from './api';

export interface ReverseGeocode {
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

const WEB_CITY: Record<string, string> = { Bangalore: 'Bengaluru', Delhi: 'Delhi NCR' };

/** GET /geo/reverse. City names match the web catalogue. */
export async function reverseGeocode(latitude: number, longitude: number) {
  const place = await apiGet<ReverseGeocode>('/geo/reverse', { latitude, longitude });
  return { ...place, city: WEB_CITY[place.city] || place.city };
}
