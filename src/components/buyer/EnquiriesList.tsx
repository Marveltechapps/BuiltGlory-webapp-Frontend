'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Pill, Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { Card, Empty } from '../ui/Card';
import { PageWrap, SectionHead } from '../ui/PageWrap';
import { Wave, gradFor } from '../ui/Photo';
import { ErrorState, InlineNote, Loading } from '../ui/StateViews';
import { useMyEnquiries } from '../../hooks/useEnquiries';
import { cx, formatINR, shortDate } from '../../lib/format';
import { enquiryBadge, enquiryGroup, enquiryNote } from '../../lib/pipelines';

const TABS = ['All', 'Active', 'Completed', 'Cancelled'];

export function EnquiriesList() {
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const { data, loading, error, reload } = useMyEnquiries(true);
  const all = data?.items ?? [];
  const rows = all.filter((r) => filter === 'All' || enquiryGroup(r) === filter.toLowerCase());
  return (
    <PageWrap className="!max-w-[1240px] web-list">
      <SectionHead title="My Enquiries" sub={`${data?.meta.total ?? all.length} total`} />
      <div className="flex flex-wrap gap-2 mb-5">{TABS.map((t) => <Pill key={t} active={filter === t} onClick={() => setFilter(t)}>{t}</Pill>)}</div>
      {loading && !data ? <Loading label="Loading enquiries" />
        : error ? <ErrorState message={error} onRetry={reload} />
        : all.length === 0 ? <Empty icon="inbox" title="No enquiries yet" sub="Submit an enquiry on any property to track it here." action={<Button onClick={() => router.push('/browse')} iconRight="arrow-right">Browse properties</Button>} />
        : (
          <div className="space-y-3.5">
            {rows.map((r) => {
              const badge = enquiryBadge(r);
              return (
                <Card key={r._id} onClick={() => router.push(`/enquiries/${r._id}`)} className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-brand-300 transition">
                  <div className={cx('w-20 h-20 rounded-2xl bg-gradient-to-br p-2 shrink-0 relative overflow-hidden group', gradFor(r.propertyId))}><Wave /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><h3 className="text-[15px] font-bold text-ink-900 truncate">{r.propertySnapshot?.title ?? 'Property'}</h3><Tag tone={badge.tone}>{badge.label}</Tag></div>
                    <div className="text-[13px] text-ink-500 mt-0.5">{[r.propertySnapshot?.location, r.propertySnapshot?.price ? formatINR(r.propertySnapshot.price) : null].filter(Boolean).join(' · ')}</div>
                    <div className="flex items-center gap-1.5 text-[12px] text-ink-400 mt-1"><Icon name="clock" size={13} />{shortDate(r.submittedAt || r.createdAt)}</div>
                    <p className="text-[13px] text-ink-600 mt-1.5">{enquiryNote(r)}</p>
                  </div>
                  <Icon name="chevron-right" size={18} color="#CBD5E1" />
                </Card>
              );
            })}
            {rows.length === 0 && <InlineNote>No {filter.toLowerCase()} enquiries.</InlineNote>}
          </div>
        )}
    </PageWrap>
  );
}
