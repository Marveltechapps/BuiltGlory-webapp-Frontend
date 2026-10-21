import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { Button } from './Button';
import { cx } from '../../lib/format';

function Bone({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-ink-200', className)} />;
}

/** Card-shaped placeholders for lists (properties, visits, deals, enquiries). */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-ink-100 bg-white p-5">
          <div className="flex items-start gap-4">
            <Bone className="h-16 w-16 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <Bone className="h-4 w-2/5" />
              <Bone className="h-3 w-1/4" />
            </div>
            <Bone className="h-6 w-16 rounded-full" />
          </div>
          <Bone className="mt-4 h-2 w-full rounded-full" />
          <Bone className="mt-4 h-11 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Short text placeholders for a panel, chat, or document. */
export function LinesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="space-y-3 py-2">
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} className={cx('h-3', i === count - 1 ? 'w-2/5' : 'w-full')} />
      ))}
    </div>
  );
}

/** Placeholder while a list or panel is loading. `lines` is for a small block inside a card. */
export function Loading({ label = 'Loading', className = '', lines = false }: { label?: string; className?: string; lines?: boolean }) {
  return (
    <div className={className} aria-label={label}>
      {lines ? <LinesSkeleton /> : <ListSkeleton />}
    </div>
  );
}

/** Placeholder for a full detail page. */
export function PageLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 lg:px-10 py-8" aria-busy="true" aria-label={label}>
      <div className="rounded-3xl bg-white p-6">
        <Bone className="h-4 w-40" />
        <Bone className="mt-4 h-8 w-72 max-w-full" />
        <Bone className="mt-5 h-56 w-full rounded-3xl" />
      </div>
      <div className="mt-6"><ListSkeleton count={2} /></div>
    </div>
  );
}

/** Failure state with a retry action (same shell as the design's Empty card). */
export function ErrorState({ message, onRetry, compact }: { message: string; onRetry?: () => void; compact?: boolean }) {
  return (
    <div role="alert" className={cx('text-center bg-white rounded-2xl border border-dashed border-rose-200', compact ? 'py-8 px-4' : 'py-20 px-6')}>
      <div className="w-14 h-14 rounded-2xl bg-rose-50 grid place-items-center mx-auto"><Icon name="triangle-alert" size={26} color="#E11D48" /></div>
      <div className="text-[15px] font-bold text-ink-800 mt-4">Something went wrong</div>
      <p className="text-[13px] text-ink-500 mt-1 max-w-md mx-auto">{message}</p>
      {onRetry && <div className="mt-4"><Button variant="outline" size="sm" icon="refresh-cw" onClick={onRetry}>Try again</Button></div>}
    </div>
  );
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="mx-auto w-full max-w-[1240px] px-6 lg:px-10 py-8"><ErrorState message={message} onRetry={onRetry} /></div>;
}

export function InlineNote({ children }: { children: ReactNode }) {
  return <div className="text-center text-[13px] text-ink-400 py-12">{children}</div>;
}
