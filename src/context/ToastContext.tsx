'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export interface ToastState { message: string; icon: string; tone: 'success' | 'error' }
type ToastFn = (message: string, icon?: string) => void;

const ToastCtx = createContext<{ toast: ToastFn; toastError: ToastFn; current: ToastState | null }>({
  toast: () => undefined,
  toastError: () => undefined,
  current: null,
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((message: string, icon: string, tone: ToastState['tone']) => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent({ message, icon, tone });
    timer.current = setTimeout(() => setCurrent(null), tone === 'error' ? 3600 : 2600);
  }, []);
  const toast = useCallback<ToastFn>((message, icon = 'check-circle') => show(message, icon, 'success'), [show]);
  const toastError = useCallback<ToastFn>((message, icon = 'circle-alert') => show(message, icon, 'error'), [show]);
  return <ToastCtx.Provider value={{ toast, toastError, current }}>{children}</ToastCtx.Provider>;
}

export const useToast = () => useContext(ToastCtx);
