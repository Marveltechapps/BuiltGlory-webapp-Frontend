'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { gradFor } from '../ui/Photo';
import { UpiQR } from '../ui/UpiQR';
import { FormError } from '../ui/FormFields';
import { LinesSkeleton, PageError, PageLoading } from '../ui/StateViews';
import { useEnquiry } from '../../hooks/useEnquiries';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useBack } from '../../hooks/useNavigation';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { useAppConfig } from '../../context/AppConfigContext';
import { cancelEnquiry } from '../../services/enquiryService';
import { createVisit, getVisitAvailability } from '../../services/visitService';
import { uploadDocument } from '../../services/documentService';
import { submitKyc } from '../../services/userService';
import { createTokenPayment, listMyPayments } from '../../services/paymentService';
import { requestPropertyCallback } from '../../services/supportService';
import { errorMessage } from '../../services/api';
import { CANCEL_REASONS } from '../../lib/catalog';
import { cx, formatINR, isoDay, longDate } from '../../lib/format';
import { ENQ_LAST, ENQ_STEPS, enquiryGroup, enquiryStepIndex, enquiryStepNotes, registrationOf } from '../../lib/pipelines';
import type { CallbackSlot } from '../../types/misc';

const CALLBACK_TIMES: Array<[string, CallbackSlot | undefined]> = [['Within 1 hour', undefined], ['This evening (5 – 8 PM)', 'evening'], ['Tomorrow morning', 'morning']];
const BANKS = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank'];
const DOCS_TO_CARRY = ['Original Sale Deed', 'Aadhaar & PAN (buyer)', 'Token payment receipt', '2 passport photos', 'Witness ID proofs'];
const KYC_FILES = [['aadhaarFront', 'Aadhaar front', 'aadhaar'], ['aadhaarBack', 'Aadhaar back', 'aadhaar'], ['panDoc', 'PAN card', 'pan']] as const;
type KycKey = (typeof KYC_FILES)[number][0];
type Pay = 'UPI' | 'Net Banking' | 'Card';
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const inp = 'w-full h-11 px-3.5 bg-white border border-ink-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-[14px] text-ink-900';
const parseIso = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1); };

function Opt({ on, onClick, children, sub }: { on: boolean; onClick: () => void; children: ReactNode; sub?: string }) {
  return (
    <button type="button" onClick={onClick} className={cx('text-left rounded-xl border p-3.5 transition flex items-center gap-3', on ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300')}>
      <span className={cx('w-4 h-4 rounded-full border-2 grid place-items-center shrink-0', on ? 'border-brand-600' : 'border-ink-300')}>{on && <span className="w-2 h-2 rounded-full bg-brand-600"></span>}</span>
      <span className="min-w-0"><span className="block text-[13.5px] font-bold text-ink-900">{children}</span>{sub && <span className="block text-[12px] text-ink-500">{sub}</span>}</span>
    </button>
  );
}

function Rows({ rows, bold = true }: { rows: Array<[string, string]>; bold?: boolean }) {
  return <>{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><span className="text-ink-500">{k}</span><span className={cx(bold ? 'font-bold' : 'font-semibold', 'text-ink-900 text-right')}>{v}</span></div>)}</>;
}

export function EnquiryStatus({ id, act }: { id: string; act?: boolean }) {
  const router = useRouter();
  const back = useBack('/enquiries');
  const { user, setUser } = useSession();
  const config = useAppConfig();
  const { toast } = useToast();
  const { data: e, loading, error, reload } = useEnquiry(id, true);
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState(CANCEL_REASONS[0] ?? '');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [actOpen, setActOpen] = useState(!!act);
  const [busy, setBusy] = useState(false);
  const [actError, setActError] = useState<string | null>(null);
  const [cbTime, setCbTime] = useState(CALLBACK_TIMES[0]![0]);
  const [visitDay, setVisitDay] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [pan, setPan] = useState('');
  const [files, setFiles] = useState<Partial<Record<KycKey, File>>>({});
  const [kycSent, setKycSent] = useState(false);
  const [pay, setPay] = useState<Pay>('UPI');
  const [upiMode, setUpiMode] = useState<'qr' | 'id'>('qr');
  const [upi, setUpi] = useState('');
  const [bank, setBank] = useState('');
  const [pendingPay, setPendingPay] = useState(false);
  const [carry, setCarry] = useState<Set<string>>(new Set());
  const fileRefs = useRef<Partial<Record<KycKey, HTMLInputElement | null>>>({});

  const kycVerified = user?.kycStatus === 'verified';
  const curIdx = e ? enquiryStepIndex(e, kycVerified) : 0;
  const dealId = e?.deal?._id;

  useEffect(() => {
    if (!dealId) return;
    const ctrl = new AbortController();
    listMyPayments(ctrl.signal).then((rows) => setPendingPay(rows.some((r) => r.dealId === dealId && (r.status === 'pending' || r.status === 'created')))).catch(() => undefined);
    return () => ctrl.abort();
  }, [dealId]);

  const propertyId = e?.propertyId ?? '';
  const [slotsFrom] = useState(() => { const t = new Date(); t.setDate(t.getDate() + 1); return isoDay(t.getFullYear(), t.getMonth(), t.getDate()); });
  const availability = useApiQuery((signal) => getVisitAvailability(propertyId, 'physical', slotsFrom, 14, signal), [propertyId, slotsFrom], actOpen && curIdx === 1 && !!propertyId);
  const slots = { loading: availability.loading, days: (availability.data?.days ?? []).filter((d) => d.slots.some((s) => s.available)).slice(0, 5) };

  if (loading && !e) return <PageLoading label="Loading enquiry" />;
  if (error || !e) return <PageError message={error ?? 'Enquiry not found.'} onRetry={reload} />;

  const group = enquiryGroup(e);
  const cancelled = group === 'cancelled';
  const last = curIdx === ENQ_LAST;
  const pct = Math.round((curIdx / ENQ_LAST) * 100);
  const cs = ENQ_STEPS[curIdx]!;
  const notes = enquiryStepNotes(e);
  const canCancel = group === 'active' && !e.deal;
  const title = e.propertySnapshot?.title ?? 'Property';
  const price = e.deal?.financials?.agreedPrice ?? e.deal?.financials?.offeredPrice ?? e.propertySnapshot?.price ?? null;
  const priceLabel = price ? formatINR(price) : '—';
  const tokenAmount = e.deal?.financials?.tokenAmount ?? config?.payment?.tokenAmount ?? 0;
  const tokenLabel = tokenAmount ? `₹ ${tokenAmount.toLocaleString('en-IN')}` : '—';
  const escrow = config?.payment?.escrow ?? null;
  const reg = registrationOf(e);
  const regDate = reg?.date ? longDate(parseIso(reg.date)) : null;
  const kycPending = !kycVerified && (kycSent || user?.kycStatus === 'pending');
  const waiting = (curIdx === 3 && kycPending) || (curIdx === 4 && pendingPay);
  const showAct = !cancelled && !!cs.act && !waiting;

  const doCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelEnquiry(e._id, reason);
      toast('Enquiry cancelled');
      router.push('/enquiries');
    } catch (err) {
      setCancelError(errorMessage(err, 'Could not cancel this enquiry.'));
      setCancelling(false);
    }
  };

  const stepBody = (): { ok: boolean; body: ReactNode; run: () => Promise<void> } | null => {
    switch (curIdx) {
      case 0: return {
        ok: !!cbTime,
        run: async () => {
          const slot = CALLBACK_TIMES.find(([t]) => t === cbTime)?.[1];
          const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(10, 0, 0, 0);
          await requestPropertyCallback({ propertyId: e.propertyId, reason: `Verification call for enquiry ${e.referenceId} — ${cbTime.toLowerCase()}`, bestTimePreference: slot, preferredTime: slot === 'morning' ? tomorrow.toISOString() : slot ? undefined : new Date(Date.now() + 3600000).toISOString() });
          toast('Callback requested', 'phone-call');
        },
        body: (<>
          <p className="text-[13.5px] text-ink-500">When should your advisor call to verify your interest?</p>
          <div className="grid gap-2.5 mt-4">{CALLBACK_TIMES.map(([t]) => <Opt key={t} on={cbTime === t} onClick={() => setCbTime(t)}>{t}</Opt>)}</div>
        </>),
      };
      case 1: {
        const day = slots.days.find((d) => d.date === visitDay);
        return {
          ok: !!visitDay && !!visitTime,
          run: async () => {
            await createVisit({ propertyId: e.propertyId, enquiryId: e._id, visitDate: visitDay, visitTime, visitType: 'physical' });
            toast('Visit scheduled', 'calendar-check');
            reload();
          },
          body: (<>
            <p className="text-[13.5px] text-ink-500">Pick a date and time to visit {title}.</p>
            {slots.loading ? <div className="mt-4"><LinesSkeleton count={3} /></div>
              : slots.days.length === 0 ? <div className="mt-4 rounded-xl bg-ink-50 p-3 text-[13px] text-ink-500">No visit slots are open in the next two weeks. Your advisor will suggest a time.</div>
              : <>
                <div className="grid grid-cols-5 gap-2 mt-4">{slots.days.map((d) => { const dt = parseIso(d.date); return (
                  <button type="button" key={d.date} onClick={() => { setVisitDay(d.date); setVisitTime(''); }} className={cx('rounded-xl border py-2.5 text-center transition', visitDay === d.date ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-700 hover:border-ink-300')}><div className="text-[11px] font-semibold opacity-80">{WEEKDAY[dt.getDay()]}</div><div className="text-[16px] font-extrabold">{String(dt.getDate()).padStart(2, '0')}</div></button>
                ); })}</div>
                {day && <div className="grid grid-cols-3 gap-2 mt-3">{day.slots.filter((s) => s.available).map((s) => <button type="button" key={s.time} onClick={() => setVisitTime(s.time)} className={cx('h-10 rounded-xl border text-[13px] font-semibold transition', visitTime === s.time ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-700 hover:border-ink-300')}>{s.time}</button>)}</div>}
              </>}
          </>),
        };
      }
      case 2: return {
        ok: true,
        run: async () => {
          await requestPropertyCallback({ propertyId: e.propertyId, category: 'pricing', reason: `Buyer confirms the deal for enquiry ${e.referenceId} at ${priceLabel}` });
          toast('Deal confirmation sent to your advisor', 'handshake');
        },
        body: (<>
          <p className="text-[13.5px] text-ink-500">Liked the property after your visit? Confirm the deal at the agreed price.</p>
          <div className="rounded-2xl bg-ink-50 p-4 mt-4 space-y-2.5 text-[13.5px]"><Rows rows={[['Property', title], ['Agreed price', priceLabel], ['Token amount', tokenLabel], ['Brokerage', '₹ 0']]} /></div>
        </>),
      };
      case 3: {
        const ad = aadhaar.replace(/\D/g, '');
        const panOk = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
        const Up = ({ k, label }: { k: KycKey; label: string }) => { const file = files[k]; return (
          <button type="button" onClick={() => (file ? setFiles((o) => ({ ...o, [k]: undefined })) : fileRefs.current[k]?.click())} className={cx('w-full flex items-center gap-3 rounded-xl border p-3 text-left transition', file ? 'border-emerald-300 bg-emerald-50' : 'border-dashed border-ink-300 hover:border-brand-400')}>
            <div className={cx('w-9 h-9 rounded-lg grid place-items-center shrink-0', file ? 'bg-emerald-500' : 'bg-ink-100')}><Icon name={file ? 'check' : 'upload'} size={16} color={file ? '#fff' : '#475569'} /></div>
            <div className="flex-1 min-w-0"><div className="text-[13.5px] font-bold text-ink-900">{label}</div><div className="text-[12px] text-ink-500 truncate">{file ? `Added · ${(file.name.split('.').pop() ?? 'file').toUpperCase()} · tap to remove` : 'Tap to upload (PDF, JPG, PNG)'}</div></div>
          </button>
        ); };
        return {
          ok: ad.length === 12 && panOk && KYC_FILES.every(([k]) => !!files[k]),
          run: async () => {
            if (!user) throw new Error('Sign in again to upload your KYC documents.');
            const uploaded: Array<{ documentId: string; type: 'aadhaar' | 'pan' }> = [];
            for (const [k, , type] of KYC_FILES) {
              const f = files[k];
              if (!f) continue;
              const doc = await uploadDocument(f, 'user', user._id, 'kyc', type);
              uploaded.push({ documentId: doc._id, type });
            }
            setUser(await submitKyc(uploaded));
            setKycSent(true);
            toast('KYC documents submitted for verification', 'shield-check');
          },
          body: (<>
            {KYC_FILES.map(([k]) => <input key={k} ref={(el) => { fileRefs.current[k] = el; }} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={(ev) => { const f = ev.target.files?.[0]; ev.target.value = ''; if (f) setFiles((o) => ({ ...o, [k]: f })); }} />)}
            <p className="text-[13.5px] text-ink-500">Enter your Aadhaar and PAN details and upload copies of both.</p>
            <label className="block text-[13px] font-bold text-ink-800 mt-4 mb-1.5" htmlFor="kyc-aadhaar">Aadhaar number</label>
            <input id="kyc-aadhaar" value={aadhaar} onChange={(ev) => { const d = ev.target.value.replace(/\D/g, '').slice(0, 12); setAadhaar(d.replace(/(\d{4})(?=\d)/g, '$1 ')); }} placeholder="XXXX XXXX XXXX" inputMode="numeric" autoComplete="off" className="w-full h-12 px-3.5 bg-white border border-ink-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-[15px] tracking-wider text-ink-900" />
            {ad.length > 0 && ad.length < 12 && <div className="text-[12px] text-rose-600 mt-1">Enter all 12 digits</div>}
            <div className="grid grid-cols-2 gap-2.5 mt-2.5"><Up k="aadhaarFront" label="Aadhaar front" /><Up k="aadhaarBack" label="Aadhaar back" /></div>
            <label className="block text-[13px] font-bold text-ink-800 mt-5 mb-1.5" htmlFor="kyc-pan">PAN number</label>
            <input id="kyc-pan" value={pan} onChange={(ev) => setPan(ev.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} placeholder="ABCDE1234F" autoComplete="off" className="w-full h-12 px-3.5 bg-white border border-ink-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-[15px] tracking-wider uppercase text-ink-900" />
            {pan.length > 0 && !panOk && <div className="text-[12px] text-rose-600 mt-1">Format: 5 letters, 4 digits, 1 letter</div>}
            <div className="mt-2.5"><Up k="panDoc" label="PAN card" /></div>
          </>),
        };
      }
      case 4: {
        const upiOk = /^[\w.-]{2,}@[a-z]{2,}$/i.test(upi);
        const qrMode = upiMode === 'qr';
        const ok = !!dealId && tokenAmount > 0 && (pay === 'UPI' ? !!escrow?.upiId && (qrMode || upiOk) : pay === 'Net Banking' ? !!bank && !!escrow?.accountNumber : false);
        return {
          ok,
          run: async () => {
            if (!dealId) throw new Error('Your deal is not ready for payment yet.');
            await createTokenPayment({
              dealId, amount: tokenAmount, method: pay === 'Net Banking' ? 'bank' : 'upi',
              transactionReference: pay === 'Net Banking' ? `Net banking · ${bank}` : qrMode ? 'UPI QR' : `UPI · ${upi}`,
              notes: `Token payment for enquiry ${e.referenceId}`,
            });
            setPendingPay(true);
            toast('Payment submitted for verification', 'wallet');
          },
          body: (<>
            <div className="rounded-2xl border border-ink-200 overflow-hidden">
              <div className="bg-brand-50 p-4 text-center"><div className="text-[12px] font-semibold text-brand-700">Token amount payable</div><div className="text-[30px] font-extrabold tracking-tight text-ink-900">{tokenLabel}</div><div className="text-[12px] text-ink-500">Fully adjusted against the final price</div></div>
              <div className="p-4 space-y-2 text-[13px]">
                <Rows bold={false} rows={[['Property', title], ['Agreed price', priceLabel], ['Token amount', tokenLabel], ['Convenience fee', '₹ 0']]} />
                <div className="flex justify-between gap-4 pt-2 border-t border-ink-100 text-[14px]"><span className="font-bold text-ink-900">Total</span><span className="font-extrabold text-ink-900">{tokenLabel}</span></div>
              </div>
            </div>
            <div className="text-[13px] font-bold text-ink-800 mt-5 mb-2">Pay using</div>
            <div className="grid grid-cols-3 gap-2">{([['UPI', 'smartphone'], ['Net Banking', 'landmark'], ['Card', 'credit-card']] as const).map(([t, ic]) => (
              <button type="button" key={t} onClick={() => setPay(t)} className={cx('rounded-xl border py-3 flex flex-col items-center gap-1.5 text-[12.5px] font-bold transition', pay === t ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-700 hover:border-ink-300')}><Icon name={ic} size={18} color={pay === t ? '#1A6FFF' : '#475569'} />{t}</button>
            ))}</div>
            <div className="mt-3">
              {pay === 'UPI' && <div className="grid grid-cols-2 p-1 rounded-xl bg-ink-100 mb-3">{([['qr', 'Scan QR', 'scan-line'], ['id', 'UPI ID', 'at-sign']] as const).map(([k, t, ic]) => <button type="button" key={k} onClick={() => setUpiMode(k)} className={cx('h-9 rounded-lg text-[12.5px] font-bold flex items-center justify-center gap-1.5 transition', upiMode === k ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500')}><Icon name={ic} size={14} />{t}</button>)}</div>}
              {pay === 'UPI' && !escrow?.upiId && <div className="rounded-xl bg-amber-50 p-3 text-[12.5px] text-amber-800">UPI details aren&apos;t available right now. Use net banking or ask your advisor.</div>}
              {pay === 'UPI' && escrow?.upiId && qrMode && tokenAmount > 0 && <UpiQR upiId={escrow.upiId} payee={escrow.accountHolder || 'Builtglory'} amount={tokenAmount} note={`Token ${e.referenceId}`} />}
              {pay === 'UPI' && escrow?.upiId && !qrMode && <><input value={upi} onChange={(ev) => setUpi(ev.target.value.trim())} placeholder="yourname@okbank" className={inp} />{upi && !upiOk && <div className="text-[12px] text-rose-600 mt-1">Enter a valid UPI ID</div>}<div className="text-[12px] text-ink-500 mt-1.5">Send {tokenLabel} to <b className="text-ink-700">{escrow.upiId}</b> from this UPI ID, then confirm below.</div></>}
              {pay === 'Net Banking' && <>
                <div className="grid grid-cols-2 gap-2">{BANKS.map((bk) => <button type="button" key={bk} onClick={() => setBank(bk)} className={cx('h-11 rounded-xl border text-[13px] font-semibold transition', bank === bk ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-700 hover:border-ink-300')}>{bk}</button>)}</div>
                {escrow?.accountNumber && <div className="rounded-xl bg-ink-50 p-3 mt-3 space-y-1.5 text-[12.5px]"><Rows bold={false} rows={[['Account name', escrow.accountHolder ?? '—'], ['Bank', escrow.bankName ?? '—'], ['Account no.', escrow.accountNumber], ['IFSC', escrow.ifsc ?? '—'], ...(escrow.branch ? [['Branch', escrow.branch] as [string, string]] : [])]} /></div>}
              </>}
              {pay === 'Card' && <div className="rounded-xl bg-ink-50 p-3 text-[12.5px] text-ink-600 flex items-start gap-2"><Icon name="info" size={14} color="#1A6FFF" className="mt-0.5 shrink-0" />Card payments aren&apos;t available yet. Please pay by UPI or net banking.</div>}
            </div>
            <div className="flex items-center gap-2 text-[12px] text-ink-500 mt-4"><Icon name="lock" size={13} color="#94A3B8" />Transfer the token from your own UPI or bank, then submit the reference. BuiltGlory verifies it before the property is reserved. Card payments are not available.</div>
          </>),
        };
      }
      case 5: return {
        ok: true,
        run: async () => undefined,
        body: (<>
          <p className="text-[13.5px] text-ink-500">{regDate ? 'Your registration appointment has been booked by your Builtglory advisor.' : 'Your Builtglory advisor will book your registration appointment. It will appear here once it is confirmed.'}</p>
          <div className="rounded-2xl overflow-hidden border border-ink-200 mt-4">
            <div className="bg-brand-600 text-white p-4">
              <div className="text-[11.5px] font-bold uppercase tracking-wide text-white/80">Your appointment</div>
              <div className="text-[22px] font-extrabold tracking-tight mt-1">{regDate ?? 'To be scheduled'}</div>
              {reg?.sub && <div className="text-[14px] font-semibold text-white/90">{reg.sub}</div>}
            </div>
            <div className="flex items-start gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-brand-50 grid place-items-center shrink-0"><Icon name="landmark" size={18} color="#1A6FFF" /></div>
              <div className="flex-1 min-w-0"><div className="text-[14px] font-bold text-ink-900">{reg?.office || 'Sub-Registrar Office'}</div><div className="text-[12.5px] text-ink-500">{reg?.office ? 'Carry the documents below on the day of registration.' : 'Office details will be shared by your advisor.'}</div></div>
              {reg?.office && <a href={`https://maps.google.com/?q=${encodeURIComponent(reg.office)}`} target="_blank" rel="noreferrer" title="Open in Maps" aria-label="Open office in Maps" className="w-9 h-9 rounded-full hover:bg-brand-50 grid place-items-center shrink-0"><Icon name="map-pin" size={18} color="#1A6FFF" /></a>}
            </div>
          </div>
          <div className="text-[14px] font-bold text-ink-900 mt-5 mb-2">Documents to carry</div>
          <div className="rounded-2xl border border-ink-200 divide-y divide-ink-100">
            {DOCS_TO_CARRY.map((d) => { const on = carry.has(d); return (
              <button type="button" key={d} onClick={() => setCarry((s) => { const n = new Set(s); if (on) n.delete(d); else n.add(d); return n; })} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-ink-50 transition">
                <span className={cx('w-5 h-5 rounded-md border-2 grid place-items-center shrink-0 transition', on ? 'bg-brand-600 border-brand-600' : 'border-ink-300')}>{on && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}</span>
                <span className={cx('text-[13.5px]', on ? 'text-ink-400 line-through' : 'text-ink-800')}>{d}</span>
              </button>
            ); })}
          </div>
        </>),
      };
      case 6: return {
        ok: true,
        run: async () => {
          await requestPropertyCallback({ propertyId: e.propertyId, category: 'general', reason: `Buyer reports the sale deed for enquiry ${e.referenceId} was registered` });
          toast('Thanks — your advisor will confirm the registration', 'file-text');
        },
        body: (<>
          <p className="text-[13.5px] text-ink-500">Confirm that the sale deed was signed and registered at the sub-registrar office.</p>
          <div className="rounded-2xl bg-ink-50 p-4 mt-4 space-y-2.5 text-[13.5px]"><Rows rows={[['Property', title], ['Final price', priceLabel], ['Appointment', regDate ?? '—'], ['Office', reg?.office || '—']]} /></div>
        </>),
      };
      default: return null;
    }
  };

  const sb = actOpen && showAct ? stepBody() : null;
  const confirm = async () => {
    if (!sb) return;
    setBusy(true);
    setActError(null);
    try {
      await sb.run();
      setActOpen(false);
    } catch (err) {
      setActError(errorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  };
  const openAct = () => { setActError(null); setActOpen(true); };

  return (
    <PageWrap className="!max-w-[1180px]">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <button type="button" onClick={back} className="flex items-center gap-2 text-[13px] font-semibold text-ink-500 hover:text-brand-600 mb-2"><Icon name="arrow-left" size={16} />My Enquiries</button>
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink-900">Enquiry Status</h1>
          <p className="text-[13.5px] text-ink-500 mt-0.5">{ENQ_STEPS.length}-step pipeline · Ref ID {e.referenceId}</p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" icon="building-2" onClick={() => router.push(`/properties/${e.propertyId}`)}>View Property</Button>
          {canCancel && <button type="button" onClick={() => setCancel(true)} className="h-11 px-5 rounded-xl border border-rose-200 text-rose-600 font-semibold text-[14px] hover:bg-rose-50 transition">Cancel Enquiry</button>}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="grid md:grid-cols-[280px_1fr]">
          <div className={cx('relative h-44 md:h-auto overflow-hidden group bg-gradient-to-br', gradFor(e.propertyId))}></div>
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="text-[20px] font-extrabold text-ink-900">{title}</h3><div className="text-[13.5px] text-ink-500 mt-0.5 flex items-center gap-1.5"><Icon name="map-pin" size={14} />{e.propertySnapshot?.location || '—'}</div></div>
              <div className="text-right"><div className="text-[22px] font-extrabold text-brand-600">{e.propertySnapshot?.price ? formatINR(e.propertySnapshot.price) : '—'}</div><div className="text-[11.5px] text-ink-400">Ref ID: {e.referenceId}</div></div>
            </div>
            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 leading-tight text-[12.5px] font-semibold mb-2"><span className="text-ink-700">Step {curIdx + 1} of {ENQ_STEPS.length} · <span className="text-brand-600">{cs.t}</span></span><span className="text-ink-500">{pct}% complete</span></div>
              <div className="h-2 rounded-full bg-ink-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-brand-600 transition-all duration-700" style={{ width: pct + '%' }}></div></div>
              <div className="hidden md:flex justify-between mt-3">
                {ENQ_STEPS.map((s, i) => <div key={s.t} title={s.t} className={cx('w-2.5 h-2.5 rounded-full', i < curIdx || last ? 'bg-emerald-500' : i === curIdx ? 'bg-brand-600 ring-4 ring-brand-100' : 'bg-ink-200')}></div>)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 mt-6 items-start">
        <Card className="p-6">
          <h3 className="text-[16px] font-bold text-ink-900 mb-5">Progress timeline</h3>
          <div className="grid sm:grid-cols-2 gap-x-8">
            {[ENQ_STEPS.slice(0, 4), ENQ_STEPS.slice(4)].map((col, ci) => (
              <div key={ci} className="relative">
                <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-ink-200"></div>
                <div className="space-y-5">
                  {col.map((s, j) => {
                    const i = ci * 4 + j, done = i < curIdx || (last && i === curIdx), cur = i === curIdx;
                    const n = notes[i];
                    return (
                      <div key={s.t} className="flex items-start gap-4 relative">
                        <div className={cx('w-8 h-8 rounded-full grid place-items-center shrink-0 z-10 ring-4 ring-white', done ? 'bg-emerald-500' : cur ? 'bg-brand-600' : 'bg-ink-200')}>
                          {done ? <Icon name="check" size={16} color="#fff" strokeWidth={3} /> : <span className={cx('text-[11px] font-bold', cur ? 'text-white' : 'text-ink-500')}>{i + 1}</span>}
                        </div>
                        <div className={cx('pt-0.5', !done && !cur && 'opacity-50')}>
                          <div className={cx('text-[14.5px] font-bold', done ? 'text-ink-900' : cur ? 'text-brand-700' : 'text-ink-700')}>{s.t}</div>
                          <div className="text-[12.5px] text-ink-500">{done && n?.note ? n.note : s.note}</div>
                          {(done || cur) && n?.at && <div className="text-[12px] text-ink-400 mt-0.5">{n.at}</div>}
                          {cur && showAct && <button type="button" onClick={openAct} className="mt-2 h-8 px-3 rounded-lg bg-brand-600 text-white text-[12.5px] font-bold hover:bg-brand-700 transition inline-flex items-center gap-1.5"><Icon name={s.icon} size={13} color="#fff" />{s.act}</button>}
                          {cur && waiting && <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-600 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Awaiting verification</div>}
                          {cur && i === ENQ_LAST && <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600 mt-1"><Icon name="circle-check" size={13} color="#059669" />Done</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4 lg:sticky lg:top-4">
          <Card className="p-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">Current step</div>
            <div className="text-[17px] font-extrabold text-ink-900 mt-1">{cs.t}</div>
            <div className="text-[13px] text-ink-500 mt-0.5">{cs.note}</div>
            {cancelled ? <div className="mt-4 rounded-xl bg-rose-50 text-rose-700 text-[13px] font-semibold p-3">This enquiry was cancelled.</div>
              : waiting ? <div className="mt-4 rounded-xl bg-amber-50 text-amber-800 text-[13px] font-semibold p-3 flex items-center gap-2"><Icon name="clock" size={16} color="#D97706" />{curIdx === 3 ? 'KYC documents submitted — awaiting verification' : 'Payment submitted — awaiting verification'}</div>
              : cs.act ? <Button className="w-full mt-4" icon={cs.icon} onClick={openAct}>{cs.act}</Button>
              : <div className="mt-4 rounded-xl bg-emerald-50 text-emerald-700 text-[13px] font-semibold p-3 flex items-center gap-2"><Icon name="circle-check" size={16} color="#059669" />All steps completed</div>}
            {curIdx === 2 && !cancelled && <Button variant="outline" className="w-full mt-2.5" icon="calendar" onClick={() => router.push('/visits')}>View My Visits</Button>}
          </Card>
          <Card className="p-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Up next</div>
            <div className="text-[15px] font-bold text-ink-900 mt-1">{curIdx >= ENQ_LAST ? 'Nothing left — enjoy your new home' : ENQ_STEPS[curIdx + 1]?.t}</div>
            <div className="border-t border-ink-100 mt-4 pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-50 grid place-items-center shrink-0"><Icon name="headset" size={18} color="#1A6FFF" /></div>
              <div className="flex-1 min-w-0"><div className="text-[13.5px] font-semibold text-ink-900">Need help with this enquiry?</div><div className="text-[12px] text-ink-500">Talk to your advisor</div></div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <Button variant="outline" size="sm" icon="phone" onClick={() => router.push('/support/call')}>Call</Button>
              <Button variant="outline" size="sm" icon="message-circle" onClick={() => router.push('/support/live-chat')}>Chat</Button>
            </div>
          </Card>
        </div>
      </div>

      {sb && (
        <div className="fixed inset-0 z-[95] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4" onClick={() => !busy && setActOpen(false)}>
          <div className="absolute inset-0 bg-ink-900/45 fade-in"></div>
          <div role="dialog" aria-modal="true" aria-label={cs.act ?? cs.t} className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[480px] p-6 pb-7 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ animation: 'sheetUp .26s cubic-bezier(.2,.8,.25,1)' }} onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-50 grid place-items-center shrink-0"><Icon name={cs.icon} size={20} color="#1A6FFF" /></div>
              <div className="flex-1 min-w-0"><div className="text-[11.5px] font-bold uppercase tracking-wide text-brand-600">Step {curIdx + 1} of {ENQ_STEPS.length} · {cs.t}</div><h2 className="text-[19px] font-extrabold tracking-tight text-ink-900">{cs.act}</h2></div>
              <button type="button" aria-label="Close" onClick={() => setActOpen(false)} className="w-9 h-9 rounded-full hover:bg-ink-100 grid place-items-center"><Icon name="x" size={18} color="#64748B" /></button>
            </div>
            <div className="mt-4">{sb.body}</div>
            <FormError message={actError} />
            <button type="button" disabled={!sb.ok || busy} onClick={() => void confirm()} className="w-full h-12 rounded-xl bg-brand-600 text-white font-bold text-[14.5px] mt-5 hover:bg-brand-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {busy ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>{curIdx === 4 ? 'Processing payment…' : 'Processing…'}</> : <>{curIdx === 5 ? 'Got it' : curIdx === 4 ? (pay === 'UPI' && upiMode === 'qr' ? "I've completed the payment" : `Pay ${tokenLabel}`) : 'Confirm'}<Icon name="arrow-right" size={16} color="#fff" /></>}
            </button>
            <button type="button" onClick={() => setActOpen(false)} className="w-full h-11 rounded-xl bg-ink-50 text-ink-700 font-semibold text-[14px] mt-2.5 hover:bg-ink-100 transition">Later</button>
          </div>
        </div>
      )}

      {cancel && (
        <div className="fixed inset-0 z-[95] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4" onClick={() => !cancelling && setCancel(false)}>
          <div className="absolute inset-0 bg-ink-900/45 fade-in"></div>
          <div role="dialog" aria-modal="true" className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[420px] p-6 pb-8 shadow-2xl" style={{ animation: 'sheetUp .26s cubic-bezier(.2,.8,.25,1)' }} onClick={(ev) => ev.stopPropagation()}>
            <div className="w-10 h-1.5 rounded-full bg-ink-200 mx-auto mb-5 sm:hidden"></div>
            <h2 className="text-[18px] font-extrabold tracking-tight text-ink-900">Cancel this enquiry?</h2>
            <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3 mt-4">
              <div className={cx('w-10 h-10 rounded-lg bg-gradient-to-br shrink-0 relative overflow-hidden group', gradFor(e.propertyId))}></div>
              <span className="text-[14px] font-bold text-ink-900">{title}</span>
            </div>
            <label className="block text-[13px] font-bold text-ink-800 mt-4 mb-1.5" htmlFor="cancel-reason">Reason for cancelling</label>
            <div className="relative">
              <select id="cancel-reason" value={reason} onChange={(ev) => setReason(ev.target.value)} className="w-full h-12 px-3.5 pr-10 bg-white border border-brand-400 rounded-xl outline-none text-[14px] text-ink-900 appearance-none focus:ring-2 focus:ring-brand-100">
                {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              <Icon name="chevron-down" size={18} color="#94A3B8" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <FormError message={cancelError} />
            <button type="button" disabled={cancelling} onClick={() => void doCancel()} className="w-full h-12 rounded-xl bg-rose-600 text-white font-bold text-[14.5px] mt-5 hover:bg-rose-700 transition disabled:opacity-60">{cancelling ? 'Cancelling…' : 'Cancel Enquiry'}</button>
            <button type="button" disabled={cancelling} onClick={() => setCancel(false)} className="w-full h-12 rounded-xl bg-ink-50 text-ink-700 font-semibold text-[14px] mt-2.5 hover:bg-ink-100 transition">Keep Enquiry</button>
          </div>
        </div>
      )}
    </PageWrap>
  );
}
