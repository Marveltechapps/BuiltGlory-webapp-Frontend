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
  ref.current = reload;
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
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<ApiMeta | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const base = JSON.stringify(deps);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => setTick((t) => t + 1), []);
  useRefreshOnFocus(reload);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loaderRef.current(1, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setItems(res.items);
        setMeta(res.meta);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(e, 'Could not load this page. Please try again.'));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [base, tick]);

  const loadMore = useCallback(() => {
    const current = meta?.page ?? 1;
    const totalPages = meta?.totalPages ?? 1;
    if (loadingMore || current >= totalPages) return;
    const controller = new AbortController();
    setLoadingMore(true);
    loaderRef.current(current + 1, controller.signal)
      .then((res) => {
        setItems((prev) => [...prev, ...res.items]);
        setMeta(res.meta);
      })
      .catch((e: unknown) => setError(errorMessage(e, 'Could not load more.')))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, meta?.page, meta?.totalPages]);

  const hasMore = (meta?.page ?? 1) < (meta?.totalPages ?? 1);
  return { items, meta, loading, loadingMore, error, reload, loadMore, hasMore };
}
