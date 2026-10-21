'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

/** Browser-history back with a fallback route when the page was opened directly. */
export function useBack(fallback = '/') {
  const router = useRouter();
  return useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push(fallback);
  }, [router, fallback]);
}
