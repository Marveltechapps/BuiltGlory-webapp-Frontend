// Maps backend workflow state onto the step pipelines drawn in the design.
// Enquiry: buyEnquiries.status + linked visits + linked salesDeal.stage.
// Listing: sellRequests.status + acquisition.stage (from /me/sell-requests/:id/activity).
import type { BuyEnquiry } from '../types/enquiry';
import type { SellRequest, SellerActivity } from '../types/sellRequest';
import type { Visit } from '../types/visit';
import { dateTime, shortDate } from './format';

export const ENQ_STEPS = [
  'Enquiry Submitted', 'Verification Call', 'Visit Scheduled', 'Deal Confirmed', 'Documents Shared',
  'KYC Verified', 'Token Payment', 'Payment Method', 'Registration', 'Completed',
];

export const activeVisits = (visits: Visit[] = []) => visits.filter((v) => !['cancelled', 'missed'].includes(v.status));

export const nextVisit = (e: BuyEnquiry) => {
  const list = activeVisits(e.visits).filter((v) => v.status !== 'completed');
  return [...list].sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime())[0];
};

export type EnquiryGroup = 'active' | 'completed' | 'cancelled';

export const enquiryGroup = (e: BuyEnquiry): EnquiryGroup => {
  if (e.deal?.stage === 'closed') return 'completed';
  if (e.status === 'closed') return e.deal ? 'completed' : 'cancelled';
  return 'active';
};

/** Index of the step in progress (ENQ_STEPS.length when everything is done). */
export const enquiryStepIndex = (e: BuyEnquiry, kycVerified: boolean) => {
  const stage = e.deal?.stage;
  if (enquiryGroup(e) === 'completed') return ENQ_STEPS.length;
  if (stage === 'documentation') return 8;
  if (stage === 'full_payment' || stage === 'stage_payment' || stage === 'interior_design') return 7;
  if (stage === 'token_payment') return kycVerified ? 6 : 5;
  if (stage === 'negotiation' || stage === 're_engagement' || e.status === 'negotiating') return 3;
  if (activeVisits(e.visits).length || e.status === 'visit_scheduled' || e.status === 'responded' || stage === 'active_leads' || stage === 'site_visits') return 2;
  return 1;
};

export const enquiryStepNotes = (e: BuyEnquiry): Record<number, { at?: string; note?: string }> => {
  const v = nextVisit(e);
  return {
    0: { at: dateTime(e.submittedAt || e.createdAt) },
    1: e.status !== 'new' ? { note: 'Advisor confirmed your interest' } : {},
    2: v ? { at: `${shortDate(v.visitDate)} · ${v.visitTime ?? ''}`.trim() } : {},
  };
};

export const enquiryBadge = (e: BuyEnquiry): { label: string; tone: 'brand' | 'amber' | 'green' | 'rose' } => {
  const g = enquiryGroup(e);
  if (g === 'completed') return { label: 'completed', tone: 'green' };
  if (g === 'cancelled') return { label: 'cancelled', tone: 'rose' };
  if (e.deal && e.customerStageLabel) return { label: e.customerStageLabel.toLowerCase(), tone: 'brand' };
  if (e.status === 'visit_scheduled' || activeVisits(e.visits).length) return { label: 'visit scheduled', tone: 'brand' };
  if (e.status === 'new') return { label: 'awaiting', tone: 'amber' };
  return { label: e.status.replace(/_/g, ' '), tone: 'brand' };
};

export const enquiryNote = (e: BuyEnquiry) => {
  const g = enquiryGroup(e);
  if (g === 'completed') return 'Deal completed';
  if (g === 'cancelled') return 'Enquiry cancelled';
  if (e.deal && e.customerStageLabel) return `Deal stage: ${e.customerStageLabel}`;
  const v = nextVisit(e);
  if (v) return `Visit on ${shortDate(v.visitDate)}${v.visitTime ? ` ${v.visitTime}` : ''}`;
  if (e.status === 'new') return 'Awaiting callback from advisor';
  if (e.status === 'responded') return 'Advisor responded to your enquiry';
  return 'Negotiation in progress';
};

export const LISTING_STEPS: Array<{ t: string; note: string }> = [
  { t: 'Submitted', note: 'Listing details received' },
  { t: 'Verification Call', note: 'Advisor confirms your listing' },
  { t: 'Document Verification', note: 'Ownership documents checked' },
  { t: 'Site Inspection', note: 'Inspected by field team' },
  { t: 'Legal Verification', note: 'Title & encumbrance checks' },
  { t: 'Offer Preparation', note: 'Builtglory prepares your offer' },
  { t: 'Offer Sent', note: 'Review & respond to the offer' },
  { t: 'Negotiation', note: 'Counter-offers, if any' },
  { t: 'Deal Confirmation', note: 'Both parties confirm terms' },
  { t: 'Term Sheet', note: 'Binding term sheet generated' },
  { t: 'Registration', note: 'Document checks & registration' },
  { t: 'Sale Complete', note: 'Funds released, handover done' },
];

const sellerDecision = (a?: SellerActivity | null) => a?.acquisition?.negotiation?.sellerDecision?.decision;

export const offerAccepted = (a?: SellerActivity | null) =>
  Boolean(a && (sellerDecision(a) === 'accepted' || a.acquisition?.negotiation?.status === 'seller_accepted'
    || ['token_to_seller', 'documentation', 'seller_payout', 'acquired'].includes(a.acquisition?.stage ?? '')));

export const listingSold = (sr: SellRequest, a?: SellerActivity | null) => sr.status === 'sold' || a?.acquisition?.stage === 'acquired';

/** Index of the listing step in progress (LISTING_STEPS.length when sold). */
export const listingStepIndex = (sr: SellRequest, a?: SellerActivity | null) => {
  const stage = a?.acquisition?.stage;
  if (listingSold(sr, a)) return LISTING_STEPS.length;
  if (sr.status === 'draft') return 0;
  if (stage === 'seller_payout') return 10;
  if (stage === 'documentation') return 9;
  if (stage === 'token_to_seller' || offerAccepted(a)) return 8;
  if (stage === 'negotiation') return sellerDecision(a) === 'countered' ? 7 : a?.offer ? 6 : 5;
  if (stage === 'valuation') return a?.offer ? 6 : 5;
  if (stage === 'site_inspection') return 3;
  if (sr.status === 'under_review' || stage === 'pending_review') return 2;
  if (['accepted', 'approved', 'active', 'negotiating'].includes(sr.status)) return 4;
  return 1;
};

export type ListingGroup = 'active' | 'sold' | 'withdrawn' | 'draft';
export const listingGroup = (sr: SellRequest): ListingGroup => {
  if (sr.status === 'sold') return 'sold';
  if (sr.status === 'paused' || sr.status === 'rejected') return 'withdrawn';
  if (sr.status === 'draft') return 'draft';
  return 'active';
};

/** Seller-side deal screen for a listing whose offer was accepted. */
export const sellerDealRoute = (id: string, a: SellerActivity) => {
  const stage = a.acquisition?.stage;
  if (listingSold(a.sellRequest, a)) return { href: `/listings/${id}/sold`, badge: 'Completed' };
  if (stage === 'seller_payout') return { href: `/listings/${id}/registration`, badge: 'Registration' };
  if (stage === 'documentation') return { href: `/listings/${id}/payment-schedule`, badge: 'Payment Schedule' };
  return { href: `/listings/${id}/deal-confirmed`, badge: 'Deal Confirmed' };
};
