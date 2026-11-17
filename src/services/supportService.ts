import { apiGet, apiList, apiSend } from './api';
import type { CallbackSlot, SupportCategory, SupportTicket } from '../types/misc';

/** POST /support/tickets */
export function createTicket(payload: { category: SupportCategory; subject: string; message: string; attachments?: string[] }) {
  return apiSend<SupportTicket>('POST', '/support/tickets', { ...payload, channel: 'ticket' });
}

/** GET /me/support/tickets */
export function listMyTickets(signal?: AbortSignal) {
  return apiList<SupportTicket>('/me/support/tickets', { channel: 'ticket', sort: 'newest', limit: 5 }, signal);
}

/** GET /me/support/tickets/:ticketId */
export function getTicket(ticketId: string, signal?: AbortSignal) {
  return apiGet<SupportTicket>(`/me/support/tickets/${encodeURIComponent(ticketId)}`, undefined, signal);
}

/** POST /me/support/tickets/:ticketId/responses */
export function replyToTicket(ticketId: string, message: string) {
  const clientMessageId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return apiSend<SupportTicket>('POST', `/me/support/tickets/${encodeURIComponent(ticketId)}/responses`, { message, clientMessageId });
}

/** POST /me/support/tickets/:ticketId/read */
export function markTicketRead(ticketId: string) {
  return apiSend<SupportTicket>('POST', `/me/support/tickets/${encodeURIComponent(ticketId)}/read`);
}

/** POST /me/support/tickets/:ticketId/close */
export function closeTicket(ticketId: string) {
  return apiSend<SupportTicket>('POST', `/me/support/tickets/${encodeURIComponent(ticketId)}/close`);
}

/** POST /me/support/tickets/:ticketId/reopen */
export function reopenTicket(ticketId: string) {
  return apiSend<SupportTicket>('POST', `/me/support/tickets/${encodeURIComponent(ticketId)}/reopen`);
}

/** GET /me/support/live-chat — the customer's active live chat, or null. */
export function getLiveChat(signal?: AbortSignal) {
  return apiGet<SupportTicket | null>('/me/support/live-chat', undefined, signal);
}

/** POST /me/support/live-chat */
export function startLiveChat(message: string) {
  return apiSend<SupportTicket>('POST', '/me/support/live-chat', { category: 'general', subject: 'Live chat', message });
}

/** POST /callbacks */
export function requestCallback(slot: CallbackSlot, sourceScreen: string) {
  return apiSend<unknown>('POST', '/callbacks', { source: 'help_support', sourceScreen, category: 'general', bestTimePreference: slot });
}

/** POST /callbacks — advisor callback tied to a property (Enquiry Status actions). */
export function requestPropertyCallback(body: { propertyId: string; reason: string; category?: 'property_inquiry' | 'pricing' | 'general'; bestTimePreference?: CallbackSlot; preferredTime?: string }) {
  return apiSend<unknown>('POST', '/callbacks', { source: 'property_detail', sourceScreen: 'enquiry_status', category: body.category ?? 'property_inquiry', ...body });
}
