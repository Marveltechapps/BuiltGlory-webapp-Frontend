'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { PageWrap } from '../ui/PageWrap';
import { PhotoPlaceholder, CoverImg } from '../ui/Photo';
import { PropCard } from '../ui/PropCard';
import { Loading, PageError, PageLoading } from '../ui/StateViews';
import { useProperty, useSimilarProperties } from '../../hooks/useProperties';
import { useBack } from '../../hooks/useNavigation';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { supportContact, useAppConfig } from '../../context/AppConfigContext';
import { AddressMap } from '../ui/LiveMap';
import { amenityIcon, typeLabel } from '../../lib/catalog';
import { cx, emi, formatINR, timeAgo } from '../../lib/format';
import { floorLabel, isVerified, mapsUrl, pricePerSqft, propertyArea, propertyBhk, propertyLocation, propertyPhotos, specRows, unitNumber } from '../../lib/property';
import { shareLink } from '../../lib/share';
import type { Property } from '../../types/property';

type Tab = 'overview' | 'specs' | 'amenities' | 'floor' | 'location';

function Lightbox({ p, photos, img, setImg, onClose }: { p: Property; photos: string[]; img: number; setImg: (fn: (i: number) => number) => void; onClose: () => void }) {
  const count = Math.max(photos.length, 1);
  const next = () => setImg((i) => (i + 1) % count);
  const prev = () => setImg((i) => (i - 1 + count) % count);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setImg((i) => (i + 1) % count); if (e.key === 'ArrowLeft') setImg((i) => (i - 1 + count) % count); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, onClose, setImg]);
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col fade-in" onClick={onClose}>
      <div className="flex items-center justify-between px-5 h-16 shrink-0 text-white">
        <div className="min-w-0"><div className="text-[14px] font-bold truncate">{p.title}</div><div className="text-[12px] text-white/60">{propertyLocation(p)}</div></div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-white/80">{photos.length ? img + 1 : 0} / {photos.length}</span>
          <button type="button" aria-label="Close" onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 grid place-items-center hover:bg-white/20 transition"><Icon name="x" size={20} color="#fff" /></button>
        </div>
      </div>
      <div className="flex-1 relative grid place-items-center px-4 pb-4 min-h-0" onClick={(e) => e.stopPropagation()}>
        <PhotoPlaceholder tag={p._id + img} src={photos[img]} className="rounded-2xl w-full h-full max-w-[1100px]" style={{ maxHeight: '100%' }} />
        {photos.length > 1 && <>
          <button type="button" aria-label="Previous photo" onClick={prev} className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur grid place-items-center hover:bg-white/20 transition"><Icon name="chevron-left" size={26} color="#fff" /></button>
          <button type="button" aria-label="Next photo" onClick={next} className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur grid place-items-center hover:bg-white/20 transition"><Icon name="chevron-right" size={26} color="#fff" /></button>
        </>}
      </div>
      <div className="shrink-0 flex gap-2 justify-center pb-6 px-4 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
        {photos.map((src, i) => (
          <button type="button" key={src + i} onClick={() => setImg(() => i)} className={cx('w-24 h-16 rounded-lg overflow-hidden ring-2 transition shrink-0', img === i ? 'ring-white' : 'ring-transparent opacity-50 hover:opacity-90')}>
            <PhotoPlaceholder tag={p._id + i} src={src} style={{ height: '100%' }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Similar({ p }: { p: Property }) {
  const similar = useSimilarProperties(p, 3);
  if (similar.loading && !similar.data) return <Loading label="Loading similar properties" />;
  if (!similar.data || similar.data.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-[18px] font-extrabold tracking-tight text-ink-900 mb-4">Similar properties</h3>
      <div className="grid sm:grid-cols-3 gap-4">{similar.data.map((s) => <PropCard key={s._id} p={s} />)}</div>
    </div>
  );
}

export function PropertyDetail({ id }: { id: string }) {
  const router = useRouter();
  const back = useBack('/browse');
  const { favorites, toggleFavorite, requireAuth } = useSession();
  const { toast, toastError } = useToast();
  const contact = supportContact(useAppConfig());
  const { data: p, loading, error, reload } = useProperty(id);
  const [img, setImg] = useState(0);
  const [tab, setTab] = useState<Tab>('overview');
  const [lightbox, setLightbox] = useState(false);

  if (loading && !p) return <PageLoading label="Loading property" />;
  if (error || !p) return <PageError message={error ?? 'Property not found.'} onRetry={reload} />;

  const photos = propertyPhotos(p);
  const galCount = photos.length;
  const nextImg = () => setImg((i) => (galCount ? (i + 1) % galCount : 0));
  const prevImg = () => setImg((i) => (galCount ? (i - 1 + galCount) % galCount : 0));
  const go = (path: string) => requireAuth(() => router.push(`/properties/${p._id}/${path}`));
  const area = propertyArea(p);
  const bhk = propertyBhk(p);
  const rate = pricePerSqft(p);
  const saved = favorites.has(p._id);
  const unit = unitNumber(p);
  const highlights = [
    { icon: 'bed-double', label: 'Configuration', value: bhk > 0 ? `${bhk} BHK` : typeLabel(p.type) },
    { icon: 'ruler', label: 'Built-up area', value: area ? `${area} sqft` : '—' },
    { icon: 'building', label: 'Floor', value: floorLabel(p) },
    { icon: 'compass', label: 'Facing', value: p.specs?.facing || '—' },
    { icon: 'calendar', label: 'Posted', value: timeAgo(p.createdAt) || '—' },
    { icon: 'trending-up', label: 'Rate', value: rate ? `${formatINR(rate)}/sqft` : '—' },
  ];
  const specs = specRows(p);
  const share = () => requireAuth(() => { shareLink(p.title).then((r) => { if (r === 'copied') toast('Share link copied', 'link'); }).catch(() => toastError('Could not share this link.')); });

  return (
    <PageWrap className="!max-w-[1200px]">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-500 hover:text-brand-600 transition mb-4"><Icon name="arrow-left" size={16} />Back to results</button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag tone="brand">{typeLabel(p.type)}</Tag>
            {isVerified(p) && <Tag tone="green" icon="badge-check">Legally verified</Tag>}
            {p.isNegotiable && <Tag tone="amber" icon="tag">Negotiable</Tag>}
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink-900 leading-tight">{p.title}</h1>
          <div className="flex items-center gap-1.5 text-[14px] text-ink-500 mt-1.5 flex-wrap"><Icon name="map-pin" size={15} color="#1A6FFF" />{propertyLocation(p) || '—'}{unit && ` · Flat ${unit}`}<button type="button" onClick={() => setTab('location')} className="ml-1 text-brand-600 font-semibold hover:underline">View on Map →</button></div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon="share-2" onClick={share}>Share</Button>
          <Button variant="outline" size="sm" icon="heart" onClick={() => toggleFavorite(p._id)} className={saved ? '!text-rose-600 !border-rose-200 !bg-rose-50' : ''}>{saved ? 'Saved' : 'Save'}</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-6 items-start">
        {/* left column */}
        <div className="min-w-0">
          {/* gallery */}
          <div className="grid grid-cols-4 gap-2.5" style={{ height: 420 }}>
            <PhotoPlaceholder tag={p._id + img} src={photos[img]} className="col-span-4 sm:col-span-3 rounded-2xl relative cursor-zoom-in" style={{ height: '100%' }} onClick={() => setLightbox(true)}>
              {isVerified(p) && <div className="absolute top-3 left-3"><span className="bg-white/90 backdrop-blur text-emerald-600 text-[12px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><Icon name="badge-check" size={14} />Verified</span></div>}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox(true); }} className="bg-black/50 backdrop-blur text-white h-7 px-2.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 hover:bg-black/70 transition"><Icon name="maximize" size={13} color="#fff" />Full screen</button>
                <div className="bg-black/50 backdrop-blur text-white text-[12px] font-semibold px-2.5 py-1 rounded-full">{galCount ? img + 1 : 0}/{galCount}</div>
              </div>
              {galCount > 1 && <>
                <button type="button" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); prevImg(); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur grid place-items-center shadow hover:bg-white transition"><Icon name="chevron-left" size={20} color="#0F172A" /></button>
                <button type="button" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); nextImg(); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur grid place-items-center shadow hover:bg-white transition"><Icon name="chevron-right" size={20} color="#0F172A" /></button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">{photos.map((_, i) => <button type="button" aria-label={`Photo ${i + 1}`} key={i} onClick={(e) => { e.stopPropagation(); setImg(i); }} className={cx('h-1.5 rounded-full transition-all', i === img ? 'w-6 bg-white' : 'w-1.5 bg-white/60')}></button>)}</div>
              </>}
            </PhotoPlaceholder>
            <div className="hidden sm:flex flex-col gap-2.5">
              {[0, 1, 2].map((i) => (
                <button type="button" key={i} onClick={() => { if (photos[i]) setImg(i); setLightbox(true); }} className={cx('flex-1 rounded-xl overflow-hidden relative ring-2 transition cursor-zoom-in', img === i && photos[i] ? 'ring-brand-600' : 'ring-transparent')}>
                  <PhotoPlaceholder tag={p._id + 'g' + i} src={photos[i]} style={{ height: '100%' }} />
                  {i === 2 && galCount > 0 && <div className="absolute inset-0 bg-black/50 grid place-items-center text-white text-[13px] font-bold">+{galCount}</div>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5 mt-4">
            {([['scan', 'VR Tour', 'vr-tour'], ['plane', 'Aerial', 'aerial'], ['list-checks', 'Specs', 'specs'], ['map-pin', 'Location', 'location']] as const).map(([ic, l, path]) => (
              <button type="button" key={l} onClick={() => go(path)} className="rounded-2xl border border-ink-200 bg-white py-3.5 flex flex-col items-center gap-1.5 hover:border-brand-300 hover:shadow-sm transition"><Icon name={ic} size={20} color="#1A6FFF" /><span className="text-[12px] font-semibold text-ink-700">{l}</span></button>
            ))}
          </div>

          {/* tabs */}
          <div className="flex gap-1 mt-7 border-b border-ink-200 overflow-x-auto hide-scroll">
            {([['overview', 'Overview'], ['specs', 'Specifications'], ['amenities', 'Amenities'], ['floor', 'Floor plan'], ['location', 'Location']] as const).map(([k, l]) => (
              <button type="button" key={k} onClick={() => setTab(k)} className={cx('px-4 h-11 text-[13.5px] font-semibold border-b-2 -mb-px transition whitespace-nowrap', tab === k ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink-500 hover:text-ink-800')}>{l}</button>
            ))}
          </div>

          <div className="py-6">
            {tab === 'overview' && (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {highlights.map((h) => (
                    <div key={h.label} className="bg-white rounded-2xl border border-ink-200 p-4">
                      <Icon name={h.icon} size={18} color="#1A6FFF" />
                      <div className="text-[11.5px] text-ink-400 mt-2">{h.label}</div>
                      <div className="text-[14.5px] font-bold text-ink-900">{h.value}</div>
                    </div>
                  ))}
                </div>
                <h3 className="text-[16px] font-bold text-ink-900 mt-7 mb-2">About this property</h3>
                <p className="text-[14px] text-ink-600 leading-relaxed whitespace-pre-line">{p.description || 'The owner has not added a description yet.'}</p>
              </div>
            )}
            {tab === 'specs' && (specs.length ? (
              <div className="grid sm:grid-cols-2 gap-x-8">
                {specs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 border-b border-ink-100">
                    <span className="text-[13.5px] text-ink-500">{k}</span><span className="text-[13.5px] font-semibold text-ink-800 text-right">{v}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-[13.5px] text-ink-500">Specifications haven&apos;t been added for this listing yet.</p>)}
            {tab === 'amenities' && ((p.amenities ?? []).length ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(p.amenities ?? []).map((a) => (
                  <div key={a} className="bg-white rounded-2xl border border-ink-200 p-4 flex flex-col items-center gap-2 text-center">
                    <div className="w-11 h-11 rounded-xl bg-brand-50 grid place-items-center"><Icon name={amenityIcon(a)} size={20} color="#1A6FFF" /></div>
                    <span className="text-[12.5px] font-medium text-ink-700">{a}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-[13.5px] text-ink-500">No amenities listed for this property.</p>)}
            {tab === 'floor' && (p.media?.floorPlanUrl ? (
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-2xl overflow-hidden relative aspect-[4/3] bg-gradient-to-br grid place-items-center group cursor-pointer from-emerald-400 to-emerald-500" onClick={() => go('floor-plan')}>
                  <CoverImg src={p.media.floorPlanUrl} className="!object-contain bg-white" />
                  <button type="button" aria-label="Open floor plan" onClick={(e) => { e.stopPropagation(); go('floor-plan'); }} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/25 grid place-items-center"><Icon name="maximize-2" size={14} color="#fff" /></button>
                  <span className="absolute bottom-2.5 left-2.5 bg-black/35 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">Plan 1</span>
                </div>
              </div>
            ) : <p className="text-[13.5px] text-ink-500">A floor plan hasn&apos;t been uploaded for this property yet.</p>)}
            {tab === 'location' && (
              <div>
                <AddressMap address={p.address} pinId={p._id} label="Home" height={320} className="rounded-2xl border border-ink-200" />
                <div className="mt-3 bg-white rounded-xl border border-ink-200 p-3 flex items-center gap-3"><Icon name="map-pin" size={18} color="#1A6FFF" /><div className="text-[13px] font-semibold text-ink-800">{propertyLocation(p) || 'Location on request'}</div><a href={mapsUrl(p)} target="_blank" rel="noopener noreferrer" className="ml-auto text-[12px] text-brand-600 font-semibold cursor-pointer whitespace-nowrap">Get directions</a></div>
              </div>
            )}
          </div>

          <Similar p={p} />
        </div>

        {/* sticky sidebar */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <div className="bg-white rounded-2xl border border-ink-200 p-5 shadow-sm">
            <div className="text-[12px] text-ink-400">Asking price</div>
            <div className="text-[30px] font-extrabold text-brand-600 leading-none mt-1">{formatINR(p.price)}</div>
            <div className="text-[12.5px] text-ink-500 mt-1.5">{rate ? `${formatINR(rate)}/sqft · ` : ''}{p.isNegotiable ? 'Negotiable' : 'Fixed price'}</div>
            <div className="mt-4 p-3 rounded-xl bg-brand-50 flex items-center gap-3">
              <Icon name="calculator" size={20} color="#1259D4" />
              <div><div className="text-[11.5px] text-brand-700/80">Est. EMI @ 8.5%, 20yr</div><div className="text-[15px] font-bold text-brand-700">₹ {emi(p.price).toLocaleString('en-IN')}/mo</div></div>
            </div>
            <div className="mt-4 space-y-2.5">
              <Button className="w-full" icon="mail" onClick={() => go('enquiry')}>Submit enquiry</Button>
              <Button variant="outline" className="w-full" icon="git-compare" onClick={() => go('compare')}>Compare</Button>
              <Button variant="ghost" className="w-full" icon="video" onClick={() => go('nri-call')}>NRI video tour</Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-ink-200 p-5">
            <div className="text-[12px] font-semibold text-ink-400 uppercase tracking-wide mb-3">Your advisor</div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-bold">BG</div>
              <div className="min-w-0 flex-1"><div className="text-[14px] font-bold text-ink-900 truncate">Builtglory Advisor</div><div className="text-[12px] text-ink-500 flex items-center gap-1">Assigned after your enquiry</div></div>
              <button type="button" aria-label="Call Builtglory" onClick={() => requireAuth(() => { if (contact.telUrl) window.location.href = contact.telUrl; else router.push('/support/call'); })} className="w-10 h-10 rounded-full bg-brand-50 grid place-items-center shrink-0 hover:bg-brand-100 transition"><Icon name="phone" size={17} color="#1A6FFF" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded-xl bg-ink-50 p-3 text-center"><div className="text-[18px] font-extrabold text-ink-900">{p.metrics?.views ?? 0}</div><div className="text-[11px] text-ink-400">Views</div></div>
              <div className="rounded-xl bg-ink-50 p-3 text-center"><div className="text-[18px] font-extrabold text-ink-900">{p.metrics?.enquiries ?? 0}</div><div className="text-[11px] text-ink-400">Enquiries</div></div>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 flex gap-3">
            <Icon name="shield-check" size={22} color="#059669" className="shrink-0" />
            <div><div className="text-[13px] font-bold text-emerald-800">Builtglory Assured</div><p className="text-[12px] text-emerald-700/80 mt-0.5">Title, legal & encumbrance verified. Payments protected by escrow.</p></div>
          </div>
        </div>
      </div>

      {lightbox && <Lightbox p={p} photos={photos} img={img} setImg={setImg} onClose={() => setLightbox(false)} />}
    </PageWrap>
  );
}
