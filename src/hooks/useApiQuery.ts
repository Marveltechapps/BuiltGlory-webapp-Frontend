'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../services/api';
import type { ApiMeta } from '../types/api';

interface QueryState<T> { key: string | null; base: string | null; data: T | null; error: string | null }

/**
 * Client data hook shared by every screen: runs `loader` with an AbortController,
 * exposes `{ data, loading, error }` and aborts on unmount / dependency change.
 * `reload()` re-runs the request (after mutations and for "Refresh" / "Try again");
 * the previous data stays visible while it reloads.
 */
export function useApiQuery<T>(loader: (signal: AbortSignal) => Promise<T>, deps: unknown[], enabled = true) {
  const [tick, setTick] = useState(0);
  const base = JSON.stringify(deps);
  const key = `${base}#${tick}`;
  const [state, setState] = useState<QueryState<T>>({ key: null, base: null, data: null, error: null });

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    loader(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ key, base, data, error: null }); })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setState((s) => ({ key, base, data: s.base === base ? s.data : null, error: errorMessage(e, 'Could not load this page. Please try again.') }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the caller's dependency list
  }, [key, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  useRefreshOnFocus(reload);
  const setData = useCallback((data: T) => setState((s) => ({ ...s, data })), []);
  const sameBase = state.base === base;
  return {
    data: enabled && sameBase ? state.data : null,
    loading: enabled && state.key !== key,
    error: enabled && state.key === key ? state.error : null,
    reload,
    setData,
  };
}

/** Refetch when the tab becomes visible again. */
export function useRefreshOnFocus(reload: () => void) {
  const ref = useRef(reload);
  useEffect(() => { ref.current = reload; });
  useEffect(() => {
    const run = () => { if (document.visibilityState === 'visible') ref.current(); };
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', run);
    return () => {
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, []);
}

/** First page, then "load more" until `meta.totalPages` is exhausted. */
export function usePagedQuery<T>(loader: (page: number, signal: AbortSignal) => Promise<{ items: T[]; meta?: ApiMeta }>, deps: unknown[]) {
  const [tick, setTick] = useState(0);
  const [pageState, setPageState] = useState<{ base: string; tick: number; items: T[]; meta?: ApiMeta; error: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const base = JSON.stringify(deps);
  const loaderRef = useRef(loader);
  useEffect(() => { loaderRef.current = loader; });

  const reload = useCallback(() => setTick((t) => t + 1), []);
  useRefreshOnFocus(reload);

  useEffect(() => {
    const controller = new AbortController();
    const requestBase = base;
    const requestTick = tick;
    loaderRef.current(1, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setPageState({ base: requestBase, tick: requestTick, items: res.items, meta: res.meta, error: null });
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setPageState((prev) => ({
            base: requestBase,
            tick: requestTick,
            items: prev?.base === requestBase ? prev.items : [],
            meta: prev?.base === requestBase ? prev.meta : undefined,
            error: errorMessage(e, 'Could not load this page. Please try again.'),
          }));
        }
      });
    return () => controller.abort();
  }, [base, tick]);

  const settled = pageState?.base === base && pageState.tick === tick ? pageState : null;
  const visible = pageState?.base === base ? pageState : null;

  const loadMore = useCallback(() => {
    const current = settled?.meta?.page ?? 1;
    const totalPages = settled?.meta?.totalPages ?? 1;
    if (loadingMore || !settled || current >= totalPages) return;
    setLoadingMore(true);
    loaderRef.current(current + 1, new AbortController().signal)
      .then((res) => {
        setPageState((prev) => prev && prev.base === base && prev.tick === tick
          ? { ...prev, items: [...prev.items, ...res.items], meta: res.meta, error: null }
          : prev);
      })
      .catch((e: unknown) => {
        setPageState((prev) => prev && prev.base === base && prev.tick === tick
          ? { ...prev, error: errorMessage(e, 'Could not load more.') }
          : prev);
      })
      .finally(() => setLoadingMore(false));
  }, [base, loadingMore, settled, tick]);

  const hasMore = (visible?.meta?.page ?? 1) < (visible?.meta?.totalPages ?? 1);
  return {
    items: visible?.items ?? [],
    meta: visible?.meta,
    loading: !settled,
    loadingMore,
    error: settled?.error ?? null,
    reload,
    loadMore,
    hasMore,
  };
}
