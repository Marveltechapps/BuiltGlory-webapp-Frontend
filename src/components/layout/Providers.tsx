'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '../../context/ToastContext';
import { SessionProvider } from '../../context/SessionContext';
import { AppConfigProvider } from '../../context/AppConfigContext';
import { AppShell } from './AppShell';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AppConfigProvider>
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </AppConfigProvider>
    </ToastProvider>
  );
}
