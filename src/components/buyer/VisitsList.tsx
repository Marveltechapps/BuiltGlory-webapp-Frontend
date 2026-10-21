'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Pill, Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { Card, Empty } from '../ui/Card';
import { PageWrap, SectionHead } from '../ui/PageWrap';
import { FormError } from '../ui/FormFields';
import { ErrorState, InlineNote, Loading } from '../ui/StateViews';
import { usePagedQuery } from '../../hooks/useApiQuery';
import { useRecordRefresh } from '../../lib/realtime';
import { useToast } from '../../context/ToastContext';
import { cancelVisit, listMyVisits } from '../../services/visitService';
import { errorMessage } from '../../services/api';
import { shortDate } from '../../lib/format';
import type { Visit } from '../../types/visit';

const TABS = ['All', 'Upcoming', 'Completed', 'Cancelled'];
const visitGroup = (v: Visit) => (v.status === 'completed' ? 'completed' : v.status === 'cancelled' || v.status === 'missed' ? 'cancelled' : 'upcoming');
interface VisitRow { visit: Visit }

export function VisitsList() {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState('Upcoming');
  const [cancelRow, setCancelRow] = useState<VisitRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const page = usePagedQuery((p, signal) => listMyVisits({ page: p, limit: 20 }, signal), []);
  useRecordRefresh(page.reload);
  const { loading, error, reload } = page;
  const list: VisitRow[] = page.items.map((visit) => ({ visit }));
  const rows = list.filter(({ visit }) => filter === 'All' || visitGroup(visit) === filter.toLowerCase());

  const doCancel = async () => {
    if (!cancelRow) return;
    setBusy(true);
    setCancelError(null);
    try {
      await cancelVisit(cancelRow.visit._id, 'Cancelled by buyer from My Visits');
      setCancelRow(null);
      toast('Visit cancelled');
      reload();
    } catch (e) {
      setCancelError(errorMessage(e, 'Could not cancel this visit.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageWrap className="!max-w-[1240px] web-list">
      <SectionHead title="My Visits" sub={`${page.meta?.total ?? list.length} total`} />
      <div className="flex flex-wrap gap-2 mb-5">{TABS.map((t) => <Pill key={t} active={filter === t} onClick={() => setFilter(t)}>{t}</Pill>)}</div>
      {loading && list.length === 0 ? <Loading label="Loading visits" />
        : error ? <ErrorState message={error} onRetry={reload} />
        : list.length === 0 ? <Empty icon="calendar" title="No visits yet" sub="Schedule a site visit from any property you have enquired about." action={<Button onClick={() => router.push('/enquiries')} iconRight="arrow-right">My Enquiries</Button>} />
        : (
          <div className="space-y-4">
            {rows.map(({ visit: v }) => {
              const g = visitGroup(v);
              const enquiryQuery = v.enquiryId ? `enquiryId=${v.enquiryId}&` : '';
              const book = `/properties/${v.propertyId}/visit?${enquiryQuery}`;
              const title = v.propertySnapshot?.title || 'Property';
              const location = v.propertySnapshot?.location;
              return (
                <Card key={v._id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-[16px] font-bold text-ink-900">{title}</h3><div className="text-[13px] text-ink-500 mt-0.5">{v.visitType === 'virtual' ? 'Video call' : 'Site visit'}{location ? ` · ${location}` : ''}</div></div>
                    <Tag tone={g === 'completed' ? 'green' : g === 'cancelled' ? 'rose' : 'brand'}>{v.status === 'missed' ? 'missed' : g}</Tag>
                  </div>
                  <div className="flex items-center gap-5 text-[13px] font-semibold text-brand-600 mt-3">
                    <span className="flex items-center gap-1.5"><Icon name="calendar" size={15} color="#1A6FFF" />{shortDate(v.visitDate)}</span>
                    {v.visitTime && <span className="flex items-center gap-1.5"><Icon name="clock" size={15} color="#1A6FFF" />{v.visitTime}</span>}
                  </div>
                  {g === 'upcoming' ? (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button type="button" onClick={() => router.push(`${book}&visitId=${v._id}&type=${v.visitType}`)} className="h-11 rounded-xl border border-ink-200 text-[14px] font-semibold text-ink-700 hover:bg-ink-50 transition">Reschedule</button>
                      <button type="button" onClick={() => { setCancelError(null); setCancelRow({ visit: v }); }} className="h-11 rounded-xl border border-rose-200 text-rose-600 text-[14px] font-semibold hover:bg-rose-50 transition">Cancel</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button type="button" onClick={() => router.push(`/properties/${v.propertyId}`)} className="h-11 rounded-xl border border-ink-200 text-[14px] font-semibold text-ink-700 hover:bg-ink-50 transition">View Property</button>
                      <button type="button" onClick={() => router.push(book)} className="h-11 rounded-xl bg-brand-600 text-white text-[14px] font-semibold hover:bg-brand-700 transition">{g === 'completed' ? 'Visit Again' : 'Rebook Visit'}</button>
                    </div>
                  )}
                </Card>
              );
            })}
            {rows.length === 0 && <InlineNote>No {filter.toLowerCase()} visits.</InlineNote>}
            {page.hasMore && <button type="button" disabled={page.loadingMore} onClick={page.loadMore} className="w-full h-11 rounded-xl border border-ink-200 text-[14px] font-semibold text-ink-700 hover:bg-ink-50 transition disabled:opacity-60">{page.loadingMore ? 'Loading…' : 'Load more'}</button>}
          </div>
        )}
      {cancelRow && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/40 fade-in" onClick={() => !busy && setCancelRow(null)}></div>
          <div role="dialog" aria-modal="true" className="relative w-full max-w-[400px] bg-white rounded-3xl p-6 text-center pop-in">
            <div className="w-16 h-16 rounded-full bg-rose-50 grid place-items-center mx-auto"><Icon name="calendar-x" size={28} color="#E11D48" /></div>
            <h3 className="text-[18px] font-extrabold text-ink-900 mt-4">Cancel this visit?</h3>
            <p className="text-[13.5px] text-ink-500 mt-1.5">The seller will be notified. You can rebook anytime.</p>
            <FormError message={cancelError} />
            <button type="button" disabled={busy} onClick={() => void doCancel()} className="w-full h-12 rounded-xl bg-rose-600 text-white font-bold text-[14.5px] mt-5 hover:bg-rose-700 transition disabled:opacity-60">{busy ? 'Cancelling…' : 'Cancel Visit'}</button>
            <button type="button" disabled={busy} onClick={() => setCancelRow(null)} className="w-full h-12 rounded-xl bg-ink-50 text-ink-700 font-semibold text-[14px] mt-2.5 hover:bg-ink-100 transition">Keep Visit</button>
          </div>
        </div>
      )}
    </PageWrap>
  );
}
