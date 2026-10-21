'use client';

import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { Tag } from './Tag';
import { PhotoPlaceholder } from './Photo';
import { cx, formatINR } from '../../lib/format';
import { typeLabel } from '../../lib/catalog';
import { isVerified, pricePerSqft, propertyArea, propertyBhk, propertyLocation, propertyPhotos } from '../../lib/property';
import { useSession } from '../../context/SessionContext';
import type { Property } from '../../types/property';

export function HeartBtn({ active, onClick, className = '' }: { active: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" aria-label={active ? 'Remove from saved' : 'Save property'} onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cx('w-9 h-9 rounded-full grid place-items-center bg-white/95 shadow-sm hover:scale-110 transition', className)}>
      <Icon name="heart" size={16} color={active ? '#E11D48' : '#334155'} strokeWidth={active ? 2.4 : 2} style={{ fill: active ? '#E11D48' : 'transparent' }} />
    </button>
  );
}

export function PropCard({ p, wide }: { p: Property; wide?: boolean }) {
  const router = useRouter();
  const { favorites, toggleFavorite } = useSession();
  const photos = propertyPhotos(p);
  const area = propertyArea(p);
  const bhk = propertyBhk(p);
  const rate = pricePerSqft(p);
  return (
    <div onClick={() => router.push(`/properties/${p._id}`)} className={cx('group bg-white rounded-2xl overflow-hidden border border-ink-200 hover:shadow-[0_18px_40px_-18px_rgba(15,23,42,.35)] hover:-translate-y-0.5 transition cursor-pointer', wide && 'lg:flex')}>
      <PhotoPlaceholder tag={p._id} src={photos[0]} height={wide ? undefined : 190} className={cx('relative', wide && 'lg:w-64 lg:shrink-0')} style={wide ? { minHeight: 190 } : undefined}>
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Tag tone="brand">{typeLabel(p.type)}</Tag>
          {isVerified(p) && <Tag tone="green" icon="badge-check">Verified</Tag>}
          {p.isUpcoming && <Tag tone="amber" icon="rocket">Upcoming</Tag>}
        </div>
        <div className="absolute top-3 right-3"><HeartBtn active={favorites.has(p._id)} onClick={() => toggleFavorite(p._id)} /></div>
        <div className="absolute bottom-3 left-3 text-white text-[11px] font-medium flex items-center gap-1 bg-black/30 backdrop-blur px-2 py-1 rounded-lg">
          <Icon name="images" size={12} />{photos.length} photos</div>
      </PhotoPlaceholder>
      <div className="p-4 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15.5px] font-bold text-ink-900 leading-snug truncate">{p.title}</h3>
        </div>
        <div className="flex items-center gap-1 text-[12.5px] text-ink-500 mt-1"><Icon name="map-pin" size={13} color="#1A6FFF" />{propertyLocation(p) || '—'}</div>
        <div className="mt-3 flex items-end justify-between">
          <div className="text-[20px] font-extrabold text-brand-600 leading-none">{formatINR(p.price)}</div>
          {rate > 0 && <div className="text-[11.5px] text-ink-400 font-medium">{formatINR(rate)}/sqft</div>}
        </div>
        <div className="mt-3 pt-3 border-t border-ink-100 flex items-center gap-4 text-[12.5px] text-ink-600">
          {bhk > 0 && <span className="flex items-center gap-1.5"><Icon name="bed-double" size={14} color="#64748B" /><b className="text-ink-800">{bhk}</b> Beds</span>}
          {area > 0 && <span className="flex items-center gap-1.5"><Icon name="ruler" size={14} color="#64748B" /><b className="text-ink-800">{area}</b> sqft</span>}
          {p.isNegotiable && <span className="ml-auto flex items-center gap-1 text-emerald-600 font-medium"><Icon name="tag" size={13} />Negotiable</span>}
        </div>
      </div>
    </div>
  );
}
