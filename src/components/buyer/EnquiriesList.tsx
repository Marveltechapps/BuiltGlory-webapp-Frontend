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
import { useSession } from '../../context/SessionContext';
import { cx, formatINR, shortDate } from '../../lib/format';
import { ENQ_LAST, ENQ_STEPS, enquiryBadge, enquiryGroup, enquiryNote, enquiryStepIndex } from '../../lib/pipelines';

const TABS = ['All', 'Active', 'Completed', 'Cancelled'];

export function EnquiriesList() {
  const router = useRouter();
  const { user } = useSession();
  const kyc = user?.kycStatus === 'verified';
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
              const badge = enquiryBadge(r, kyc);
              const group = enquiryGroup(r);
              const stage = enquiryStepIndex(r, kyc);
              const step = ENQ_STEPS[stage]!;
              const open = (act?: boolean) => router.push(`/enquiries/${r._id}${act ? '?act=1' : ''}`);
              return (
                <Card key={r._id} onClick={() => open()} className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-brand-300 transition">
                  <div className={cx('w-20 h-20 rounded-2xl bg-gradient-to-br p-2 shrink-0 relative overflow-hidden group', gradFor(r.propertyId))}><Wave /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><h3 className="text-[15px] font-bold text-ink-900 truncate">{r.propertySnapshot?.title ?? 'Property'}</h3><Tag tone={badge.tone}>{badge.label}</Tag></div>
                    <div className="text-[13px] text-ink-500 mt-0.5">{[r.propertySnapshot?.location, r.propertySnapshot?.price ? formatINR(r.propertySnapshot.price) : null].filter(Boolean).join(' · ')}</div>
                    <div className="flex items-center gap-1.5 text-[12px] text-ink-400 mt-1"><Icon name="clock" size={13} />{shortDate(r.submittedAt || r.createdAt)}</div>
                    <p className="text-[13px] text-ink-600 mt-1.5">{enquiryNote(r, kyc)}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      <div className="flex gap-1">{ENQ_STEPS.map((_, i) => <span key={i} className={cx('h-1.5 w-4 rounded-full', i < stage || (group === 'completed') ? 'bg-emerald-500' : i === stage && group === 'active' ? 'bg-brand-600' : 'bg-ink-200')}></span>)}</div>
                      <span className="text-[11.5px] font-semibold text-ink-500">Step {Math.min(stage + 1, ENQ_STEPS.length)} of {ENQ_STEPS.length}</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-2 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                    {group === 'active' && stage < ENQ_LAST && step.act
                      ? <Button size="sm" icon={step.icon} onClick={() => open(true)}>{step.act}</Button>
                      : <Button size="sm" variant="outline" icon="eye" onClick={() => open()}>View Details</Button>}
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
