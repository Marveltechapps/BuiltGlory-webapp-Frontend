'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAppConfig } from '../services/contentService';
import type { AppConfig } from '../types/misc';

const AppConfigCtx = createContext<AppConfig | null>(null);

/** Loads GET /app/config once (support phone, WhatsApp, store links, version). */
export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getAppConfig(controller.signal).then(setConfig).catch(() => { /* screens fall back to "unavailable" states */ });
    return () => controller.abort();
  }, []);
  return <AppConfigCtx.Provider value={config}>{children}</AppConfigCtx.Provider>;
}

export const useAppConfig = () => useContext(AppConfigCtx);

export const supportContact = (config: AppConfig | null) => {
  const s = config?.support;
  const phone = s?.phone || s?.supportPhone || '';
  const digits = (s?.supportPhoneE164 || phone).replace(/[^\d+]/g, '');
  return {
    phone,
    email: s?.supportEmail || '',
    telUrl: s?.telUrl || (digits ? `tel:${digits}` : ''),
    whatsappUrl: s?.whatsappUrl || (s?.whatsappNumber ? `https://wa.me/${s.whatsappNumber}` : ''),
  };
};
