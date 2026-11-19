'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { PhotoPlaceholder } from '../ui/Photo';
import { FieldRow, FormError, TextInput } from '../ui/FormFields';
import { PageError, PageLoading } from '../ui/StateViews';
import { useProperty } from '../../hooks/useProperties';
import { useBack } from '../../hooks/useNavigation';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { createEnquiry } from '../../services/enquiryService';
import { updateMe } from '../../services/userService';
import { errorMessage } from '../../services/api';
import { typeLabel } from '../../lib/catalog';
import { cx, digits, formatINR, localMobile } from '../../lib/format';
import { mobileOf } from '../../lib/user';
import { propertyPhotos } from '../../lib/property';
import type { BuyEnquiry, InterestType, PreferredContact } from '../../types/enquiry';

const CONTACTS: Array<[string, PreferredContact]> = [['Phone', 'phone'], ['WhatsApp', 'whatsapp'], ['Email', 'email']];
/** The API's `interestType` enum has no home-loan value: Home Loan is sent as `more_details` and tagged in `enquiryTypes`. */
const INTERESTS: Array<[string, InterestType]> = [['More Details', 'more_details'], ['Price Negotiation', 'price_negotiation'], ['Home Loan', 'more_details']];
const BUDGETS = ['Within listed price', 'Slightly lower', 'Flexible'];
const TIMELINES = ['Immediately', 'Within 3 months', 'Just exploring'];

function CtaBtn({ options, value, onPick }: { options: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button type="button" key={o} onClick={() => onPick(o)} className={cx('h-11 rounded-xl text-[13px] font-semibold transition px-2', value === o ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200')}>{o}</button>
      ))}
    </div>
  );
}

export function EnquiryForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const back = useBack(`/properties/${propertyId}`);
  const { user, setUser } = useSession();
  const { toast } = useToast();
  const { data: p, loading, error, reload } = useProperty(propertyId);
  const [done, setDone] = useState<BuyEnquiry | null>(null);
  const [contact, setContact] = useState('WhatsApp');
  const [intent, setIntent] = useState('More Details');
  const [budget, setBudget] = useState('Within listed price');
  const [timeline, setTimeline] = useState('Within 3 months');
  const [msg, setMsg] = useState('');
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(mobileOf(user));
  const [email, setEmail] = useState(user?.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (loading && !p) return <PageLoading label="Loading property" />;
  if (error || !p) return <PageError message={error ?? 'Property not found.'} onRetry={reload} />;

  if (done) return (
    <PageWrap className="!max-w-[560px]">
      <Card className="p-8 text-center mt-6">
        <div className="w-24 h-24 rounded-full bg-emerald-50 grid place-items-center mx-auto ring-8 ring-emerald-50/60"><Icon name="check" size={44} color="#059669" strokeWidth={2.5} /></div>
        <h1 className="text-[24px] font-extrabold tracking-tight text-ink-900 mt-6">Enquiry submitted!</h1>
        <p className="text-[14px] text-ink-500 mt-2">Our advisor will call you within an hour.<br />Track it anytime in <button type="button" onClick={() => router.push('/enquiries')} className="text-brand-600 font-semibold">My Enquiries</button>.</p>
        <div className="rounded-2xl bg-ink-50 p-5 mt-7 text-left">
          <div className="text-[12px] font-semibold text-ink-400 uppercase tracking-wide mb-3">What happens next</div>
          <div className="space-y-2.5">
            {['Advisor calls within 1 hour', 'Property details & documents shared', 'Site visit unlocked for this property'].map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-[13.5px] text-ink-700"><Icon name="circle-check" size={17} color="#1A6FFF" />{t}</div>
            ))}
          </div>
        </div>
        <Button size="lg" className="w-full mt-6" icon="inbox" onClick={() => router.push('/enquiries')}>View My Enquiries</Button>
        <div className="grid grid-cols-2 gap-2.5 mt-2.5">
          <Button variant="outline" size="sm" onClick={() => router.push(`/properties/${p._id}`)}>View Property</Button>
          <Button variant="outline" size="sm" icon="calendar" onClick={() => router.push(`/properties/${p._id}/visit?enquiryId=${done._id}`)}>Schedule a Visit</Button>
        </div>
      </Card>
    </PageWrap>
  );

  const accountMobile = localMobile(user?.mobileNumber || user?.phone);
  const submit = async () => {
    setFormError(null);
    if (digits(phone) !== accountMobile) { setFormError('Enquiries use your verified mobile number. To use a different number, change it from Profile → Change Phone Number.'); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { setFormError('Enter a valid email address.'); return; }
    setSubmitting(true);
    try {
      const nameChanged = name.trim() !== (user?.name ?? '');
      const emailChanged = email.trim() !== (user?.email ?? '') && email.trim() !== '';
      if (nameChanged || emailChanged) {
        const updated = await updateMe({ ...(nameChanged ? { name: name.trim() } : {}), ...(emailChanged ? { email: email.trim() } : {}) });
        setUser(updated);
      }
      const enquiry = await createEnquiry({
        propertyId: p._id,
        enquiryTypes: [`Interest: ${intent}`, `Budget: ${budget}`, `Planning to buy: ${timeline}`],
        preferredContact: CONTACTS.find(([l]) => l === contact)?.[1] ?? 'whatsapp',
        interestType: INTERESTS.find(([l]) => l === intent)?.[1] ?? 'more_details',
        preferredVisitTime: null,
        additionalMessage: msg.trim() || null,
      });
      setDone(enquiry);
      toast('Enquiry submitted');
    } catch (e) {
      setFormError(errorMessage(e, 'Could not submit your enquiry.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} aria-label="Back" className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-500 hover:text-brand-600 mb-4"><Icon name="arrow-left" size={16} />Back</button>
      <Card className="p-6">
        <div className="flex items-center gap-3 rounded-2xl bg-brand-50 border border-brand-100 p-3">
          <PhotoPlaceholder tag={p._id} src={propertyPhotos(p)[0]} className="rounded-xl shrink-0" style={{ width: 56, height: 56 }} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-ink-900 truncate">{p.title}</div>
            <div className="text-[12.5px] font-semibold text-brand-600 mt-0.5">{formatINR(p.price)} · {typeLabel(p.type)}</div>
            <div className="text-[11px] text-ink-400">Ref ID: {p.referenceId}</div>
          </div>
        </div>

        <div className="text-[15px] font-extrabold text-ink-900 mt-6 mb-3">Your Details</div>
        <div className="space-y-4">
          <FieldRow label="Full Name" required><TextInput icon="user" value={name} onChange={(e) => setName(e.target.value)} /></FieldRow>
          <FieldRow label="Mobile" required><TextInput icon="phone" prefix="+91" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} /></FieldRow>
          <FieldRow label="Email (Optional)"><TextInput icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></FieldRow>
        </div>

        <div className="text-[13px] font-semibold text-ink-700 mt-5 mb-2">Preferred Contact</div>
        <CtaBtn options={CONTACTS.map(([l]) => l)} value={contact} onPick={setContact} />

        <div className="text-[14px] font-extrabold text-brand-700 mt-6 mb-2">I&apos;m interested in</div>
        <CtaBtn options={INTERESTS.map(([l]) => l)} value={intent} onPick={setIntent} />

        <div className="text-[13px] font-semibold text-ink-700 mt-5 mb-2">Budget</div>
        <CtaBtn options={BUDGETS} value={budget} onPick={setBudget} />
        <div className="text-[13px] font-semibold text-ink-700 mt-5 mb-2">Planning to buy</div>
        <CtaBtn options={TIMELINES} value={timeline} onPick={setTimeline} />
        <div className="mt-4 p-3 rounded-xl bg-brand-50 flex items-start gap-2 text-[12.5px] text-brand-700"><Icon name="info" size={14} color="#1A6FFF" className="mt-0.5 shrink-0" />Site visits are booked separately once your enquiry is submitted.</div>

        <div className="text-[13px] font-semibold text-ink-700 mt-5 mb-2">Additional Message (Optional)</div>
        <div className="relative">
          <textarea rows={3} maxLength={500} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Any specific requirements or questions?" className="w-full p-3.5 bg-white border border-ink-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-[14px] text-ink-900 resize-none" />
          <span className="absolute bottom-2.5 right-3.5 text-[11px] text-ink-400">{msg.length}/500</span>
        </div>

        <button type="button" onClick={() => setAgree((v) => !v)} className="w-full flex items-start gap-3 mt-4 text-left">
          <span className={cx('w-5 h-5 rounded-md grid place-items-center shrink-0 mt-0.5 transition', agree ? 'bg-brand-600' : 'border-2 border-ink-300 bg-white')}>{agree && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}</span>
          <span className="text-[12.5px] text-ink-600 leading-snug">I agree to be contacted by Builtglory and the property owner regarding this enquiry</span>
        </button>
        <div className="mt-4 p-3 rounded-xl bg-ink-50 flex items-start gap-2 text-[12px] text-ink-500"><Icon name="lock" size={14} color="#94A3B8" className="mt-0.5 shrink-0" />Your information is secure and shared only with the property owner.</div>

        <FormError message={formError} />
        <Button size="lg" className="w-full mt-4" icon="send" loading={submitting} disabled={!agree || !name.trim() || !phone.trim()} onClick={() => void submit()}>Submit Enquiry</Button>
      </Card>
    </PageWrap>
  );
}
