import { apiGet, apiList, apiSend } from './api';
import type { BuyEnquiry, CreateEnquiryPayload, CustomerDeal } from '../types/enquiry';

/** POST /buy-enquiries */
export function createEnquiry(payload: CreateEnquiryPayload) {
  return apiSend<BuyEnquiry>('POST', '/buy-enquiries', payload);
}

/** GET /me/buy-enquiries — each item is enriched with its linked `visits` and `deal`. */
export function listMyEnquiries(query: { propertyId?: string; limit?: number; page?: number } = {}, signal?: AbortSignal) {
  return apiList<BuyEnquiry>('/me/buy-enquiries', { limit: 100, sort: 'newest', ...query }, signal);
}

/** GET /me/buy-enquiries/:enquiryId */
export function getEnquiry(enquiryId: string, signal?: AbortSignal) {
  return apiGet<BuyEnquiry>(`/me/buy-enquiries/${encodeURIComponent(enquiryId)}`, undefined, signal);
}

/** GET /me/deals — buyer and seller deals with server-side progress. One page per call. */
export function listMyDeals(query: { page?: number; limit?: number } = {}, signal?: AbortSignal) {
  return apiList<CustomerDeal>('/me/deals', { limit: 20, ...query }, signal);
}

/** PATCH /me/buy-enquiries/:enquiryId/cancel */
export function cancelEnquiry(enquiryId: string, reason?: string) {
  return apiSend<BuyEnquiry>('PATCH', `/me/buy-enquiries/${encodeURIComponent(enquiryId)}/cancel`, reason ? { reason } : {});
}
