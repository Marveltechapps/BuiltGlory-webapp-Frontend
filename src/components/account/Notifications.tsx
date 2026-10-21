'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Card, Empty } from '../ui/Card';
import { PageWrap, SectionHead } from '../ui/PageWrap';
import { ErrorState, Loading } from '../ui/StateViews';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { listNotifications, markAllRead, markRead } from '../../services/notificationService';
import { errorMessage } from '../../services/api';
import { ageShort, cx, isToday } from '../../lib/format';
import type { AppNotification } from '../../types/misc';

const toneBg: Record<string, string> = { brand: 'bg-brand-50 text-brand-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600', rose: 'bg-rose-50 text-rose-600' };

const metaFor = (n: AppNotification): [string, string] => {
  const k = `${n.event} ${n.notificationType ?? ''} ${n.entityType ?? ''}`.toLowerCase();
  if (/visit/.test(k)) return ['calendar-check', 'brand'];
  if (/enquir/.test(k)) return ['message-square', 'brand'];
  if (/sell|listing|acquisition/.test(k)) return [/reject|fail/.test(k) ? 'triangle-alert' : 'badge-check', /reject|fail/.test(k) ? 'rose' : 'green'];
  if (/payment|token|payout/.test(k)) return ['wallet', 'violet'];
  if (/deal/.test(k)) return ['handshake', 'brand'];
  if (/support|ticket|chat/.test(k)) return ['headset', 'brand'];
  if (/launch|upcoming/.test(k)) return ['rocket', 'amber'];
  if (/offer|percent|loan/.test(k)) return ['percent', 'violet'];
  return ['bell', 'brand'];
};

const targetFor = (n: AppNotification) => {
  const k = `${n.event} ${n.entityType ?? ''} ${n.screen ?? ''}`.toLowerCase();
  if (n.enquiryId) return `/enquiries/${n.enquiryId}`;
  if (n.listingId) return `/listings/${n.listingId}`;
  if (/visit/.test(k)) return '/visits';
  if (/deal/.test(k) || n.dealId) return '/deals';
  if (/support|ticket|chat/.test(k)) return '/support';
  if (/sell/.test(k) && n.entityId) return `/listings/${n.entityId}`;
  if (n.propertyId) return `/properties/${n.propertyId}`;
  return null;
};

export function Notifications() {
  const router = useRouter();
  const { refreshUnread } = useSession();
  const { toast, toastError } = useToast();
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload, setData } = useApiQuery((signal) => listNotifications(signal), []);
  const items = data?.items ?? [];
  const groups = [
    { when: 'Today', items: items.filter((n) => isToday(n.createdAt)) },
    { when: 'Earlier', items: items.filter((n) => !isToday(n.createdAt)) },
  ].filter((g) => g.items.length);

  const readAll = async () => {
    setBusy(true);
    try {
      await markAllRead();
      if (data) setData({ ...data, items: items.map((n) => ({ ...n, isRead: true })) });
      refreshUnread();
      toast('All notifications marked read');
    } catch (e) { toastError(errorMessage(e, 'Could not mark notifications as read.')); } finally { setBusy(false); }
  };

  const open = (n: AppNotification) => {
    if (!n.isRead) {
      markRead(n._id).then(() => refreshUnread()).catch(() => { /* still navigate */ });
      if (data) setData({ ...data, items: items.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)) });
    }
    const to = targetFor(n);
    if (to) router.push(to);
  };

  return (
    <PageWrap className="!max-w-[1240px] web-list">
      <SectionHead title="Notifications" sub="Your recent updates and alerts" action={<Button variant="ghost" size="sm" icon="check-check" loading={busy} disabled={!items.some((n) => !n.isRead)} onClick={() => void readAll()}>Mark all read</Button>} />
      {loading && !data ? <Loading label="Loading notifications" />
        : error ? <ErrorState message={error} onRetry={reload} />
        : groups.length === 0 ? <Empty icon="bell" title="You're all caught up" sub="Updates about your enquiries, visits and listings will appear here." />
        : groups.map((g) => (
          <div key={g.when} className="mb-6">
            <div className="text-[12px] font-semibold text-ink-400 uppercase tracking-wide mb-2">{g.when}</div>
            <Card className="divide-y divide-ink-100">
              {g.items.map((n) => {
                const [icon, tone] = metaFor(n);
                return (
                  <div key={n._id} onClick={() => open(n)} className="flex items-center gap-4 p-4 hover:bg-ink-50 transition cursor-pointer">
                    <div className={cx('w-11 h-11 rounded-xl grid place-items-center shrink-0', toneBg[tone])}><Icon name={icon} size={19} /></div>
                    <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-ink-900">{n.title || n.event.replace(/_/g, ' ')}</div>{n.message && <div className="text-[12.5px] text-ink-500">{n.message}</div>}</div>
                    {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-brand-600 shrink-0"></span>}
                    <span className="text-[11.5px] text-ink-400 shrink-0">{ageShort(n.createdAt)}</span>
                  </div>
                );
              })}
            </Card>
          </div>
        ))}
    </PageWrap>
  );
}
