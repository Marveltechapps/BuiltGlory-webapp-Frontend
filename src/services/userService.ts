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

/** POST /me/kyc — attach uploaded KYC files and mark the profile pending review. */
export function submitKyc(documents: Array<{ documentId: string; type: 'pan' | 'aadhaar' | 'passport' | 'oci_card' | 'visa' | 'address_proof' | 'other' }>) {
  return apiSend<User>('POST', '/me/kyc', { documents });
}

/** GET /me/account-deletion */
export function getAccountDeletion(signal?: AbortSignal) {
  return apiGet<AccountDeletionStatus>('/me/account-deletion', undefined, signal);
}

/** POST /me/account-deletion — confirmation must be the literal "DELETE". */
export function requestAccountDeletion(reason: string | null) {
  return apiSend<AccountDeletionStatus>('POST', '/me/account-deletion', { confirmation: 'DELETE', reason });
}

/** DELETE /me/account-deletion — cancel a request that is still inside the grace window. */
export function cancelAccountDeletion() {
  return apiSend<AccountDeletionStatus>('DELETE', '/me/account-deletion');
}
