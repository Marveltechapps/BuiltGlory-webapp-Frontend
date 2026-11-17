// Maps backend workflow state onto the step pipelines drawn in the design.
// Enquiry: buyEnquiries.status + linked visits + linked salesDeal.stage.
// Listing: sellRequests.status + acquisition.stage (from /me/sell-requests/:id/activity).
import type { BuyEnquiry } from '../types/enquiry';
import type { SellRequest, SellerActivity } from '../types/sellRequest';
import type { Visit } from '../types/visit';
import { dateTime, shortDate } from './format';

import type { Tone } from '../components/ui/Tag';

/** The design's 8-step buyer pipeline. `act` is the buyer's action while the step is current. */
export interface EnqStep { t: string; note: string; act: string | null; icon: string; badge: string; tone: Tone }
export const ENQ_STEPS: EnqStep[] = [
  { t: 'Enquiry Submitted', note: 'Advisor will call you to verify', act: 'Request Callback', icon: 'phone-call', badge: 'submitted', tone: 'amber' },
  { t: 'Verification Call', note: 'Advisor confirmed your interest', act: 'Schedule Visit', icon: 'calendar', badge: 'verified', tone: 'brand' },
  { t: 'Visit Scheduled', note: 'Site visit with the owner', act: 'Confirm Deal', icon: 'handshake', badge: 'visit scheduled', tone: 'brand' },
  { t: 'Deal Confirmed', note: 'Price agreed with the seller', act: 'Complete KYC', icon: 'shield-check', badge: 'documents', tone: 'brand' },
  { t: 'KYC Verified', note: 'Aadhaar & PAN verified', act: 'Pay Token Amount', icon: 'wallet', badge: 'kyc verified', tone: 'green' },
  { t: 'Token Payment', note: 'Booking amount to block the property', act: 'View Appointment', icon: 'landmark', badge: 'token paid', tone: 'green' },
  { t: 'Registration', note: 'Sub-registrar appointment & sale deed', act: 'Mark as Registered', icon: 'file-text', badge: 'registration', tone: 'brand' },
  { t: 'Completed', note: 'Property handed over', act: null, icon: 'circle-check', badge: 'completed', tone: 'green' },
];
export const ENQ_LAST = ENQ_STEPS.length - 1;

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

export const tokenPaid = (e: BuyEnquiry) => Boolean(e.deal?.financials?.tokenPaid);
export const registrationOf = (e: BuyEnquiry) => e.deal?.documentation?.workflow?.registration ?? null;

/** Index of the step in progress (ENQ_LAST once the deal is closed). Backend state drives it; buyer actions only send requests. */
export const enquiryStepIndex = (e: BuyEnquiry, kycVerified: boolean) => {
  const stage = e.deal?.stage;
  if (enquiryGroup(e) === 'completed') return ENQ_LAST;
  if (stage === 'documentation') return 6;
  if (tokenPaid(e) || stage === 'full_payment' || stage === 'stage_payment' || stage === 'interior_design') return 5;
  if (stage === 'token_payment') return kycVerified ? 4 : 3;
  if (stage === 'negotiation' || stage === 're_engagement' || e.status === 'negotiating') return 3;
  if (activeVisits(e.visits).length || e.status === 'visit_scheduled' || stage === 'site_visits') return 2;
  if (e.status === 'responded' || stage === 'active_leads') return 1;
  return 0;
};

/** Timestamp / detail lines shown under finished steps. */
export const enquiryStepNotes = (e: BuyEnquiry): Record<number, { at?: string; note?: string }> => {
  const v = nextVisit(e) ?? activeVisits(e.visits).find((x) => x.status === 'completed');
  const reg = registrationOf(e);
  const agreed = e.deal?.financials?.agreedPrice ?? e.deal?.financials?.offeredPrice;
  return {
    0: { at: dateTime(e.submittedAt || e.createdAt) },
    2: v ? { at: `${shortDate(v.visitDate)} · ${v.visitTime ?? ''}`.trim() } : {},
    3: agreed ? { note: `Agreed at ₹ ${agreed.toLocaleString('en-IN')}` } : {},
    5: e.deal?.financials?.tokenAmount && tokenPaid(e) ? { note: `₹ ${e.deal.financials.tokenAmount.toLocaleString('en-IN')} paid` } : {},
    6: reg?.date ? { note: [reg.office, reg.sub].filter(Boolean).join(' · ') || undefined, at: shortDate(reg.date) } : {},
  };
};

export const enquiryBadge = (e: BuyEnquiry, kycVerified = false): { label: string; tone: Tone } => {
  const g = enquiryGroup(e);
  if (g === 'completed') return { label: 'completed', tone: 'green' };
  if (g === 'cancelled') return { label: 'cancelled', tone: 'rose' };
  const s = ENQ_STEPS[enquiryStepIndex(e, kycVerified)]!;
  return { label: s.badge, tone: s.tone };
};

export const enquiryNote = (e: BuyEnquiry, kycVerified = false) => {
  const g = enquiryGroup(e);
  if (g === 'completed') return 'Enquiry completed — property registered';
  if (g === 'cancelled') return 'Enquiry cancelled';
  const i = enquiryStepIndex(e, kycVerified);
  const v = nextVisit(e);
  if (i === 2 && v) return `Visit on ${shortDate(v.visitDate)}${v.visitTime ? ` ${v.visitTime}` : ''}`;
  if (i === 0) return 'Awaiting callback from advisor';
  return `Next: ${ENQ_STEPS[i]?.act ?? ENQ_STEPS[i]?.t}`;
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

/** My Listings tabs: `upcoming` = submitted and still in verification, `active` = live on the marketplace. */
export type ListingGroup = 'active' | 'upcoming' | 'sold' | 'withdrawn' | 'draft';
export const listingGroup = (sr: SellRequest): ListingGroup => {
  if (sr.status === 'sold') return 'sold';
  if (sr.status === 'paused' || sr.status === 'rejected') return 'withdrawn';
  if (sr.status === 'draft') return 'draft';
  if (sr.status === 'active' || sr.status === 'negotiating') return 'active';
  return 'upcoming';
};

/** A draft the seller deleted from My Listings (withdrawn before it was ever submitted). */
export const isDiscardedDraft = (sr: SellRequest) => sr.status === 'paused' && !sr.submittedAt;

/** Seller-side deal screen for a listing whose offer was accepted. */
export const sellerDealRoute = (id: string, a: SellerActivity) => {
  const stage = a.acquisition?.stage;
  if (listingSold(a.sellRequest, a)) return { href: `/listings/${id}/sold`, badge: 'Completed' };
  if (stage === 'seller_payout') return { href: `/listings/${id}/registration`, badge: 'Registration' };
  if (stage === 'documentation') return { href: `/listings/${id}/payment-schedule`, badge: 'Payment Schedule' };
  return { href: `/listings/${id}/deal-confirmed`, badge: 'Deal Confirmed' };
};
