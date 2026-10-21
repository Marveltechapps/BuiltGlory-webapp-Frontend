'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { PageWrap } from '../ui/PageWrap';
import { ThumbFill, Wave, gradFor } from '../ui/Photo';
import { PageError, PageLoading } from '../ui/StateViews';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useBack } from '../../hooks/useNavigation';
import { useSession } from '../../context/SessionContext';
import { getProperty, listProperties } from '../../services/propertyService';
import { cx, formatINR } from '../../lib/format';
import { floorLabel, isVerified, pricePerSqft, propertyArea, propertyBhk, propertyLocality, propertyPhotos } from '../../lib/property';
import type { Property } from '../../types/property';

const yes = (on: boolean) => on ? <Icon name="check" size={17} color="#059669" strokeWidth={3} /> : <Icon name="x" size={17} color="#CBD5E1" strokeWidth={3} />;
const ROWS: Array<[string, (p: Property) => ReactNode]> = [
  ['Price', (p) => <span className="text-[14px] font-bold text-ink-900">{formatINR(p.price)}</span>],
  ['BHK', (p) => <span className="text-[14px] font-semibold text-ink-800">{propertyBhk(p) || '—'}</span>],
  ['Area', (p) => <span className="text-[14px] font-semibold text-ink-800">{propertyArea(p) ? `${propertyArea(p)} sqft` : '—'}</span>],
  ['Floor', (p) => <span className="text-[14px] font-semibold text-ink-800">{floorLabel(p)}</span>],
  ['Rate', (p) => <span className="text-[14px] font-semibold text-ink-800">{pricePerSqft(p) ? `₹${pricePerSqft(p)}/sqft` : '—'}</span>],
  ['Verified', (p) => yes(isVerified(p))],
  ['Negotiable', (p) => yes(Boolean(p.isNegotiable))],
  ['Saved by', (p) => <span className="flex items-center gap-1 text-[14px] font-semibold text-ink-800"><Icon name="heart" size={14} color="#E11D48" style={{ fill: '#E11D48' }} />{p.metrics?.savedCount ?? 0}</span>],
];

/** Compares the property with `?with=` or, failing that, the first saved / same-type listing. */
export function CompareView({ propertyId, withId }: { propertyId: string; withId?: string }) {
  const router = useRouter();
  const back = useBack(`/properties/${propertyId}`);
  const { favorites } = useSession();
  const favKey = [...favorites].join(',');
  const q = useApiQuery(async (signal) => {
    const a = await getProperty(propertyId, signal);
    const otherId = withId && withId !== propertyId ? withId : [...favorites].find((id) => id !== propertyId);
    let b: Property | undefined;
    if (otherId) b = await getProperty(otherId, signal).catch(() => undefined);
    if (!b) b = (await listProperties({ type: a.type, limit: 4 }, signal)).items.find((x) => x._id !== a._id);
    if (!b) b = (await listProperties({ limit: 4 }, signal)).items.find((x) => x._id !== a._id);
    return { a, b };
  }, [propertyId, withId, favKey]);

  if (q.loading && !q.data) return <PageLoading label="Loading comparison" />;
  if (q.error || !q.data) return <PageError message={q.error ?? 'Property not found.'} onRetry={q.reload} />;
  const { a, b } = q.data;
  const pair = [a, b].filter((x): x is Property => Boolean(x));

  return (
    <PageWrap className="!max-w-[1100px]">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink-900 mb-6"><Icon name="arrow-left" size={19} />Compare properties</button>
      <div className="grid grid-cols-2 gap-4">
        {pair.map((p) => (
          <div key={p._id} onClick={() => router.push(`/properties/${p._id}`)} className="rounded-2xl border border-ink-200 overflow-hidden bg-white cursor-pointer">
            <div className={cx('h-24 bg-gradient-to-br relative overflow-hidden group', gradFor(p._id))}><ThumbFill src={propertyPhotos(p)[0]} /><Wave viewBox="0 0 120 30" d="M0 20 Q30 8 60 18 T120 14 V30 H0 Z" /></div>
            <div className="p-3"><div className="text-[14px] font-bold text-ink-900 leading-tight">{p.title}</div><div className="text-[12px] text-ink-400 mt-0.5">{propertyLocality(p)}</div></div>
          </div>
        ))}
        {pair.length < 2 && <div className="rounded-2xl border border-dashed border-ink-200 grid place-items-center text-[13px] text-ink-400 p-6 text-center">No other listing to compare with yet.</div>}
      </div>
      <div className="rounded-2xl border border-ink-200 overflow-hidden mt-5">
        {ROWS.map(([label, render], i) => (
          <div key={label} className={cx('grid items-center', i % 2 ? 'bg-white' : 'bg-ink-50/60')} style={{ gridTemplateColumns: '96px 1fr 1fr' }}>
            <div className="text-[13px] font-semibold text-brand-600 px-4 py-3.5">{label}</div>
            <div className="px-4 py-3.5 border-l border-ink-100">{render(a)}</div>
            <div className="px-4 py-3.5 border-l border-ink-100">{b ? render(b) : '—'}</div>
          </div>
        ))}
      </div>
    </PageWrap>
  );
}
