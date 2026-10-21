import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from '../../lib/format';

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={cx('bg-white rounded-2xl border border-ink-200', className)}>{children}</div>;
}

export function Empty({ icon, title, sub, action }: { icon: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-ink-200">
      <div className="w-14 h-14 rounded-2xl bg-ink-100 grid place-items-center mx-auto"><Icon name={icon} size={26} color="#94A3B8" /></div>
      <div className="text-[15px] font-bold text-ink-800 mt-4">{title}</div>{sub && <p className="text-[13px] text-ink-500 mt-1">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className={cx('w-11 h-6 rounded-full transition relative shrink-0 disabled:opacity-60', on ? 'bg-brand-600' : 'bg-ink-200')}>
      <span className={cx('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')}></span>
    </button>
  );
}
