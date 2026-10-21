'use client';

import { useEffect, useState } from 'react';

/** Seconds-resolution countdown to `target` (null when there is no deadline). */
export function useCountdown(target: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return undefined;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [target]);
  if (!target) return null;
  const left = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  return { h: Math.floor(left / 3600), m: Math.floor((left % 3600) / 60), s: left % 60 };
}

/** Resend timer for OTP screens. */
export function useTimer(start: number, running: boolean) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    if (!running || left <= 0) return undefined;
    const t = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [running, left]);
  return [left, setLeft] as const;
}
