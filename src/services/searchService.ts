import { apiGet, apiSend } from './api';

/** GET /search/trending (public) — returns terms. */
export function getTrendingSearches(signal?: AbortSignal) {
  return apiGet<string[]>('/search/trending', { limit: 8 }, signal);
}

/** GET /me/searches — recent terms. */
export function getRecentSearches(signal?: AbortSignal) {
  return apiGet<string[]>('/me/searches', undefined, signal);
}

/** POST /me/searches { term } — returns the updated recent list. */
export function recordSearch(term: string) {
  return apiSend<string[]>('POST', '/me/searches', { term });
}

/** DELETE /me/searches — clears all recent searches. */
export function clearRecentSearches() {
  return apiSend<string[]>('DELETE', '/me/searches');
}

/** DELETE /me/searches?term= — removes one recent search. */
export function removeRecentSearch(term: string) {
  return apiSend<string[]>('DELETE', `/me/searches?term=${encodeURIComponent(term)}`);
}
