'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { gradFor } from '../ui/Photo';
import { FormError } from '../ui/FormFields';
import { PageError, PageLoading } from '../ui/StateViews';
import { useEnquiry } from '../../hooks/useEnquiries';
import { useBack } from '../../hooks/useNavigation';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { cancelEnquiry } from '../../services/enquiryService';
import { errorMessage } from '../../services/api';
import { CANCEL_REASONS } from '../../lib/catalog';
import { cx, formatINR } from '../../lib/format';
import { ENQ_STEPS, enquiryGroup, enquiryStepIndex, enquiryStepNotes } from '../../lib/pipelines';

export function EnquiryStatus({ id }: { id: string }) {
  const router = useRouter();
  const back = useBack('/enquiries');
  const { user } = useSession();
  const { toast } = useToast();
  const { data: e, loading, error, reload } = useEnquiry(id, true);
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState(CANCEL_REASONS[0] ?? '');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  if (loading && !e) return <PageLoading label="Loading enquiry" />;
  if (error || !e) return <PageError message={error ?? 'Enquiry not found.'} onRetry={reload} />;

  const group = enquiryGroup(e);
  const curIdx = Math.min(enquiryStepIndex(e, user?.kycStatus === 'verified'), ENQ_STEPS.length);
  const pct = Math.round((Math.min(curIdx, ENQ_STEPS.length - 1) / (ENQ_STEPS.length - 1)) * 100);
  const allDone = curIdx >= ENQ_STEPS.length;
  const cs = allDone ? 'Completed' : ENQ_STEPS[curIdx] ?? '';
  const notes = enquiryStepNotes(e);
  const canCancel = group === 'active' && !e.deal;
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
              <div><h3 className="text-[20px] font-extrabold text-ink-900">{e.propertySnapshot?.title ?? 'Property'}</h3><div className="text-[13.5px] text-ink-500 mt-0.5 flex items-center gap-1.5"><Icon name="map-pin" size={14} />{e.propertySnapshot?.location || '—'}</div></div>
              <div className="text-right"><div className="text-[22px] font-extrabold text-brand-600">{e.propertySnapshot?.price ? formatINR(e.propertySnapshot.price) : '—'}</div><div className="text-[11.5px] text-ink-400">Ref ID: {e.referenceId}</div></div>
            </div>
            <div className="mt-5">
              {group === 'cancelled' ? (
                <div className="flex items-center gap-2 text-[13px] font-semibold text-rose-600"><Icon name="circle-x" size={16} color="#E11D48" />This enquiry was cancelled.</div>
              ) : <>
                <div className="flex items-center justify-between text-[12.5px] font-semibold mb-2"><span className="text-ink-700">Step {Math.min(curIdx + 1, ENQ_STEPS.length)} of {ENQ_STEPS.length} · <span className="text-brand-600">{cs}</span></span><span className="text-ink-500">{allDone ? 100 : pct}% complete</span></div>
                <div className="h-2 rounded-full bg-ink-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-brand-600 transition-all duration-700" style={{ width: (allDone ? 100 : pct) + '%' }}></div></div>
                <div className="hidden md:flex justify-between mt-3">
                  {ENQ_STEPS.map((s, i) => <div key={s} title={s} className={cx('w-2.5 h-2.5 rounded-full', i < curIdx ? 'bg-emerald-500' : i === curIdx ? 'bg-brand-600 ring-4 ring-brand-100' : 'bg-ink-200')}></div>)}
                </div>
              </>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 mt-6 items-start">
        <Card className="p-6">
          <h3 className="text-[16px] font-bold text-ink-900 mb-5">Progress timeline</h3>
          <div className="grid sm:grid-cols-2 gap-x-8">
            {[ENQ_STEPS.slice(0, 5), ENQ_STEPS.slice(5)].map((col, ci) => (
              <div key={ci} className="relative">
                <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-ink-200"></div>
                <div className="space-y-5">
                  {col.map((t, j) => {
                    const i = ci * 5 + j, done = i < curIdx, cur = i === curIdx && group !== 'cancelled';
                    const n = notes[i];
                    return (
                      <div key={t} className="flex items-start gap-4 relative">
                        <div className={cx('w-8 h-8 rounded-full grid place-items-center shrink-0 z-10 ring-4 ring-white', done ? 'bg-emerald-500' : cur ? 'bg-brand-600' : 'bg-ink-200')}>
                          {done ? <Icon name="check" size={16} color="#fff" strokeWidth={3} /> : cur ? <Icon name="loader" size={15} color="#fff" className="animate-spin" /> : <span className="text-[11px] font-bold text-ink-500">{i + 1}</span>}
                        </div>
                        <div className={cx('pt-0.5', !done && !cur && 'opacity-50')}>
                          <div className={cx('text-[14.5px] font-bold', done ? 'text-ink-900' : cur ? 'text-brand-700' : 'text-ink-700')}>{t}</div>
                          {n?.note && <div className="text-[12.5px] text-ink-500">{n.note}</div>}
                          {n?.at && <div className="text-[12px] text-ink-400 mt-0.5">{n.at}</div>}
                          {cur && <div className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse"></span>In progress</div>}
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
            <div className="text-[17px] font-extrabold text-ink-900 mt-1">{group === 'cancelled' ? 'Cancelled' : cs}</div>
            {notes[curIdx]?.at && <div className="text-[13px] text-ink-500 mt-0.5">{notes[curIdx]?.at}</div>}
            <Button className="w-full mt-4" icon="calendar" onClick={() => router.push('/visits')}>View My Visits</Button>
          </Card>
          <Card className="p-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Up next</div>
            <div className="text-[15px] font-bold text-ink-900 mt-1">{allDone || group !== 'active' ? 'Completed' : ENQ_STEPS[curIdx + 1] ?? 'Completed'}</div>
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

      {cancel && (
        <div className="fixed inset-0 z-[95] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4" onClick={() => !cancelling && setCancel(false)}>
          <div className="absolute inset-0 bg-ink-900/45 fade-in"></div>
          <div role="dialog" aria-modal="true" className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[420px] p-6 pb-8 shadow-2xl" style={{ animation: 'sheetUp .26s cubic-bezier(.2,.8,.25,1)' }} onClick={(ev) => ev.stopPropagation()}>
            <div className="w-10 h-1.5 rounded-full bg-ink-200 mx-auto mb-5 sm:hidden"></div>
            <h2 className="text-[18px] font-extrabold tracking-tight text-ink-900">Cancel this enquiry?</h2>
            <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3 mt-4">
              <div className={cx('w-10 h-10 rounded-lg bg-gradient-to-br shrink-0 relative overflow-hidden group', gradFor(e.propertyId))}></div>
              <span className="text-[14px] font-bold text-ink-900">{e.propertySnapshot?.title ?? 'Property'}</span>
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
