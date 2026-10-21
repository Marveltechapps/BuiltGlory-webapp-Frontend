import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from '../../lib/format';

export function PageWrap({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cx('page-in mx-auto w-full max-w-[1240px] px-6 lg:px-10 py-8', className)}>{children}</div>;
}

export function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h2 className="text-[22px] font-extrabold tracking-tight text-ink-900">{title}</h2>
        {sub && <p className="text-[13.5px] text-ink-500 mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

type BackVariant = 'muted' | 'title' | 'titleLg';

/** The three "← label" back controls used across the design. */
export function BackLink({ onClick, children, variant = 'muted', className = '' }: { onClick: () => void; children: ReactNode; variant?: BackVariant; className?: string }) {
  if (variant === 'title') return <button type="button" onClick={onClick} className={cx('flex items-center gap-2 text-[15px] font-bold text-ink-900', className)}><Icon name="arrow-left" size={18} />{children}</button>;
  if (variant === 'titleLg') return <button type="button" onClick={onClick} className={cx('flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink-900', className)}><Icon name="arrow-left" size={19} />{children}</button>;
  return <button type="button" onClick={onClick} className={cx('flex items-center gap-2 text-[13.5px] font-semibold text-ink-500 hover:text-brand-600 transition', className)}><Icon name="arrow-left" size={16} />{children}</button>;
}
