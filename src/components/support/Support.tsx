'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Tag, type Tone } from '../ui/Tag';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { FieldRow, FormError } from '../ui/FormFields';
import { ErrorState, Loading } from '../ui/StateViews';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useBack } from '../../hooks/useNavigation';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { supportContact, useAppConfig } from '../../context/AppConfigContext';
import { listMyTickets, requestCallback } from '../../services/supportService';
import { errorMessage } from '../../services/api';
import { ageShort, cx } from '../../lib/format';
import { displayName, mobileOf } from '../../lib/user';
import type { CallbackSlot, SupportStatus } from '../../types/misc';

export const STATUS_TAG: Record<SupportStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'amber' }, in_progress: { label: 'In progress', tone: 'brand' },
  resolved: { label: 'Resolved', tone: 'green' }, closed: { label: 'Closed', tone: 'ink' },
};

const SLOTS: Array<[string, CallbackSlot]> = [['Morning', 'morning'], ['Afternoon', 'afternoon'], ['Evening', 'evening']];

function RecentTickets() {
  const router = useRouter();
  const tickets = useApiQuery((signal) => listMyTickets(signal), []);
  return (
    <Card className="p-5 mb-3">
      <div className="flex items-center justify-between mb-3"><h3 className="text-[15px] font-bold text-ink-900">Recent Tickets</h3><button type="button" onClick={tickets.reload} className="text-[13px] font-bold text-brand-600 hover:underline">Refresh</button></div>
      {tickets.loading ? <Loading />
        : tickets.error ? <ErrorState compact message={tickets.error} onRetry={tickets.reload} />
        : (tickets.data?.items ?? []).length === 0 ? <div className="text-[13px] text-ink-400 py-4 text-center">You haven&apos;t raised any tickets yet.</div>
        : (
          <div className="space-y-2.5">{(tickets.data?.items ?? []).map((t) => (
            <button type="button" key={t._id} onClick={() => router.push(`/support/tickets/${t._id}`)} className="w-full flex items-center gap-3 rounded-xl border border-ink-100 p-3 hover:border-brand-300 transition text-left">
              <div className="flex-1 min-w-0"><div className="text-[13.5px] font-bold text-ink-900 truncate">{t.subject}</div><div className="text-[11.5px] text-ink-400">{t.referenceId} · {ageShort(t.createdAt)} ago</div></div>
              <Tag tone={STATUS_TAG[t.status].tone}>{STATUS_TAG[t.status].label}</Tag>
            </button>
          ))}</div>
        )}
    </Card>
  );
}

export function Support() {
  const router = useRouter();
  const back = useBack('/help');
  const { user, signedIn, requireAuth } = useSession();
  const { toast } = useToast();
  const contact = supportContact(useAppConfig());
  const [slot, setSlot] = useState(0);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [callbackOpen, setCallbackOpen] = useState(false);

  const submitCallback = async () => {
    const choice = SLOTS[slot] ?? SLOTS[0]!;
    setBusy(true);
    setErr(null);
    try {
      await requestCallback(choice[1], 'web_customer_support');
      setSent(true);
      toast(`Callback requested for ${choice[0]}`, 'phone-call');
    } catch (e) { setErr(errorMessage(e, 'Could not request a callback.')); } finally { setBusy(false); }
  };

  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink-900 mb-5"><Icon name="arrow-left" size={19} />Customer Support</button>
      <button type="button" onClick={() => requireAuth(() => router.push('/support/live-chat'))} className="w-full flex items-center gap-3 bg-white border border-ink-200 rounded-2xl p-4 hover:border-brand-300 hover:shadow-md transition text-left mb-3">
        <div className="flex-1"><div className="text-[15px] font-bold text-ink-900">Live Chat</div><div className="text-[12.5px] text-ink-500">Typically replies in &lt; 2 hours</div></div>
        <Icon name="chevron-right" size={18} color="#CBD5E1" />
      </button>
      <button type="button" onClick={() => requireAuth(() => setCallbackOpen((v) => !v))} className="w-full flex items-center gap-3 bg-white border border-ink-200 rounded-2xl p-4 hover:border-brand-300 hover:shadow-md transition text-left mb-3">
        <div className="flex-1"><div className="text-[15px] font-bold text-ink-900">Request a Callback</div><div className="text-[12.5px] text-ink-500">We&apos;ll call you in your preferred slot</div></div>
        <Icon name="chevron-right" size={18} color="#CBD5E1" style={{ transform: callbackOpen ? 'rotate(90deg)' : 'none', transition: '.2s' }} />
      </button>
      {callbackOpen && signedIn && (
        <Card className="p-5 mb-3 slide-in">
          {sent ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5"><Icon name="circle-check" size={18} color="#059669" /><span className="text-[13.5px] font-semibold text-emerald-700">We&apos;ll call you in your chosen slot.</span></div>
          ) : (
            <div className="space-y-4">
              <FieldRow label="Name"><div className="flex items-center gap-2 h-12 px-3.5 bg-ink-50 border border-ink-200 rounded-xl"><Icon name="user" size={16} color="#94A3B8" /><span className="flex-1 text-[14px] text-ink-700">{displayName(user)}</span></div></FieldRow>
              <FieldRow label="Phone"><div className="flex items-center gap-2 h-12 px-3.5 bg-ink-50 border border-ink-200 rounded-xl"><Icon name="phone" size={16} color="#94A3B8" /><span className="text-ink-600 text-[14px] font-medium">+91</span><span className="flex-1 text-[14px] text-ink-700">{mobileOf(user)}</span></div></FieldRow>
              <div><div className="block text-[13px] font-bold text-ink-800 mb-2">Preferred time slot</div><div className="flex gap-2">{SLOTS.map(([s], i) => <button type="button" key={s} onClick={() => setSlot(i)} className={cx('flex-1 h-10 rounded-xl text-[13px] font-semibold border transition', slot === i ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-ink-200 text-ink-700 hover:border-brand-300')}>{s}</button>)}</div></div>
              <FormError message={err} />
              <Button size="lg" className="w-full" loading={busy} onClick={() => void submitCallback()}>Request Callback</Button>
            </div>
          )}
        </Card>
      )}
      <button type="button" onClick={() => requireAuth(() => router.push('/support/tickets/new'))} className="w-full flex items-center gap-3 bg-white border border-ink-200 rounded-2xl p-4 hover:border-brand-300 hover:shadow-md transition text-left mb-3">
        <div className="flex-1"><div className="text-[15px] font-bold text-ink-900">Raise a Support Ticket</div><div className="text-[12.5px] text-ink-500">Tracked issue with full history</div></div>
        <Icon name="chevron-right" size={18} color="#CBD5E1" />
      </button>
      {signedIn ? <RecentTickets /> : (
        <Card className="p-5 mb-3"><h3 className="text-[15px] font-bold text-ink-900">Recent Tickets</h3><p className="text-[13px] text-ink-400 mt-2">Sign in to see your support tickets.</p></Card>
      )}
      <button type="button" onClick={() => router.push('/support/call')} className="w-full flex items-center gap-3 bg-white border border-ink-200 rounded-2xl p-4 hover:border-brand-300 hover:shadow-md transition text-left mb-3">
        <div className="w-11 h-11 rounded-full bg-brand-50 grid place-items-center shrink-0"><Icon name="phone-call" size={20} color="#1A6FFF" /></div>
        <div className="flex-1"><div className="text-[15px] font-bold text-ink-900">Call Us</div><div className="text-[12.5px] text-ink-500">{contact.phone || 'Support phone'}</div></div>
        <Icon name="chevron-right" size={18} color="#CBD5E1" />
      </button>
      <a href={contact.whatsappUrl || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!contact.whatsappUrl} className={cx('w-full flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 hover:bg-emerald-100 transition text-left', !contact.whatsappUrl && 'pointer-events-none opacity-60')}>
        <div className="w-11 h-11 rounded-full bg-emerald-600 grid place-items-center shrink-0"><Icon name="message-circle" size={20} color="#fff" /></div>
        <div className="flex-1"><div className="text-[15px] font-bold text-emerald-700">WhatsApp Support</div><div className="text-[12.5px] text-emerald-600 font-semibold">Chat with BuiltGlory team</div></div>
        <Icon name="chevron-right" size={18} color="#059669" />
      </a>
    </PageWrap>
  );
}

export function CallUs() {
  const router = useRouter();
  const back = useBack('/support');
  const contact = supportContact(useAppConfig());
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink-900 mb-5"><Icon name="arrow-left" size={19} />Call Us</button>
      <Card className="p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-50 grid place-items-center mx-auto"><Icon name="phone-call" size={34} color="#1A6FFF" /></div>
        <div className="text-[26px] font-extrabold text-brand-600 mt-4">{contact.phone || '—'}</div>
        <div className="text-[13.5px] font-semibold text-ink-500 mt-1">Builtglory Customer</div>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <a href={contact.telUrl || undefined} aria-disabled={!contact.telUrl} className={cx('h-12 rounded-xl bg-brand-600 text-white font-bold text-[14.5px] flex items-center justify-center gap-2 hover:bg-brand-700 transition', !contact.telUrl && 'pointer-events-none opacity-60')}><Icon name="phone" size={17} color="#fff" />Tap to Call</a>
          <a href={contact.whatsappUrl || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!contact.whatsappUrl} className={cx('h-12 rounded-xl bg-emerald-600 text-white font-bold text-[14.5px] flex items-center justify-center gap-2 hover:bg-emerald-700 transition', !contact.whatsappUrl && 'pointer-events-none opacity-60')}><Icon name="message-circle" size={17} color="#fff" />WhatsApp</a>
        </div>
      </Card>
      <div className="rounded-2xl bg-ink-50 p-4 text-center mt-4"><div className="text-[12px] font-semibold text-ink-400">Office</div><div className="text-[15px] font-bold text-ink-900 mt-0.5">Mon–Sat · 9:00 AM – 7:00 PM IST</div></div>
      <button type="button" onClick={() => router.push('/support')} className="w-full h-12 rounded-2xl border border-ink-200 text-[14.5px] font-bold text-ink-800 mt-4 hover:bg-ink-50 transition">Request Callback Instead</button>
    </PageWrap>
  );
}
