'use client';

import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { useToast } from '../../context/ToastContext';

export function Modal({ open, onClose, children, maxW = 420 }: { open: boolean; onClose: () => void; children: ReactNode; maxW?: number }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink-900/45 fade-in" onClick={onClose}></div>
      <div role="dialog" aria-modal="true" className="relative bg-white rounded-3xl w-full shadow-2xl" style={{ maxWidth: maxW, animation: 'fadeIn .2s ease-out' }}>{children}</div>
    </div>
  );
}

/** Global toast (reference web `Toast`); error toasts use a rose icon. */
export function ToastHost() {
  const { current } = useToast();
  if (!current) return null;
  return (
    <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-ink-900 text-white text-[13.5px] font-medium px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 fade-in max-w-[calc(100vw-32px)]">
      <Icon name={current.icon} size={18} color={current.tone === 'error' ? '#FB7185' : '#34D399'} className="shrink-0" /><span>{current.message}</span>
    </div>
  );
}
