'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { ThumbFill, Wave } from '../ui/Photo';
import { FormError } from '../ui/FormFields';
import { Loading, PageError, PageLoading } from '../ui/StateViews';
import { useProperty } from '../../hooks/useProperties';
import { useMyEnquiries } from '../../hooks/useEnquiries';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useBack } from '../../hooks/useNavigation';
import { useToast } from '../../context/ToastContext';
import { createVisit, getVisitAvailability } from '../../services/visitService';
import { errorMessage } from '../../services/api';
import { cx, formatINR, isoDay, shortDate } from '../../lib/format';
import { propertyLocality, propertyPhotos } from '../../lib/property';
import { enquiryGroup } from '../../lib/pipelines';
import type { Visit } from '../../types/visit';

const LANGS = ['English', 'Tamil', 'Hindi', 'Kannada'];

export function NriVideoCall({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const back = useBack(`/properties/${propertyId}`);
  const { toast } = useToast();
  const property = useProperty(propertyId);
  const enquiries = useMyEnquiries(true, propertyId);
  const [from] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return isoDay(d.getFullYear(), d.getMonth(), d.getDate()); });
  const availability = useApiQuery((signal) => getVisitAvailability(propertyId, 'virtual', from, 14, signal), [propertyId, from]);
  const [lang, setLang] = useState('English');
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [done, setDone] = useState<Visit | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (property.loading && !property.data) return <PageLoading label="Loading property" />;
  if (property.error || !property.data) return <PageError message={property.error ?? 'Property not found.'} onRetry={property.reload} />;
  const p = property.data;
  const days = (availability.data?.days ?? []).filter((d) => d.slots.some((s) => s.available)).slice(0, 5);
  const selDay = day && days.some((d) => d.date === day) ? day : days[0]?.date ?? null;
  const slots = days.find((d) => d.date === selDay)?.slots ?? [];
  const selTime = time && slots.some((s) => s.time === time && s.available) ? time : slots.find((s) => s.available)?.time ?? null;
  const enquiry = (enquiries.data?.items ?? []).find((e) => enquiryGroup(e) === 'active');

  const schedule = async () => {
    if (!selDay || !selTime) return;
    setSaving(true);
    setFormError(null);
    try {
      const visit = await createVisit({ propertyId: p._id, enquiryId: enquiry?._id, visitDate: selDay, visitTime: selTime, visitType: 'virtual', preferredLanguage: lang as 'English' | 'Tamil' | 'Hindi' | 'Kannada' });
      setDone(visit);
      toast('Video call scheduled');
    } catch (e) {
      setFormError(errorMessage(e, 'Could not schedule the video call.'));
    } finally {
      setSaving(false);
    }
  };

  if (done) return (
    <PageWrap className="!max-w-[1120px] web-split">
      <div className="text-center mt-6">
        <div className="relative w-24 h-24 mx-auto"><div className="absolute inset-0 rounded-full bg-brand-100 pulse-ring"></div><div className="relative w-24 h-24 rounded-full bg-brand-50 grid place-items-center"><Icon name="video" size={40} color="#1A6FFF" /></div></div>
        <h1 className="text-[24px] font-extrabold tracking-tight text-ink-900 mt-6">Video call scheduled!</h1>
        <p className="text-[14px] text-ink-500 mt-2">Your NRI property tour is confirmed. Our advisor will call you at the scheduled time.</p>
      </div>
      <Card className="p-5 mt-6">
        <div className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide">Call details</div>
        <div className="mt-3"><div className="text-[12px] text-ink-400">Property</div><div className="text-[14.5px] font-bold text-ink-900">{p.title}</div></div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div><div className="text-[12px] text-ink-400">Date</div><div className="text-[14.5px] font-bold text-ink-900">{shortDate(done.visitDate)}</div></div>
          <div><div className="text-[12px] text-ink-400">Time (IST)</div><div className="text-[14.5px] font-bold text-ink-900">{done.visitTime}</div></div>
        </div>
        <div className="mt-3"><div className="text-[12px] text-ink-400">Language</div><div className="text-[14.5px] font-bold text-ink-900">{lang}</div></div>
        <div className="border-t border-dashed border-ink-200 mt-4 pt-3 text-[12.5px] text-ink-400 italic">You&apos;ll receive a call link 10 minutes before the scheduled time</div>
      </Card>
      <div className="grid grid-cols-2 gap-3 mt-5">
        <Button variant="outline" onClick={() => router.push('/visits')}>My Visits</Button>
        <Button onClick={() => router.push('/')}>Home</Button>
      </div>
    </PageWrap>
  );

  return (
    <PageWrap className="!max-w-[560px]">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink-900"><Icon name="arrow-left" size={19} />Schedule Video Call</button>
      <p className="text-[13px] text-ink-500 mb-5 ml-7">NRI Property Tour</p>
      <Card className="p-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br p-2 shrink-0 relative overflow-hidden from-emerald-400 to-teal-500"><ThumbFill src={propertyPhotos(p)[0]} /><Wave /></div>
        <div><div className="text-[15px] font-bold text-ink-900">{p.title}</div><div className="text-[12.5px] text-ink-400">{propertyLocality(p)}</div><div className="text-[14px] font-extrabold text-brand-600 mt-0.5">{formatINR(p.price)}</div></div>
      </Card>

      <div className="text-[13px] font-bold text-ink-800 mt-6 mb-2.5">Preferred Language</div>
      <div className="grid grid-cols-2 gap-2.5">
        {LANGS.map((l) => <button type="button" key={l} onClick={() => setLang(l)} className={cx('h-12 rounded-xl text-[14px] font-semibold border transition', lang === l ? 'bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-100' : 'bg-white border-ink-200 text-ink-700 hover:border-brand-300')}>{l}</button>)}
      </div>

      <div className="text-[13px] font-bold text-ink-800 mt-6 mb-2.5">Select Date</div>
      {availability.loading && !availability.data ? <Loading lines label="Checking availability" />
        : availability.error ? <FormError message={availability.error} />
        : days.length === 0 ? <div className="text-[13px] text-ink-400">No video-call slots are open in the next two weeks.</div>
        : <div className="grid grid-cols-3 gap-2.5">
          {days.map((d) => <button type="button" key={d.date} onClick={() => { setDay(d.date); setTime(null); }} className={cx('h-11 rounded-xl text-[13.5px] font-semibold border transition', selDay === d.date ? 'bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-100' : 'bg-white border-ink-200 text-ink-700 hover:border-brand-300')}>{shortDate(d.date + 'T00:00:00')}</button>)}
        </div>}

      {slots.length > 0 && <>
        <div className="text-[13px] font-bold text-ink-800 mt-6 mb-2.5">Select Time (IST)</div>
        <div className="space-y-2.5">
          {slots.map((s) => <button type="button" key={s.time} disabled={!s.available} onClick={() => setTime(s.time)} className={cx('w-full h-12 rounded-xl text-[14px] font-semibold border text-left px-4 transition disabled:opacity-40 disabled:line-through', selTime === s.time ? 'bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-100' : 'bg-white border-ink-200 text-ink-800 hover:border-brand-300')}>{s.time}</button>)}
        </div>
      </>}

      <FormError message={formError} />
      <Button size="lg" className="w-full mt-6" loading={saving} disabled={!selDay || !selTime} onClick={() => void schedule()}>Schedule Video Call</Button>
    </PageWrap>
  );
}
