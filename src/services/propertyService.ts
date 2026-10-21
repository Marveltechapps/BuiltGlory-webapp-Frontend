import { apiGet, apiList, apiSend } from './api';
import type { Property, PropertyListQuery } from '../types/property';

/** GET /properties (public). */
export function listProperties(query: PropertyListQuery, signal?: AbortSignal) {
  return apiList<Property>('/properties', { ...query }, signal);
}

/** GET /properties/:propertyId (public). */
export function getProperty(propertyId: string, signal?: AbortSignal) {
  return apiGet<Property>(`/properties/${encodeURIComponent(propertyId)}`, undefined, signal);
}

/** POST /properties/:propertyId/save */
export function saveProperty(propertyId: string) {
  return apiSend<Property>('POST', `/properties/${encodeURIComponent(propertyId)}/save`);
}

/** DELETE /properties/:propertyId/save (204). */
export function unsaveProperty(propertyId: string) {
  return apiSend<void>('DELETE', `/properties/${encodeURIComponent(propertyId)}/save`);
}

/** GET /me/favorites */
export function getFavorites(signal?: AbortSignal) {
  return apiGet<Property[]>('/me/favorites', undefined, signal);
}
