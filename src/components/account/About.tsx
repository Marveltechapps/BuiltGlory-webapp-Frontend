'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { LogoMark } from '../ui/LogoMark';
import { Card } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { useContent } from '../../hooks/useContent';
import { useListingTotal } from '../../hooks/useProperties';
import { useAppConfig } from '../../context/AppConfigContext';
import { useToast } from '../../context/ToastContext';
import { shareLink } from '../../lib/share';

const LINKS: Array<[string, string]> = [['file-text', 'Terms of Service'], ['shield', 'Privacy Policy'], ['scale', 'Legal & RERA'], ['star', 'Rate the app'], ['share-2', 'Share Builtglory']];

export function About() {
  const router = useRouter();
  const config = useAppConfig();
  const { toast, toastError } = useToast();
  const total = useListingTotal();
  const content = useContent('about');
  const about = content.data?.[0];
  const version = config?.versions?.current || about?.metadata?.version;
  const storeUrl = config?.storeUrls?.android || config?.storeUrls?.ios || null;

  const open = (label: string) => {
    if (label === 'Rate the app') {
      if (storeUrl) window.open(storeUrl, '_blank', 'noopener,noreferrer');
      else toast('Thanks for rating us!', 'star');
      return;
    }
    if (label === 'Share Builtglory') {
      shareLink('Builtglory', window.location.origin).then((r) => { if (r === 'copied') toast('Share link copied', 'share-2'); }).catch(() => toastError('Could not share this link.'));
      return;
    }
    router.push(`/legal?doc=${encodeURIComponent(label)}`);
  };

  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <Card className="p-8 text-center">
        <LogoMark className="w-20 h-20 rounded-3xl mx-auto shadow-[0_10px_30px_-6px_rgba(26,111,255,.6)]" />
        <h1 className="text-[24px] font-extrabold tracking-tight text-ink-900 mt-4">Builtglory</h1>
        <div className="text-[13px] text-ink-400">{version ? `Version ${version}` : ' '}</div>
        <p className="text-[14px] text-ink-600 leading-relaxed mt-4 max-w-md mx-auto">{about?.body || about?.excerpt || (content.loading ? 'Loading…' : 'Builtglory is a zero-brokerage real estate platform where every listing is legally verified before it reaches you.')}</p>
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[[total.data !== null ? total.data.toLocaleString('en-IN') : '—', 'Listings'], [config?.stats?.cities != null ? String(config.stats.cities) : '—', 'Cities'], [config?.stats?.appRating != null ? `${config.stats.appRating}★` : '—', 'App rating']].map(([v, l]) => <div key={l} className="rounded-xl bg-ink-50 p-3"><div className="text-[18px] font-extrabold text-ink-900">{v}</div><div className="text-[11px] text-ink-400">{l}</div></div>)}
        </div>
      </Card>
      <Card className="divide-y divide-ink-100 mt-4">
        {LINKS.map(([ic, l]) => (
          <button type="button" key={l} onClick={() => open(l)} className="w-full flex items-center gap-4 p-4 hover:bg-ink-50 transition text-left">
            <div className="w-10 h-10 rounded-xl bg-ink-100 grid place-items-center shrink-0"><Icon name={ic} size={18} color="#334155" /></div>
            <span className="flex-1 text-[14px] font-semibold text-ink-900">{l}</span><Icon name="chevron-right" size={17} color="#CBD5E1" />
          </button>
        ))}
      </Card>
      <div className="text-center text-[12px] text-ink-400 mt-6">© {about?.metadata?.copyright || '2026 Builtglory'} Technologies Pvt. Ltd.<br />{about?.metadata?.address || 'Made with care in Chennai, India.'}</div>
    </PageWrap>
  );
}
