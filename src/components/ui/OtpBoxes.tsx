'use client';

import { useRef } from 'react';
import { cx } from '../../lib/format';

/**
 * One-time-code boxes. The backend issues 6-digit OTPs (auth/validator.js `^\d{6}$`),
 * so every OTP screen uses 6 boxes; the design's box styling is unchanged.
 */
export function OtpBoxes({ value, onChange, variant = 'brand', error }: { value: string[]; onChange: (v: string[]) => void; variant?: 'brand' | 'plain' | 'rose'; error?: boolean }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const setDigit = (i: number, raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (clean.length > 1) {
      // paste of the whole code
      const n = [...value];
      clean.slice(0, value.length - i).split('').forEach((d, k) => { n[i + k] = d; });
      onChange(n);
      refs.current[Math.min(i + clean.length, value.length - 1)]?.focus();
      return;
    }
    const n = [...value];
    n[i] = clean;
    onChange(n);
    if (clean && i < value.length - 1) refs.current[i + 1]?.focus();
  };
  return (
    <div className={cx('flex gap-2 sm:gap-3', variant === 'rose' ? '' : 'justify-center')}>
      {value.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} autoFocus={i === 0} aria-label={`Digit ${i + 1}`}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus(); }}
          className={variant === 'rose'
            ? cx('w-12 sm:w-14 h-14 rounded-xl border text-center text-[22px] font-bold text-ink-900 outline-none transition focus:ring-2', error ? 'border-rose-400 focus:ring-rose-100' : 'border-ink-200 focus:border-rose-500 focus:ring-rose-100')
            : cx('w-11 sm:w-14 h-14 sm:h-16 text-center text-[22px] sm:text-[24px] font-extrabold rounded-2xl border-2 outline-none transition-all duration-200',
              d ? 'border-brand-500 bg-brand-50 text-brand-700' + (variant === 'brand' ? ' scale-105' : '') : 'border-ink-200 text-ink-900 focus:border-brand-400' + (variant === 'brand' ? ' focus:ring-4 focus:ring-brand-100' : ''))} />
      ))}
    </div>
  );
}

export const emptyOtp = () => ['', '', '', '', '', ''];
