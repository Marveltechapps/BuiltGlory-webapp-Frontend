'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { FormError } from '../ui/FormFields';
import { OtpBoxes, emptyOtp } from '../ui/OtpBoxes';
import { PageLoading } from '../ui/StateViews';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useBack } from '../../hooks/useNavigation';
import { useTimer } from '../../hooks/useCountdown';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { cancelAccountDeletion, getAccountDeletion, requestAccountDeletion } from '../../services/userService';
import { listMyEnquiries } from '../../services/enquiryService';
import { listMySellRequests } from '../../services/sellRequestService';
import { sendCustomerOtp, verifyCustomerOtp } from '../../services/authService';
import { errorMessage } from '../../services/api';
import { setTokens } from '../../lib/authStorage';
import { DELETE_REASONS } from '../../lib/catalog';
import { cx, digits, initials, longDate } from '../../lib/format';
import { displayName, mobileOf } from '../../lib/user';
import { activeVisits } from '../../lib/pipelines';
import type { AccountDeletionStatus } from '../../types/user';

const STEPS = ['Review', 'Reason', 'Verify'];

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((t, i) => { const n = i + 1, done = step > n, cur = step === n; return (
        <Fragment key={t}>
          <div className="flex items-center gap-2">
            <div className={cx('w-7 h-7 rounded-full grid place-items-center text-[12px] font-bold transition', done ? 'bg-rose-600 text-white' : cur ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-500' : 'bg-ink-100 text-ink-400')}>{done ? <Icon name="check" size={14} color="#fff" strokeWidth={3} /> : n}</div>
            <span className={cx('text-[13px] font-semibold', cur ? 'text-ink-900' : 'text-ink-400')}>{t}</span>
          </div>
          {i < STEPS.length - 1 && <div className={cx('flex-1 h-0.5 rounded-full', step > n ? 'bg-rose-500' : 'bg-ink-200')}></div>}
        </Fragment>
      ); })}
    </div>
  );
}

function Deleted({ status, onDone, onCancelled }: { status: AccountDeletionStatus; onDone: () => void; onCancelled: () => void }) {
  const { user } = useSession();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    setBusy(true);
    try {
      await cancelAccountDeletion();
      toast('Account deletion cancelled', 'check');
      onCancelled();
    } catch (e) {
      toast(errorMessage(e, 'Could not cancel deletion.'), 'triangle-alert');
    } finally {
      setBusy(false);
    }
  };
  return (
    <PageWrap className="!max-w-[520px]">
      <Card className="p-8 text-center mt-6">
        <div className="w-20 h-20 rounded-full bg-emerald-50 grid place-items-center mx-auto"><Icon name="check" size={38} color="#059669" strokeWidth={2.5} /></div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900 mt-5">Account deletion requested</h1>
        <p className="text-[13.5px] text-ink-500 mt-2">Your Builtglory account for +91 {mobileOf(user)} is scheduled for deletion. Your data will be permanently erased within 30 days. You can cancel the request until that date.</p>
        <div className="rounded-2xl bg-ink-50 p-4 mt-6 text-left text-[13px] text-ink-600 space-y-2">
          <div className="flex items-center gap-2"><Icon name="calendar" size={15} color="#1A6FFF" />Scheduled for {status.scheduledDeletionAt ? longDate(status.scheduledDeletionAt) : 'deletion within 30 days'}</div>
          <div className="flex items-center gap-2"><Icon name="info" size={15} color="#1A6FFF" />Requested {status.requestedAt ? longDate(status.requestedAt) : 'today'}</div>
        </div>
        <Button size="lg" className="w-full mt-6" variant="outline" disabled={busy} onClick={() => void cancel()}>{busy ? 'Cancelling…' : 'Cancel deletion'}</Button>
        <Button size="lg" className="w-full mt-2.5" onClick={onDone}>Done</Button>
      </Card>
    </PageWrap>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const back = useBack('/settings/account');
  const { user, favorites, signOut } = useSession();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);
  const [otp, setOtp] = useState(emptyOtp());
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otpErr, setOtpErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState<AccountDeletionStatus | null>(null);
  const [timer, setTimer] = useTimer(30, step === 3);
  const mobile = digits(mobileOf(user));

  const status = useApiQuery((signal) => getAccountDeletion(signal), []);
  const counts = useApiQuery(async (signal) => {
    const [enq, listings] = await Promise.all([listMyEnquiries({}, signal), listMySellRequests(signal)]);
    return {
      enquiries: enq.meta.total ?? enq.items.length,
      visits: enq.items.flatMap((e) => activeVisits(e.visits)).filter((v) => v.status !== 'completed').length,
      listings: listings.items.filter((l) => !['sold', 'rejected', 'draft'].includes(l.status)).length,
      deals: enq.items.filter((e) => e.deal && e.deal.stage !== 'closed').length,
    };
  }, []);

  const done = () => { void signOut().then(() => router.push('/')); };
  if (status.loading && !status.data) return <PageLoading label="Loading account" />;
  const current = deleted ?? (status.data?.status === 'requested' ? status.data : null);
  if (current) return <Deleted status={current} onDone={done} onCancelled={status.reload} />;

  const c = counts.data;
  const lose: Array<[string, string, string]> = [
    ['heart', 'Saved properties', `${favorites.size} propert${favorites.size === 1 ? 'y' : 'ies'} you are tracking`],
    ['inbox', 'Enquiries & visits', c ? `${c.enquiries} enquiries and ${c.visits} scheduled visits will be cancelled` : 'Your enquiries and scheduled visits will be cancelled'],
    ['tag', 'Listings', c ? `${c.listings} active listing${c.listings === 1 ? '' : 's'} will be taken down` : 'Active listings will be taken down'],
    ['handshake', 'Deals in progress', 'Active deals are handed to your advisor to close offline'],
    ['file-text', 'Documents', 'Uploaded KYC and property documents are permanently erased'],
  ];

  const sendOtp = async () => {
    setBusy(true);
    setOtpErr(null);
    try {
      const res = await sendCustomerOtp(mobile);
      setRequestId(res.requestId);
      setTimer(Math.max(1, Math.round((new Date(res.canResendAt).getTime() - Date.now()) / 1000)) || 30);
      setOtp(emptyOtp());
      setStep(3);
      toast('OTP sent to +91 ' + mobileOf(user), 'message-square');
    } catch (e) { setOtpErr(errorMessage(e, 'Could not send the code.')); } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true);
    setOtpErr(null);
    try {
      const session = await verifyCustomerOtp(mobile, otp.join(''), requestId);
      setTokens(session.accessToken, session.refreshToken); // fresh session from the re-verification
      setConfirm(true);
    } catch (e) { setOtpErr(errorMessage(e, 'Incorrect code. Please try again.')); } finally { setBusy(false); }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      const r = await requestAccountDeletion([reason, note.trim()].filter(Boolean).join(' — ') || null);
      setConfirm(false);
      setDeleted(r);
    } catch (e) { setOtpErr(errorMessage(e, 'Could not delete your account.')); setConfirm(false); } finally { setBusy(false); }
  };

  return (
    <PageWrap className="!max-w-[1120px]">
      <button type="button" onClick={() => (step > 1 ? setStep(step - 1) : back())} className="flex items-center gap-2 text-[13px] font-semibold text-ink-500 hover:text-brand-600 mb-2"><Icon name="arrow-left" size={16} />{step > 1 ? 'Back' : 'Account Settings'}</button>
      <h1 className="text-[26px] font-extrabold tracking-tight text-ink-900">Delete Account</h1>
      <p className="text-[13.5px] text-ink-500 mt-0.5 mb-6">Permanently delete your Builtglory account and data</p>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <Card className="p-6">
          <Stepper step={step} />
          {step === 1 && (
            <div key="s1" className="fade-in">
              <div className="flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4">
                <Icon name="triangle-alert" size={20} color="#E11D48" />
                <div><div className="text-[14.5px] font-bold text-rose-700">This can&apos;t be undone after 30 days</div><div className="text-[13px] text-rose-600 mt-0.5">Here&apos;s what happens when you delete your account.</div></div>
              </div>
              <div className="divide-y divide-ink-100 mt-4">
                {lose.map(([i, t, d]) => (
                  <div key={t} className="flex items-center gap-3.5 py-3.5">
                    <div className="w-10 h-10 rounded-full bg-ink-100 grid place-items-center shrink-0"><Icon name={i} size={18} color="#334155" /></div>
                    <div className="min-w-0"><div className="text-[14.5px] font-bold text-ink-900">{t}</div><div className="text-[12.5px] text-ink-500">{d}</div></div>
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-3 mt-4 cursor-pointer select-none">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 w-5 h-5 accent-rose-600" />
                <span className="text-[13.5px] text-ink-700">I understand that my account, listings, enquiries and documents will be permanently deleted.</span>
              </label>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={back}>Keep My Account</Button>
                <button type="button" disabled={!ack} onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl bg-rose-600 text-white font-bold text-[14.5px] hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed">Continue</button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div key="s2" className="fade-in">
              <h3 className="text-[16px] font-bold text-ink-900">Why are you leaving?</h3>
              <p className="text-[13px] text-ink-500 mt-0.5">Your feedback helps us improve Builtglory.</p>
              <div className="grid sm:grid-cols-2 gap-2.5 mt-4">
                {DELETE_REASONS.map((r) => (
                  <button type="button" key={r} onClick={() => setReason(r)} className={cx('text-left rounded-xl border p-3.5 text-[13.5px] font-semibold flex items-center gap-2.5 transition', reason === r ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-ink-200 text-ink-700 hover:border-ink-300')}>
                    <span className={cx('w-4 h-4 rounded-full border-2 grid place-items-center shrink-0', reason === r ? 'border-rose-600' : 'border-ink-300')}>{reason === r && <span className="w-2 h-2 rounded-full bg-rose-600"></span>}</span>{r}
                  </button>
                ))}
              </div>
              <label htmlFor="del-note" className="block text-[13px] font-bold text-ink-800 mt-5 mb-1.5">Anything else? <span className="font-normal text-ink-400">(optional)</span></label>
              <textarea id="del-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={900} placeholder="Tell us more" className="w-full px-3.5 py-3 bg-white border border-ink-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-[14px] text-ink-900 resize-none"></textarea>
              <FormError message={otpErr} />
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <button type="button" disabled={!reason || busy} onClick={() => void sendOtp()} className="flex-1 h-12 rounded-xl bg-rose-600 text-white font-bold text-[14.5px] hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed">{busy ? 'Sending…' : 'Send OTP'}</button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div key="s3" className="fade-in">
              <h3 className="text-[16px] font-bold text-ink-900">Verify it&apos;s you</h3>
              <p className="text-[13px] text-ink-500 mt-0.5">Enter the {otp.length}-digit code sent to <b className="text-ink-800">+91 {mobileOf(user)}</b></p>
              <div className={cx('mt-5', otpErr && 'animate-[shakeX_.4s]')}><OtpBoxes value={otp} onChange={(v) => { setOtp(v); setOtpErr(null); }} variant="rose" error={Boolean(otpErr)} /></div>
              {otpErr && <div className="text-[12.5px] font-semibold text-rose-600 mt-2">{otpErr}</div>}
              <div className="text-[13px] text-ink-500 mt-3">{timer > 0 ? <>Resend code in <b className="text-ink-800">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</b></> : <button type="button" onClick={() => void sendOtp()} className="font-bold text-brand-600 hover:underline">Resend code</button>}</div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                <button type="button" disabled={otp.join('').length < otp.length || busy} onClick={() => void verify()} className="flex-1 h-12 rounded-xl bg-rose-600 text-white font-bold text-[14.5px] hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed">Verify & Continue</button>
              </div>
            </div>
          )}
        </Card>
        <div className="space-y-4 lg:sticky lg:top-4">
          <Card className="p-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Account</div>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white text-[14px] font-bold shrink-0">{initials(displayName(user))}</div>
              <div className="min-w-0"><div className="text-[14.5px] font-bold text-ink-900 truncate">{displayName(user)}</div><div className="text-[12.5px] text-ink-500">+91 {mobileOf(user)}</div></div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-[14px] font-bold text-ink-900">Just need a break?</div>
            <p className="text-[12.5px] text-ink-500 mt-1">You can log out or turn off notifications instead of deleting your account.</p>
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <Button variant="outline" size="sm" icon="bell-off" onClick={() => router.push('/settings/notifications')}>Mute</Button>
              <Button variant="outline" size="sm" icon="headset" onClick={() => router.push('/support')}>Get help</Button>
            </div>
          </Card>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[95] grid place-items-center p-4">
          <div className="absolute inset-0 bg-ink-900/45 fade-in" onClick={() => !busy && setConfirm(false)}></div>
          <div role="dialog" aria-modal="true" className="relative w-full max-w-[420px] bg-white rounded-3xl p-6 text-center shadow-2xl" style={{ animation: 'sheetUp .26s cubic-bezier(.2,.8,.25,1)' }}>
            <div className="w-16 h-16 rounded-full bg-rose-50 grid place-items-center mx-auto"><Icon name="trash-2" size={28} color="#E11D48" /></div>
            <h3 className="text-[19px] font-extrabold text-ink-900 mt-4">Delete your account?</h3>
            <p className="text-[13.5px] text-ink-500 mt-1.5">Type <b className="text-rose-600">DELETE</b> to confirm. You&apos;ll be logged out immediately.</p>
            <input aria-label="Type DELETE to confirm" value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} placeholder="DELETE" className="w-full h-12 mt-4 px-3.5 bg-white border border-ink-200 rounded-xl outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 text-center text-[15px] font-bold tracking-[.2em] text-ink-900" />
            <button type="button" disabled={typed !== 'DELETE' || busy} onClick={() => void doDelete()} className="w-full h-12 rounded-xl bg-rose-600 text-white font-bold text-[14.5px] mt-4 hover:bg-rose-700 transition disabled:opacity-40 flex items-center justify-center gap-2">
              {busy ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>Deleting…</> : 'Permanently Delete'}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirm(false)} className="w-full h-12 rounded-xl bg-ink-50 text-ink-700 font-semibold text-[14px] mt-2.5 hover:bg-ink-100 transition">Cancel</button>
          </div>
        </div>
      )}
    </PageWrap>
  );
}
