import { apiGet, apiList, apiSend } from './api';
import type { AppNotification } from '../types/misc';

/** GET /me/notifications (in-app channel). */
export function listNotifications(signal?: AbortSignal) {
  return apiList<AppNotification>('/me/notifications', { limit: 100 }, signal);
}

/** GET /me/notifications/unread-count */
export function getUnreadCount(signal?: AbortSignal) {
  return apiGet<{ count: number }>('/me/notifications/unread-count', undefined, signal);
}

/** PATCH /me/notifications/read — no ids marks all as read. */
export function markAllRead() {
  return apiSend<AppNotification[]>('PATCH', '/me/notifications/read', {});
}

/** PATCH /me/notifications/:id/read */
export function markRead(id: string) {
  return apiSend<AppNotification>('PATCH', `/me/notifications/${encodeURIComponent(id)}/read`, {});
}
