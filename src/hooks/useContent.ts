'use client';

import { useApiQuery } from './useApiQuery';
import { listContent } from '../services/contentService';

export function useContent(section: 'faq' | 'legal' | 'about') {
  return useApiQuery((signal) => listContent(section, signal), [section]);
}
