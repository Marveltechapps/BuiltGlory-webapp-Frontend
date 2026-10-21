'use client';

import { useApiQuery } from './useApiQuery';
import { getEnquiry, listMyEnquiries } from '../services/enquiryService';
import type { BuyEnquiry } from '../types/enquiry';

export function useMyEnquiries(enabled: boolean, propertyId?: string) {
  return useApiQuery((signal) => listMyEnquiries(propertyId ? { propertyId } : {}, signal), [propertyId], enabled);
}

export function useEnquiry(id: string, enabled: boolean) {
  return useApiQuery<BuyEnquiry>((signal) => getEnquiry(id, signal), [id], enabled);
}
