'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { LogoMark } from '../ui/LogoMark';
import { Button } from '../ui/Button';
import { Card, Empty } from '../ui/Card';
import { PageWrap, SectionHead } from '../ui/PageWrap';
import { ThumbFill, Wave, gradFor } from '../ui/Photo';
import { FieldRow, FormError, TextInput } from '../ui/FormFields';
import { PageError, PageLoading } from '../ui/StateViews';
import { useSellerActivity } from '../../hooks/useSellRequests';
import { useSellerRealtime } from '../../lib/realtime';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useBack } from '../../hooks/useNavigation';
import { useCountdown } from '../../hooks/useCountdown';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { confirmPayoutSchedule, confirmRegistration, decideOffer, getMarketEstimate, listSellerDocuments, sendSellerMessage } from '../../services/sellRequestService';
import { documentReadUrl } from '../../services/documentService';
import { updateMe } from '../../services/userService';
import { errorMessage } from '../../services/api';
import { cx, formatINR, formatRupees, longDate } from '../../lib/format';
import { LISTING_STEPS, listingSold, listingStepIndex, offerAccepted } from '../../lib/pipelines';
import type { RegistrationAppointment, SellerActivity } from '../../types/sellRequest';

function useListing(id: string) {
  const back = useBack(`/listings/${id}`);
  const q = useSellerActivity(id, true);
  useSellerRealtime(id, q.setData);
  const gate = q.loading && !q.data ? <PageLoading label="Loading listing" /> : q.error || !q.data ? <PageError message={q.error ?? 'Listing not found.'} onRetry={q.reload} /> : null;
  return { a: q.data, gate, back, reload: q.reload };
}

const title = (a: SellerActivity) => a.sellRequest.propertyTitle || 'My listing';

function NoOffer({ id }: { id: string }) {
  const router = useRouter();
  return (
    <PageWrap className="!max-w-[760px]">
      <Empty icon="handshake" title="No offer yet" sub="Builtglory prepares an offer after inspection and legal verification. We'll notify you as soon as it's ready."
        action={<Button variant="outline" onClick={() => router.push(`/listings/${id}`)}>View listing status</Button>} />
    </PageWrap>
  );
}

// ── LISTING STATUS (12-step pipeline) ────────────────────────
export function ListingStatus({ id }: { id: string }) {
  const router = useRouter();
  const back = useBack('/listings');
  const q = useSellerActivity(id, true);
  if (q.loading && !q.data) return <PageLoading label="Loading listing" />;
  if (q.error || !q.data) return <PageError message={q.error ?? 'Listing not found.'} onRetry={q.reload} />;
  const a = q.data;
  const l = a.sellRequest;
  const curIdx = listingStepIndex(l, a);
  const allDone = curIdx >= LISTING_STEPS.length;
  const cur = LISTING_STEPS[Math.min(curIdx, LISTING_STEPS.length - 1)]!;
  const hasOffer = Boolean(a.offer);
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900 mb-1"><Icon name="arrow-left" size={18} />Listing Status</button>
      <p className="text-[13px] text-ink-500 mb-5 ml-7">{LISTING_STEPS.length}-step pipeline</p>
      <Card className="p-4 flex items-center gap-4">
        <div className={cx('w-16 h-16 rounded-2xl bg-gradient-to-br grid place-items-start p-2 shrink-0 relative overflow-hidden group', gradFor(l._id))}><ThumbFill src={l.photos?.[0]} />
          <span className="relative text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white text-emerald-600 capitalize">{l.status.replace(/_/g, ' ')}</span>
          <Wave />
        </div>
        <div><h3 className="text-[16px] font-bold text-ink-900">{title(a)}</h3><div className="text-[13px] text-ink-500">{[l.address?.locality, l.address?.city].filter(Boolean).join(', ') || '—'}</div><div className="text-[15px] font-extrabold text-brand-600 mt-0.5">{l.askingPrice ? formatINR(l.askingPrice) : '—'}</div></div>
      </Card>
      <div className="grid grid-cols-3 gap-3 mt-3">
        {[[(l.metrics?.views ?? 0).toLocaleString(), 'Views'], [String(a.metrics.enquiryCount), 'Enquiries'], [allDone ? 'Done' : `Step ${curIdx + 1}`, `of ${LISTING_STEPS.length}`]].map(([v, s]) => (
          <Card key={s} className="p-4 text-center"><div className="text-[20px] font-extrabold text-ink-900">{v}</div><div className="text-[12px] text-ink-400">{s}</div></Card>
        ))}
      </div>
      {l.status === 'rejected' || l.status === 'changes_requested' ? (
        <Card className="flex items-center gap-3 p-4 mt-3 !border-amber-200 bg-amber-50">
          <div className="w-11 h-11 rounded-full bg-amber-500 grid place-items-center shrink-0"><Icon name="triangle-alert" size={20} color="#fff" /></div>
          <div><div className="text-[13.5px] font-bold text-ink-900">{l.status === 'rejected' ? 'Listing rejected' : 'Changes requested'}</div><div className="text-[12.5px] text-amber-700">{l.rejectionReason || l.changeRequests?.join(' · ') || 'Our team will contact you with details.'}</div></div>
        </Card>
      ) : (
        <Card className="flex items-center gap-3 p-4 mt-3">
          <div className="w-11 h-11 rounded-full bg-brand-600 grid place-items-center shrink-0"><Icon name="zap" size={20} color="#fff" /></div>
          <div><div className="text-[13.5px] font-bold text-ink-900">{allDone ? `All ${LISTING_STEPS.length} steps complete` : `Step ${curIdx + 1} of ${LISTING_STEPS.length} · ${cur.t}`}</div><div className="text-[12.5px] text-brand-600">{allDone ? 'Sale complete' : l.status === 'draft' ? 'Draft — submit your listing to start verification' : cur.note}</div></div>
        </Card>
      )}
      <div className="mt-5 space-y-2.5">
        {LISTING_STEPS.map((s, i) => {
          const done = i < curIdx, current = i === curIdx;
          return (
            <div key={s.t} onClick={() => hasOffer && router.push(listingSold(l, a) ? `/listings/${id}/sold` : `/listings/${id}/offer`)} className={cx('flex items-center gap-3 rounded-2xl border p-3.5', hasOffer && 'cursor-pointer', done ? 'bg-emerald-50 border-emerald-100' : current ? 'bg-brand-50 border-brand-200' : 'bg-white border-ink-200 opacity-60')}>
              <div className={cx('w-8 h-8 rounded-full grid place-items-center shrink-0', done ? 'bg-emerald-500' : current ? 'bg-brand-600' : 'bg-ink-200')}><Icon name={done ? 'check' : current ? 'loader' : 'circle'} size={16} color="#fff" /></div>
              <div className="flex-1 min-w-0"><div className={cx('text-[14px] font-bold', done ? 'text-emerald-800' : 'text-ink-900')}>{s.t}</div><div className="text-[12px] text-ink-500">{i === 0 && l.submittedAt ? `${longDate(l.submittedAt)} · ${s.note}` : s.note}</div></div>
              <Icon name="chevron-right" size={16} color="#CBD5E1" />
            </div>
          );
        })}
      </div>
    </PageWrap>
  );
}

// ── BUILTGLORY OFFER ─────────────────────────────────────────
function Box({ v, l }: { v: number; l: string }) {
  return <div className="flex-1 rounded-2xl bg-ink-800 py-3 text-center"><div className="text-[26px] font-extrabold text-white tabular-nums">{String(v).padStart(2, '0')}</div><div className="text-[11px] text-white/50 uppercase tracking-wide">{l}</div></div>;
}

export function OfferView({ id }: { id: string }) {
  const router = useRouter();
  const { a, gate, back } = useListing(id);
  const countdown = useCountdown(a?.offer?.expiresAt);
  const estimate = useApiQuery((signal) => { void signal; return getMarketEstimate(id); }, [id], Boolean(a?.offer));
  if (gate || !a) return gate;
  if (!a.offer) return <NoOffer id={id} />;
  const amount = a.offer.amount;
  const est = estimate.data?.estimatedPrice;
  const delta = est ? Math.round(((amount - est) / est) * 100) : null;
  const accepted = offerAccepted(a);
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900 mb-0.5"><Icon name="arrow-left" size={18} />Builtglory Offer</button>
      <p className="text-[13px] text-ink-500 mb-5 ml-7">{title(a)}</p>
      <Card className="p-6 text-center border-brand-300 ring-1 ring-brand-100">
        <div className="text-[12px] font-semibold text-ink-400 uppercase tracking-wide">Our offer for your property</div>
        <div className="text-[44px] font-extrabold text-brand-600 leading-none mt-3">{formatINR(amount)}</div>
        {delta !== null && est && <div className={cx('inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-full mt-4', delta >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-700 bg-amber-50')}><Icon name="trending-up" size={14} />{Math.abs(delta)}% {delta >= 0 ? 'above' : 'below'} area average ({formatINR(est)})</div>}
      </Card>
      <div className="rounded-3xl bg-ink-900 p-5 mt-4">
        <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wide text-center mb-3">{countdown ? 'Offer expires in' : 'Offer validity'}</div>
        {countdown ? <div className="flex gap-3"><Box v={countdown.h} l="hrs" /><Box v={countdown.m} l="min" /><Box v={countdown.s} l="sec" /></div>
          : <div className="text-center text-[14px] font-semibold text-white/80 py-3">No expiry has been set for this offer</div>}
      </div>
      <div className="rounded-2xl bg-ink-50 p-4 text-[13px] text-ink-600 leading-relaxed mt-4">This offer is based on Builtglory&apos;s AI valuation, recent area transactions and your property&apos;s condition. Accept to move to deal confirmation, or negotiate with a counter offer.</div>
      {accepted ? (
        <Button size="lg" className="w-full mt-5" icon="handshake" onClick={() => router.push(`/listings/${id}/deal-confirmed`)}>Offer accepted · View deal</Button>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-5">
          <Button variant="outline" size="lg" onClick={() => router.push(`/listings/${id}/counter`)}>Negotiate</Button>
          <Button size="lg" className="!bg-emerald-600 hover:!bg-emerald-700" onClick={() => router.push(`/listings/${id}/accept-offer`)}>Accept Offer</Button>
        </div>
      )}
    </PageWrap>
  );
}

// ── ACCEPT OFFER ─────────────────────────────────────────────
export function AcceptOffer({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { a, gate, back } = useListing(id);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (gate || !a) return gate;
  if (!a.offer) return <NoOffer id={id} />;
  const amount = formatINR(a.offer.amount);
  const accept = async () => {
    setBusy(true);
    setErr(null);
    try {
      await decideOffer(id, 'accepted');
      toast('Offer accepted');
      router.push(`/listings/${id}/deal-confirmed`);
    } catch (e) { setErr(errorMessage(e, 'Could not accept the offer.')); setBusy(false); }
  };
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900 mb-5"><Icon name="arrow-left" size={18} />Accept Offer</button>
      <Card className="p-6 text-center">
        <div className="text-[13px] text-ink-500">You are accepting Builtglory&apos;s offer of</div>
        <div className="text-[32px] font-extrabold text-brand-600 mt-2">{amount}</div>
      </Card>
      <div className="rounded-2xl bg-ink-50 p-4 text-[13px] text-ink-600 leading-relaxed mt-4">Once you confirm, we&apos;ll generate a term sheet and move to deal confirmation. This is binding subject to final document checks.</div>
      <Button size="lg" className="w-full mt-5" onClick={() => setSheet(true)}>Confirm & Accept</Button>
      {sheet && (
        <div className="fixed inset-0 z-[95] grid place-items-center p-4" onClick={() => !busy && setSheet(false)}>
          <div className="absolute inset-0 bg-ink-900/45 fade-in"></div>
          <div role="dialog" aria-modal="true" className="relative bg-white rounded-3xl w-full max-w-[420px] p-6 shadow-2xl" style={{ animation: 'fadeIn .22s ease-out' }} onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 grid place-items-center mx-auto"><Icon name="handshake" size={26} color="#059669" /></div>
            <h2 className="text-[19px] font-extrabold tracking-tight text-ink-900 text-center mt-4">Confirm acceptance?</h2>
            <p className="text-[13.5px] text-ink-500 text-center mt-1.5">You&apos;re accepting {amount} for <b className="text-ink-800">{title(a)}</b>. We&apos;ll proceed to deal confirmation.</p>
            <FormError message={err} />
            <Button size="lg" className="w-full mt-5" loading={busy} onClick={() => void accept()}>Yes, Accept Offer</Button>
            <button type="button" disabled={busy} onClick={() => setSheet(false)} className="w-full h-12 rounded-xl bg-ink-50 text-[14px] font-semibold text-ink-700 mt-2.5 hover:bg-ink-100 transition">Go Back</button>
          </div>
        </div>
      )}
    </PageWrap>
  );
}

// ── COUNTER OFFER ────────────────────────────────────────────
export function CounterOffer({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { a, gate, back } = useListing(id);
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (gate || !a) return gate;
  if (!a.offer) return <NoOffer id={id} />;
  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await decideOffer(id, 'countered', Number(amt), note.trim() || undefined);
      toast('Counter offer sent');
      router.push(`/listings/${id}/counter-sent`);
    } catch (e) { setErr(errorMessage(e, 'Could not send your counter offer.')); setBusy(false); }
  };
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900 mb-5"><Icon name="arrow-left" size={18} />Send Counter Offer</button>
      <div className="flex items-center justify-between rounded-xl bg-ink-50 px-4 h-12 mb-5"><span className="text-[13px] font-semibold text-ink-500">Builtglory&apos;s offer</span><span className="text-[15px] font-extrabold text-ink-900">{formatINR(a.offer.amount)}</span></div>
      <FieldRow label="Your counter offer (₹)" required>
        <TextInput icon="badge-indian-rupee" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 8800000" />
        {amt && <div className="text-[12px] text-brand-600 font-semibold mt-1.5">{formatRupees(Number(amt))}</div>}
      </FieldRow>
      <FieldRow label="Notes (optional)">
        <textarea rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note to support your counter offer…" className="w-full p-3.5 bg-white border border-ink-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-[14px] text-ink-900 resize-none" />
      </FieldRow>
      <FormError message={err} />
      <Button size="lg" className="w-full mt-3" loading={busy} disabled={!amt || Number(amt) <= 0} onClick={() => void submit()}>Submit Counter Offer</Button>
    </PageWrap>
  );
}

// ── COUNTER SENT ─────────────────────────────────────────────
export function CounterSent({ id }: { id: string }) {
  const router = useRouter();
  const { a, gate } = useListing(id);
  if (gate || !a) return gate;
  const counter = a.offer?.counterAmount ? formatRupees(a.offer.counterAmount) : '—';
  return (
    <PageWrap className="!max-w-[520px]">
      <SectionHead title="Counter Offer Sent" />
      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4">
        <div className="w-9 h-9 rounded-full bg-amber-100 grid place-items-center shrink-0"><Icon name="loader" size={18} color="#D97706" /></div>
        <div><div className="text-[14px] font-bold text-amber-700">Negotiation in progress</div><div className="text-[12.5px] text-amber-600">Your counter of {counter} is under review.</div></div>
      </div>
      <Card className="divide-y divide-ink-100 mt-4">
        <div className="flex items-center justify-between p-4"><span className="text-[13px] text-ink-500">Builtglory offer</span><span className="text-[14px] font-bold text-ink-900">{a.offer ? formatINR(a.offer.amount) : '—'}</span></div>
        <div className="flex items-center justify-between p-4"><span className="text-[13px] text-ink-500">Your counter</span><span className="text-[14px] font-bold text-brand-600">{counter}</span></div>
      </Card>
      <Button variant="outline" size="lg" className="w-full mt-4" onClick={() => router.push('/listings')}>Back to My Listings</Button>
    </PageWrap>
  );
}

// ── DEAL CONFIRMED + BANK DETAILS ────────────────────────────
interface Bank { holder: string; bank: string; acc: string; acc2: string; ifsc: string; branch: string; upi: string }
const BANK_FIELDS: Array<[keyof Bank, string, boolean, string]> = [
  ['holder', 'Account Holder Name', true, 'As per bank records'], ['bank', 'Bank Name', true, 'e.g. HDFC Bank'],
  ['acc', 'Account Number', true, 'Enter account number'], ['acc2', 'Confirm Account Number', true, 'Re-enter account number'],
  ['ifsc', 'IFSC Code', true, 'e.g. HDFC0001234'], ['branch', 'Branch (optional)', false, 'Branch'], ['upi', 'UPI ID (optional)', false, 'name@bank'],
];

async function openSellerFile(listingId: string, type: 'term_sheet' | 'sale_deed') {
  const docs = await listSellerDocuments(listingId);
  const doc = docs.find((item) => item.type === type && (item.url || item.documentId));
  if (!doc) throw new Error(type === 'term_sheet' ? 'The term sheet is not ready yet.' : 'The sale deed is not ready yet.');
  if (doc.url) { window.open(doc.url, '_blank', 'noopener,noreferrer'); return; }
  const signed = await documentReadUrl(doc.documentId!);
  window.open(signed.readUrl, '_blank', 'noopener,noreferrer');
}

function TermSheet({ id, a, onClose }: { id: string; a: SellerActivity; onClose: () => void }) {
  const { toastError } = useToast();
  const amount = a.offer?.amount ?? 0;
  const token = a.payoutSchedule.find((x) => x.key === 'token');
  const balance = a.payoutSchedule.find((x) => x.key === 'balance');
  const download = () => { void openSellerFile(id, 'term_sheet').catch((e) => toastError(errorMessage(e, 'The term sheet is not ready yet.'), 'download')); };
  return (
    <div className="fixed inset-0 z-[95] flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-900/60 fade-in"></div>
      <div role="dialog" aria-modal="true" className="relative m-auto bg-white rounded-2xl w-full max-w-[520px] max-h-[88vh] flex flex-col shadow-2xl overflow-hidden" style={{ animation: 'fadeIn .2s ease-out' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 h-14 border-b border-ink-100 shrink-0">
          <Icon name="file-text" size={18} color="#E11D48" /><span className="flex-1 text-[14px] font-bold text-ink-900">Term Sheet.pdf</span>
          <button type="button" aria-label="Download" onClick={download} className="w-9 h-9 rounded-full bg-brand-50 grid place-items-center hover:bg-brand-100 transition"><Icon name="download" size={17} color="#1A6FFF" /></button>
          <button type="button" aria-label="Close" onClick={onClose} className="w-9 h-9 rounded-full bg-ink-100 grid place-items-center hover:bg-ink-200 transition"><Icon name="x" size={17} color="#334155" /></button>
        </div>
        <div className="flex-1 overflow-y-auto bg-ink-100 p-5">
          <div className="bg-white rounded-lg shadow-sm mx-auto p-7" style={{ maxWidth: 400 }}>
            <div className="flex items-center gap-2 pb-4 border-b border-ink-100"><LogoMark className="w-8 h-8 rounded-lg" /><div><div className="text-[13px] font-extrabold text-ink-900">Builtglory</div><div className="text-[9px] text-ink-400 uppercase tracking-wide">Term Sheet</div></div></div>
            <div className="text-[15px] font-extrabold text-ink-900 mt-4">Sale Term Sheet</div>
            <div className="text-[10px] text-ink-400">Ref: {a.acquisition?.referenceId || a.sellRequest.referenceId} · {title(a)}</div>
            <div className="space-y-2 mt-4 text-[11px]">
              {[['Property', title(a)], ['Agreed price', amount ? formatINR(amount) : '—'], ['Token amount', token ? formatINR(token.amount) : '—'], ['Balance', balance ? formatINR(balance.amount) : '—'], ['Timeline', '21–30 days'], ['Payment mode', 'Bank transfer (escrow)']].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-dashed border-ink-100 pb-1.5"><span className="text-ink-500">{k}</span><span className="font-bold text-ink-900">{v}</span></div>
              ))}
            </div>
            <div className="h-2"></div>
            {[100, 92, 96, 70].map((w, i) => <div key={i} className="h-2 rounded bg-ink-100 mt-2" style={{ width: `${w}%` }}></div>)}
            <div className="flex justify-between mt-8 pt-4 border-t border-ink-100"><div className="text-[9px] text-ink-400">Seller sign</div><div className="text-[9px] text-ink-400">Builtglory</div></div>
          </div>
        </div>
        <div className="p-4 border-t border-ink-100 shrink-0"><Button size="lg" className="w-full" icon="download" onClick={download}>Download PDF</Button></div>
      </div>
    </div>
  );
}

export function DealConfirmed({ id }: { id: string }) {
  const router = useRouter();
  const { user, setUser } = useSession();
  const { toast } = useToast();
  const { a, gate, back, reload } = useListing(id);
  const [viewer, setViewer] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bd = user?.bankDetails;
  const [b, setB] = useState<Bank>({ holder: bd?.accountHolderName ?? '', bank: bd?.bankName ?? '', acc: '', acc2: '', ifsc: bd?.ifsc ?? '', branch: bd?.branch ?? '', upi: bd?.upiId ?? '' });
  if (gate || !a) return gate;
  if (!a.offer) return <NoOffer id={id} />;
  const confirmed = offerAccepted(a);
  const confirm = async () => {
    setConfirming(true);
    setErr(null);
    try { await decideOffer(id, 'accepted'); toast('Deal confirmed'); reload(); } catch (e) { setErr(errorMessage(e, 'Could not confirm the deal.')); } finally { setConfirming(false); }
  };
  const save = async () => {
    setErr(null);
    const acc = b.acc.replace(/\s/g, '');
    if (!b.holder.trim() || !b.bank.trim() || !acc || !b.ifsc.trim()) { setErr('Fill in all required bank details.'); return; }
    if (!/^\d{6,18}$/.test(acc)) { setErr('Enter a valid account number.'); return; }
    if (acc !== b.acc2.replace(/\s/g, '')) { setErr('Account numbers do not match.'); return; }
    if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(b.ifsc.trim())) { setErr('Enter a valid 11-character IFSC code.'); return; }
    setSaving(true);
    try {
      // The API stores only the last four digits of the account number.
      const updated = await updateMe({ bankDetails: { accountHolderName: b.holder.trim(), bankName: b.bank.trim(), accountNumberLast4: acc.slice(-4), ifsc: b.ifsc.trim().toUpperCase(), branch: b.branch.trim() || null, upiId: b.upi.trim() || null } });
      setUser(updated);
      toast('Bank details saved');
      router.push(`/listings/${id}/payment-schedule`);
    } catch (e) { setErr(errorMessage(e, 'Could not save bank details.')); setSaving(false); }
  };
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900 mb-5"><Icon name="arrow-left" size={18} />Deal Confirmed</button>
      <Card className="p-5 bg-emerald-50/60 border-emerald-200">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-[15px]"><Icon name="circle-check" size={20} color="#059669" />{confirmed ? 'Deal agreed' : 'Offer ready to confirm'}</div>
        <div className="flex items-center justify-between mt-4"><span className="text-[13px] text-ink-500">Final agreed price</span><span className="text-[16px] font-extrabold text-ink-900">{formatINR(a.offer.amount)}</span></div>
        <button type="button" onClick={() => setViewer(true)} className="w-full flex items-center gap-3 bg-white border border-ink-200 rounded-xl p-3.5 mt-3 hover:border-brand-300 transition text-left">
          <Icon name="file-text" size={18} color="#E11D48" /><span className="flex-1 text-[13.5px] font-semibold text-ink-900">Term Sheet.pdf</span><Icon name="eye" size={16} color="#94A3B8" />
        </button>
        <div className="flex items-center justify-between mt-3"><span className="text-[13px] text-ink-500">Expected timeline</span><span className="text-[14px] font-bold text-ink-900">21–30 days</span></div>
        {confirmed
          ? <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-600 mt-3"><Icon name="circle-check" size={16} color="#059669" />Deal confirmed — now add your bank details</div>
          : <Button size="lg" className="w-full mt-4" loading={confirming} onClick={() => void confirm()}>Confirm Deal</Button>}
      </Card>
      <h3 className="text-[15px] font-bold text-ink-900 mt-6 mb-3">Your bank details for payout</h3>
      {bd?.accountNumberLast4 && <p className="text-[12.5px] text-ink-500 -mt-1 mb-3">Saved account ending ••{bd.accountNumberLast4}. Re-enter the full number to update it.</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        {BANK_FIELDS.map(([k, label, req, ph]) => (
          <div key={k}>
            <label htmlFor={`bank-${k}`} className="block text-[13px] font-bold text-ink-800 mb-1.5">{label}{req && <span className="text-rose-500"> *</span>}</label>
            <input id={`bank-${k}`} value={b[k]} onChange={(e) => setB((o) => ({ ...o, [k]: e.target.value }))} placeholder={ph} inputMode={k === 'acc' || k === 'acc2' ? 'numeric' : undefined} autoComplete="off" className="w-full h-12 px-3.5 bg-white border border-ink-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-[14px] text-ink-900 placeholder:text-ink-400" />
          </div>
        ))}
      </div>
      <FormError message={err} />
      <Button size="lg" className="w-full mt-5" loading={saving} onClick={() => void save()}>Save Bank Details</Button>
      {viewer && <TermSheet id={id} a={a} onClose={() => setViewer(false)} />}
    </PageWrap>
  );
}

// ── PAYMENT SCHEDULE ─────────────────────────────────────────
export function PaymentSchedule({ id }: { id: string }) {
  const router = useRouter();
  const { toast, toastError } = useToast();
  const { a, gate, back, reload } = useListing(id);
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await confirmPayoutSchedule(id);
      toast('Payment schedule confirmed');
      reload();
      router.push(`/listings/${id}/registration`);
    } catch (e) { toastError(errorMessage(e, 'Could not confirm the schedule.')); setBusy(false); }
  };
  if (gate || !a) return gate;
  if (!a.offer) return <NoOffer id={id} />;
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900 mb-5"><Icon name="arrow-left" size={18} />Payment Schedule</button>
      <div className="space-y-3">
        {a.payoutSchedule.map((item) => (
          <Card key={item.key} className="p-4 flex items-center justify-between">
            <div><div className="text-[14.5px] font-bold text-ink-900">{item.label}</div><div className="flex items-center gap-1.5 text-[12px] text-ink-400 mt-0.5"><Icon name="calendar" size={13} />{item.dueLabel} · <span className={cx('font-semibold capitalize', item.status === 'paid' ? 'text-emerald-600' : 'text-ink-500')}>{item.status}</span></div></div>
            <span className="text-[16px] font-extrabold text-brand-600">{formatINR(item.amount)}</span>
          </Card>
        ))}
        <Card className="p-4 flex items-center justify-between">
          <span className="text-[14.5px] font-bold text-ink-900">Payment Mode</span>
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-600"><Icon name="landmark" size={15} color="#64748B" />Bank Transfer (escrow)</span>
        </Card>
        <div className="rounded-2xl bg-ink-900 p-4 flex items-center justify-between"><span className="text-[12px] font-semibold text-white/50 uppercase tracking-wide">Total</span><span className="text-[20px] font-extrabold text-white">{formatINR(a.offer.amount)}</span></div>
      </div>
      <Button size="lg" className="w-full mt-6" loading={busy} onClick={() => void confirm()}>Confirm Schedule</Button>
    </PageWrap>
  );
}

// ── REGISTRATION APPOINTMENT ─────────────────────────────────
const appointmentParts = (ap: RegistrationAppointment) => {
  if (!ap) return null;
  if (typeof ap === 'string') return { when: ap, time: '', office: '', address: '' };
  const d = ap.date ? new Date(ap.date) : null;
  return { when: d && !Number.isNaN(d.getTime()) ? longDate(d) : String(ap.date ?? ''), time: String(ap.time ?? ''), office: String(ap.office ?? ap.location ?? ''), address: String(ap.address ?? ''), date: d };
};

const icsFor = (summary: string, date: Date, location: string) => {
  const stamp = (x: Date) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(date.getTime() + 2 * 3600000);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Builtglory//Web//EN', 'BEGIN:VEVENT', `UID:${date.getTime()}@builtglory`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(date)}`, `DTEND:${stamp(end)}`, `SUMMARY:${summary}`, `LOCATION:${location}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
};

export function Registration({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { a, gate, back } = useListing(id);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (gate || !a) return gate;
  const docs = a.registration.checklist;
  const toggle = (d: string) => setChecked((s) => { const x = new Set(s); if (x.has(d)) x.delete(d); else x.add(d); return x; });
  const all = docs.length > 0 && checked.size === docs.length;
  const ap = appointmentParts(a.registration.appointment);
  const addToCalendar = () => {
    if (!ap?.date || Number.isNaN(ap.date.getTime())) return;
    const blob = new Blob([icsFor(`Property registration — ${title(a)}`, ap.date, [ap.office, ap.address].filter(Boolean).join(', '))], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'builtglory-registration.ics'; link.click();
    URL.revokeObjectURL(url);
    toast('Added to your calendar', 'calendar-plus');
  };
  const confirm = async () => {
    setBusy(true);
    setErr(null);
    try {
      await confirmRegistration(id, [...checked]);
      await sendSellerMessage(id, `Registration documents ready: ${docs.join(', ')}. I confirm the registration appointment.`);
      toast('Appointment confirmed');
      router.push(listingSold(a.sellRequest, a) ? `/listings/${id}/sold` : `/listings/${id}`);
    } catch (e) { setErr(errorMessage(e, 'Could not confirm the appointment.')); setBusy(false); }
  };
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900 mb-5"><Icon name="arrow-left" size={18} />Registration Appointment</button>
      <div className="rounded-3xl overflow-hidden border border-ink-200">
        <div className="bg-brand-600 text-white p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Appointment</div>
          <div className="text-[24px] font-extrabold mt-0.5">{ap?.when || 'To be scheduled'}</div>
          <div className="text-[13px] text-white/90">{ap?.time || (ap ? '' : 'Builtglory will share the date and time')}</div>
        </div>
        <div className="flex items-start gap-3 p-4">
          <div className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center shrink-0"><Icon name="landmark" size={20} color="#1A6FFF" /></div>
          <div className="flex-1"><div className="text-[14px] font-bold text-ink-900">{ap?.office || 'Sub-Registrar Office'}</div><div className="text-[12.5px] text-ink-500">{ap?.address || 'Office details will be confirmed with your appointment.'}</div></div>
          {(ap?.office || ap?.address) && <a aria-label="Open map" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([ap.office, ap.address].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer"><Icon name="map-pin" size={18} color="#1A6FFF" /></a>}
        </div>
      </div>
      <h3 className="text-[15px] font-bold text-ink-900 mt-6 mb-3">Documents to carry</h3>
      <div className="space-y-2.5">
        {docs.map((d) => (
          <button type="button" key={d} onClick={() => toggle(d)} className="w-full flex items-center gap-3 bg-white border border-ink-200 rounded-xl p-3.5 text-left hover:border-brand-300 transition">
            <div className={cx('w-5 h-5 rounded-md border-2 grid place-items-center shrink-0', checked.has(d) ? 'bg-brand-600 border-brand-600' : 'border-ink-300')}>{checked.has(d) && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}</div>
            <span className="text-[13.5px] font-medium text-ink-800">{d}</span>
          </button>
        ))}
      </div>
      <FormError message={err} />
      <Button variant="outline" size="lg" className="w-full mt-4" icon="calendar-plus" disabled={!ap?.date || Number.isNaN(ap.date.getTime())} onClick={addToCalendar}>Add to Calendar</Button>
      <Button size="lg" className="w-full mt-3" loading={busy} disabled={!all} onClick={() => void confirm()}>Confirm Appointment</Button>
    </PageWrap>
  );
}

function StatusLine({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return ok
    ? <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-emerald-600"><Icon name="circle-check" size={16} color="#059669" />{yes}</span>
    : <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-amber-600"><Icon name="loader" size={16} color="#D97706" />{no}</span>;
}

// ── SOLD ─────────────────────────────────────────────────────
export function Sold({ id }: { id: string }) {
  const router = useRouter();
  const { toastError } = useToast();
  const { a, gate } = useListing(id);
  if (gate || !a) return gate;
  const sold = listingSold(a.sellRequest, a);
  const paid = a.payoutSchedule.length > 0 && a.payoutSchedule.every((x) => x.status === 'paid');
  const registered = a.registration.status === 'completed';
  return (
    <PageWrap className="!max-w-[480px]">
      <div className="text-center mt-6">
        <div className="relative w-24 h-24 mx-auto"><div className="absolute inset-0 rounded-full bg-emerald-200 pulse-ring"></div><div className="relative w-24 h-24 rounded-full bg-emerald-100 grid place-items-center text-[44px]">🎉</div></div>
        <h1 className="text-[24px] font-extrabold tracking-tight text-ink-900 mt-6">{sold ? 'Your property has been sold' : 'Sale in progress'}</h1>
        <p className="text-[14px] text-ink-500 mt-2">{sold ? <>Congratulations! The deal for <b className="text-ink-800">{title(a)}</b> is complete.</> : <>We&apos;re finishing the last steps for <b className="text-ink-800">{title(a)}</b>.</>}</p>
      </div>
      <Card className="divide-y divide-ink-100 mt-6">
        <div className="flex items-center justify-between p-4"><span className="text-[14px] font-semibold text-ink-800">Payment</span><StatusLine ok={paid} yes="Received" no="Pending" /></div>
        <div className="flex items-center justify-between p-4"><span className="text-[14px] font-semibold text-ink-800">Registration</span><StatusLine ok={registered} yes="Completed" no="Pending" /></div>
      </Card>
      <Button size="lg" className="w-full mt-5" icon="file-text" onClick={() => { void openSellerFile(id, 'sale_deed').catch((e) => toastError(errorMessage(e, 'The sale deed is not ready yet.'), 'download')); }}>Download Sale Deed</Button>
      <button type="button" onClick={() => router.push('/support')} className="w-full text-center text-[14px] font-semibold text-brand-600 mt-4 hover:underline">Contact Builtglory</button>
    </PageWrap>
  );
}
