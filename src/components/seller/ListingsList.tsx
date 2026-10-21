'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Pill } from '../ui/Tag';
import { Button } from '../ui/Button';
import { Card, Empty } from '../ui/Card';
import { PageWrap, SectionHead } from '../ui/PageWrap';
import { ThumbFill, Wave, gradFor } from '../ui/Photo';
import { ErrorState, InlineNote, Loading } from '../ui/StateViews';
import { useMySellRequests } from '../../hooks/useSellRequests';
import { cx, formatINR } from '../../lib/format';
import { listingGroup } from '../../lib/pipelines';

const TABS = ['All', 'Active', 'Sold', 'Withdrawn'];

export function ListingsList() {
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const { data, loading, error, reload } = useMySellRequests(true);
  const all = data?.items ?? [];
  const rows = all.filter((r) => filter === 'All' || listingGroup(r) === filter.toLowerCase());
  return (
    <PageWrap className="!max-w-[1240px] web-list">
      <SectionHead title="My listings" sub={`${data?.meta.total ?? all.length} total`} action={<Button icon="plus" onClick={() => router.push('/sell')}>New listing</Button>} />
      <div className="flex flex-wrap gap-2 mb-5">{TABS.map((t) => <Pill key={t} active={filter === t} onClick={() => setFilter(t)}>{t}</Pill>)}</div>
      {loading && !data ? <Loading label="Loading listings" />
        : error ? <ErrorState message={error} onRetry={reload} />
        : all.length === 0 ? <Empty icon="tag" title="No listings yet" sub="List your property in minutes — zero brokerage." action={<Button icon="plus" onClick={() => router.push('/sell')}>New listing</Button>} />
        : (
          <div className="space-y-3.5">
            {rows.map((r) => {
              const g = listingGroup(r);
              return (
                <Card key={r._id} onClick={() => router.push(`/listings/${r._id}`)} className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-brand-300 transition">
                  <div className={cx('w-20 h-20 rounded-2xl bg-gradient-to-br grid place-items-start p-2 shrink-0 relative overflow-hidden group', gradFor(r._id))}><ThumbFill src={r.photos?.[0]} />
                    <span className={cx('relative text-[10px] font-bold px-2 py-0.5 rounded-full bg-white', g === 'sold' ? 'text-rose-600' : g === 'withdrawn' ? 'text-ink-500' : 'text-emerald-600')}>{r.status.replace(/_/g, ' ')}</span>
                    <Wave />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-bold text-ink-900 truncate">{r.propertyTitle || 'Untitled listing'}</h3>
                    <div className="text-[13px] text-ink-500">{r.address?.locality || r.address?.city || '—'}</div>
                    <div className="text-[15px] font-extrabold text-brand-600 mt-1">{r.askingPrice ? formatINR(r.askingPrice) : '—'}</div>
                    <div className="flex items-center gap-4 text-[12px] text-ink-400 mt-1.5"><span className="flex items-center gap-1"><Icon name="eye" size={13} />{(r.metrics?.views ?? 0).toLocaleString()}</span><span className="flex items-center gap-1"><Icon name="message-square" size={13} />{r.metrics?.enquiryCount ?? 0}</span></div>
                  </div>
                </Card>
              );
            })}
            {rows.length === 0 && <InlineNote>No {filter.toLowerCase()} listings.</InlineNote>}
          </div>
        )}
    </PageWrap>
  );
}
