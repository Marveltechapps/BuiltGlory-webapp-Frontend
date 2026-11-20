'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Pill } from '../ui/Tag';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { CoverImg } from '../ui/Photo';
import { PageError, PageLoading } from '../ui/StateViews';
import { useProperty } from '../../hooks/useProperties';
import { useBack } from '../../hooks/useNavigation';
import { useToast } from '../../context/ToastContext';
import { AddressMap } from '../ui/LiveMap';
import { SPECS } from '../../lib/catalog';
import { cx } from '../../lib/format';
import { mapsUrl, propertyArea, propertyLocality } from '../../lib/property';
import type { NearbyPlace } from '../../types/property';

function usePropertyPage(id: string) {
  const back = useBack(`/properties/${id}`);
  const q = useProperty(id);
  const gate = q.loading && !q.data ? <PageLoading label="Loading property" /> : q.error || !q.data ? <PageError message={q.error ?? 'Property not found.'} onRetry={q.reload} /> : null;
  return { p: q.data, gate, back };
}

const enterFullscreen = (el: HTMLElement | null) => { void el?.requestFullscreen?.(); };

// ── 360° VIRTUAL TOUR ────────────────────────────────────────
export function VrTour({ id }: { id: string }) {
  const { p, gate, back } = usePropertyPage(id);
  const { toast } = useToast();
  const box = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [room, setRoom] = useState('Living');
  const [muted, setMuted] = useState(false);
  if (gate || !p) return gate;
  const url = p.media?.tour3dUrl;
  const rooms = ['Living', 'Kitchen', 'Master Bed', 'Bed 2', 'Bathroom', 'Balcony'];
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900"><Icon name="arrow-left" size={18} />360° Virtual Tour</button>
        <button type="button" aria-label="Full screen" onClick={() => enterFullscreen(box.current)} className="w-9 h-9 rounded-full border border-ink-200 grid place-items-center hover:bg-ink-50"><Icon name="maximize" size={16} color="#334155" /></button>
      </div>
      <div ref={box} className="rounded-3xl overflow-hidden relative" style={{ aspectRatio: '1/1', background: 'radial-gradient(circle at 40% 35%, #6366F1, #4338CA 55%, #312E81)' }}>
        {playing && url ? (
          <iframe src={url} title={`${p.title} virtual tour`} className="absolute inset-0 w-full h-full border-0" allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowFullScreen />
        ) : (
          <>
            <div className="absolute top-4 left-4"><span className="bg-white/15 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-full ring-1 ring-white/25">LIVE 360°</span></div>
            <div className="absolute top-4 right-4 text-[13px] font-semibold text-indigo-200">{room}</div>
            <button type="button" aria-label="Play tour" disabled={!url} onClick={() => setPlaying(true)} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full ring-2 ring-white/40 grid place-items-center hover:ring-white/70 transition disabled:opacity-60"><Icon name="rotate-3d" size={34} color="#fff" /></button>
            {!url && <div className="absolute left-1/2 top-[62%] -translate-x-1/2 text-center text-[13px] font-semibold text-indigo-100 px-4">A virtual tour isn&apos;t available for this property yet.</div>}
          </>
        )}
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4 pointer-events-none">
          <button type="button" aria-label={muted ? 'Unmute audio' : 'Mute audio'} onClick={() => { setMuted((m) => !m); toast(muted ? 'Audio on' : 'Audio muted', muted ? 'volume-2' : 'volume-x'); }} className="pointer-events-auto w-11 h-11 rounded-full bg-white/15 backdrop-blur grid place-items-center ring-1 ring-white/20"><Icon name={muted ? 'volume-x' : 'volume-2'} size={18} color="#fff" /></button>
          <button type="button" disabled={!url} onClick={() => setPlaying((v) => !v)} className="pointer-events-auto bg-white rounded-full px-5 h-11 text-[14px] font-bold text-ink-900 flex items-center gap-2 shadow-lg disabled:opacity-60"><Icon name={playing ? 'pause' : 'play'} size={16} color="#0F172A" />{playing ? 'Pause tour' : 'Play tour'}</button>
          <button type="button" aria-label="Tour info" onClick={() => toast(url ? `360° tour of ${p.title}` : 'No virtual tour uploaded yet', 'info')} className="pointer-events-auto w-11 h-11 rounded-full bg-white/15 backdrop-blur grid place-items-center ring-1 ring-white/20"><Icon name="info" size={18} color="#fff" /></button>
        </div>
      </div>
      <div className="text-[12px] font-semibold text-ink-400 uppercase tracking-wide mt-6 mb-2">Rooms</div>
      <div className="flex flex-wrap gap-2">{rooms.map((r) => <Pill key={r} active={room === r} onClick={() => setRoom(r)}>{r}</Pill>)}</div>
    </PageWrap>
  );
}

// ── AERIAL DRONE VIEW ────────────────────────────────────────
export function AerialView({ id }: { id: string }) {
  const { p, gate, back } = usePropertyPage(id);
  const { toast } = useToast();
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [total, setTotal] = useState(0);
  const [zoom, setZoom] = useState(false);
  if (gate || !p) return gate;
  const videoUrl = p.media?.videoUrl;
  const imageUrl = p.media?.droneImageUrl;
  const media = videoUrl || imageUrl;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const toggle = () => { const v = video.current; if (!v) return; if (v.paused) void v.play(); else v.pause(); };
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900 mb-4"><Icon name="arrow-left" size={18} />Aerial Drone View</button>
      <div className="rounded-3xl overflow-hidden relative" style={{ aspectRatio: '16/9', background: 'linear-gradient(#8FD3F4 0%, #A9E0FB 55%, #7EC850 55%, #4CA64C 100%)' }}>
        {videoUrl ? (
          <video ref={video} src={videoUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300" style={{ transform: zoom ? 'scale(1.5)' : undefined }} playsInline
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setTotal(e.currentTarget.duration || 0)} />
        ) : imageUrl ? (
          <CoverImg src={imageUrl} style={{ transform: zoom ? 'scale(1.5)' : undefined }} />
        ) : <div className="absolute left-[42%] top-[46%] w-24 h-20 bg-amber-300 rounded-md shadow-lg -rotate-3"></div>}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="bg-white/85 text-rose-600 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"><span className={cx('w-2 h-2 rounded-full bg-rose-500', playing && 'animate-pulse')}></span>{videoUrl ? 'VIDEO' : 'AERIAL'}</span>
        </div>
        {videoUrl && <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/25 backdrop-blur grid place-items-center ring-2 ring-white/40 hover:bg-white/35 transition"><Icon name={playing ? 'pause' : 'play'} size={26} color="#fff" /></button>}
        {!media && <div className="absolute inset-x-0 bottom-6 text-center text-[13px] font-semibold text-white drop-shadow">Aerial footage isn&apos;t available for this property yet.</div>}
      </div>
      {videoUrl && (
        <div className="flex items-center gap-3 mt-4">
          <span className="text-[12px] font-semibold text-ink-500 w-10">{fmt(t)}</span>
          <div className="flex-1 h-1.5 rounded-full bg-ink-200 overflow-hidden cursor-pointer" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); if (video.current && total) video.current.currentTime = ((e.clientX - r.left) / r.width) * total; }}><div className="h-full bg-brand-600 rounded-full" style={{ width: `${total ? (t / total) * 100 : 0}%` }}></div></div>
          <span className="text-[12px] font-semibold text-ink-500 w-10 text-right">{fmt(total)}</span>
        </div>
      )}
      <div className="grid grid-cols-4 gap-2.5 mt-5">
        {([['compass', 'N · orient'], ['zoom-in', 'Zoom'], ['layers', 'Layers'], ['download', 'Save']] as const).map(([ic, l]) => (
          <button type="button" key={l} disabled={!media} onClick={() => {
            if (l === 'Zoom') setZoom((z) => !z);
            else if (l === 'Save' && media) window.open(media, '_blank', 'noopener,noreferrer');
            else toast(`${l.replace('N · ', '')} isn't available for this footage`, ic);
          }} className="rounded-2xl border border-ink-200 bg-white py-4 flex flex-col items-center gap-1.5 hover:border-brand-300 hover:shadow-sm transition disabled:opacity-50"><Icon name={ic} size={20} color="#1A6FFF" /><span className="text-[12px] font-semibold text-ink-700">{l}</span></button>
        ))}
      </div>
    </PageWrap>
  );
}

// ── SPECIFICATIONS & AMENITIES ───────────────────────────────
export function SpecsView({ id }: { id: string }) {
  const { p, gate, back } = usePropertyPage(id);
  if (gate || !p) return gate;
  const have = new Set((p.amenities ?? []).map((a) => a.toLowerCase()));
  const highlights = p.highlights ?? [];
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900 mb-1"><Icon name="arrow-left" size={18} />Specifications & Amenities</button>
      <p className="text-[13px] text-ink-500 mb-5 ml-7">Everything {p.title} offers across {SPECS.length} categories.</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {SPECS.map((a) => { const on = have.has(a.label.toLowerCase()); return (
          <div key={a.label} className={cx('rounded-2xl border p-4 flex flex-col items-center gap-2 transition', on ? 'border-brand-300 bg-brand-50' : 'border-ink-200 opacity-45')}>
            <Icon name={a.icon} size={20} color={on ? '#1A6FFF' : '#94A3B8'} /><span className={cx('text-[11.5px] font-semibold text-center leading-tight', on ? 'text-brand-700' : 'text-ink-500')}>{a.label}</span>
          </div>); })}
      </div>
      <h3 className="text-[16px] font-bold text-ink-900 mt-7 mb-3">Property highlights</h3>
      <div className="space-y-2.5">
        {highlights.length ? highlights.map((h) => <div key={h} className="flex items-center gap-2.5 text-[13.5px] text-ink-700"><Icon name="circle-check" size={17} color="#059669" />{h}</div>)
          : <div className="text-[13.5px] text-ink-500">No highlights have been added for this property yet.</div>}
      </div>
    </PageWrap>
  );
}

// ── ADVANTAGES & LOCATION ────────────────────────────────────
const toneBg: Record<string, string> = { green: 'bg-emerald-50 text-emerald-600', brand: 'bg-brand-50 text-brand-600', rose: 'bg-rose-50 text-rose-500', violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600' };
const placeMeta = (type = ''): [string, string] => {
  const t = type.toLowerCase();
  if (/school|college|education/.test(t)) return ['school', 'brand'];
  if (/hospital|clinic|health|medical/.test(t)) return ['cross', 'rose'];
  if (/metro|train|rail|bus|transport|airport/.test(t)) return ['train-front', 'violet'];
  if (/mall|shop|market|store/.test(t)) return ['shopping-bag', 'amber'];
  return ['map-pin', 'brand'];
};

export function LocationView({ id }: { id: string }) {
  const { p, gate, back } = usePropertyPage(id);
  const router = useRouter();
  if (gate || !p) return gate;
  const rows: Array<[string, string, string, string]> = [
    ...(p.advantages?.investment ?? []).map((t): [string, string, string, string] => ['trending-up', 'green', 'Investment potential', t]),
    ...(p.nearbyPlaces ?? []).map((n: NearbyPlace): [string, string, string, string] => { const [ic, tone] = placeMeta(n.type); return [ic, tone, n.name || n.type || 'Nearby', [n.type, n.distance].filter(Boolean).join(' · ')]; }),
    ...(p.advantages?.connectivity ?? []).map((t): [string, string, string, string] => ['train-front', 'violet', 'Connectivity', t]),
    ...(p.advantages?.location ?? []).map((t): [string, string, string, string] => ['map-pin', 'brand', 'Location', t]),
  ];
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900 mb-5"><Icon name="arrow-left" size={18} />Advantages & Location</button>
      <div className="space-y-3">
        {rows.length ? rows.map(([ic, tone, t, s], i) => (
          <Card key={`${t}-${i}`} className="p-4 flex items-center gap-3.5">
            <div className={cx('w-11 h-11 rounded-2xl grid place-items-center shrink-0', toneBg[tone])}><Icon name={ic} size={20} /></div>
            <div><div className="text-[14.5px] font-bold text-ink-900">{t}</div><div className="text-[12.5px] text-ink-500">{s}</div></div>
          </Card>
        )) : <Card className="p-4 text-[13.5px] text-ink-500">Nearby places and location advantages haven&apos;t been added for {propertyLocality(p) || 'this property'} yet.</Card>}
      </div>
      <div className="relative mt-4">
        <AddressMap address={p.address} pinId={p._id} height={240} className="rounded-2xl border border-ink-200" />
        <a href={mapsUrl(p)} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-14 z-10 bg-white rounded-lg px-3 h-9 text-[12.5px] font-semibold text-ink-800 flex items-center gap-1.5 shadow-sm hover:bg-ink-50"><Icon name="map" size={14} color="#1A6FFF" />Open map</a>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Button variant="outline" icon="scan" onClick={() => router.push(`/properties/${p._id}/vr-tour`)}>VR walk</Button>
        <Button variant="outline" icon="plane" onClick={() => router.push(`/properties/${p._id}/aerial`)}>Aerial view</Button>
      </div>
    </PageWrap>
  );
}

// ── FLOOR PLAN VIEWER ────────────────────────────────────────
export function FloorPlanView({ id }: { id: string }) {
  const { p, gate, back } = usePropertyPage(id);
  const [zoom, setZoom] = useState(1);
  if (gate || !p) return gate;
  const url = p.media?.floorPlanUrl;
  const area = propertyArea(p);
  return (
    <PageWrap className="!max-w-[900px]">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={back} className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink-900"><Icon name="arrow-left" size={19} />Floor Plan · Plan 1</button>
        <div className="flex gap-2">
          <button type="button" aria-label="Zoom out" disabled={!url} onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="w-10 h-10 rounded-full border border-ink-200 grid place-items-center hover:bg-ink-50 disabled:opacity-50"><Icon name="zoom-out" size={17} /></button>
          <button type="button" aria-label="Zoom in" disabled={!url} onClick={() => setZoom((z) => Math.min(2, z + 0.25))} className="w-10 h-10 rounded-full border border-ink-200 grid place-items-center hover:bg-ink-50 disabled:opacity-50"><Icon name="zoom-in" size={17} /></button>
          {url ? <a aria-label="Download floor plan" href={url} target="_blank" rel="noopener noreferrer" download className="w-10 h-10 rounded-full border border-ink-200 grid place-items-center hover:bg-ink-50"><Icon name="download" size={17} /></a>
            : <span className="w-10 h-10 rounded-full border border-ink-200 grid place-items-center opacity-50"><Icon name="download" size={17} /></span>}
        </div>
      </div>
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br grid place-items-center from-emerald-400 to-emerald-500 relative" style={{ aspectRatio: '16/10' }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- floor plan from listing media (arbitrary S3 URL)
          <img src={url} alt={`${p.title} floor plan`} className="max-w-full max-h-full object-contain bg-white transition-transform duration-300" style={{ transform: `scale(${zoom})` }} />
        ) : <div className="text-white text-[14px] font-semibold px-6 text-center">A floor plan hasn&apos;t been uploaded for this property yet.</div>}
      </div>
      <div className="flex gap-2 mt-4"><Pill active>Plan 1</Pill></div>
      <p className="text-[13px] text-ink-500 mt-3">{p.title}{area ? ` · ${area} sq.ft` : ''}</p>
    </PageWrap>
  );
}
