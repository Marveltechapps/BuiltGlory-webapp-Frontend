import { apiSend } from './api';
import { getDeviceId, getRefreshToken } from '../lib/authStorage';
import type { AuthSession, OtpSendResult, PhoneVerifiedResult } from '../types/user';

type OtpPurpose = 'login' | 'change_phone';

/** POST /auth/customer/otp/send — body: countryCode, phone (10 digits), deviceId, purpose. */
export function sendCustomerOtp(phone: string, purpose: OtpPurpose = 'login') {
  return apiSend<OtpSendResult>('POST', '/auth/customer/otp/send', { countryCode: '+91', phone, deviceId: getDeviceId(), purpose });
}

/** POST /auth/customer/otp/verify — 6-digit OTP. Login returns a session; change_phone returns `{ verified }`. */
export function verifyCustomerOtp(phone: string, otp: string, requestId?: string | null) {
  return apiSend<AuthSession>('POST', '/auth/customer/otp/verify', { countryCode: '+91', phone, otp, requestId: requestId ?? null, purpose: 'login' });
}

export function verifyPhoneChangeOtp(phone: string, otp: string, requestId?: string | null) {
  return apiSend<PhoneVerifiedResult>('POST', '/auth/customer/otp/verify', { countryCode: '+91', phone, otp, requestId: requestId ?? null, purpose: 'change_phone' });
}

/** POST /auth/customer/password/login — phone or email plus password. */
export function loginWithPassword(identifier: string, password: string) {
  return apiSend<AuthSession>('POST', '/auth/customer/password/login', { identifier, password });
}

/** PUT /me/password — set a password on the signed-in account. */
export function setPassword(password: string) {
  return apiSend<{ updated: boolean }>('PUT', '/me/password', { password });
}

/** POST /auth/customer/password/forgot — sends a reset OTP to an account that already has a password. */
export function forgotPassword(phone: string) {
  return apiSend<OtpSendResult>('POST', '/auth/customer/password/forgot', { countryCode: '+91', phone, deviceId: getDeviceId() });
}

/** POST /auth/customer/password/reset */
export function resetPassword(phone: string, otp: string, newPassword: string, requestId?: string | null) {
  return apiSend<{ reset: boolean }>('POST', '/auth/customer/password/reset', { countryCode: '+91', phone, otp, requestId: requestId ?? null, newPassword });
}

/** POST /auth/logout — revokes the refresh token and blacklists the access token. */
export async function logout() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;
  await apiSend<{ revoked: boolean }>('POST', '/auth/logout', { refreshToken });
}
