import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

export function FieldRow({ label, children, hint, required, error }: { label: string; children: ReactNode; hint?: string; required?: boolean; error?: string | null }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[13px] font-semibold text-ink-700">{label}{required && <span className="text-rose-500"> *</span>}</div>
      {children}
      {error ? <div className="mt-1 text-[11.5px] font-medium text-rose-600">{error}</div> : hint && <div className="mt-1 text-[11.5px] text-ink-400">{hint}</div>}
    </label>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  prefix?: string;
  suffix?: string;
}

export function TextInput({ icon, prefix, suffix, ...p }: TextInputProps) {
  return (
    <div className="flex items-center gap-2 h-12 px-3.5 bg-white border border-ink-200 rounded-xl focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition">
      {icon && <Icon name={icon} size={16} color="#94A3B8" />}{prefix && <span className="text-ink-500 text-[14px] font-medium">{prefix}</span>}
      <input {...p} className="flex-1 bg-transparent outline-none text-[14px] text-ink-900 placeholder:text-ink-400 min-w-0" />
      {suffix && <span className="text-ink-400 text-[13px] font-medium shrink-0">{suffix}</span>}
    </div>
  );
}

/** Inline error banner used under forms when an API call fails. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2 text-[12.5px] font-medium text-rose-700">
      <Icon name="circle-alert" size={15} color="#E11D48" className="mt-0.5 shrink-0" />{message}
    </div>
  );
}
