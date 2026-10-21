'use client';

import { useApiQuery } from './useApiQuery';
import { getFavorites, getProperty, listProperties } from '../services/propertyService';
import type { Property, PropertyListQuery } from '../types/property';

export function useProperties(query: PropertyListQuery, enabled = true) {
  const key = JSON.stringify(query);
  return useApiQuery((signal) => listProperties(query, signal), [key], enabled);
}

export function useProperty(id: string) {
  return useApiQuery<Property>((signal) => getProperty(id, signal), [id]);
}

/** Same-type listings for "Similar properties" / compare, excluding the current one. */
export function useSimilarProperties(p: Property | null, limit = 3) {
  const type = p?.type;
  const id = p?._id;
  return useApiQuery(async (signal) => {
    const sameType = await listProperties({ type, limit: limit + 1 }, signal);
    let items = sameType.items.filter((x) => x._id !== id);
    if (items.length < limit) {
      const any = await listProperties({ limit: limit + 4 }, signal);
      items = [...items, ...any.items.filter((x) => x._id !== id && !items.some((y) => y._id === x._id))];
    }
    return items.slice(0, limit);
  }, [type, id, limit], Boolean(p));
}

/** Live listing count (pagination total of GET /properties) for the "Live listings" stats. */
export function useListingTotal() {
  return useApiQuery((signal) => listProperties({ limit: 1 }, signal).then((r) => r.meta.total ?? 0), []);
}

export function useFavoriteProperties(enabled: boolean) {
  return useApiQuery((signal) => getFavorites(signal), [], enabled);
}
