import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from '../../lib/format';

export type Tone = 'brand' | 'green' | 'amber' | 'rose' | 'ink' | 'violet';

const map: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700', green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700',
  ink: 'bg-ink-100 text-ink-600', violet: 'bg-violet-50 text-violet-700',
};

export function Tag({ tone = 'brand', icon, children }: { tone?: Tone; icon?: string; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', map[tone])}>
      {icon && <Icon name={icon} size={11} />}{children}
    </span>
  );
}

export function Pill({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cx('h-9 px-3.5 rounded-full text-[13px] font-medium border transition whitespace-nowrap',
      active ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-ink-200 text-ink-700 hover:border-brand-300')}>
      {children}
    </button>
  );
}
