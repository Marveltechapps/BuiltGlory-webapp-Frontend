'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Pill, Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { Card, Empty } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { PageWrap, SectionHead } from '../ui/PageWrap';
import { ThumbFill, gradFor } from '../ui/Photo';
import { ErrorState, InlineNote, Loading } from '../ui/StateViews';
import { useMySellRequests } from '../../hooks/useSellRequests';
import { useToast } from '../../context/ToastContext';
import { withdrawSellRequest } from '../../services/sellRequestService';
import { errorMessage } from '../../services/api';
import { typeLabel } from '../../lib/catalog';
import { daysBetween, expectedLive, listingChips } from '../../lib/listing';
import { cx, formatINR, mediumDate } from '../../lib/format';
import { LISTING_STEPS, isDiscardedDraft, listingGroup, listingStepIndex } from '../../lib/pipelines';
import type { SellRequest } from '../../types/sellRequest';

const TABS = ['All', 'Active', 'Upcoming', 'Drafts', 'Sold'] as const;
type Tab = (typeof TABS)[number];
const TONE: Record<string, string> = { active: 'text-emerald-600', upcoming: 'text-amber-600', sold: 'text-rose-600', withdrawn: 'text-ink-500' };
export function ListingsList({ tab }: { tab?: string }) {
  const router = useRouter();
  const { toast, toastError } = useToast();
  const initial = TABS.find((t) => t === tab) ?? 'All';
  const [filter, setFilter] = useState<Tab>(initial);
  const [delId, setDelId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { data, loading, error, reload } = useMySellRequests(true);

  const items = (data?.items ?? []).filter((r) => !isDiscardedDraft(r));
  const drafts = items.filter((r) => listingGroup(r) === 'draft');
  const listings = items.filter((r) => listingGroup(r) !== 'draft');
  const count = (t: Tab) => (t === 'All' ? listings.length : t === 'Drafts' ? drafts.length : listings.filter((r) => listingGroup(r) === t.toLowerCase()).length);
  const rows = listings.filter((r) => filter === 'All' || listingGroup(r) === filter.toLowerCase());
  const open = (r: SellRequest) => router.push(listingGroup(r) === 'sold' ? `/listings/${r._id}/sold` : `/listings/${r._id}`);

  const deleteDraft = async () => {
    if (!delId) return;
    setDeleting(true);
    try {
      await withdrawSellRequest(delId);
      setDelId(null);
      toast('Draft deleted', 'trash-2');
      reload();
    } catch (e) {
      toastError(errorMessage(e, 'Could not delete this draft.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageWrap className="!max-w-[1240px] web-list">
      <SectionHead title="My Listings" sub={`${listings.length} listings · ${drafts.length} drafts`} action={<Button icon="plus" onClick={() => router.push('/sell')}>New listing</Button>} />
      <div className="flex flex-wrap gap-2 mb-5">{TABS.map((t) => <Pill key={t} active={filter === t} onClick={() => setFilter(t)}>{t} ({count(t)})</Pill>)}</div>
      {loading && !data ? <Loading label="Loading listings" />
        : error ? <ErrorState message={error} onRetry={reload} />
        : filter === 'Drafts' ? (
          <div className="space-y-3.5">
            {drafts.map((d) => {
              const step = Math.min(5, Math.max(0, (d.draftStep ?? 1) - 1));
              const label = typeLabel(d.propertyType);
              return (
                <Card key={d._id} className="p-4 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-ink-100 border-2 border-dashed border-ink-300 grid place-items-center shrink-0"><Icon name="file-text" size={26} color="#64748B" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><h3 className="text-[15px] font-bold text-ink-900 truncate">{d.propertyTitle || `Untitled ${label}`}</h3><Tag tone="amber">Draft</Tag></div>
                    <div className="text-[13px] text-ink-500 mt-0.5">{label} · Last edited {mediumDate(d.updatedAt || d.createdAt) || '—'}</div>
                    <div className="flex items-center gap-3 mt-2.5">
                      <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden max-w-[240px]"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.round((step / 6) * 100)}%` }}></div></div>
                      <span className="text-[12px] font-semibold text-ink-500">Step {step + 1} of 6</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <Button size="sm" icon="pencil" onClick={() => router.push(`/sell?draft=${d._id}`)}>Continue</Button>
                    <button type="button" onClick={() => setDelId(d._id)} className="h-9 px-3.5 rounded-xl border border-rose-200 text-rose-600 text-[13px] font-semibold hover:bg-rose-50 transition flex items-center justify-center gap-1.5"><Icon name="trash-2" size={14} color="#E11D48" />Delete</button>
                  </div>
                </Card>
              );
            })}
            {drafts.length === 0 && <Empty icon="file-text" title="No drafts" sub="Listings you save before submitting appear here." action={<Button icon="plus" onClick={() => router.push('/sell')}>Start a listing</Button>} />}
          </div>
        ) : listings.length === 0 && filter === 'All' ? <Empty icon="tag" title="No listings yet" sub="List your property in minutes — zero brokerage." action={<Button icon="plus" onClick={() => router.push('/sell')}>New listing</Button>} />
        : (
          <div className="space-y-3.5">
            {rows.map((r) => {
              const g = listingGroup(r);
              const stepIdx = Math.min(listingStepIndex(r), LISTING_STEPS.length - 1);
              const price = r.askingPrice ? formatINR(r.askingPrice) : '—';
              return (
                <Card key={r._id} onClick={() => open(r)} className="p-4 flex items-start gap-4 cursor-pointer hover:shadow-md hover:border-brand-300 transition">
                  <div className={cx('w-24 h-24 rounded-2xl bg-gradient-to-br grid place-items-start p-2 shrink-0 relative overflow-hidden group', gradFor(r._id))}><ThumbFill src={r.photos?.[0]} />
                    <span className={cx('relative text-[10px] font-bold px-2 py-0.5 rounded-full bg-white capitalize', TONE[g])}>{g === 'sold' ? 'Sold out' : g}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-bold text-ink-900 truncate">{r.propertyTitle || 'Untitled listing'}</h3>
                    <div className="text-[13px] text-ink-500 flex items-center gap-1"><Icon name="map-pin" size={13} />{[r.address?.locality, r.address?.city].filter(Boolean).join(', ') || '—'}</div>
                    {listingChips(r).length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{listingChips(r).map((c) => <span key={c} className="text-[11.5px] font-semibold text-ink-600 bg-ink-100 rounded-md px-2 py-0.5">{c}</span>)}</div>}
                    {(g === 'active' || g === 'withdrawn') && <div className="flex items-center gap-4 text-[12px] text-ink-500 mt-2"><span className="text-[15px] font-extrabold text-brand-600">{price}</span><span className="flex items-center gap-1"><Icon name="eye" size={13} />{(r.metrics?.views ?? 0).toLocaleString()} views</span><span className="flex items-center gap-1"><Icon name="message-square" size={13} />{r.metrics?.enquiryCount ?? 0} enquiries</span></div>}
                    {g === 'upcoming' && (
                      <div className="mt-2.5 rounded-xl bg-amber-50 border border-amber-100 p-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
                        <span className="font-extrabold text-brand-600 text-[14px]">{price}</span>
                        <span className="flex items-center gap-1 font-semibold text-amber-700"><Icon name="loader" size={13} color="#D97706" />{LISTING_STEPS[stepIdx]?.t} · Step {stepIdx + 1} of {LISTING_STEPS.length}</span>
                        {r.submittedAt && <span className="text-ink-500">Submitted {mediumDate(r.submittedAt)}</span>}
                        {expectedLive(r) && <span className="text-ink-500">Expected live <b className="text-ink-800">{mediumDate(expectedLive(r))}</b></span>}
                      </div>
                    )}
                    {g === 'sold' && (
                      <div className="mt-2.5 rounded-xl bg-rose-50 border border-rose-100 p-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
                        <span className="text-ink-500">Sold for <b className="text-[14px] font-extrabold text-ink-900">{r.sale?.salePrice ? formatINR(r.sale.salePrice) : price}</b></span>
                        {r.sale?.saleDate && <span className="text-ink-500">on <b className="text-ink-800">{mediumDate(r.sale.saleDate)}</b></span>}
                        {r.sale?.buyerName && <span className="text-ink-500">Buyer <b className="text-ink-800">{r.sale.buyerName}</b></span>}
                        {daysBetween(r.submittedAt || r.createdAt, r.sale?.saleDate) && <span className="text-ink-500">in {daysBetween(r.submittedAt || r.createdAt, r.sale?.saleDate)} days</span>}
                      </div>
                    )}
                  </div>
                  <Icon name="chevron-right" size={18} color="#CBD5E1" className="self-center" />
                </Card>
              );
            })}
            {rows.length === 0 && <InlineNote>No {filter.toLowerCase()} listings.</InlineNote>}
          </div>
        )}
      <Modal open={!!delId} onClose={() => !deleting && setDelId(null)} maxW={400}>
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 grid place-items-center mx-auto"><Icon name="trash-2" size={28} color="#E11D48" /></div>
          <h3 className="text-[18px] font-extrabold text-ink-900 mt-4">Delete this draft?</h3>
          <p className="text-[13.5px] text-ink-500 mt-1.5">The details you&apos;ve entered will be lost.</p>
          <button type="button" disabled={deleting} onClick={() => void deleteDraft()} className="w-full h-12 rounded-xl bg-rose-600 text-white font-bold text-[14.5px] mt-5 hover:bg-rose-700 transition disabled:opacity-60">{deleting ? 'Deleting…' : 'Delete Draft'}</button>
          <button type="button" disabled={deleting} onClick={() => setDelId(null)} className="w-full h-12 rounded-xl bg-ink-50 text-ink-700 font-semibold text-[14px] mt-2.5 hover:bg-ink-100 transition">Keep</button>
        </div>
      </Modal>
    </PageWrap>
  );
}
