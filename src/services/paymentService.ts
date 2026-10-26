import { apiGet, apiSend } from './api';

export interface TokenPayment {
  _id: string;
  dealId?: string;
  amount: number;
  status: string;
  method: string;
}

/** POST /payments/token — manual escrow record (bank, UPI, cheque, or cash). */
export function createTokenPayment(body: {
  dealId: string;
  amount: number;
  method: 'bank' | 'upi' | 'cheque' | 'cash';
  transactionReference?: string;
  notes?: string;
}) {
  return apiSend<TokenPayment>('POST', '/payments/token', { type: 'token', currency: 'INR', ...body });
}

/** GET /me/payments */
export function listMyPayments(signal?: AbortSignal) {
  return apiGet<TokenPayment[]>('/me/payments', { limit: 50 }, signal);
}

/** POST /payments/:paymentId/cancel */
export function cancelTokenPayment(paymentId: string) {
  return apiSend<TokenPayment>('POST', `/payments/${paymentId}/cancel`);
}
