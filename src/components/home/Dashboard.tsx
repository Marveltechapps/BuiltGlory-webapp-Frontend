'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { Empty } from '../ui/Card';
import { PageWrap, SectionHead } from '../ui/PageWrap';
import { PropCard } from '../ui/PropCard';
import { Loading, ErrorState } from '../ui/StateViews';
import { useListingTotal, useProperties } from '../../hooks/useProperties';
import { cx } from '../../lib/format';
import { stockUrl } from '../../lib/stock';

const toneBg: Record<string, string> = { brand: 'bg-brand-50 text-brand-600', green: 'bg-emerald-50 text-emerald-600', violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600' };

export function Dashboard() {
  const router = useRouter();
  const total = useListingTotal();
  const featured = useProperties({ featured: true, limit: 6 });
  const upcoming = useProperties({ upcoming: true, limit: 4 });
  const stats = [
    { icon: 'building-2', label: 'Live listings', value: total.data !== null ? total.data.toLocaleString('en-IN') : '—', tone: 'brand' },
    { icon: 'badge-check', label: 'Legally verified', value: '100%', tone: 'green' },
    { icon: 'badge-indian-rupee', label: 'Brokerage', value: '0%', tone: 'violet' },
    { icon: 'headset', label: 'Support', value: '24×7', tone: 'amber' },
  ];
  return (
    <div>
      {/* hero */}
      <div className="relative overflow-hidden border-b border-ink-200" style={{ background: 'linear-gradient(120deg,#0A3270,#1259D4 55%,#1A6FFF)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative hero art from the design */}
        <img src={stockUrl('hero-home')} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35 kenburns" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg,rgba(7,28,68,.92) 0%,rgba(10,50,112,.75) 45%,rgba(18,89,212,.35) 100%)' }}></div>
        <div className="absolute inset-0 bg-grid opacity-30"></div>
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle,rgba(255,255,255,.16),transparent 70%)' }}></div>
        <PageWrap className="relative py-20">
          <Tag tone="brand"><span className="text-brand-700">✦ No brokerage, ever</span></Tag>
          <h1 className="text-white text-[40px] leading-[1.1] font-extrabold tracking-tight mt-4 max-w-2xl">Find a home that&apos;s already verified.</h1>
          <p className="text-white/75 text-[15.5px] mt-3 max-w-xl">Every listing on Builtglory passes legal, title and site checks before it reaches you. Buy, sell and close — all in one place.</p>
        </PageWrap>
      </div>

      <PageWrap>
        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-16 relative z-10">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-ink-200 p-5 shadow-sm">
              <div className={cx('w-11 h-11 rounded-xl grid place-items-center', toneBg[s.tone])}><Icon name={s.icon} size={20} /></div>
              <div className="text-[26px] font-extrabold text-ink-900 mt-3 leading-none">{s.value}</div>
              <div className="text-[12.5px] text-ink-500 mt-1.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* featured */}
        <div className="mt-12">
          <SectionHead title="Featured properties" sub="Hand-picked, ready to move in" action={<Button variant="outline" size="sm" iconRight="arrow-right" onClick={() => router.push('/browse')}>View all</Button>} />
          {featured.loading && !featured.data ? <Loading label="Loading properties" />
            : featured.error ? <ErrorState compact message={featured.error} onRetry={featured.reload} />
            : featured.data && featured.data.items.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {featured.data.items.map((p) => <PropCard key={p._id} p={p} />)}
              </div>
            ) : <Empty icon="building-2" title="No featured properties yet" sub="Browse every verified listing instead." action={<Button onClick={() => router.push('/browse')} iconRight="arrow-right">Browse properties</Button>} />}
        </div>

        {/* upcoming */}
        <div className="mt-12">
          <SectionHead title="Upcoming launches" sub="Get notified before they go live" />
          {upcoming.loading && !upcoming.data ? <Loading label="Loading launches" />
            : upcoming.error ? <ErrorState compact message={upcoming.error} onRetry={upcoming.reload} />
            : upcoming.data && upcoming.data.items.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {upcoming.data.items.map((p) => <PropCard key={p._id} p={p} wide />)}
              </div>
            ) : <Empty icon="rocket" title="No upcoming launches right now" sub="New launches appear here as soon as they are announced." />}
        </div>

        {/* CTA band */}
        <div className="mt-12 rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(120deg,#0F172A,#1259D4)' }}>
          <div className="absolute inset-0 bg-grid opacity-30"></div>
          <div className="relative p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center gap-6 justify-between">
            <div>
              <h3 className="text-white text-[26px] font-extrabold tracking-tight">Own a property? List it in minutes.</h3>
              <p className="text-white/70 text-[14px] mt-2 max-w-lg">Zero commission. We handle verification, visits and escrow so you close faster.</p>
            </div>
            <Button size="lg" variant="soft" icon="tag" onClick={() => router.push('/sell')} className="!bg-white !text-brand-700 shrink-0">Start selling</Button>
          </div>
        </div>
      </PageWrap>
    </div>
  );
}
