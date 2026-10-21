import type { Visit } from './visit';

export type EnquiryStatus = 'new' | 'responded' | 'visit_scheduled' | 'negotiating' | 'closed';
export type PreferredContact = 'phone' | 'whatsapp' | 'email';
export type InterestType = 'schedule_visit' | 'price_negotiation' | 'more_details';
export type PreferredVisitTime = 'tomorrow_morning' | 'tomorrow_afternoon' | 'this_weekend_morning' | 'this_weekend_afternoon' | 'custom';

/** Sales deal linked to an enquiry (salesDeals schema, returned inside the enriched enquiry). */
export interface LinkedDeal {
  _id: string;
  referenceId?: string;
  stage?: string;
  financials?: { offeredPrice?: number; agreedPrice?: number; tokenAmount?: number; tokenPaid?: boolean; paymentType?: 'full' | 'stage' | null; totalPaid?: number };
  propertySnapshot?: { title?: string; price?: number; type?: string; location?: string };
  closedAt?: string;
  updatedAt?: string;
  createdAt?: string;
}

/** `GET /api/v1/me/buy-enquiries` items — buyEnquiries/service.js `enrich()`. */
export interface BuyEnquiry {
  _id: string;
  referenceId: string;
  buyerId: string;
  propertyId: string;
  propertySnapshot?: { title?: string; price?: number; type?: string; location?: string };
  buyerSnapshot?: { name?: string; phone?: string; email?: string; userType?: string };
  enquiryTypes?: string[];
  preferredContact: PreferredContact;
  interestType: InterestType;
  preferredVisitTime?: PreferredVisitTime | null;
  preferredVisitDate?: string | null;
  preferredVisitTimeSlot?: string | null;
  additionalMessage?: string | null;
  status: EnquiryStatus;
  customerStage?: string | null;
  customerStageLabel?: string | null;
  visits?: Visit[];
  deal?: LinkedDeal | null;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** `GET /me/deals` row. Progress and labels come from the API, shared with the customer app. */
export interface CustomerDeal {
  side: 'buyer' | 'seller';
  id: string;
  title: string;
  price: number | null;
  stage: string;
  stageLabel: string;
  progressPercent: number;
  enquiryId: string | null;
  sellRequestId: string | null;
  updatedAt: string | null;
}

export interface CreateEnquiryPayload {
  propertyId: string;
  preferredContact: PreferredContact;
  interestType: InterestType;
  preferredVisitTime?: PreferredVisitTime | null;
  preferredVisitDate?: string | null;
  preferredVisitTimeSlot?: string | null;
  additionalMessage?: string | null;
}
