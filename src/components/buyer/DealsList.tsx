'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Pill, Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { Card, Empty } from '../ui/Card';
import { PageWrap, SectionHead } from '../ui/PageWrap';
import { gradFor } from '../ui/Photo';
import { ErrorState, InlineNote, Loading } from '../ui/StateViews';
import { usePagedQuery } from '../../hooks/useApiQuery';
import { useRecordRefresh } from '../../lib/realtime';
import { listMyDeals } from '../../services/enquiryService';
import { cancelTokenPayment, createTokenPayment, listMyPayments } from '../../services/paymentService';
import { errorMessage } from '../../services/api';
import { useAppConfig } from '../../context/AppConfigContext';
import { useToast } from '../../context/ToastContext';
import { cx, formatINR } from '../../lib/format';
import type { CustomerDeal } from '../../types/enquiry';

interface DealRow { key: string; title: string; price: number | null; badge: string; progress: number; group: 'active' | 'completed'; href: string; side: CustomerDeal['side']; dealId: string }

const dealHref = (deal: CustomerDeal) => {
  if (deal.side === 'buyer') return deal.enquiryId ? `/enquiries/${deal.enquiryId}` : '/enquiries';
  const id = deal.sellRequestId || deal.id;
  if (deal.stageLabel === 'Completed' || deal.stage === 'acquired' || deal.stage === 'sold') return `/listings/${id}/sold`;
  if (deal.stageLabel === 'Registration') return `/listings/${id}/registration`;
  if (deal.stageLabel === 'Payment Schedule') return `/listings/${id}/payment-schedule`;
  return `/listings/${id}/deal-confirmed`;
};

const toRow = (deal: CustomerDeal): DealRow => {
  const completed = deal.progressPercent >= 100 || deal.stage === 'closed' || deal.stage === 'acquired' || deal.stageLabel === 'Completed';
  return {
    key: `${deal.side}-${deal.id}`,
    title: deal.title || 'Property',
    price: deal.price,
    badge: deal.stageLabel || deal.stage,
    progress: deal.progressPercent,
    group: completed ? 'completed' : 'active',
    href: dealHref(deal),
    side: deal.side,
    dealId: deal.id,
  };
};

function TokenPayment({ dealId }: { dealId: string }) {
  const { toast, toastError } = useToast();
  const config = useAppConfig();
  const configured = config?.payment?.tokenAmount ?? null;
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<'bank' | 'upi' | 'cheque' | 'cash'>('upi');
  const [reference, setReference] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    listMyPayments(controller.signal)
      .then((rows) => {
        const pending = rows.find((row) => row.dealId === dealId && (row.status === 'pending' || row.status === 'created'));
        setPendingId(pending?._id ?? null);
      })
      .catch(() => setPendingId(null));
    return () => controller.abort();
  }, [dealId]);
  const submit = async () => {
    if (!(configured && configured > 0)) {
      toastError('Token amount is not available yet.');
      return;
    }
    setBusy(true);
    try {
      const created = await createTokenPayment({ dealId, amount: configured, method, transactionReference: reference.trim() || undefined });
      setPendingId(created._id);
      toast('Token payment submitted for verification');
      setOpen(false);
    } catch (e) {
      toastError(errorMessage(e, 'Could not record the token payment.'));
    } finally {
      setBusy(false);
    }
  };
  const cancel = async () => {
    if (!pendingId) return;
    setBusy(true);
    try {
      await cancelTokenPayment(pendingId);
      setPendingId(null);
      toast('Token payment cancelled');
    } catch (e) {
      toastError(errorMessage(e, 'Could not cancel the token payment.'));
    } finally {
      setBusy(false);
    }
  };
  if (!open) {
    return (
      <div className="mt-2 space-y-2">
        <button type="button" onClick={() => setOpen(true)} className="w-full h-11 rounded-xl border border-ink-200 text-ink-800 font-bold text-[14px] hover:bg-ink-50 transition">Record token payment</button>
        {pendingId && <button type="button" disabled={busy} onClick={() => void cancel()} className="w-full h-11 rounded-xl border border-ink-200 text-ink-700 font-semibold text-[14px] disabled:opacity-60">Cancel pending payment</button>}
      </div>
    );
  }
  return (
    <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <p className="text-[12.5px] font-semibold text-ink-600">Token amount {configured ? `₹${configured.toLocaleString('en-IN')}` : 'loading…'}</p>
      <label className="block text-[12.5px] font-semibold text-ink-600">Method
        <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="mt-1 w-full h-10 px-3 border border-ink-200 rounded-lg bg-white">
          <option value="upi">UPI</option>
          <option value="bank">Bank</option>
          <option value="cheque">Cheque</option>
          <option value="cash">Cash</option>
        </select>
      </label>
      <label className="block text-[12.5px] font-semibold text-ink-600">Reference
        <input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 w-full h-10 px-3 border border-ink-200 rounded-lg" />
      </label>
      <button type="submit" disabled={busy} className="w-full h-11 rounded-xl bg-brand-600 text-white font-bold text-[14px] disabled:opacity-60">{busy ? 'Submitting…' : 'Submit payment'}</button>
    </form>
  );
}

const TABS = ['All', 'Active', 'Completed'];

/**
 * My Deals combines both sides of the marketplace:
 * buyer deals = enquiries with a linked sales deal; seller deals = listings whose Builtglory offer was accepted.
 */
export function DealsList() {
  const router = useRouter();
  const [filter, setFilter] = useState('Active');
  const page = usePagedQuery(async (p, signal) => {
    const res = await listMyDeals({ page: p, limit: 20 }, signal);
    return { items: res.items.map(toRow), meta: res.meta };
  }, []);
  useRecordRefresh(page.reload);

  const all = page.items;
  const rows = all.filter((d) => filter === 'All' || d.group === filter.toLowerCase());
  return (
    <PageWrap className="!max-w-[1240px] web-list">
      <SectionHead title="My Deals" sub={`${page.meta?.total ?? all.length} total`} />
      <div className="flex flex-wrap gap-2 mb-5">{TABS.map((t) => <Pill key={t} active={filter === t} onClick={() => setFilter(t)}>{t}</Pill>)}</div>
      {page.loading && all.length === 0 ? <Loading label="Loading deals" />
        : page.error ? <ErrorState message={page.error} onRetry={page.reload} />
        : all.length === 0 ? <Empty icon="handshake" title="No deals yet" sub="Deals appear here once an offer is agreed on a property you're buying or selling." action={<Button onClick={() => router.push('/enquiries')} iconRight="arrow-right">My Enquiries</Button>} />
        : (
          <div className="space-y-4">
            {rows.map((d) => (
              <Card key={d.key} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cx('w-11 h-11 rounded-xl bg-gradient-to-br shrink-0 relative overflow-hidden group', gradFor(d.key))}></div>
                    <div className="min-w-0"><h3 className="text-[16px] font-bold text-ink-900 truncate">{d.title}</h3><div className="text-[14px] font-extrabold text-brand-600">{d.price ? formatINR(d.price) : '—'}</div></div>
                  </div>
                  <Tag tone={d.group === 'completed' ? 'green' : 'brand'}>{d.badge}</Tag>
                </div>
                <div className="flex items-center justify-between text-[12.5px] mt-5 mb-1.5"><span className="text-ink-500 font-medium">Progress</span><span className="font-bold text-ink-900">{d.progress}%</span></div>
                <div className="h-2 rounded-full bg-ink-100 overflow-hidden"><div className={cx('h-full rounded-full', d.progress === 100 ? 'bg-emerald-500' : 'bg-brand-600')} style={{ width: `${d.progress}%` }}></div></div>
                <button type="button" onClick={() => router.push(d.href)} className="w-full h-11 rounded-xl bg-brand-50 text-brand-700 font-bold text-[14px] mt-4 hover:bg-brand-100 transition flex items-center justify-center gap-1.5">View Details <Icon name="arrow-right" size={15} color="#1A6FFF" /></button>
                {d.side === 'buyer' && d.group === 'active' && <TokenPayment dealId={d.dealId} />}
              </Card>
            ))}
            {rows.length === 0 && <InlineNote>No {filter.toLowerCase()} deals.</InlineNote>}
            {page.hasMore && <button type="button" disabled={page.loadingMore} onClick={page.loadMore} className="w-full h-11 rounded-xl border border-ink-200 text-[14px] font-semibold text-ink-700 hover:bg-ink-50 transition disabled:opacity-60">{page.loadingMore ? 'Loading…' : 'Load more'}</button>}
          </div>
        )}
    </PageWrap>
  );
}
