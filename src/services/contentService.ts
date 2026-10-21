import { apiGet } from './api';
import type { AppConfig, ContentItem } from '../types/misc';

/** GET /content?section=… (published CMS items). */
export function listContent(section: 'faq' | 'legal' | 'about', signal?: AbortSignal) {
  return apiGet<ContentItem[]>('/content', { section, limit: 100 }, signal);
}

/** GET /app/config */
export function getAppConfig(signal?: AbortSignal) {
  return apiGet<AppConfig>('/app/config', undefined, signal);
}
