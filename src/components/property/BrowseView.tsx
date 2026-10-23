'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Pill } from '../ui/Tag';
import { Button } from '../ui/Button';
import { PageWrap } from '../ui/PageWrap';
import { PropCard } from '../ui/PropCard';
import { Loading, ErrorState } from '../ui/StateViews';
import { useApiQuery } from '../../hooks/useApiQuery';
import { listProperties } from '../../services/propertyService';
import { LiveMap } from '../ui/LiveMap';
import { PROPERTY_TYPES, cityCenter, typeById } from '../../lib/catalog';
import { cx, formatINR } from '../../lib/format';
import { propertyArea, propertyCity } from '../../lib/property';
import type { Property, PropertyListQuery } from '../../types/property';

type Sort = 'relevance' | 'low' | 'high' | 'area';

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div className="py-5 border-b border-ink-100 last:border-0"><div className="text-[13px] font-bold text-ink-800 mb-3">{title}</div>{children}</div>;
}

function Check({ on, onClick, label, right }: { on: boolean; onClick: () => void; label: string; right?: string }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-2.5 py-1.5 group">
      <span className={cx('rounded-[5px] border grid place-items-center shrink-0 transition', on ? 'bg-brand-600 border-brand-600' : 'border-ink-300 group-hover:border-brand-400')} style={{ width: 18, height: 18 }}>
        {on && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}</span>
      <span className="text-[13.5px] text-ink-700 flex-1 text-left">{label}</span>
      {right && <span className="text-[12px] text-ink-400">{right}</span>}
    </button>
  );
}

export function BrowseView({ initialType, initialSearch }: { initialType?: string; initialSearch?: string }) {
  const router = useRouter();
  const [types, setTypes] = useState<Set<string>>(new Set(initialType && typeById(initialType) ? [initialType] : []));
  const [bhks, setBhks] = useState<Set<string>>(new Set());
  const [amens, setAmens] = useState<Set<string>>(new Set());
  const [budget, setBudget] = useState(300);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('relevance');
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [picked, setPicked] = useState(Boolean((initialType && typeById(initialType)) || initialSearch));
  const search = initialSearch?.trim() || '';

  const toggleSet = (setter: (fn: (s: Set<string>) => Set<string>) => void) => (v: string) => setter((s) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; });

  const base: PropertyListQuery = {
    maxPrice: budget < 300 ? budget * 100000 : undefined,
    bhk: bhks.size ? [...bhks].join(',') : undefined,
    amenities: amens.size ? [...amens].join(',') : undefined,
    verified: verifiedOnly || undefined,
    search: search || undefined,
    sort: sort === 'low' ? 'price_asc' : sort === 'high' ? 'price_desc' : 'relevance',
    limit: 50,
  };
  const typeList = [...types].map((t) => typeById(t)?.api).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const query = useApiQuery(async (signal) => {
    // The API filters one property type per request; several ticked types are fetched in parallel and merged.
    if (typeList.length <= 1) return listProperties({ ...base, type: typeList[0] }, signal);
    const parts = await Promise.all(typeList.map((type) => listProperties({ ...base, type }, signal)));
    return { items: parts.flatMap((p) => p.items), meta: { total: parts.reduce((a, p) => a + (p.meta.total ?? 0), 0) } };
  }, [JSON.stringify(base), typeList.join(',')], picked);

  let list = query.data?.items ?? [];
  if (typeList.length > 1 && sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
  if (typeList.length > 1 && sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
  if (sort === 'area') list = [...list].sort((a, b) => propertyArea(b) - propertyArea(a));
  const count = query.data?.meta.total ?? list.length;
  const cities = [...new Set(list.map(propertyCity).filter(Boolean))];

  const clearAll = () => { setTypes(new Set()); setBhks(new Set()); setAmens(new Set()); setBudget(300); setVerifiedOnly(false); };
  const activeCount = types.size + bhks.size + amens.size + (verifiedOnly ? 1 : 0);
  const open = (p: Property) => router.push(`/properties/${p._id}`);

  if (!picked) return (
    <PageWrap className="!max-w-[880px]">
      <h1 className="text-[24px] font-extrabold tracking-tight text-ink-900">What are you looking to buy?</h1>
      <p className="text-[14px] text-ink-500 mt-1.5">Select a property type to get started.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
        {PROPERTY_TYPES.map((t) => (
          <button type="button" key={t.id} onClick={() => { setTypes(new Set([t.id])); setPicked(true); }} className="rounded-2xl border border-ink-200 p-5 flex flex-col items-center gap-3 transition group hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5">
            <div className="w-14 h-14 rounded-2xl grid place-items-center bg-brand-50 group-hover:bg-brand-100 transition"><Icon name={t.icon} size={24} color="#1A6FFF" /></div>
            <div className="text-center min-h-[34px]"><div className="text-[13.5px] font-bold text-ink-800 leading-tight">{t.label}</div>{t.sub && <div className="text-[11.5px] text-emerald-600 font-medium mt-0.5 leading-tight">{t.sub}</div>}</div>
          </button>
        ))}
      </div>
    </PageWrap>
  );

  const pins = list.flatMap((p) => {
    const latitude = p.address?.latitude;
    const longitude = p.address?.longitude;
    return typeof latitude === 'number' && typeof longitude === 'number' ? [{ id: p._id, latitude, longitude, label: formatINR(p.price) }] : [];
  });
  return (
    <PageWrap className="!max-w-[1320px]">
      <button type="button" onClick={() => setPicked(false)} className="flex items-center gap-2 text-[13px] font-semibold text-ink-500 hover:text-brand-600 mb-4"><Icon name="arrow-left" size={15} />Change property type</button>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight text-ink-900">Properties for sale</h1>
          <p className="text-[13.5px] text-ink-500 mt-1"><b className="text-ink-800">{query.loading && !query.data ? '…' : count}</b> homes{cities.length === 1 ? ` in ${cities[0]}` : ''}{types.size ? ` · ${[...types].map((t) => typeById(t)?.label).join(', ')}` : ''}{search ? ` · “${search}”` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-white border border-ink-200 rounded-xl overflow-hidden">
            <button type="button" aria-label="Grid view" onClick={() => setView('grid')} className={cx('w-10 h-10 grid place-items-center', view === 'grid' ? 'bg-brand-600 text-white' : 'text-ink-500')}><Icon name="layout-grid" size={17} /></button>
            <button type="button" aria-label="Map view" onClick={() => setView('map')} className={cx('w-10 h-10 grid place-items-center', view === 'map' ? 'bg-brand-600 text-white' : 'text-ink-500')}><Icon name="map" size={17} /></button>
          </div>
          <div className="flex items-center gap-2 h-10 px-3 bg-white border border-ink-200 rounded-xl">
            <Icon name="arrow-up-down" size={15} color="#94A3B8" />
            <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="bg-transparent outline-none text-[13.5px] font-medium text-ink-700">
              <option value="relevance">Relevance</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option><option value="area">Largest area</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-7 items-start">
        {/* filter rail */}
        <aside className="hidden lg:block w-[268px] shrink-0 sticky top-6">
          <div className="bg-white rounded-2xl border border-ink-200 px-5">
            <div className="flex items-center justify-between pt-5 pb-1">
              <div className="flex items-center gap-2 text-[14px] font-bold text-ink-900"><Icon name="sliders-horizontal" size={16} color="#1A6FFF" />Filters{activeCount ? <span className="text-[11px] bg-brand-600 text-white rounded-full px-1.5 py-0.5">{activeCount}</span> : null}</div>
              {activeCount > 0 && <button type="button" onClick={clearAll} className="text-[12px] font-semibold text-brand-600 hover:underline">Clear</button>}
            </div>
            <FilterGroup title="Property type">
              {PROPERTY_TYPES.slice(0, 6).map((t) => <Check key={t.id} on={types.has(t.id)} onClick={() => toggleSet(setTypes)(t.id)} label={`${t.label}${t.sub ? ' ' + t.sub : ''}`} />)}
            </FilterGroup>
            <FilterGroup title={`Budget · up to ${formatINR(budget * 100000)}`}>
              <input type="range" aria-label="Budget" min="10" max="300" step="5" value={budget} onChange={(e) => setBudget(+e.target.value)} className="w-full accent-brand-600" />
              <div className="flex justify-between text-[11px] text-ink-400 mt-1"><span>₹10 L</span><span>₹3 Cr</span></div>
            </FilterGroup>
            <FilterGroup title="Bedrooms">
              <div className="flex gap-2 flex-wrap">{['1', '2', '3', '4'].map((b) => <Pill key={b} active={bhks.has(b)} onClick={() => toggleSet(setBhks)(b)}>{b} BHK</Pill>)}</div>
            </FilterGroup>
            <FilterGroup title="Amenities">
              {['Lift', 'Gym', 'Pool', 'Parking', 'Security', 'Power Backup'].map((a) => <Check key={a} on={amens.has(a)} onClick={() => toggleSet(setAmens)(a)} label={a} />)}
            </FilterGroup>
            <FilterGroup title="Trust">
              <Check on={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)} label="Verified listings only" />
            </FilterGroup>
          </div>
        </aside>

        {/* results */}
        <div className="flex-1 min-w-0">
          {query.loading && !query.data ? <Loading label="Loading properties" />
            : query.error ? <ErrorState message={query.error} onRetry={query.reload} />
            : view === 'map' ? (
              <div className="relative">
                <LiveMap height={560} className="rounded-2xl border border-ink-200" pins={pins} center={cities.length === 1 ? cityCenter(cities[0]) : null} onPinClick={(id) => { const p = list.find((item) => item._id === id); if (p) open(p); }} />
                <div className="absolute top-4 left-4 z-10 bg-white rounded-xl shadow px-3 py-2 text-[12.5px] font-semibold text-ink-700">{pins.length} of {list.length} on the map{pins.length < list.length ? ' · some listings have no coordinates' : ''}</div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {list.map((p) => <PropCard key={p._id} p={p} />)}
              </div>
            )}
          {!query.loading && !query.error && list.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-ink-200">
              <div className="w-14 h-14 rounded-2xl bg-ink-100 grid place-items-center mx-auto"><Icon name="search-x" size={26} color="#94A3B8" /></div>
              <div className="text-[15px] font-bold text-ink-800 mt-4">No properties match</div>
              <p className="text-[13px] text-ink-500 mt-1">Try widening your budget or clearing filters.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={clearAll}>Clear filters</Button>
            </div>
          )}
        </div>
      </div>
    </PageWrap>
  );
}
