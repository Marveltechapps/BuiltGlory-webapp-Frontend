'use client';

import { useApiQuery } from './useApiQuery';
import { getSellRequest, getSellerActivity, listMySellRequests } from '../services/sellRequestService';
import type { SellerActivity } from '../types/sellRequest';

export function useMySellRequests(enabled: boolean) {
  return useApiQuery((signal) => listMySellRequests(signal), [], enabled);
}

export function useSellRequest(id: string, enabled: boolean) {
  return useApiQuery((signal) => getSellRequest(id, signal), [id], enabled);
}

/** Offer, payout schedule, registration and metrics for one listing. */
export function useSellerActivity(id: string, enabled: boolean) {
  return useApiQuery<SellerActivity>((signal) => getSellerActivity(id, signal), [id], enabled);
}
