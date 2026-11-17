import { apiGet, apiList, apiSend } from './api';
import type { MarketEstimate, SellRequest, SellRequestPayload, SellerActivity } from '../types/sellRequest';

/** POST /sell-requests/drafts */
export function createSellDraft(payload: SellRequestPayload) {
  return apiSend<SellRequest>('POST', '/sell-requests/drafts', payload);
}

/** PATCH /me/sell-requests/:id */
export function updateSellRequest(id: string, payload: SellRequestPayload & { isDraft?: boolean; status?: 'draft' }) {
  return apiSend<SellRequest>('PATCH', `/me/sell-requests/${encodeURIComponent(id)}`, payload);
}

/** POST /me/sell-requests/:id/submit — moves a draft to "new" after server-side validation. */
export function submitSellRequest(id: string) {
  return apiSend<SellRequest>('POST', `/me/sell-requests/${encodeURIComponent(id)}/submit`);
}

/** GET /me/sell-requests */
export function listMySellRequests(signal?: AbortSignal) {
  return apiList<SellRequest>('/me/sell-requests', { limit: 100, sort: 'newest' }, signal);
}

/** GET /me/sell-requests/:id */
export function getSellRequest(id: string, signal?: AbortSignal) {
  return apiGet<SellRequest>(`/me/sell-requests/${encodeURIComponent(id)}`, undefined, signal);
}

/** POST /me/sell-requests/:id/withdraw — the API has no delete; withdrawing pauses the listing ("Withdrawn by seller"). */
export function withdrawSellRequest(id: string) {
  return apiSend<SellRequest>('POST', `/me/sell-requests/${encodeURIComponent(id)}/withdraw`);
}

/** GET /me/sell-requests/:id/activity — offer, payout schedule, registration, metrics. */
export function getSellerActivity(id: string, signal?: AbortSignal) {
  return apiGet<SellerActivity>(`/me/sell-requests/${encodeURIComponent(id)}/activity`, undefined, signal);
}

/** POST /me/sell-requests/:id/offer-decision */
export function decideOffer(id: string, decision: 'accepted' | 'countered', counterAmount?: number, notes?: string) {
  return apiSend<SellerActivity>('POST', `/me/sell-requests/${encodeURIComponent(id)}/offer-decision`, {
    decision,
    ...(decision === 'countered' ? { counterAmount } : {}),
    ...(notes ? { notes } : {}),
  });
}

export interface SellerDocument {
  documentId: string | null;
  type: string;
  name: string;
  status: string;
  createdAt?: string | null;
  url?: string | null;
}

/** GET /me/sell-requests/:id/documents — term sheet, sale deed and uploaded files. */
export function listSellerDocuments(id: string) {
  return apiGet<SellerDocument[]>(`/me/sell-requests/${encodeURIComponent(id)}/documents`);
}

/** POST /me/sell-requests/:id/payout-schedule/confirm */
export function confirmPayoutSchedule(id: string) {
  return apiSend<SellerActivity>('POST', `/me/sell-requests/${encodeURIComponent(id)}/payout-schedule/confirm`);
}

/** POST /me/sell-requests/:id/registration/confirm */
export function confirmRegistration(id: string, documentsReady: string[]) {
  return apiSend<SellerActivity>('POST', `/me/sell-requests/${encodeURIComponent(id)}/registration/confirm`, { documentsReady });
}

/** POST /me/sell-requests/:id/messages */
export function sendSellerMessage(id: string, text: string) {
  return apiSend<unknown>('POST', `/me/sell-requests/${encodeURIComponent(id)}/messages`, { text });
}

/** POST /me/sell-requests/:id/valuation-estimate */
export function getMarketEstimate(id: string, payload: SellRequestPayload = {}) {
  return apiSend<MarketEstimate>('POST', `/me/sell-requests/${encodeURIComponent(id)}/valuation-estimate`, payload);
}
