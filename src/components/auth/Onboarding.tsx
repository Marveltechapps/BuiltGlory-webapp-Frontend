'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Pill } from '../ui/Tag';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FieldRow, FormError, TextInput } from '../ui/FormFields';
import { OtpBoxes, emptyOtp } from '../ui/OtpBoxes';
import { CoverImg } from '../ui/Photo';
import { Loading } from '../ui/StateViews';
import { LogoMark } from '../ui/LogoMark';
import { LegalModal } from '../legal/LegalModal';
import { findLegal, parseLegal, type LegalDocName } from '../legal/LegalBody';
import { useContent } from '../../hooks/useContent';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { useTimer } from '../../hooks/useCountdown';
import { sendCustomerOtp, verifyCustomerOtp } from '../../services/authService';
import { updateMe } from '../../services/userService';
import { uploadDocument } from '../../services/documentService';
import { errorMessage } from '../../services/api';
import { LiveMap } from '../ui/LiveMap';
import { CITIES, ONBOARDING_SLIDES, cityCenter } from '../../lib/catalog';
import { reverseGeocode } from '../../services/geoService';
import { cx, digits, firstName, initials } from '../../lib/format';
import type { CustomerRole, UserType } from '../../types/user';

type Stage = 'splash' | 'intro' | 'login' | 'otp' | 'terms' | 'setup' | 'prefs' | 'success';
type Geo = { status: 'idle' | 'locating' | 'done' | 'denied' | 'unsupported'; accuracy?: number; latitude?: number; longitude?: number };

const ROLES: Array<[string, string, string, CustomerRole, UserType]> = [
  ['Buyer', 'search', 'Looking to buy a home', 'buyer', 'resident'],
  ['Seller', 'tag', 'Listing my property', 'seller', 'resident'],
  ['Investor', 'trending-up', 'Building a portfolio', 'buyer', 'resident'],
  ['NRI', 'globe', 'Buying from abroad', 'buyer', 'nri'],
];
const toneBg: Record<string, string> = { brand: 'bg-brand-50 text-brand-600', green: 'bg-emerald-50 text-emerald-600', violet: 'bg-violet-50 text-violet-600' };

function OnbPanel({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full grid place-items-center p-4 sm:p-8" style={{ background: 'radial-gradient(circle at 20% 0%, rgba(26,111,255,.06), transparent 42%), #F1F5F9' }}>
      <div className="w-full max-w-[440px] slide-in">{children}</div>
    </div>
  );
}
function OnbStepper({ i }: { i: number }) {
  return <div className="flex items-center gap-1.5 justify-center mb-6">{[0, 1, 2, 3].map((n) => <span key={n} className={cx('h-1.5 rounded-full transition-all', n === i ? 'w-6 bg-brand-600' : n < i ? 'w-1.5 bg-brand-300' : 'w-1.5 bg-ink-200')}></span>)}</div>;
}
/** Terms summary from the CMS (GET /content?section=legal, slug terms-of-service). */
function TermsBox() {
  const { data, loading, error, reload } = useContent('legal');
  const item = findLegal(data, 'Terms of Service');
  return (
    <div className="mt-5 rounded-2xl border border-ink-200 bg-ink-50/60 p-5 max-h-52 overflow-y-auto">
      {loading && !data ? <Loading lines label="Loading terms" />
        : error ? <div className="text-[13px] text-rose-600">{error} <button type="button" onClick={reload} className="font-bold underline">Retry</button></div>
        : item ? <>
          <div className="text-[14px] font-bold text-ink-900">{item.title}</div>
          {parseLegal(item.body).flatMap((sec) => sec.paragraphs).map((para, i) => <p key={i} className={cx('text-[13px] text-ink-600 leading-relaxed', i === 0 ? 'mt-2' : 'mt-3')}>{para}</p>)}
        </> : <div className="text-[13px] text-ink-500">The Terms of Service haven&apos;t been published yet.</div>}
    </div>
  );
}

function OnbLogo() {
  return <div className="flex items-center gap-3 justify-center mb-6"><LogoMark className="rounded-2xl w-11 h-11 shadow-[0_10px_30px_-6px_rgba(26,111,255,.6)]" /><span className="text-[20px] font-extrabold tracking-tight text-ink-900">Builtglory</span></div>;
}

export function Onboarding({ startStage }: { startStage?: string }) {
  const router = useRouter();
  const { user, signedIn, completeSignIn, setUser } = useSession();
  const { toast, toastError } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const resume = startStage === 'setup' || startStage === 'prefs' ? startStage : null;
  const [stage, setStage] = useState<Stage>(resume ? (signedIn ? resume : 'login') : 'splash');
  const [legalDoc, setLegalDoc] = useState<LegalDocName | null>(null);
  const [slide, setSlide] = useState(0);
  const [form, setForm] = useState({ name: user?.name ?? '', phone: '', email: user?.email ?? '', city: user?.city || 'Chennai', role: 'Buyer' });
  const [otp, setOtp] = useState(emptyOtp());
  const [requestId, setRequestId] = useState<string | null>(null);
  const [terms, setTerms] = useState([false, false, false]);
  const [citySearch, setCitySearch] = useState('');
  const [geo, setGeo] = useState<Geo>({ status: 'idle' });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resend, setResend] = useTimer(30, stage === 'otp');
  const setF = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((o) => ({ ...o, [k]: e.target.value }));
  const phone = digits(form.phone);

  useEffect(() => { if (stage !== 'splash') return undefined; const t = setTimeout(() => setStage('intro'), 1500); return () => clearTimeout(t); }, [stage]);

  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(null); try { await fn(); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); } };
  const sendOtp = () => run(async () => {
    const res = await sendCustomerOtp(phone);
    setRequestId(res.requestId);
    setResend(Math.max(1, Math.round((new Date(res.canResendAt).getTime() - Date.now()) / 1000)) || 30);
    setOtp(emptyOtp());
    setStage('otp');
  });
  const verify = () => run(async () => {
    const me = await completeSignIn(await verifyCustomerOtp(phone, otp.join(''), requestId));
    setForm((o) => ({ ...o, name: me.name ?? o.name, email: me.email ?? o.email, city: me.city || o.city }));
    setStage('terms');
  });
  const saveProfile = () => run(async () => {
    setUser(await updateMe({ name: form.name.trim(), ...(form.email.trim() ? { email: form.email.trim() } : {}) }));
    setStage('prefs');
  });
  const finish = () => run(async () => {
    const role = ROLES.find(([r]) => r === form.role) ?? ROLES[0]!;
    setUser(await updateMe({
      city: form.city,
      role: role[3],
      userType: role[4],
      ...(geo.latitude != null && geo.longitude != null ? { latitude: geo.latitude, longitude: geo.longitude } : {}),
    }));
    setStage('success');
  });
  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    setUploading(true);
    try {
      const doc = await uploadDocument(file, 'user', user._id, 'property_media', 'profile_photo');
      if (doc.url) { setUser(await updateMe({ profilePhoto: doc.url })); toast('Profile photo added', 'camera'); }
    } catch (x) { toastError(errorMessage(x, 'Could not upload the photo.')); } finally { setUploading(false); }
  };
  const detectLocation = () => {
    if (!navigator.geolocation) { setGeo({ status: 'unsupported' }); return; }
    setGeo({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void reverseGeocode(pos.coords.latitude, pos.coords.longitude).then((place) => {
          setForm((o) => ({ ...o, city: place.city }));
          setGeo({ status: 'done', accuracy: Math.round(pos.coords.accuracy), latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          toast(`Location detected · ${place.city}`, 'map-pin');
        }).catch(() => setGeo({ status: 'denied' }));
      },
      () => setGeo({ status: 'denied' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };
  const pickCity = (c: string) => { setForm((o) => ({ ...o, city: c })); setCitySearch(''); if (geo.status === 'done') setGeo({ status: 'idle' }); };

  if (stage === 'splash') return (
    <div className="min-h-full grid place-items-center" style={{ background: 'linear-gradient(140deg,#0A3270,#1259D4 55%,#1A6FFF)' }}>
      <div className="text-center">
        <LogoMark className="w-20 h-20 rounded-3xl mx-auto ring-1 ring-white/25" />
        <div className="text-white text-[26px] font-extrabold tracking-tight mt-5">Builtglory</div>
        <div className="text-white/70 text-[13.5px] mt-1">Verified real estate</div>
        <div className="mt-8 flex justify-center gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full bg-white/80" style={{ animation: `bounceDot 1.2s ${i * 0.15}s infinite` }}></span>)}</div>
      </div>
    </div>
  );

  if (stage === 'intro') {
    const s = ONBOARDING_SLIDES[slide] ?? ONBOARDING_SLIDES[0];
    const nextStage: Stage = signedIn ? 'setup' : 'login';
    return (
      <div className="min-h-full flex flex-col" style={{ background: '#F1F5F9' }}>
        <div className="flex-1 grid place-items-center p-6 sm:p-8">
          <div className="w-full max-w-[440px] text-center slide-in" key={slide}>
            <div className={cx('w-24 h-24 rounded-[28px] grid place-items-center mx-auto', toneBg[s.tone])}><Icon name={s.icon} size={46} /></div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-ink-900 mt-8">{s.title}</h1>
            <p className="text-[15px] text-ink-500 mt-3 leading-relaxed">{s.body}</p>
          </div>
        </div>
        <div className="p-6 sm:p-8 max-w-[476px] w-full mx-auto">
          <div className="flex items-center gap-1.5 justify-center mb-6">{ONBOARDING_SLIDES.map((_, n) => <span key={n} className={cx('h-1.5 rounded-full transition-all cursor-pointer', n === slide ? 'w-6 bg-brand-600' : 'w-1.5 bg-ink-300')} onClick={() => setSlide(n)}></span>)}</div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setStage(nextStage)} className="!px-3">Skip</Button>
            <Button className="flex-1" iconRight="arrow-right" onClick={() => (slide < ONBOARDING_SLIDES.length - 1 ? setSlide(slide + 1) : setStage(nextStage))}>{slide < ONBOARDING_SLIDES.length - 1 ? 'Next' : 'Get started'}</Button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'login') return (
    <OnbPanel>
      <Card className="p-7 shadow-[0_30px_60px_-30px_rgba(15,23,42,.3)]">
        <OnbLogo />
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900 text-center">Welcome</h1>
        <p className="text-[13.5px] text-ink-500 text-center mt-1">Enter your mobile number to continue. We&apos;ll send a one-time code.</p>
        <div className="mt-6">
          <FieldRow label="Mobile number" required>
            <div className="flex items-center gap-2 h-12 px-3.5 bg-white border border-ink-200 rounded-xl focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
              <span className="text-ink-700 text-[14px] font-semibold">🇮🇳 +91</span><div className="w-px h-5 bg-ink-200"></div>
              <input value={form.phone} onChange={setF('phone')} inputMode="numeric" maxLength={11} placeholder="98840 12345" className="flex-1 bg-transparent outline-none text-[15px] text-ink-900 placeholder:text-ink-400 tracking-wide" />
            </div>
          </FieldRow>
          <FormError message={err} />
          <Button size="lg" className="w-full mt-4" iconRight="arrow-right" loading={busy} disabled={phone.length !== 10} onClick={() => void sendOtp()}>Continue</Button>
        </div>
        <p className="text-[11.5px] text-ink-400 text-center mt-6 leading-relaxed">By continuing you agree to our <button type="button" onClick={() => setLegalDoc('Terms of Service')} className="text-brand-600 font-medium hover:underline">Terms</button> & <button type="button" onClick={() => setLegalDoc('Privacy Policy')} className="text-brand-600 font-medium hover:underline">Privacy Policy</button>.</p>
        <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} onSwitch={setLegalDoc} />
      </Card>
    </OnbPanel>
  );

  if (stage === 'otp') return (
    <OnbPanel>
      <Card className="p-7 shadow-[0_30px_60px_-30px_rgba(15,23,42,.3)]">
        <button type="button" onClick={() => setStage('login')} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-brand-600 mb-4"><Icon name="arrow-left" size={15} />Back</button>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">Verify your number</h1>
        <p className="text-[13.5px] text-ink-500 mt-1">Enter the {otp.length}-digit code sent to <b className="text-ink-800">+91 {phone}</b>.</p>
        <div className="mt-6"><OtpBoxes value={otp} onChange={(v) => { setOtp(v); setErr(null); }} variant="plain" /></div>
        <div className="text-center mt-5 text-[13px] text-ink-500">{resend > 0 ? <>Resend code in <b className="text-ink-800">{Math.floor(resend / 60)}:{String(resend % 60).padStart(2, '0')}</b></> : <button type="button" onClick={() => void sendOtp()} className="text-brand-600 font-semibold">Resend code</button>}</div>
        <FormError message={err} />
        <Button size="lg" className="w-full mt-5" icon="check" loading={busy} disabled={!otp.every((d) => d)} onClick={() => void verify()}>Verify & continue</Button>
      </Card>
    </OnbPanel>
  );

  if (stage === 'terms') {
    const items = ['I have read and accept the Terms of Service', 'I accept the Privacy Policy and data use', 'I consent to receive updates by SMS / Email'];
    return (
      <OnbPanel>
        <Card className="p-7 shadow-[0_30px_60px_-30px_rgba(15,23,42,.3)]">
          <button type="button" onClick={() => setStage(signedIn ? 'intro' : 'otp')} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-brand-600 mb-4"><Icon name="arrow-left" size={15} />Back</button>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">Terms & Privacy</h1>
          <TermsBox />
          <div className="mt-5 space-y-1">
            {items.map((label, i) => (
              <button type="button" key={label} onClick={() => setTerms((t) => t.map((v, n) => (n === i ? !v : v)))} className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-ink-50 transition text-left">
                <span className={cx('w-6 h-6 rounded-lg grid place-items-center shrink-0 mt-0.5 transition', terms[i] ? 'bg-brand-600' : 'border-2 border-ink-300 bg-white')}>{terms[i] && <Icon name="check" size={15} color="#fff" strokeWidth={3} />}</span>
                <span className="text-[13.5px] text-ink-700 leading-snug">{label}{i < 2 && <span role="link" tabIndex={0} onClick={(e) => { e.stopPropagation(); setLegalDoc(i === 0 ? 'Terms of Service' : 'Privacy Policy'); }} className="ml-1.5 text-brand-600 font-semibold hover:underline cursor-pointer">Read</span>}</span>
              </button>
            ))}
          </div>
          <Button size="lg" className="w-full mt-5" iconRight="arrow-right" disabled={!terms.every(Boolean)} onClick={() => setStage('setup')}>Accept &amp; Continue</Button>
          <p className="text-[12px] text-ink-400 text-center mt-3">You must accept Terms and Privacy Policy to proceed.</p>
          <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} onSwitch={setLegalDoc} />
        </Card>
      </OnbPanel>
    );
  }

  if (stage === 'setup') return (
    <OnbPanel>
      <Card className="p-7 shadow-[0_30px_60px_-30px_rgba(15,23,42,.3)]">
        <OnbStepper i={2} />
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900 text-center">Create your profile</h1>
        <p className="text-[13.5px] text-ink-500 text-center mt-1">Tell us a little about yourself.</p>
        <div className="flex justify-center my-5"><div className="relative">
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white text-[24px] font-extrabold overflow-hidden">{form.name ? initials(form.name) : <Icon name="user" size={30} color="#fff" />}{user?.profilePhoto && <CoverImg src={user.profilePhoto} />}{uploading && <div className="absolute inset-0 bg-black/40 grid place-items-center"><Icon name="loader-circle" size={20} color="#fff" style={{ animation: 'spin .8s linear infinite' }} /></div>}</div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void onPhoto(e)} />
          <button type="button" aria-label="Add photo" onClick={() => fileInput.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-ink-200 grid place-items-center shadow-sm"><Icon name="camera" size={15} color="#1A6FFF" /></button>
        </div></div>
        <div className="space-y-4">
          <FieldRow label="Full name" required><TextInput icon="user" value={form.name} onChange={setF('name')} placeholder="Aarav Subramanian" /></FieldRow>
          <FieldRow label="Email"><TextInput icon="mail" type="email" value={form.email} onChange={setF('email')} placeholder="you@example.com" /></FieldRow>
        </div>
        <FormError message={err} />
        <Button size="lg" className="w-full mt-6" iconRight="arrow-right" loading={busy} disabled={form.name.trim().length < 2} onClick={() => void saveProfile()}>Continue</Button>
      </Card>
    </OnbPanel>
  );

  if (stage === 'prefs') {
    const matches = citySearch.trim() ? CITIES.filter((c) => c.toLowerCase().includes(citySearch.toLowerCase())) : [];
    return (
      <OnbPanel>
        <Card className="p-7 shadow-[0_30px_60px_-30px_rgba(15,23,42,.3)]">
          <OnbStepper i={3} />
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900 text-center">Personalise your feed</h1>
          <p className="text-[13.5px] text-ink-500 text-center mt-1">We&apos;ll tailor listings to you.</p>
          <div className="mt-6">
            <div className="text-[13px] font-bold text-ink-800 mb-2">Your location</div>
            <button type="button" onClick={detectLocation} disabled={geo.status === 'locating'}
              className={cx('w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition', geo.status === 'done' ? 'border-emerald-300 bg-emerald-50' : 'border-brand-200 bg-brand-50/60 hover:border-brand-400')}>
              <div className={cx('w-11 h-11 rounded-xl grid place-items-center shrink-0', geo.status === 'done' ? 'bg-emerald-500' : 'bg-brand-600')}>
                {geo.status === 'locating' ? <Icon name="loader-circle" size={20} color="#fff" style={{ animation: 'spin 1s linear infinite' }} /> : <Icon name={geo.status === 'done' ? 'check' : 'locate-fixed'} size={20} color="#fff" strokeWidth={geo.status === 'done' ? 3 : 2} />}
              </div>
              <div className="flex-1 min-w-0">
                {geo.status === 'done'
                  ? <><div className="text-[14px] font-bold text-emerald-800">{form.city}</div><div className="text-[12px] text-emerald-600">Detected via GPS · ±{geo.accuracy} m · tap to refresh</div></>
                  : geo.status === 'locating'
                    ? <><div className="text-[14px] font-bold text-brand-700">Locating you…</div><div className="text-[12px] text-brand-600/80">Allow location access when prompted</div></>
                    : <><div className="text-[14px] font-bold text-brand-700">Use my current location</div><div className="text-[12px] text-brand-600/80">Detect your city automatically with GPS</div></>}
              </div>
              {geo.status !== 'locating' && <Icon name="chevron-right" size={18} color={geo.status === 'done' ? '#059669' : '#1A6FFF'} />}
            </button>
            {(geo.status === 'denied' || geo.status === 'unsupported') && (
              <div className="mt-2 flex items-start gap-2 text-[12px] text-amber-600"><Icon name="triangle-alert" size={14} className="mt-0.5 shrink-0" /><span>{geo.status === 'denied' ? 'Location access blocked. Pick your city manually below.' : 'GPS not available on this device. Pick your city manually below.'}</span></div>
            )}
            <div className="flex items-center gap-3 my-4"><div className="flex-1 h-px bg-ink-200"></div><span className="text-[11.5px] text-ink-400">or enter your city</span><div className="flex-1 h-px bg-ink-200"></div></div>
            <div className="relative">
              <TextInput icon="search" aria-label="Search city" value={citySearch} onChange={(e) => setCitySearch(e.target.value)} placeholder="Search for your city…" />
              {matches.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1.5 bg-white border border-ink-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                  {matches.map((c) => <button type="button" key={c} onClick={() => pickCity(c)} className="w-full flex items-center gap-2.5 px-3.5 h-11 hover:bg-brand-50 transition text-left"><Icon name="map-pin" size={15} color="#94A3B8" /><span className="text-[14px] text-ink-800">{c}</span></button>)}
                </div>
              )}
              {citySearch.trim() && matches.length === 0 && (
                <button type="button" onClick={() => pickCity(citySearch.trim())} className="absolute z-10 left-0 right-0 mt-1.5 bg-white border border-ink-200 rounded-xl shadow-lg px-3.5 h-11 flex items-center gap-2.5 hover:bg-brand-50 transition text-left">
                  <Icon name="plus" size={15} color="#1A6FFF" /><span className="text-[14px] text-ink-800">Use “<b>{citySearch.trim()}</b>”</span>
                </button>
              )}
            </div>
            <div className="mt-3"><div className="text-[11.5px] text-ink-400 mb-1.5">Popular cities</div><div className="flex flex-wrap gap-2">{CITIES.slice(0, 6).map((c) => <Pill key={c} active={form.city === c} onClick={() => pickCity(c)}>{c}</Pill>)}</div></div>
            <div className="text-[12.5px] text-ink-500 mt-3">Selected city: <b className="text-ink-900">{form.city}</b></div>
            <LiveMap
              height={180}
              className="rounded-2xl border border-ink-200 mt-3"
              pins={geo.latitude != null && geo.longitude != null ? [{ id: 'me', latitude: geo.latitude, longitude: geo.longitude, label: 'You' }] : []}
              center={(geo.latitude != null && geo.longitude != null ? { latitude: geo.latitude, longitude: geo.longitude } : null) ?? cityCenter(form.city)}
            />
            <div className="text-[13px] font-bold text-ink-800 mt-6 mb-2">I am a</div>
            <div className="grid grid-cols-2 gap-2.5">{ROLES.map(([r, ic, sub]) => (
              <button type="button" key={r} onClick={() => setForm((o) => ({ ...o, role: r }))} className={cx('rounded-2xl border p-3.5 text-left transition', form.role === r ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-100' : 'border-ink-200 hover:border-brand-300')}>
                <Icon name={ic} size={20} color={form.role === r ? '#1A6FFF' : '#64748B'} /><div className={cx('text-[13.5px] font-bold mt-1.5', form.role === r ? 'text-brand-700' : 'text-ink-800')}>{r}</div><div className="text-[11px] text-ink-400 leading-tight mt-0.5">{sub}</div>
              </button>))}
            </div>
          </div>
          <FormError message={err} />
          <Button size="lg" className="w-full mt-6" iconRight="arrow-right" loading={busy} onClick={() => void finish()}>Finish setup</Button>
        </Card>
      </OnbPanel>
    );
  }

  return (
    <OnbPanel>
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full bg-emerald-200 pulse-ring"></div>
          <div className="relative w-24 h-24 rounded-full bg-emerald-500 grid place-items-center"><Icon name="check" size={48} color="#fff" strokeWidth={3} /></div>
        </div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink-900 mt-7">You&apos;re all set{form.name ? `, ${firstName(form.name)}` : ''}!</h1>
        <p className="text-[14.5px] text-ink-500 mt-2 max-w-sm mx-auto">Your Builtglory account is ready. Let&apos;s find you a verified home in {form.city}.</p>
        <Button size="lg" className="mt-7" iconRight="arrow-right" onClick={() => router.replace('/')}>Enter Builtglory</Button>
      </div>
    </OnbPanel>
  );
}
