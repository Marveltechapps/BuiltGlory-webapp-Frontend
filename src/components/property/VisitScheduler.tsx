'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { PhotoPlaceholder } from '../ui/Photo';
import { FormError } from '../ui/FormFields';
import { Loading, PageError, PageLoading } from '../ui/StateViews';
import { useProperty } from '../../hooks/useProperties';
import { useMyEnquiries } from '../../hooks/useEnquiries';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useBack } from '../../hooks/useNavigation';
import { useToast } from '../../context/ToastContext';
import { createVisit, getVisitAvailability, rescheduleVisit } from '../../services/visitService';
import { errorMessage } from '../../services/api';
import { MONTHS, cx, formatINR, isoDay, longDate } from '../../lib/format';
import { mapsUrl, propertyLocation, propertyPhotos } from '../../lib/property';
import { enquiryGroup } from '../../lib/pipelines';
import type { Visit, VisitType } from '../../types/visit';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WINDOW_DAYS = 30;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
const parseIso = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1); };

export function VisitScheduler({ propertyId, enquiryId, visitId, visitType = 'physical' }: { propertyId: string; enquiryId?: string; visitId?: string; visitType?: VisitType }) {
  const router = useRouter();
  const back = useBack(`/properties/${propertyId}`);
  const { toast } = useToast();
  const property = useProperty(propertyId);
  const enquiries = useMyEnquiries(true, propertyId);

  const [today] = useState(() => startOfDay(new Date()));
  const first = addDays(today, 1);
  const last = addDays(today, WINDOW_DAYS);
  const [view, setView] = useState({ y: first.getFullYear(), m: first.getMonth() });
  const [sel, setSel] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | undefined>(visitId);
  const [vType, setVType] = useState<VisitType>(visitType);
  const [guests, setGuests] = useState(1);
  const [done, setDone] = useState<Visit | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const monthStart = new Date(view.y, view.m, 1);
  const monthEnd = new Date(view.y, view.m + 1, 0);
  const from = monthStart < first ? first : monthStart;
  const to = monthEnd > last ? last : monthEnd;
  const span = dayDiff(from, to) + 1;
  const availability = useApiQuery((signal) => getVisitAvailability(propertyId, vType, isoDay(from.getFullYear(), from.getMonth(), from.getDate()), Math.min(Math.max(span, 1), 30), signal), [propertyId, vType, view.y, view.m], span > 0);

  if (property.loading || enquiries.loading) return <PageLoading label="Loading visit slots" />;
  if (property.error || !property.data) return <PageError message={property.error ?? 'Property not found.'} onRetry={property.reload} />;
  if (enquiries.error) return <PageError message={enquiries.error} onRetry={enquiries.reload} />;
  const p = property.data;
  const myEnquiries = enquiries.data?.items ?? [];
  const enquiry = myEnquiries.find((e) => e._id === enquiryId) ?? myEnquiries.find((e) => enquiryGroup(e) === 'active');
  const existing = rescheduleId ? myEnquiries.flatMap((e) => e.visits ?? []).find((v) => v._id === rescheduleId) ?? (done?._id === rescheduleId ? done : undefined) : undefined;

  if (!enquiry && !rescheduleId) return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-500 hover:text-brand-600 mb-4"><Icon name="arrow-left" size={16} />Back</button>
      <Card className="p-8 text-center mt-6">
        <div className="w-16 h-16 rounded-full bg-amber-50 grid place-items-center mx-auto"><Icon name="lock" size={28} color="#D97706" /></div>
        <h1 className="text-[20px] font-extrabold tracking-tight text-ink-900 mt-5">Submit an enquiry first</h1>
        <p className="text-[13.5px] text-ink-500 mt-2">To schedule a site visit for <b className="text-ink-800">{p.title}</b>, please submit an enquiry. Our advisor will confirm your visit slot.</p>
        <div className="flex gap-3 mt-6 justify-center"><Button variant="outline" onClick={() => router.push(`/properties/${p._id}`)}>View property</Button><Button icon="send" onClick={() => router.push(`/properties/${p._id}/enquiry`)}>Submit enquiry</Button></div>
      </Card>
    </PageWrap>
  );

  const days = availability.data?.days ?? [];
  const dayMap = new Map(days.map((d) => [d.date, d.slots]));
  const firstOpen = days.find((d) => d.slots.some((s) => s.available))?.date ?? null;
  const selected = sel && dayMap.has(sel) ? sel : firstOpen;
  const slots = selected ? dayMap.get(selected) ?? [] : [];
  const chosenSlot = slot && slots.some((s) => s.time === slot && s.available) ? slot : null;
  const firstDow = monthStart.getDay();
  const cells: Array<number | null> = [...Array<null>(firstDow).fill(null), ...Array.from({ length: monthEnd.getDate() }, (_, i) => i + 1)];
  const atMinMonth = view.y === first.getFullYear() && view.m === first.getMonth();
  const atMaxMonth = view.y === last.getFullYear() && view.m === last.getMonth();
  const shiftMonth = (delta: number) => setView((v) => { const nm = v.m + delta; return { y: v.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 }; });
  const selLabel = selected ? longDate(parseIso(selected)) : '—';

  const confirm = async () => {
    if (!selected || !chosenSlot) return;
    setSaving(true);
    setFormError(null);
    try {
      const visit = rescheduleId
        ? await rescheduleVisit(rescheduleId, selected, chosenSlot)
        : await createVisit({ propertyId: p._id, enquiryId: enquiry?._id, visitDate: selected, visitTime: chosenSlot, visitType: vType });
      setDone(visit);
      toast(rescheduleId ? 'Visit rescheduled' : 'Visit scheduled');
      enquiries.reload();
      availability.reload();
    } catch (e) {
      setFormError(errorMessage(e, 'Could not book this slot.'));
    } finally {
      setSaving(false);
    }
  };

  const resched = !!rescheduleId;
  const summary = (
    <div className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3 mb-5">
      <PhotoPlaceholder tag={p._id} src={propertyPhotos(p)[0]} className="rounded-xl shrink-0" style={{ width: 52, height: 52 }} />
      <div className="min-w-0"><div className="text-[14px] font-bold text-ink-900 truncate">{p.title}</div><div className="text-[12px] text-ink-400">{propertyLocation(p)}</div><div className="text-[13px] font-semibold text-brand-600">{formatINR(p.price)}</div></div>
    </div>
  );

  if (done) return (
    <PageWrap className="!max-w-[540px]">
      <Card className="p-7 text-center mt-6">
        <div className="w-20 h-20 rounded-full bg-brand-50 grid place-items-center mx-auto"><Icon name="calendar-check" size={36} color="#1A6FFF" /></div>
        <h1 className="text-[24px] font-extrabold tracking-tight text-ink-900 mt-5">{resched ? 'Visit rescheduled!' : 'Visit scheduled!'}</h1>
        <p className="text-[14px] text-ink-500 mt-2">{resched ? 'The seller has been notified of your new time.' : "We've added it to your calendar. Track it in My Visits."}</p>
        <div className="rounded-2xl border border-ink-200 overflow-hidden mt-6 text-left">
          <div className="bg-brand-600 text-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Your visit</div>
            <div className="text-[20px] font-extrabold mt-0.5">{longDate(parseIso(done.visitDate))}</div>
            <div className="text-[13px] text-white/90">{[done.visitTime, (done.visitType ?? vType) === 'virtual' ? 'Video tour' : 'In-person'].filter(Boolean).join(' · ')}</div>
          </div>
          <div className="p-4 flex gap-3 items-center border-b border-ink-100">
            <PhotoPlaceholder tag={p._id} src={propertyPhotos(p)[0]} className="rounded-xl shrink-0" style={{ width: 52, height: 52 }} />
            <div className="min-w-0"><div className="text-[14px] font-bold text-ink-900 truncate">{p.title}</div><div className="text-[12px] text-ink-400">{propertyLocation(p)}</div><div className="text-[13px] font-semibold text-brand-600 mt-0.5">{formatINR(p.price)}</div></div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div><div className="text-[11px] text-ink-400">Advisor</div><div className="text-[13.5px] font-bold text-ink-900">Builtglory team</div></div>
            <div><div className="text-[11px] text-ink-400">Reference</div><div className="text-[13.5px] font-bold text-ink-900">#{done.referenceId}</div></div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <Button variant="outline" icon="map-pin" onClick={() => window.open(mapsUrl(p), '_blank', 'noopener,noreferrer')}>Directions</Button>
          <Button variant="outline" icon="calendar" onClick={() => { setRescheduleId(done._id); setDone(null); setSel(null); setSlot(null); }}>Change Time</Button>
        </div>
        <Button size="lg" className="w-full mt-3" icon="calendar-check" onClick={() => router.push('/visits')}>Go to My Visits</Button>
      </Card>
    </PageWrap>
  );

  return (
    <PageWrap className="!max-w-[560px]">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-500 hover:text-brand-600 mb-4"><Icon name="arrow-left" size={16} />{resched ? 'Reschedule Visit' : 'Schedule Visit'}</button>
      <Card className="p-6">
        {summary}
        {resched ? (
          <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-3.5 mb-5">
            <Icon name="calendar-clock" size={20} color="#D97706" className="shrink-0" />
            <div><div className="text-[13px] font-bold text-amber-700">Current booking</div><div className="text-[12.5px] text-amber-600">{existing ? `${longDate(parseIso(existing.visitDate))}${existing.visitTime ? ` · ${existing.visitTime}` : ''}` : '—'}</div></div>
          </div>
        ) : (
          <div className="mb-5">
            <div className="text-[13px] font-bold text-ink-800 mb-2.5">Visit type</div>
            <div className="grid grid-cols-2 gap-2.5">
              {([['In-person', 'physical', 'map-pin', 'Visit the site with an advisor'], ['Video tour', 'virtual', 'video', 'Live walkthrough on video call']] as const).map(([t, v, ic, d]) => (
                <button type="button" key={t} onClick={() => { setVType(v); setSlot(null); }} className={cx('rounded-xl border p-3.5 text-left flex items-start gap-3 transition', vType === v ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-ink-200 hover:border-brand-300')}>
                  <Icon name={ic} size={18} color={vType === v ? '#1A6FFF' : '#64748B'} className="mt-0.5 shrink-0" />
                  <div><div className={cx('text-[13.5px] font-bold', vType === v ? 'text-brand-700' : 'text-ink-800')}>{t}</div><div className="text-[11.5px] text-ink-500">{d}</div></div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} disabled={atMinMonth} className={cx('w-9 h-9 grid place-items-center rounded-xl transition', atMinMonth ? 'text-ink-200 cursor-default' : 'text-ink-600 hover:bg-ink-100')}><Icon name="chevron-left" size={18} /></button>
          <div className="text-[14px] font-bold text-ink-900">{MONTHS[view.m]} {view.y}</div>
          <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} disabled={atMaxMonth} className={cx('w-9 h-9 grid place-items-center rounded-xl transition', atMaxMonth ? 'text-ink-200 cursor-default' : 'text-ink-600 hover:bg-ink-100')}><Icon name="chevron-right" size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DOW.map((d, i) => <div key={i} className={cx('text-[12px] font-semibold py-1.5', i === 0 || i === 6 ? 'text-ink-400' : 'text-ink-500')}>{d}</div>)}
          {cells.map((d, i) => {
            if (d === null) return <div key={i}></div>;
            const key = isoDay(view.y, view.m, d);
            const open = (dayMap.get(key) ?? []).some((s) => s.available);
            return <button type="button" key={i} onClick={() => { setSel(key); setSlot(null); }} disabled={!open} className={cx('aspect-square grid place-items-center rounded-xl text-[13.5px] font-semibold transition', selected === key ? 'bg-brand-600 text-white' : !open ? 'text-ink-300 cursor-default' : 'text-ink-800 hover:bg-ink-100')}>{d}</button>;
          })}
        </div>
        <div className="text-[13px] font-bold text-ink-800 mt-6 mb-2.5">Available time slots</div>
        {availability.loading && !availability.data ? <Loading lines label="Checking availability" />
          : availability.error ? <FormError message={availability.error} />
          : slots.length === 0 ? <div className="text-[13px] text-ink-400 py-3">No slots available for this month.</div>
          : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((s) => <button type="button" key={s.time} disabled={!s.available} onClick={() => setSlot(s.time)} className={cx('h-11 rounded-xl text-[12.5px] font-semibold border transition disabled:opacity-40 disabled:line-through', chosenSlot === s.time ? 'bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-100' : 'bg-white border-ink-200 text-ink-700 hover:border-brand-300')}>{s.time}</button>)}
            </div>
          )}
        {!resched && vType === 'physical' && (
          <div className="flex items-center justify-between rounded-xl border border-ink-200 p-3.5 mt-5">
            <div><div className="text-[13.5px] font-bold text-ink-900">Visitors</div><div className="text-[12px] text-ink-500">Including you</div></div>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Fewer visitors" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="w-8 h-8 rounded-lg border border-ink-200 grid place-items-center hover:bg-ink-50"><Icon name="minus" size={15} /></button>
              <span className="w-5 text-center text-[14px] font-bold text-ink-900">{guests}</span>
              <button type="button" aria-label="More visitors" onClick={() => setGuests((g) => Math.min(5, g + 1))} className="w-8 h-8 rounded-lg border border-ink-200 grid place-items-center hover:bg-ink-50"><Icon name="plus" size={15} /></button>
            </div>
          </div>
        )}
        <div className="mt-5 p-3.5 rounded-xl bg-ink-50 flex items-center gap-2 text-[13px] text-ink-600"><Icon name="calendar-check" size={16} color="#1A6FFF" />{resched ? 'New time' : 'Your visit'}: <b className="text-ink-900">{selLabel}{chosenSlot ? ` at ${chosenSlot}` : ''}</b></div>
        <FormError message={formError} />
        <Button size="lg" className="w-full mt-5" loading={saving} disabled={!selected || !chosenSlot} onClick={() => void confirm()}>{rescheduleId ? 'Confirm Reschedule' : 'Confirm Visit'}</Button>
      </Card>
    </PageWrap>
  );
}
