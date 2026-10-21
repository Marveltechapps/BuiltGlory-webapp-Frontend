'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { PageWrap } from '../ui/PageWrap';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useBack } from '../../hooks/useNavigation';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { clearRecentSearches, getRecentSearches, getTrendingSearches, recordSearch, removeRecentSearch } from '../../services/searchService';
import { errorMessage } from '../../services/api';
import { PROPERTY_TYPES } from '../../lib/catalog';

export function SearchView() {
  const router = useRouter();
  const back = useBack('/');
  const { signedIn } = useSession();
  const { toastError } = useToast();
  const [q, setQ] = useState('');
  const recent = useApiQuery((signal) => getRecentSearches(signal), [signedIn], signedIn);
  const trending = useApiQuery((signal) => getTrendingSearches(signal), []);
  const recentList = recent.data ?? [];

  const go = (term: string) => {
    const t = term.trim();
    if (t && signedIn) recordSearch(t).then(recent.setData).catch(() => { /* history is best-effort */ });
    router.push(t ? `/browse?search=${encodeURIComponent(t)}` : '/browse');
  };
  const clearAll = () => clearRecentSearches().then(() => recent.setData([])).catch((e: unknown) => toastError(errorMessage(e, 'Could not clear searches.')));
  const removeOne = (term: string) => removeRecentSearch(term).then(recent.setData).catch((e: unknown) => toastError(errorMessage(e, 'Could not remove that search.')));

  return (
    <PageWrap className="!max-w-[760px]">
      <div className="flex items-center gap-3 mb-6">
        <button type="button" aria-label="Back" onClick={back} className="w-10 h-10 grid place-items-center rounded-xl hover:bg-ink-100 shrink-0"><Icon name="arrow-left" size={19} color="#334155" /></button>
        <div className="flex-1 flex items-center gap-2.5 h-12 px-4 rounded-2xl bg-white border border-ink-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
          <Icon name="search" size={18} color="#94A3B8" />
          <input autoFocus aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go(q)} placeholder="Search properties, areas, builders…" className="flex-1 bg-transparent outline-none text-[14.5px] text-ink-900 placeholder:text-ink-400" />
          {q && <button type="button" aria-label="Clear" onClick={() => setQ('')}><Icon name="x" size={17} color="#94A3B8" /></button>}
        </div>
      </div>

      {recentList.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center justify-between mb-3"><h2 className="text-[15px] font-bold text-ink-900">Recent searches</h2><button type="button" onClick={() => void clearAll()} className="text-[12.5px] font-semibold text-brand-600 hover:underline">Clear all</button></div>
          <div className="space-y-1">
            {recentList.map((s) => (
              <div key={s} className="flex items-center gap-3 group">
                <button type="button" onClick={() => go(s)} className="flex-1 flex items-center gap-3 h-11 px-3 rounded-xl hover:bg-ink-100 transition text-left"><Icon name="clock" size={17} color="#94A3B8" /><span className="flex-1 text-[14px] text-ink-700">{s}</span></button>
                <button type="button" aria-label={`Remove ${s}`} onClick={() => void removeOne(s)} className="w-8 h-8 grid place-items-center rounded-lg text-ink-300 hover:bg-ink-100 hover:text-ink-500 transition"><Icon name="x" size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(trending.data ?? []).length > 0 && (
        <div className="mb-7">
          <h2 className="text-[15px] font-bold text-ink-900 mb-3">Trending areas</h2>
          <div className="flex flex-wrap gap-2.5">
            {(trending.data ?? []).map((t) => <button type="button" key={t} onClick={() => go(t)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-ink-200 text-[13.5px] font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-600 transition"><Icon name="trending-up" size={15} color="#1A6FFF" />{t}</button>)}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-[15px] font-bold text-ink-900 mb-3">Browse by type</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {PROPERTY_TYPES.map((t) => (
            <button type="button" key={t.id} onClick={() => router.push(`/browse?type=${t.id}`)} className="rounded-2xl border border-ink-200 bg-white p-4 flex flex-col items-center gap-2.5 hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 transition group">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 grid place-items-center group-hover:bg-brand-100 transition"><Icon name={t.icon} size={22} color="#1A6FFF" /></div>
              <div className="text-center min-h-[32px]"><div className="text-[12.5px] font-bold text-ink-800 leading-tight">{t.label}</div>{t.sub && <div className="text-[11px] text-emerald-600 font-medium leading-tight">{t.sub}</div>}</div>
            </button>
          ))}
        </div>
      </div>
    </PageWrap>
  );
}
