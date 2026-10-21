'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { stockUrl } from '../../lib/stock';

const PALETTES: Array<[string, string]> = [['#60A5FA', '#3B82F6'], ['#34D399', '#10B981'], ['#FBBF24', '#F59E0B'], ['#F472B6', '#EC4899'], ['#A78BFA', '#8B5CF6'], ['#22D3EE', '#0891B2']];

/** Fading cover image (reference `StockImg`). Hidden on load error so the gradient shows through. */
export function CoverImg({ src, className = '', style }: { src: string; className?: string; style?: CSSProperties }) {
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState(false);
  if (err) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- listing photos are arbitrary S3 URLs; next.config defines no image domains
    <img src={src} alt="" loading="lazy" draggable={false} onLoad={() => setOk(true)} onError={() => setErr(true)}
      className={'absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.06] ' + className}
      style={{ opacity: ok ? 1 : 0, transform: ok ? undefined : 'scale(1.06)', ...style }} />
  );
}

interface PhotoProps {
  tag: string;
  /** Real photo URL (listing media). */
  src?: string | null;
  /** Decorative stock art from the design, seeded by `tag` — never used for listings. */
  stock?: boolean;
  gradient?: [string, string];
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  onClick?: () => void;
}

/** Gradient + shimmer frame with an optional photo (reference `PhotoPlaceholder`). */
export function PhotoPlaceholder({ tag, src, stock, gradient, height, className = '', style, children, onClick }: PhotoProps) {
  const seed = (tag || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const [c1, c2] = gradient || PALETTES[seed % PALETTES.length] || PALETTES[0]!;
  const image = src || (stock ? stockUrl(tag) : null);
  return (
    <div onClick={onClick} className={`relative overflow-hidden ${className}`} style={{ height, background: `linear-gradient(135deg, ${c1}, ${c2})`, ...style }}>
      <div className="absolute inset-0 shimmer"></div>
      {image && <CoverImg key={image} src={image} />}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.08) 0%,transparent 35%,transparent 60%,rgba(0,0,0,.28) 100%)' }}></div>
      {children}
    </div>
  );
}

/** Small thumbnail fill (reference `StockFill`): real photo when available. */
export function ThumbFill({ src }: { src?: string | null }) {
  return src ? <CoverImg src={src} /> : null;
}

/** Tailwind gradient classes cycled for list thumbnails (Enquiries / Deals / Listings). */
const GRADS = ['from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500', 'from-pink-400 to-rose-500', 'from-violet-400 to-indigo-500', 'from-blue-400 to-indigo-500'];
export const gradFor = (key: string) => GRADS[key.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % GRADS.length] ?? GRADS[0]!;

export function Wave({ viewBox = '0 0 80 30', d = 'M0 20 Q20 8 40 18 T80 14 V30 H0 Z' }: { viewBox?: string; d?: string }) {
  return <svg viewBox={viewBox} className="absolute bottom-0 left-0 w-full opacity-40"><path d={d} fill="#fff" /></svg>;
}
