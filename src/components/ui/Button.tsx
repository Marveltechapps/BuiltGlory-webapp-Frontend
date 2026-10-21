import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from '../../lib/format';

type Variant = 'primary' | 'outline' | 'ghost' | 'soft' | 'dark' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: string;
  iconRight?: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
  style?: CSSProperties;
  loading?: boolean;
}

const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none';
const sizes: Record<Size, string> = { sm: 'h-9 px-3.5 text-[13px]', md: 'h-11 px-5 text-[14px]', lg: 'h-[52px] px-6 text-[15px]' };
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-[0_8px_20px_-6px_rgba(26,111,255,.5)] hover:bg-brand-700',
  outline: 'border border-ink-200 text-ink-800 bg-white hover:border-brand-300 hover:text-brand-700',
  ghost: 'text-brand-700 hover:bg-brand-50', soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  dark: 'bg-ink-900 text-white hover:bg-black', danger: 'bg-rose-600 text-white hover:bg-rose-700',
};

export function Button({ children, variant = 'primary', size = 'md', icon, iconRight, className = '', onClick, disabled, type = 'button', title, style, loading }: ButtonProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} title={title} style={style} className={cx(base, sizes[size], variants[variant], className)}>
      {loading ? <Icon name="loader-circle" size={17} style={{ animation: 'spin .8s linear infinite' }} /> : icon && <Icon name={icon} size={17} />}
      {children}
      {!loading && iconRight && <Icon name={iconRight} size={17} />}
    </button>
  );
}
