import type { Property } from './property';

export type SellRequestStatus =
  | 'draft' | 'new' | 'under_review' | 'accepted' | 'approved' | 'active'
  | 'negotiating' | 'paused' | 'sold' | 'rejected' | 'changes_requested';

export interface SellAddress {
  street?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
}

export interface SellSpecifications {
  subType?: string;
  title?: string;
  bhk?: string;
  builtUpArea?: number | null;
  plotArea?: number | null;
  area?: number | null;
  carpetArea?: number | null;
  floor?: string | number | null;
  totalFloors?: number | null;
  unitNo?: string;
  propertyAge?: string;
  facing?: string;
  furnishing?: string;
  parking?: number | null;
  parkingType?: string | null;
  [key: string]: unknown;
}

/** `GET /api/v1/me/sell-requests` item (sellRequests/schema.js + enrichSellRequest). */
export interface SellRequest {
  _id: string;
  referenceId: string;
  sellerId: string;
  propertyTitle?: string;
  propertyType?: string;
  askingPrice?: number;
  negotiable?: boolean;
  address?: SellAddress;
  ownershipType?: string;
  possessionStatus?: string;
  photos?: string[];
  photosCount?: number;
  completenessPercent?: number;
  description?: string;
  amenities?: string[];
  specifications?: SellSpecifications;
  status: SellRequestStatus;
  isDraft?: boolean;
  draftStep?: number;
  rejectionReason?: string;
  changeRequests?: string[];
  metrics?: { views?: number; enquiryCount?: number; visitCount?: number; saveCount?: number };
  sale?: { salePrice?: number; saleDate?: string; buyerName?: string };
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Body for `POST /sell-requests`, `/sell-requests/drafts` and `PATCH /me/sell-requests/:id`. */
export interface SellRequestPayload {
  propertyType?: string;
  propertyTitle?: string;
  askingPrice?: number;
  negotiable?: boolean;
  address?: SellAddress;
  specifications?: SellSpecifications;
  amenities?: string[];
  ownershipType?: string;
  photos?: string[];
  draftStep?: number;
}

export interface Acquisition {
  _id: string;
  referenceId?: string;
  stage?: string;
  builtgloryOffer?: number;
  agreedPrice?: number;
  negotiation?: { status?: string; deadline?: string; counterAmount?: number; sellerDecision?: { decision?: string; counterAmount?: number; notes?: string } };
  documentation?: Record<string, unknown>;
  token?: { amount?: number; paid?: boolean };
  payout?: { completed?: boolean };
  updatedAt?: string;
  createdAt?: string;
}

export interface SellerOffer {
  amount: number;
  status: string;
  expiresAt: string | null;
  counterAmount: number | null;
  notes: string | null;
}

export interface PayoutItem {
  key: 'token' | 'balance';
  label: string;
  amount: number;
  dueLabel: string;
  status: string;
}

export type RegistrationAppointment = string | { date?: string; time?: string; office?: string; address?: string; location?: string; [key: string]: unknown } | null;

/** `GET /api/v1/me/sell-requests/:id/activity` — sellRequests/service.js `sellerActivity()`. */
export interface SellerActivity {
  sellRequest: SellRequest;
  acquisition: Acquisition | null;
  property: Property | null;
  offer: SellerOffer | null;
  enquiries: Array<{ _id: string; referenceId?: string; status?: string; submittedAt?: string }>;
  visits: Array<{ _id: string; referenceId?: string; visitDate?: string; visitTime?: string; status?: string }>;
  messages: Array<{ text?: string; createdAt?: string; [key: string]: unknown }>;
  payoutSchedule: PayoutItem[];
  registration: { appointment: RegistrationAppointment; status: string; checklist: string[] };
  metrics: { enquiryCount: number; visitCount: number; chatCount: number; payoutCount: number };
}

/** `POST /me/sell-requests/:id/valuation-estimate`. */
export interface MarketEstimate {
  sellRequestId: string;
  source: 'comparables' | 'baseline';
  confidence: string;
  estimatedPrice: number;
  low: number;
  high: number;
  pricePerSqft: number;
  area: number;
  comparableCount: number;
  basis: string;
  askingPriceDeltaPercent: number | null;
}
