'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Card, Empty } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { ErrorState, Loading } from '../ui/StateViews';
import { useContent } from '../../hooks/useContent';
import { useBack } from '../../hooks/useNavigation';
import { useToast } from '../../context/ToastContext';
import { supportContact, useAppConfig } from '../../context/AppConfigContext';
import { cx } from '../../lib/format';
import { LEGAL_ICON, LEGAL_TABS, LegalBody, findLegal, legalId, parseLegal, updatedLabel, type LegalDocName } from './LegalBody';

export function LegalPage({ initialDoc }: { initialDoc?: string }) {
  const router = useRouter();
  const back = useBack('/about');
  const { toast, toastError } = useToast();
  const contact = supportContact(useAppConfig());
  const [doc, setDoc] = useState<LegalDocName>(initialDoc === 'Privacy Policy' || initialDoc === 'Legal & RERA' ? initialDoc : 'Terms of Service');
  const [active, setActive] = useState<string | null>(null);
  const { data, loading, error, reload } = useContent('legal');
  const item = findLegal(data, doc);
  const headings = item ? parseLegal(item.body).map((s) => s.heading).filter((h): h is string => Boolean(h)) : [];

  const goTo = (h: string) => {
    setActive(h);
    const el = document.getElementById(legalId(h));
    const sc = document.getElementById('wa-main');
    if (el && sc) sc.scrollTo({ top: el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 16, behavior: 'smooth' });
  };
  const email = () => {
    if (!contact.email) { router.push('/support'); return; }
    navigator.clipboard.writeText(contact.email).then(() => toast('Email copied: ' + contact.email, 'mail')).catch(() => toastError('Could not copy the email address.'));
  };

  return (
    <PageWrap className="!max-w-[1120px]">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[13px] font-semibold text-ink-500 hover:text-brand-600 mb-3"><Icon name="arrow-left" size={16} />Back</button>
      <div className="relative overflow-hidden rounded-3xl p-7 text-white" style={{ background: 'linear-gradient(135deg,#0A3270 0%,#1259D4 60%,#1A6FFF 100%)' }}>
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10"></div>
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 grid place-items-center shrink-0"><Icon name={LEGAL_ICON[doc]} size={26} color="#fff" /></div>
          <div><h1 className="text-[26px] font-extrabold tracking-tight">{doc}</h1><div className="text-[13px] text-white/75">{item ? `Last updated ${updatedLabel(item)} · ` : ''}Builtglory Technologies Pvt. Ltd.</div></div>
        </div>
        <div className="relative flex gap-2 mt-5">
          {LEGAL_TABS.map((k) => <button type="button" key={k} onClick={() => { setDoc(k); setActive(null); document.getElementById('wa-main')?.scrollTo({ top: 0, behavior: 'smooth' }); }} className={cx('h-9 px-4 rounded-full text-[13px] font-bold transition', doc === k ? 'bg-white text-brand-700' : 'bg-white/15 text-white hover:bg-white/25')}>{k}</button>)}
        </div>
      </div>
      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start mt-6">
        <Card className="p-3 lg:sticky lg:top-4 hidden lg:block">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink-400 px-3 pt-1 pb-2">On this page</div>
          {headings.length ? headings.map((h, i) => <button type="button" key={h} onClick={() => goTo(h)} className={cx('w-full text-left flex gap-2 px-3 py-2 rounded-lg text-[13px] transition', active === h ? 'bg-brand-50 text-brand-700 font-bold' : 'text-ink-600 hover:bg-ink-50')}><span className="tabular-nums text-ink-400">{i + 1}.</span>{h}</button>)
            : <div className="px-3 py-2 text-[13px] text-ink-600">{item?.title ?? doc}</div>}
        </Card>
        <div className="space-y-4">
          {loading && !data ? <Card className="p-7"><Loading lines label="Loading document" /></Card>
            : error ? <ErrorState message={error} onRetry={reload} />
            : item ? <Card key={doc} className="p-7 fade-in"><LegalBody item={item} /></Card>
            : <Empty icon={LEGAL_ICON[doc]} title="Not published yet" sub={`The ${doc} document hasn't been published.`} />}
          <Card className="p-5 flex flex-wrap items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-brand-50 grid place-items-center shrink-0"><Icon name="headset" size={20} color="#1A6FFF" /></div>
            <div className="flex-1 min-w-[200px]"><div className="text-[14.5px] font-bold text-ink-900">Questions about this {doc === 'Privacy Policy' ? 'policy' : 'agreement'}?</div><div className="text-[12.5px] text-ink-500">Our team responds within 72 hours.</div></div>
            <Button variant="outline" icon="mail" onClick={email}>Email us</Button>
            <Button icon="message-circle" onClick={() => router.push('/support')}>Contact support</Button>
          </Card>
        </div>
      </div>
    </PageWrap>
  );
}
