'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Pill } from '../ui/Tag';
import { Button } from '../ui/Button';
import { Card, Toggle } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { CoverImg, PhotoPlaceholder } from '../ui/Photo';
import { FieldRow, FormError, TextInput } from '../ui/FormFields';
import { Loading, PageError, PageLoading } from '../ui/StateViews';
import { useProperties } from '../../hooks/useProperties';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { createSellDraft, getMarketEstimate, getSellRequest, submitSellRequest, updateSellRequest } from '../../services/sellRequestService';
import { uploadDocument } from '../../services/documentService';
import { updateMe } from '../../services/userService';
import { reverseGeocode } from '../../services/geoService';
import { errorMessage } from '../../services/api';
import { LiveMap } from '../ui/LiveMap';
import { AGES, BHKS, FACINGS, FURNISHINGS, OWNERSHIPS, PARKING_TYPES, PROPERTY_TYPES, SELL_AMENITIES, SUBTYPES, cityCenter, typeByApi, typeById } from '../../lib/catalog';
import { AREA_MIN, PRICE_MIN, basicReady, detailsReady, sellKind } from '../../lib/sellCategory';
import { cx, formatINR } from '../../lib/format';
import type { MarketEstimate, SellRequest, SellRequestPayload } from '../../types/sellRequest';

const STEPS = ['Basic Details', 'Location & Address', 'Property Details', 'Amenities', 'Add Photos', 'Expected Price'];
const MIN_PHOTOS = 5; // sellRequests/validationRules.js SELL_LIMITS.photosMin
const MIN_TITLE = 8; // SELL_LIMITS.titleMin
const GRADS = ['from-red-400 to-rose-400', 'from-blue-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-violet-400 to-purple-500'];

interface Form {
  title: string; subType: string; bhk: string; builtup: string; carpet: string; floor: string; totalFloors: string; unit: string; age: string;
  plotArea: string; share: string; totalValue: string; scope: string; suitableFor: string; roadWidth: string; approval: string; furnishDetails: string;
  building: string; area: string; city: string; pincode: string; facing: string; ownership: string; furnishing: string; parking: number; parkingType: string;
  price: string; negotiable: boolean;
}
interface Photo { key: string; url?: string; preview: string; uploading: boolean }

const n = (v: string) => parseInt(v.replace(/\D/g, ''), 10) || 0;
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

/** Rebuilds the wizard form from a saved draft (inverse of `payload()`). */
function formFromDraft(sr: SellRequest, base: Form): Form {
  const s = sr.specifications ?? {};
  const bhk = str(s.bhk);
  return {
    ...base,
    title: sr.propertyTitle ?? '',
    subType: str(s.subType),
    bhk: bhk ? (/bhk|studio/i.test(bhk) ? bhk : `${bhk} BHK`) : base.bhk,
    builtup: str(s.builtUpArea), carpet: str(s.carpetArea), floor: str(s.floor), totalFloors: str(s.totalFloors), unit: str(s.unitNo),
    age: str(s.propertyAge) || base.age,
    plotArea: str(s.plotArea), share: str(s.sharePercentage), totalValue: str(s.totalPropertyValue), scope: str(s.scopeOfWork),
    suitableFor: str(s.commercialType), roadWidth: str(s.roadWidth), approval: str(s.approvalType), furnishDetails: str(s.furnishDetails),
    building: sr.address?.street ?? '', area: sr.address?.locality ?? '', city: sr.address?.city || base.city, pincode: sr.address?.pincode ?? '',
    facing: str(s.facing) || base.facing, ownership: sr.ownershipType || base.ownership, furnishing: str(s.furnishing) || base.furnishing,
    parking: typeof s.parking === 'number' ? s.parking : base.parking, parkingType: str(s.parkingType),
    price: sr.askingPrice ? String(sr.askingPrice) : '', negotiable: sr.negotiable ?? base.negotiable,
  };
}

function PillRow({ options, value, onPick }: { options: string[]; value: string; onPick: (v: string) => void }) {
  return <div className="flex flex-wrap gap-2">{options.map((o) => <Pill key={o} active={value === o} onClick={() => onPick(o)}>{o}</Pill>)}</div>;
}

function RecentlySold() {
  const sold = useProperties({ recentlySold: true, limit: 4 });
  if (sold.loading && !sold.data) return <Loading label="Loading recent sales" />;
  const items = sold.data?.items ?? [];
  if (!items.length) return <div className="text-[13px] text-ink-400">No recent sales to show yet.</div>;
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
      {items.map((p, i) => {
        const days = p.soldAt && p.createdAt ? Math.max(1, Math.round((new Date(p.soldAt).getTime() - new Date(p.createdAt).getTime()) / 86400000)) : null;
        return (
          <div key={p._id} className="w-44 shrink-0 rounded-2xl border border-ink-200 overflow-hidden bg-white">
            <div className={cx('h-24 bg-gradient-to-br relative', GRADS[i % GRADS.length])}><svg viewBox="0 0 120 30" className="absolute bottom-0 left-0 w-full opacity-40"><path d="M0 20 Q30 8 60 18 T120 14 V30 H0 Z" fill="#fff" /></svg></div>
            <div className="p-3"><div className="text-[15px] font-extrabold text-brand-600">{formatINR(p.price).replace('₹ ', '₹')}</div><div className="text-[12px] text-ink-400 mt-0.5">{days ? `Sold in ${days} days` : 'Sold'}</div></div>
          </div>
        );
      })}
    </div>
  );
}

export function SellWizard({ draftId: resumeId }: { draftId?: string }) {
  const router = useRouter();
  const { user, setUser, requireAuth } = useSession();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [type, setType] = useState<string | null>(null);
  const [picking, setPicking] = useState(!resumeId);
  const [resume, setResume] = useState<{ loading: boolean; error: string | null }>({ loading: !!resumeId, error: null });
  const [f, setF] = useState<Form>({
    title: '', subType: '', bhk: '3 BHK', builtup: '', carpet: '', floor: '', totalFloors: '', unit: '', age: '1–5 years',
    plotArea: '', share: '', totalValue: '', scope: '', suitableFor: '', roadWidth: '', approval: '', furnishDetails: '',
    building: '', area: '', city: user?.city || 'Chennai', pincode: '', facing: 'East', ownership: 'Freehold', furnishing: 'Unfurnished', parking: 1, parkingType: '',
    price: '', negotiable: true,
  });
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [amens, setAmens] = useState<Set<string>>(new Set(['Lift', 'Parking', 'Security', 'Power Backup']));
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<MarketEstimate | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [resumeTry, setResumeTry] = useState(0);
  useEffect(() => {
    if (!resumeId) return;
    const ctrl = new AbortController();
    getSellRequest(resumeId, ctrl.signal).then((sr) => {
      setDraftId(sr._id);
      setType(typeByApi(sr.propertyType)?.id ?? 'apartment');
      setF((base) => formFromDraft(sr, base));
      if (sr.amenities?.length) setAmens(new Set(sr.amenities));
      setPhotos((sr.photos ?? []).map((url) => ({ key: url, url, preview: url, uploading: false })));
      if (typeof sr.address?.latitude === 'number' && typeof sr.address?.longitude === 'number') setCoords({ latitude: sr.address.latitude, longitude: sr.address.longitude });
      setStep(Math.min(5, Math.max(0, (sr.draftStep ?? 1) - 1)));
      setPicking(false);
      setResume({ loading: false, error: null });
    }).catch((e: unknown) => {
      if (ctrl.signal.aborted) return;
      setResume({ loading: false, error: errorMessage(e, 'Could not load this draft.') });
    });
    return () => ctrl.abort();
  }, [resumeId, resumeTry]);

  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((o) => ({ ...o, [k]: e.target.value }));
  const toggleA = (a: string) => setAmens((s) => { const x = new Set(s); if (x.has(a)) x.delete(a); else x.add(a); return x; });
  const typeObj = typeById(type) ?? PROPERTY_TYPES[1]!;
  const kind = sellKind(typeObj.api);
  const subList = SUBTYPES[type ?? ''] ?? [];
  const priceNum = n(f.price);
  const areaNum = kind === 'plot' ? n(f.plotArea) : n(f.builtup) || n(f.plotArea);
  const perSqft = priceNum && areaNum ? Math.round(priceNum / areaNum) : 0;
  const uploaded = photos.filter((p) => p.url);
  const furnished = f.furnishing.toLowerCase() !== 'unfurnished';
  const checks = { ...f };
  const canNext = [
    basicReady(kind, checks, MIN_TITLE),
    f.building.trim().length >= 3 && /^\d{6}$/.test(f.pincode.trim()),
    detailsReady(kind, checks),
    amens.size > 0,
    uploaded.length >= MIN_PHOTOS && !photos.some((p) => p.uploading),
    priceNum >= PRICE_MIN,
  ][step];

  const payload = (): SellRequestPayload => ({
    propertyType: typeObj.api,
    propertyTitle: f.title.trim(),
    askingPrice: priceNum >= 50000 ? priceNum : undefined,
    negotiable: f.negotiable,
    address: {
      street: f.building.trim() || undefined, locality: f.area.trim() || undefined, city: f.city.trim() || undefined,
      pincode: /^\d{6}$/.test(f.pincode.trim()) ? f.pincode.trim() : undefined, ...(coords ?? {}),
    },
    specifications: {
      subType: f.subType || undefined,
      ...(kind === 'home' ? {
        bhk: f.bhk.replace(/\s*BHK$/, ''),
        builtUpArea: n(f.builtup) || null,
        carpetArea: n(f.carpet) || null,
        floor: f.floor.trim() || null,
        totalFloors: n(f.totalFloors) || null,
        unitNo: f.unit.trim() || undefined,
        propertyAge: f.age,
        facing: f.facing,
        furnishing: f.furnishing,
        ...(furnished && f.furnishDetails.trim() ? { furnishDetails: f.furnishDetails.trim() } : {}),
        parking: f.parking,
        ...(f.parking > 0 && f.parkingType ? { parkingType: f.parkingType } : {}),
      } : {}),
      ...(kind === 'plot' ? {
        plotArea: n(f.plotArea) || null,
        facing: f.facing,
        ...(n(f.roadWidth) >= 3 ? { roadWidth: n(f.roadWidth) } : {}),
        ...(f.approval ? { approvalType: f.approval } : {}),
      } : {}),
      ...(kind === 'commercial' ? {
        commercialType: f.suitableFor || undefined,
        builtUpArea: n(f.builtup) || null,
        plotArea: n(f.plotArea) || null,
        floor: f.floor.trim() || null,
        facing: f.facing,
        parking: f.parking,
        ...(f.parking > 0 && f.parkingType ? { parkingType: f.parkingType } : {}),
      } : {}),
      ...(kind === 'fractional' ? {
        sharePercentage: Number(f.share) || null,
        totalPropertyValue: n(f.totalValue) || null,
      } : {}),
      ...(kind === 'interior' ? { scopeOfWork: f.scope.trim() || undefined } : {}),
    },
    amenities: [...amens],
    ...(kind === 'interior' ? {} : { ownershipType: f.ownership }),
    photos: uploaded.map((p) => p.url as string),
    draftStep: step + 1,
  });

  /** Creates the draft on first use (photos need a sell-request id to upload against) and saves the latest form. */
  const saveDraft = async () => {
    if (draftId) { await updateSellRequest(draftId, payload()); return draftId; }
    const created = await createSellDraft(payload());
    setDraftId(created._id);
    return created._id;
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setFormError(null);
    try { await fn(); } catch (e) { setFormError(errorMessage(e, 'Something went wrong. Please try again.')); } finally { setBusy(false); }
  };

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    if (!files.length) return;
    void run(async () => {
      const id = await saveDraft();
      const pending = files.map((file) => ({ file, key: `${Date.now()}-${file.name}-${Math.random()}`, preview: URL.createObjectURL(file) }));
      setPhotos((ps) => [...ps, ...pending.map((x) => ({ key: x.key, preview: x.preview, uploading: true }))]);
      const results = await Promise.allSettled(pending.map((x) => uploadDocument(x.file, 'sell_request', id, 'property_media', 'property_photo')));
      setPhotos((ps) => ps.flatMap((ph) => {
        const i = pending.findIndex((x) => x.key === ph.key);
        if (i < 0) return [ph];
        const r = results[i];
        return r && r.status === 'fulfilled' && r.value.url ? [{ ...ph, url: r.value.url, uploading: false }] : [];
      }));
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed) throw failed.reason;
    });
  };

  const next = () => void run(async () => {
    if (step === 5) {
      const id = await saveDraft();
      if (user && user.role === 'buyer') setUser(await updateMe({ role: 'both' })); // listing a property makes the account a seller too
      await submitSellRequest(id);
      setDone(true);
      toast('Listing submitted');
      return;
    }
    if (step === 4) {
      const id = await saveDraft();
      setEstimate(await getMarketEstimate(id, payload()).catch(() => null));
    }
    setStep(step + 1);
  });

  const geoReq = useRef(0);
  const applyPlace = (latitude: number, longitude: number) => {
    setCoords({ latitude, longitude });
    const request = ++geoReq.current;
    void reverseGeocode(latitude, longitude).then((place) => {
      if (geoReq.current !== request) return;
      setF((current) => ({
        ...current,
        ...(place.city ? { city: place.city } : {}),
        ...(place.locality ? { area: place.locality } : {}),
        ...(place.street && place.street.trim().length >= 3 ? { building: place.street.trim() } : {}),
        ...(place.pincode && /^\d{6}$/.test(place.pincode) ? { pincode: place.pincode } : {}),
      }));
      const where = [place.locality, place.city].filter(Boolean).join(', ');
      toast(where ? `Address filled · ${where}` : 'Location set', 'map-pin');
    }).catch(() => toast('Could not look up that map point', 'map-pin'));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { toast('Location is not available on this device', 'locate-fixed'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => applyPlace(pos.coords.latitude, pos.coords.longitude),
      () => toast('Location access was blocked', 'locate-fixed'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  if (resume.loading) return <PageLoading label="Loading your draft" />;
  if (resume.error) return <PageError message={resume.error} onRetry={() => { setResume({ loading: true, error: null }); setResumeTry((t) => t + 1); }} />;

  if (done) return (
    <PageWrap className="!max-w-[560px]">
      <Card className="p-8 text-center mt-6">
        <div className="w-24 h-24 rounded-full bg-emerald-50 grid place-items-center mx-auto ring-8 ring-emerald-50/60"><Icon name="circle-check" size={40} color="#059669" /></div>
        <h1 className="text-[24px] font-extrabold tracking-tight text-ink-900 mt-6 leading-tight">Your property has been<br />submitted</h1>
        <p className="text-[14px] text-ink-500 mt-2.5 max-w-sm mx-auto">Builtglory team will review within 48 hours. You&apos;ll receive updates on your progress.</p>
        <div className="rounded-2xl border border-ink-200 p-5 mt-7 text-left">
          <div className="text-[12px] font-semibold text-ink-400 uppercase tracking-wide mb-3">4 next steps</div>
          <div className="space-y-4">
            {[['Document Review', '12–24 hours'], ['Site Inspection', '2–3 days'], ['Legal Verification', '3–5 days'], ['Offer from Builtglory', 'After verification']].map(([t, s], i) => (
              <div key={t} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 grid place-items-center text-[12.5px] font-bold shrink-0">{i + 1}</span>
                <div><div className="text-[14px] font-bold text-ink-900">{t}</div><div className="text-[12px] text-ink-400">{s}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6"><Button variant="outline" onClick={() => router.push('/')}>Home</Button><Button icon="tag" onClick={() => router.push('/listings?tab=Upcoming')}>My Listings</Button></div>
      </Card>
    </PageWrap>
  );

  if (picking) return (
    <PageWrap className="!max-w-[860px]">
      <button type="button" onClick={() => router.push('/')} className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-500 hover:text-brand-600 mb-4"><Icon name="arrow-left" size={16} />Sell Property</button>
      <h1 className="text-[26px] font-extrabold tracking-tight text-ink-900">What Would You Like to Sell?</h1>
      <p className="text-[14px] text-ink-500 mt-1.5">Select property type to get started.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
        {PROPERTY_TYPES.map((t) => { const on = type === t.id; return (
          <button type="button" key={t.id} onClick={() => requireAuth(() => { setType(t.id); setF((o) => ({ ...o, subType: '' })); setPicking(false); })} className={cx('rounded-2xl border p-5 flex flex-col items-center gap-3 transition group', on ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-100' : 'border-ink-200 hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5')}>
            <div className={cx('w-14 h-14 rounded-2xl grid place-items-center transition', on ? 'bg-brand-600' : 'bg-brand-50 group-hover:bg-brand-100')}><Icon name={t.icon} size={24} color={on ? '#fff' : '#1A6FFF'} /></div>
            <div className="text-center min-h-[34px]"><div className={cx('text-[13.5px] font-bold leading-tight', on ? 'text-brand-700' : 'text-ink-800')}>{t.label}</div>{t.sub && <div className="text-[11.5px] text-emerald-600 font-medium mt-0.5 leading-tight">{t.sub}</div>}</div>
          </button>); })}
      </div>
      <Card className="p-5 mt-6 flex items-center gap-4 bg-brand-50/50 !border-brand-100">
        <div className="w-11 h-11 rounded-xl bg-white grid place-items-center shrink-0"><Icon name="info" size={20} color="#1A6FFF" /></div>
        <div className="flex-1"><div className="text-[14px] font-bold text-ink-900">Not sure which category?</div><div className="text-[12.5px] text-ink-500">Get free guidance from a property expert.</div></div>
        <Button variant="outline" size="sm" icon="phone" onClick={() => router.push('/support')}>Call Us</Button>
      </Card>

      <h2 className="text-[16px] font-bold text-ink-900 mt-8 mb-3">Recently Sold on Builtglory</h2>
      <RecentlySold />

      <h2 className="text-[16px] font-bold text-ink-900 mt-8 mb-3">Why Sell with Builtglory?</h2>
      <div className="flex flex-wrap gap-2.5">
        {[['No Commission', 'bg-emerald-500'], ['Verified Buyers', 'bg-brand-600'], ['Quick Sale', 'bg-amber-500']].map(([label, bg]) => (
          <span key={label} className={cx('inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-white text-[13.5px] font-bold', bg)}><Icon name="check" size={15} color="#fff" strokeWidth={3} />{label}</span>
        ))}
      </div>
    </PageWrap>
  );

  const typeBanner = (
    <div className="mb-5">
      <div className="flex items-center gap-3 rounded-2xl bg-brand-50 border border-brand-100 p-3.5">
        <div className="w-9 h-9 rounded-xl bg-white grid place-items-center shrink-0"><Icon name={typeObj.icon} size={18} color="#1A6FFF" /></div>
        <div className="flex-1 min-w-0"><div className="text-[14px] font-bold text-brand-700">{typeObj.label}{typeObj.sub ? ' ' + typeObj.sub : ''} Selected</div></div>
        <button type="button" aria-label="Change type" onClick={() => setPicking(true)} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white transition"><Icon name="pencil" size={16} color="#1A6FFF" /></button>
      </div>
    </div>
  );

  return (
    <PageWrap className="!max-w-[980px]">
      <h1 className="text-[24px] font-extrabold tracking-tight text-ink-900">List your property</h1>
      <p className="text-[13.5px] text-ink-500 mt-1">Zero brokerage · verified in 48 hours · reach 12,000+ buyers</p>
      <div className="grid md:grid-cols-[240px_1fr] gap-7 mt-6 items-start">
        <Card className="p-4 md:sticky md:top-6">
          {STEPS.map((s, i) => (
            <button type="button" key={s} onClick={() => i <= step && setStep(i)} className={cx('w-full flex items-center gap-3 py-2.5 text-left', i > step && 'cursor-default')}>
              <span className={cx('w-8 h-8 rounded-full grid place-items-center text-[13px] font-bold shrink-0 transition', i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400')}>{i < step ? <Icon name="check" size={15} strokeWidth={3} /> : i + 1}</span>
              <span className={cx('text-[13.5px] font-semibold', i === step ? 'text-ink-900' : 'text-ink-400')}>{s}</span>
            </button>
          ))}
        </Card>

        <Card className="p-6 min-h-[440px] flex flex-col">
          <div className="flex items-center gap-2 mb-1"><span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">Step {step + 1} of 6</span></div>
          <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden mb-5"><div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${((step + 1) / 6) * 100}%` }}></div></div>
          <div className="flex-1">
            {step === 0 && (<div>
              <h2 className="text-[18px] font-bold text-ink-900 mb-1">Basic Details</h2>
              <p className="text-[13px] text-ink-500 mb-5">Tell us about your property.</p>
              {typeBanner}
              <div className="space-y-4">
                <FieldRow label="Property Title" required hint={`${f.title.length}/100 characters${f.title.trim() && f.title.trim().length < MIN_TITLE ? ` · at least ${MIN_TITLE}` : ''}`}>
                  <TextInput icon="type" maxLength={100} value={f.title} onChange={set('title')} placeholder="e.g. Bright 3 BHK in Adyar" />
                </FieldRow>
                {subList.length > 0 && <FieldRow label="Property Sub-Type">
                  <div className="relative">
                    <select aria-label="Property sub-type" value={f.subType} onChange={set('subType')} className="w-full h-12 px-3.5 pr-10 bg-white border border-ink-200 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 text-[14px] text-ink-900 appearance-none">
                      <option value="">Select sub-type</option>{subList.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Icon name="chevron-down" size={18} color="#94A3B8" className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </FieldRow>}
                {kind === 'home' && <>
                  <FieldRow label="BHK Configuration" required><PillRow options={BHKS} value={f.bhk} onPick={(v) => setF((o) => ({ ...o, bhk: v }))} /></FieldRow>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldRow label="Built-up Area (sqft)" required hint={`At least ${AREA_MIN} sqft`}><TextInput icon="ruler" suffix="sqft" inputMode="numeric" value={f.builtup} onChange={set('builtup')} placeholder="e.g. 1200" /></FieldRow>
                    <FieldRow label="Carpet Area (sqft)" hint="Usable floor area (optional)"><TextInput icon="scan" suffix="sqft" inputMode="numeric" value={f.carpet} onChange={set('carpet')} placeholder="Enter carpet area" /></FieldRow>
                  </div>
                  <FieldRow label="Floor Number">
                    <div className="grid grid-cols-2 gap-3"><TextInput icon="building-2" inputMode="numeric" value={f.floor} onChange={set('floor')} placeholder="Your floor" /><TextInput icon="layers" inputMode="numeric" value={f.totalFloors} onChange={set('totalFloors')} placeholder="Total floors" /></div>
                  </FieldRow>
                  <FieldRow label="Flat / Unit Number" hint="Optional"><TextInput icon="hash" value={f.unit} onChange={set('unit')} placeholder="e.g. A-204, Tower B" /></FieldRow>
                  <FieldRow label="Property Age"><PillRow options={AGES} value={f.age} onPick={(v) => setF((o) => ({ ...o, age: v }))} /></FieldRow>
                </>}
                {kind === 'plot' && <FieldRow label="Plot Area (sqft)" required hint={`At least ${AREA_MIN} sqft`}><TextInput icon="ruler" suffix="sqft" inputMode="numeric" value={f.plotArea} onChange={set('plotArea')} placeholder="e.g. 2400" /></FieldRow>}
                {kind === 'commercial' && <>
                  <FieldRow label="Suitable For"><PillRow options={SUBTYPES.commercial ?? []} value={f.suitableFor} onPick={(v) => setF((o) => ({ ...o, suitableFor: v }))} /></FieldRow>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FieldRow label="Built-up Area (sqft)" required hint={`At least ${AREA_MIN} sqft, or a plot area`}><TextInput icon="ruler" suffix="sqft" inputMode="numeric" value={f.builtup} onChange={set('builtup')} placeholder="e.g. 2000" /></FieldRow>
                    <FieldRow label="Plot Area (sqft)" hint="If the listing is land-led"><TextInput icon="map" suffix="sqft" inputMode="numeric" value={f.plotArea} onChange={set('plotArea')} placeholder="Optional" /></FieldRow>
                  </div>
                  <FieldRow label="Floor Number"><TextInput icon="building-2" inputMode="numeric" value={f.floor} onChange={set('floor')} placeholder="Your floor" /></FieldRow>
                </>}
                {kind === 'fractional' && <>
                  <FieldRow label="Share Percentage" required hint="Between 0.01 and 100"><TextInput icon="pie-chart" suffix="%" inputMode="decimal" value={f.share} onChange={set('share')} placeholder="e.g. 10" /></FieldRow>
                  <FieldRow label="Total Property Value (₹)" required hint={`At least ₹${PRICE_MIN.toLocaleString('en-IN')}`}><TextInput icon="indian-rupee" prefix="₹" inputMode="numeric" value={f.totalValue} onChange={set('totalValue')} placeholder="e.g. 8500000" /></FieldRow>
                </>}
                {kind === 'interior' && <FieldRow label="Scope of Work" required hint="What the interior project covers"><PillRow options={SUBTYPES.interior ?? []} value={f.scope} onPick={(v) => setF((o) => ({ ...o, scope: v }))} /></FieldRow>}
              </div>
            </div>)}

            {step === 1 && (<div>
              <h2 className="text-[18px] font-bold text-ink-900 mb-1">Location & Address</h2>
              <p className="text-[13px] text-ink-500 mb-5">Buyers filter by area — be precise.</p>
              <div className="relative mb-5">
                <LiveMap
                  height={280}
                  className="rounded-2xl border border-ink-200"
                  pickable
                  pins={coords ? [{ id: 'listing', latitude: coords.latitude, longitude: coords.longitude }] : []}
                  center={coords ?? cityCenter(f.city)}
                  onPick={(point) => applyPlace(point.latitude, point.longitude)}
                />
                {coords && <div className="absolute top-3 left-3 z-10 bg-white rounded-lg px-3 h-8 text-[12px] font-semibold text-emerald-700 flex items-center gap-1.5 shadow-sm"><Icon name="check" size={13} color="#059669" />{coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</div>}
                <button type="button" onClick={useCurrentLocation} className="absolute bottom-3 left-3 z-10 bg-white rounded-lg px-3 h-9 text-[12.5px] font-semibold text-ink-800 flex items-center gap-1.5 shadow-sm hover:bg-ink-50"><Icon name="locate-fixed" size={14} color="#1A6FFF" />Use current</button>
              </div>
              <p className="text-[12.5px] text-ink-500 -mt-3 mb-4">Click the map or drag the pin. Building, area, city and pincode fill in from that point.</p>
              <div className="space-y-4">
                <FieldRow label={kind === 'plot' ? 'Layout / plot name' : kind === 'interior' ? 'Site / studio name' : 'Building / Society'} required><TextInput icon="building" value={f.building} onChange={set('building')} placeholder={kind === 'plot' ? 'e.g. Green Acres Layout' : 'e.g. Sunrise Heights'} /></FieldRow>
                <FieldRow label="Area / Locality"><TextInput icon="map" value={f.area} onChange={set('area')} placeholder="e.g. Adyar" /></FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="City"><TextInput icon="map-pin" value={f.city} onChange={set('city')} /></FieldRow>
                  <FieldRow label="Pincode" required><TextInput icon="hash" inputMode="numeric" maxLength={6} value={f.pincode} onChange={set('pincode')} placeholder="6-digit" /></FieldRow>
                </div>
              </div>
            </div>)}

            {step === 2 && (<div>
              <h2 className="text-[18px] font-bold text-ink-900 mb-1">Property Details</h2>
              <p className="text-[13px] text-ink-500 mb-5">The specifics buyers care about.</p>
              <div className="space-y-4">
                {kind === 'interior' && <p className="text-[13.5px] text-ink-500">Interior projects do not need ownership, facing or parking. Continue when the scope on the previous step looks right.</p>}
                {(kind === 'home' || kind === 'plot' || kind === 'commercial') && <FieldRow label="Facing Direction">
                  <div className="grid grid-cols-4 gap-2.5">{FACINGS.map((d) => (
                    <button type="button" key={d} onClick={() => setF((o) => ({ ...o, facing: d }))} className={cx('h-11 rounded-xl border text-[13.5px] font-semibold transition', f.facing === d ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100' : 'border-ink-200 text-ink-700 hover:border-brand-300')}>{d}</button>))}
                  </div>
                </FieldRow>}
                {kind !== 'interior' && <FieldRow label="Ownership Type" required>
                  <div className="grid grid-cols-2 gap-2.5">{OWNERSHIPS.map((d) => (
                    <button type="button" key={d} onClick={() => setF((o) => ({ ...o, ownership: d }))} className={cx('h-12 rounded-xl border text-[13.5px] font-semibold transition', f.ownership === d ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100' : 'border-ink-200 text-ink-700 hover:border-brand-300')}>{d}</button>))}
                  </div>
                </FieldRow>}
                {kind === 'plot' && <>
                  <FieldRow label="Road Width (ft)"><TextInput icon="ruler" suffix="ft" inputMode="numeric" value={f.roadWidth} onChange={set('roadWidth')} placeholder="e.g. 30" /></FieldRow>
                  <FieldRow label="Approval Type"><PillRow options={['CMDA', 'DTCP', 'BDA', 'Panchayat', 'Other']} value={f.approval} onPick={(v) => setF((o) => ({ ...o, approval: v }))} /></FieldRow>
                </>}
                {kind === 'home' && <>
                  <FieldRow label="Furnishing Status">
                    <div className="grid grid-cols-3 gap-2.5">{FURNISHINGS.map((d) => (
                      <button type="button" key={d} onClick={() => setF((o) => ({ ...o, furnishing: d }))} className={cx('h-11 rounded-xl border text-[13px] font-semibold transition', f.furnishing === d ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100' : 'border-ink-200 text-ink-700 hover:border-brand-300')}>{d}</button>))}
                    </div>
                  </FieldRow>
                  {furnished && <FieldRow label="Furnishing Details" required hint="Required when the home is not unfurnished"><TextInput icon="sofa" value={f.furnishDetails} onChange={set('furnishDetails')} placeholder="e.g. Modular kitchen, wardrobes, ACs" /></FieldRow>}
                </>}
                {(kind === 'home' || kind === 'commercial') && <>
                  <FieldRow label="Parking Spaces">
                    <div className="inline-flex items-center gap-4 rounded-xl border border-ink-200 px-4 h-12">
                      <button type="button" aria-label="Fewer parking spaces" onClick={() => setF((o) => ({ ...o, parking: Math.max(0, o.parking - 1) }))} className="w-8 h-8 rounded-lg bg-ink-100 grid place-items-center hover:bg-ink-200"><Icon name="minus" size={16} color="#334155" /></button>
                      <span className="text-[16px] font-extrabold text-ink-900 w-6 text-center">{f.parking}</span>
                      <button type="button" aria-label="More parking spaces" onClick={() => setF((o) => ({ ...o, parking: Math.min(50, o.parking + 1) }))} className="w-8 h-8 rounded-lg bg-ink-100 grid place-items-center hover:bg-ink-200"><Icon name="plus" size={16} color="#334155" /></button>
                    </div>
                  </FieldRow>
                  {f.parking > 0 && (
                    <FieldRow label="Parking Type" required>
                      <div className="grid grid-cols-3 gap-2.5">{PARKING_TYPES.map((d) => (
                        <button type="button" key={d} onClick={() => setF((o) => ({ ...o, parkingType: d }))} className={cx('h-11 rounded-xl border text-[13.5px] font-semibold transition', f.parkingType === d ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100' : 'border-ink-200 text-ink-700 hover:border-brand-300')}>{d}</button>
                      ))}</div>
                    </FieldRow>
                  )}
                </>}
              </div>
            </div>)}

            {step === 3 && (<div>
              <h2 className="text-[18px] font-bold text-ink-900 mb-1">Amenities</h2>
              <p className="text-[13px] text-ink-500 mb-3">Selected <b className="text-emerald-600">{amens.size}</b> of {SELL_AMENITIES.length}</p>
              <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden mb-5"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(amens.size / SELL_AMENITIES.length) * 100}%` }}></div></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">{SELL_AMENITIES.map((a) => { const on = amens.has(a.label); return (
                <button type="button" key={a.label} onClick={() => toggleA(a.label)} className={cx('relative rounded-xl border p-4 flex flex-col items-center gap-2 transition', on ? 'border-emerald-500 bg-emerald-50' : 'border-ink-200 hover:border-brand-300')}>
                  {on && <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 grid place-items-center"><Icon name="check" size={11} color="#fff" strokeWidth={3} /></span>}
                  <Icon name={a.icon} size={20} color={on ? '#059669' : '#94A3B8'} /><span className={cx('text-[11.5px] font-medium text-center leading-tight', on ? 'text-emerald-700' : 'text-ink-600')}>{a.label}</span></button>); })}
              </div>
            </div>)}

            {step === 4 && (<div>
              <h2 className="text-[18px] font-bold text-ink-900 mb-1">Add Photos</h2>
              <p className="text-[13px] text-ink-500 mb-5">Add at least {MIN_PHOTOS} photos. The first one is your cover.</p>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onPickFiles} />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {photos.map((ph, idx) => (<div key={ph.key} className="relative rounded-xl overflow-hidden aspect-square">
                  <PhotoPlaceholder tag={ph.key} style={{ height: '100%' }}><CoverImg src={ph.url || ph.preview} /></PhotoPlaceholder>
                  {ph.uploading && <div className="absolute inset-0 bg-black/40 grid place-items-center"><Icon name="loader-circle" size={22} color="#fff" style={{ animation: 'spin .8s linear infinite' }} /></div>}
                  {idx === 0 && !ph.uploading && <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">COVER</span>}
                  {!ph.uploading && <button type="button" aria-label="Remove photo" onClick={() => setPhotos((ps) => ps.filter((x) => x.key !== ph.key))} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-500 grid place-items-center shadow"><Icon name="x" size={13} color="#fff" /></button>}
                </div>))}
                <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-ink-300 grid place-items-center hover:border-brand-400 hover:bg-brand-50 transition disabled:opacity-60"><div className="text-center"><Icon name="plus" size={24} color="#94A3B8" /><div className="text-[11px] text-ink-400 mt-1">Add</div></div></button>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-ink-50 flex items-center gap-2 text-[12.5px] text-ink-500"><Icon name="info" size={15} color={uploaded.length >= MIN_PHOTOS ? '#059669' : '#1A6FFF'} />{uploaded.length}/{MIN_PHOTOS} required photos</div>
              <div className="mt-5"><div className="text-[13.5px] font-bold text-ink-900 mb-2">Tips for great photos</div>
                <div className="space-y-1.5">{['Shoot in daylight with windows open', 'Wide-angle covers more of each room', 'Tidy clutter before each shot'].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-[13px] text-ink-600"><Icon name="check" size={15} color="#059669" strokeWidth={3} />{t}</div>))}
                </div>
              </div>
            </div>)}

            {step === 5 && (<div>
              <h2 className="text-[18px] font-bold text-ink-900 mb-1">Expected Price</h2>
              <p className="text-[13px] text-ink-500 mb-5">Set your asking price.</p>
              <FieldRow label="Expected Price (₹)" required hint={priceNum && priceNum < 50000 ? 'Minimum asking price is ₹50,000' : undefined}><TextInput icon="indian-rupee" prefix="₹" inputMode="numeric" value={f.price} onChange={set('price')} placeholder="e.g. 8500000" /></FieldRow>
              {perSqft > 0 && (<div className="mt-3 p-3.5 rounded-xl bg-brand-50 flex items-center justify-between slide-in"><span className="text-[13px] font-semibold text-brand-700/80">Price per sqft</span><span className="text-[16px] font-extrabold text-brand-700">₹ {perSqft.toLocaleString('en-IN')}</span></div>)}
              {estimate && estimate.area > 0 && (<div className="mt-3 rounded-2xl border border-ink-200 p-4 slide-in">
                <div className="flex items-center gap-2 text-[13.5px] font-bold text-ink-900"><Icon name="trending-up" size={17} color="#1259D4" />Market estimate</div>
                <p className="text-[12.5px] text-ink-500 mt-1.5">{estimate.basis}</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex-1 text-center"><div className="text-[11px] text-emerald-600 font-semibold">Low</div><div className="text-[16px] font-extrabold text-ink-900">₹ {Math.round(estimate.low / estimate.area).toLocaleString('en-IN')}</div></div>
                  <div className="w-8 h-px bg-ink-200"></div>
                  <div className="flex-1 text-center"><div className="text-[11px] text-rose-500 font-semibold">High</div><div className="text-[16px] font-extrabold text-ink-900">₹ {Math.round(estimate.high / estimate.area).toLocaleString('en-IN')}</div></div>
                </div>
                <p className="text-[11.5px] text-ink-400 text-center mt-2 italic">Informational only · final offer from Builtglory based on verification</p>
              </div>)}
              <div className="mt-4 rounded-2xl border border-ink-200 p-4 flex items-center gap-3">
                <div className="flex-1"><div className="text-[14px] font-bold text-ink-900">Price negotiable?</div><div className="text-[12px] text-ink-400">Buyers can request a quote</div></div>
                <Toggle on={f.negotiable} onChange={(v) => setF((o) => ({ ...o, negotiable: v }))} />
              </div>
            </div>)}
          </div>

          <FormError message={formError} />
          <div className="flex items-center gap-3 pt-5 mt-5 border-t border-ink-100">
            <Button variant="outline" icon="arrow-left" disabled={busy} onClick={() => (step === 0 ? setPicking(true) : setStep(step - 1))}>Back</Button>
            <button type="button" disabled={busy} onClick={() => void run(async () => { await saveDraft(); toast('Saved as draft', 'save'); router.push('/listings?tab=Drafts'); })} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-brand-600 disabled:opacity-50"><Icon name="save" size={15} />Save as Draft</button>
            <div className="flex-1"></div>
            <Button iconRight={step === 5 ? 'check' : 'arrow-right'} loading={busy} disabled={!canNext} onClick={next}>
              {['Continue to Address', 'Continue to Details', 'Continue to Amenities', 'Continue to Photos', `Continue (${uploaded.length}/${MIN_PHOTOS} photos)`, 'Submit Listing'][step]}
            </Button>
          </div>
        </Card>
      </div>
    </PageWrap>
  );
}
