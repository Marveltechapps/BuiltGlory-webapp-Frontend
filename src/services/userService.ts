import { apiGet, apiSend } from './api';
import type { AccountDeletionStatus, UpdateMePayload, User } from '../types/user';

/** GET /me */
export function getMe(signal?: AbortSignal) {
  return apiGet<User>('/me', undefined, signal);
}

/** PATCH /me */
export function updateMe(payload: UpdateMePayload) {
  return apiSend<User>('PATCH', '/me', payload);
}

/** GET /me/account-deletion */
export function getAccountDeletion(signal?: AbortSignal) {
  return apiGet<AccountDeletionStatus>('/me/account-deletion', undefined, signal);
}

/** POST /me/account-deletion — confirmation must be the literal "DELETE". */
export function requestAccountDeletion(reason: string | null) {
  return apiSend<AccountDeletionStatus>('POST', '/me/account-deletion', { confirmation: 'DELETE', reason });
}
