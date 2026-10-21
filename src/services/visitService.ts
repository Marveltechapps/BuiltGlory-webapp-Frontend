import { apiGet, apiList, apiSend } from './api';
import type { CreateVisitPayload, Visit, VisitAvailability, VisitType } from '../types/visit';

/** GET /visits/availability?propertyId&visitType&from&days */
export function getVisitAvailability(propertyId: string, visitType: VisitType, from: string, days: number, signal?: AbortSignal) {
  return apiGet<VisitAvailability>('/visits/availability', { propertyId, visitType, from, days }, signal);
}

/** GET /me/visits — buyer visits, including bookings that have no enquiry. */
export function listMyVisits(query: { page?: number; limit?: number } = {}, signal?: AbortSignal) {
  return apiList<Visit>('/me/visits', { limit: 20, sort: 'newest', ...query }, signal);
}

/** POST /visits */
export function createVisit(payload: CreateVisitPayload) {
  return apiSend<Visit>('POST', '/visits', payload);
}

/** PATCH /visits/:visitId/reschedule */
export function rescheduleVisit(visitId: string, visitDate: string, visitTime: string) {
  return apiSend<Visit>('PATCH', `/visits/${encodeURIComponent(visitId)}/reschedule`, { visitDate, visitTime });
}

/** PATCH /visits/:visitId/cancel */
export function cancelVisit(visitId: string, reason?: string) {
  return apiSend<Visit>('PATCH', `/visits/${encodeURIComponent(visitId)}/cancel`, reason ? { reason } : {});
}
