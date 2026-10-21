'use client';

import { useEffect, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { LogoMark } from '../ui/LogoMark';
import { OtpBoxes, emptyOtp } from '../ui/OtpBoxes';
import { LegalModal } from '../legal/LegalModal';
import type { LegalDocName } from '../legal/LegalBody';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { supportContact, useAppConfig } from '../../context/AppConfigContext';
import { useTimer } from '../../hooks/useCountdown';
import { useBack } from '../../hooks/useNavigation';
import { useListingTotal } from '../../hooks/useProperties';
import { forgotPassword, loginWithPassword, resetPassword, sendCustomerOtp, setPassword, verifyCustomerOtp } from '../../services/authService';
import { updateMe } from '../../services/userService';
import { errorMessage } from '../../services/api';
import { setTokens } from '../../lib/authStorage';
import { AUTH_FEATURES } from '../../lib/catalog';
import { cx, digits, firstName } from '../../lib/format';
import { stockUrl } from '../../lib/stock';
import type { AuthSession, CustomerRole, UserType } from '../../types/user';

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label: string;
  icon: string;
  error?: string;
  right?: ReactNode;
  suffix?: ReactNode;
  prefix?: string;
}

function AuthField({ label, icon, error, right, suffix, prefix, ...rest }: AuthFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5"><span className="text-[13px] font-semibold text-ink-800">{label}</span>{right}</div>
      <div className={cx('flex items-center gap-2.5 h-12 px-3.5 rounded-xl border bg-white transition-all duration-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100', error ? 'border-rose-400 ring-4 ring-rose-50' : 'border-ink-200 hover:border-ink-300')}>
        <Icon name={icon} size={17} color={error ? '#F43F5E' : '#94A3B8'} />
        {prefix && <><span className="text-[14px] font-semibold text-ink-700">{prefix}</span><span className="w-px h-5 bg-ink-200"></span></>}
        <input {...rest} aria-label={label} className="flex-1 min-w-0 bg-transparent outline-none text-[14.5px] text-ink-900 placeholder:text-ink-400" />
        {suffix}
      </div>
      {error && <div className="text-[12px] font-medium text-rose-600 mt-1.5 flex items-center gap-1" style={{ animation: 'authIn .25s ease-out' }}><Icon name="circle-alert" size={13} color="#E11D48" />{error}</div>}
    </div>
  );
}

export const pwScore = (pw: string) => [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;

export function PwStrength({ pw }: { pw: string }) {
  if (!pw) return null;
  const s = pwScore(pw);
  const meta: [string, string] = ([['Too weak', '#F43F5E'], ['Weak', '#F43F5E'], ['Fair', '#F59E0B'], ['Good', '#1A6FFF'], ['Strong', '#059669']] as Array<[string, string]>)[s] ?? ['Too weak', '#F43F5E'];
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 grid grid-cols-4 gap-1.5">{[0, 1, 2, 3].map((i) => <span key={i} className="h-1.5 rounded-full transition-all duration-300" style={{ background: i < s ? meta[1] : '#E2E8F0' }}></span>)}</div>
      <span className="text-[11.5px] font-bold w-14 text-right" style={{ color: meta[1] }}>{meta[0]}</span>
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled, loading }: { children: ReactNode; onClick: () => void; disabled?: boolean; loading: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={loading || disabled} className="relative w-full h-12 rounded-xl bg-brand-600 text-white text-[15px] font-bold overflow-hidden transition-all duration-200 hover:bg-brand-700 hover:shadow-[0_12px_28px_-10px_rgba(26,111,255,.7)] active:scale-[.98] disabled:opacity-60 disabled:hover:shadow-none flex items-center justify-center gap-2">
      {loading ? <Icon name="loader-circle" size={19} color="#fff" style={{ animation: 'spin .8s linear infinite' }} /> : children}
    </button>
  );
}

const ROLE_MAP: Record<string, { role: CustomerRole; userType: UserType }> = {
  Buyer: { role: 'buyer', userType: 'resident' },
  Seller: { role: 'seller', userType: 'resident' },
  NRI: { role: 'buyer', userType: 'nri' },
};

type Mode = 'login' | 'signup' | 'forgot';
type Step = 'form' | 'otp' | 'success';
interface Form { id: string; password: string; name: string; phone: string; email: string; role: string; agree: boolean }

export function AuthScreen({ gated = false, initialMode = 'login', next = '/' }: { gated?: boolean; initialMode?: 'login' | 'signup'; next?: string }) {
  const router = useRouter();
  const back = useBack(next || '/');
  const { completeSignIn, enterGuest } = useSession();
  const { toast, toastError } = useToast();
  const contact = supportContact(useAppConfig());
  const total = useListingTotal();
  const [legalDoc, setLegalDoc] = useState<LegalDocName | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>('form');
  const [method, setMethod] = useState<'password' | 'otp'>('otp');
  const [f, setF] = useState<Form>({ id: '', password: '', name: '', phone: '', email: '', role: 'Buyer', agree: false });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<Partial<Record<keyof Form, string>>>({});
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(emptyOtp());
  const [otpError, setOtpError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [expires, setExpires] = useState(300);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [timer, setTimer] = useTimer(30, step === 'otp');
  const [shake, setShake] = useState(0);
  const [feat, setFeat] = useState(0);

  useEffect(() => { const t = setInterval(() => setFeat((i) => (i + 1) % AUTH_FEATURES.length), 3600); return () => clearInterval(t); }, []);

  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((o) => ({ ...o, [k]: v }));
    setErr((o) => ({ ...o, [k]: undefined }));
  };
  const check = (e: Partial<Record<keyof Form, string>>) => { if (Object.keys(e).length) { setErr(e); setShake((s) => s + 1); return false; } return true; };
  const switchMode = (m: Mode) => { setMode(m); setStep('form'); setErr({}); setOtp(emptyOtp()); setOtpError(null); setShow(false); };
  const otpTarget = digits(mode === 'signup' ? f.phone : f.id);

  const sendOtp = async (field: keyof Form) => {
    setLoading(true);
    try {
      const res = await sendCustomerOtp(otpTarget);
      setRequestId(res.requestId);
      setExpires(res.expiresInSeconds);
      setTimer(Math.max(1, Math.round((new Date(res.canResendAt).getTime() - Date.now()) / 1000)) || 30);
      setOtp(emptyOtp());
      setOtpError(null);
      setStep('otp');
    } catch (e) {
      check({ [field]: errorMessage(e, 'Could not send the code. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      const res = mode === 'forgot' ? await forgotPassword(otpTarget) : await sendCustomerOtp(otpTarget);
      setRequestId(res.requestId);
      setTimer(Math.max(1, Math.round((new Date(res.canResendAt).getTime() - Date.now()) / 1000)) || 30);
      setOtp(emptyOtp());
      toast('New code sent');
    } catch (e) { toastError(errorMessage(e, 'Could not resend the code.')); }
  };

  const submitLogin = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (method === 'otp') {
      if (!f.id.trim()) e.id = 'Enter your mobile number';
      else if (digits(f.id).length !== 10) e.id = 'Enter a valid 10-digit mobile number';
      if (check(e)) void sendOtp('id');
      return;
    }
    if (!f.id.trim()) e.id = 'Enter your phone number or email';
    if (f.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!check(e)) return;
    void (async () => {
      setLoading(true);
      try {
        const s = await loginWithPassword(f.id.trim(), f.password);
        setTokens(s.accessToken, s.refreshToken);
        setNeedsProfile(!s.user?.name);
        setSession(s);
        setStep('success');
      } catch (err) {
        check({ password: errorMessage(err, 'Could not sign in. Check the phone, email and password.') });
      } finally {
        setLoading(false);
      }
    })();
  };

  const submitSignup = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name';
    if (digits(f.phone).length !== 10) e.phone = 'Enter a valid 10-digit mobile number';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address';
    if (pwScore(f.password) < 2) e.password = 'Use 8+ characters with a number or capital letter';
    if (!f.agree) e.agree = 'Please accept the terms to continue';
    if (check(e)) void sendOtp('phone');
  };

  const submitForgot = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (digits(f.id).length !== 10) e.id = 'Enter your registered 10-digit mobile number';
    if (pwScore(f.password) < 2) e.password = 'Use 8+ characters with a number or capital letter';
    if (!check(e)) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await forgotPassword(digits(f.id));
        setRequestId(res.requestId);
        setExpires(res.expiresInSeconds);
        setTimer(Math.max(1, Math.round((new Date(res.canResendAt).getTime() - Date.now()) / 1000)) || 30);
        setOtp(emptyOtp());
        setOtpError(null);
        setStep('otp');
      } catch (err) {
        check({ id: errorMessage(err, 'Could not send the reset code.') });
      } finally {
        setLoading(false);
      }
    })();
  };

  const verify = async () => {
    setLoading(true);
    setOtpError(null);
    try {
      if (mode === 'forgot') {
        await resetPassword(otpTarget, otp.join(''), f.password, requestId);
        toast('Password updated. Sign in with your new password.');
        switchMode('login');
        setMethod('password');
        return;
      }
      const s = await verifyCustomerOtp(otpTarget, otp.join(''), requestId);
      setTokens(s.accessToken, s.refreshToken);
      if (mode === 'signup') {
        await updateMe({ name: f.name.trim(), email: f.email.trim(), ...(ROLE_MAP[f.role] ?? ROLE_MAP.Buyer!) });
        await setPassword(f.password);
      }
      setNeedsProfile(mode !== 'signup' && !s.user?.name);
      setSession(s);
      setStep('success');
    } catch (e) {
      setOtpError(errorMessage(e, 'Invalid code. Please try again.'));
      setShake((x) => x + 1);
    } finally {
      setLoading(false);
    }
  };

  const enter = async () => {
    if (!session) return;
    setLoading(true);
    try {
      await completeSignIn(session);
      toast(mode === 'signup' ? 'Account created' : 'Signed in');
      if (needsProfile) router.replace('/onboarding?stage=setup');
      else if (!gated) router.replace(next && !next.startsWith('/login') ? next : '/');
    } catch (e) {
      toastError(errorMessage(e, 'Could not load your account.'));
      setLoading(false);
    }
  };

  const eye = <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)} className="text-ink-400 hover:text-ink-700 transition"><Icon name={show ? 'eye-off' : 'eye'} size={17} /></button>;

  let body: ReactNode;
  if (step === 'success') body = (
    <div className="text-center py-6">
      <div className="relative w-24 h-24 mx-auto"><div className="absolute inset-0 rounded-full bg-emerald-200 pulse-ring"></div><div className="relative w-24 h-24 rounded-full bg-emerald-500 grid place-items-center shadow-[0_16px_40px_-12px_rgba(5,150,105,.6)]"><Icon name="check" size={46} color="#fff" strokeWidth={3} /></div></div>
      <h1 className="text-[28px] font-extrabold tracking-tight text-ink-900 mt-8">{mode === 'signup' ? `Welcome, ${firstName(f.name)}!` : 'Welcome back!'}</h1>
      <p className="text-[14.5px] text-ink-500 mt-2 max-w-sm mx-auto">{mode === 'signup' ? 'Your Builtglory account is ready. Start exploring verified homes near you.' : "You're signed in. Pick up right where you left off."}</p>
      <div className="mt-8"><PrimaryBtn loading={loading} onClick={() => void enter()}>Continue to Builtglory<Icon name="arrow-right" size={17} color="#fff" /></PrimaryBtn></div>
    </div>
  );
  else if (step === 'otp') body = (
    <>
      <button type="button" onClick={() => setStep('form')} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-brand-600 mb-6 transition"><Icon name="arrow-left" size={15} />Change number</button>
      <div className="w-14 h-14 rounded-2xl bg-brand-50 grid place-items-center mb-5"><Icon name="message-square-lock" size={26} color="#1A6FFF" /></div>
      <h1 className="text-[28px] font-extrabold tracking-tight text-ink-900">Verify your number</h1>
      <p className="text-[14px] text-ink-500 mt-1.5 mb-7">Enter the {otp.length}-digit code sent to <b className="text-ink-800">+91 {otpTarget}</b></p>
      <OtpBoxes value={otp} onChange={(v) => { setOtp(v); setOtpError(null); }} />
      {otpError && <div role="alert" className="text-[12.5px] font-semibold text-rose-600 mt-3 text-center">{otpError}</div>}
      <div className="text-center mt-5 text-[13px] text-ink-500">{timer > 0 ? <>Resend code in <b className="text-ink-800 tabular-nums">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</b></> : <button type="button" onClick={() => void resend()} className="text-brand-600 font-bold hover:underline">Resend code</button>}</div>
      <div className="mt-6"><PrimaryBtn loading={loading} onClick={() => void verify()} disabled={!otp.every(Boolean)}>Verify & continue</PrimaryBtn></div>
      <div className="mt-4 p-3 rounded-xl bg-ink-50 flex items-center justify-center gap-2 text-[12px] text-ink-500"><Icon name="info" size={14} color="#1A6FFF" />The code is valid for {Math.max(1, Math.round(expires / 60))} minutes</div>
    </>
  );
  else if (mode === 'forgot') body = (
    <>
      <button type="button" onClick={() => switchMode('login')} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-brand-600 mb-6 transition"><Icon name="arrow-left" size={15} />Back to login</button>
      <div className="w-14 h-14 rounded-2xl bg-brand-50 grid place-items-center mb-5"><Icon name="lock-keyhole-open" size={26} color="#1A6FFF" /></div>
      <h1 className="text-[28px] font-extrabold tracking-tight text-ink-900">Forgot password?</h1>
      <p className="text-[14px] text-ink-500 mt-1.5 mb-7">Enter your registered mobile number and a new password. We&apos;ll send a code to confirm the reset.</p>
      <AuthField label="Mobile number" icon="phone" prefix="+91" inputMode="numeric" value={f.id} onChange={set('id')} placeholder="98840 12345" error={err.id} />
      <div className="mt-4"><AuthField label="New password" icon="lock" type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} placeholder="At least 8 characters" error={err.password} suffix={eye} /><PwStrength pw={f.password} /></div>
      <div className="mt-6"><PrimaryBtn loading={loading} onClick={submitForgot}>Send reset code</PrimaryBtn></div>
    </>
  );
  else body = (
    <>
      <h1 className="text-[30px] font-extrabold tracking-tight text-ink-900">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="text-[14px] text-ink-500 mt-1.5">{mode === 'login' ? 'Sign in to manage enquiries, visits and listings.' : 'Join thousands buying and selling verified homes.'}</p>
      <div className="relative grid grid-cols-2 p-1 rounded-2xl bg-ink-100 mt-6 mb-6">
        <span className="absolute top-1 bottom-1 rounded-xl bg-white shadow-sm transition-all duration-300" style={{ left: mode === 'login' ? 4 : 'calc(50% + 0px)', width: 'calc(50% - 4px)', transitionTimingFunction: 'cubic-bezier(.2,.8,.25,1)' }}></span>
        {([['login', 'Log in'], ['signup', 'Sign up']] as const).map(([m, l]) => <button type="button" key={m} onClick={() => switchMode(m)} className={cx('relative h-10 text-[14px] font-bold transition-colors', mode === m ? 'text-ink-900' : 'text-ink-500 hover:text-ink-700')}>{l}</button>)}
      </div>
      {mode === 'login' ? (
        <div className="space-y-4">
          <div className="flex gap-2">{([['password', 'Password'], ['otp', 'OTP']] as const).map(([m, l]) => <button type="button" key={m} onClick={() => { setMethod(m); setErr({}); }} className={cx('h-8 px-3.5 rounded-full text-[12.5px] font-bold border transition', method === m ? 'bg-brand-50 border-brand-200 text-brand-700' : 'border-ink-200 text-ink-500 hover:border-ink-300')}>{l}</button>)}</div>
          {method === 'password' ? (
            <>
              <AuthField label="Phone or email" icon="user" value={f.id} onChange={set('id')} placeholder="98840 12345 or you@example.com" error={err.id} />
              <AuthField label="Password" icon="lock" type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} onKeyDown={(e) => e.key === 'Enter' && submitLogin()} placeholder="Enter your password" error={err.password} suffix={eye}
                right={<button type="button" onClick={() => switchMode('forgot')} className="text-[12.5px] font-bold text-brand-600 hover:underline">Forgot password?</button>} />
            </>
          ) : (
            <AuthField label="Mobile number" icon="phone" prefix="+91" inputMode="numeric" value={f.id} onChange={set('id')} onKeyDown={(e) => e.key === 'Enter' && submitLogin()} placeholder="98840 12345" error={err.id} />
          )}
          <div className="pt-2"><PrimaryBtn loading={loading} onClick={submitLogin}>{method === 'otp' ? 'Send OTP' : 'Log in'}<Icon name="arrow-right" size={17} color="#fff" /></PrimaryBtn></div>
        </div>
      ) : (
        <div className="space-y-4">
          <AuthField label="Full name" icon="user" value={f.name} onChange={set('name')} placeholder="Aarav Subramanian" error={err.name} />
          <div className="grid sm:grid-cols-2 gap-4">
            <AuthField label="Mobile number" icon="phone" prefix="+91" inputMode="numeric" value={f.phone} onChange={set('phone')} placeholder="98840 12345" error={err.phone} />
            <AuthField label="Email" icon="mail" type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" error={err.email} />
          </div>
          <div><AuthField label="Password" icon="lock" type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} placeholder="At least 8 characters" error={err.password} suffix={eye} /><PwStrength pw={f.password} /></div>
          <div>
            <div className="text-[13px] font-semibold text-ink-800 mb-2">I&apos;m here to</div>
            <div className="grid grid-cols-3 gap-2">{([['Buyer', 'home', 'Buy'], ['Seller', 'tag', 'Sell'], ['NRI', 'globe', 'Buy from abroad']] as const).map(([r, ic, l]) => (
              <button type="button" key={r} onClick={() => setF((o) => ({ ...o, role: r }))} className={cx('rounded-xl border p-2.5 flex flex-col items-center gap-1 transition-all duration-200', f.role === r ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100' : 'border-ink-200 hover:border-ink-300')}>
                <Icon name={ic} size={17} color={f.role === r ? '#1A6FFF' : '#64748B'} /><span className={cx('text-[12px] font-bold', f.role === r ? 'text-brand-700' : 'text-ink-700')}>{l}</span>
              </button>))}
            </div>
          </div>
          <div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={f.agree} onChange={set('agree')} className="mt-0.5 w-4 h-4 accent-[#1A6FFF]" />
              <span className="text-[13px] text-ink-600">I agree to the <button type="button" onClick={(e) => { e.preventDefault(); setLegalDoc('Terms of Service'); }} className="text-brand-600 font-semibold hover:underline">Terms of Service</button> and <button type="button" onClick={(e) => { e.preventDefault(); setLegalDoc('Privacy Policy'); }} className="text-brand-600 font-semibold hover:underline">Privacy Policy</button></span>
            </label>
            {err.agree && <div className="text-[12px] font-medium text-rose-600 mt-1.5 ml-6">{err.agree}</div>}
          </div>
          <div className="pt-1"><PrimaryBtn loading={loading} onClick={submitSignup}>Create account<Icon name="arrow-right" size={17} color="#fff" /></PrimaryBtn></div>
        </div>
      )}
      <p className="text-center text-[13.5px] text-ink-500 mt-6">{mode === 'login' ? 'New to Builtglory? ' : 'Already have an account? '}<button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="font-bold text-brand-600 hover:underline">{mode === 'login' ? 'Create an account' : 'Log in'}</button></p>
      {gated && <button type="button" onClick={enterGuest} className="group w-full mt-4 h-11 rounded-xl bg-ink-50 hover:bg-ink-100 text-[13.5px] font-semibold text-ink-600 hover:text-ink-900 transition flex items-center justify-center gap-2"><Icon name="user-round" size={16} />Continue as Guest<Icon name="arrow-right" size={15} className="transition-transform group-hover:translate-x-0.5" /></button>}
    </>
  );

  const fi = AUTH_FEATURES[feat] ?? AUTH_FEATURES[0]!;
  const helpText = [contact.phone && `Call ${contact.phone}`, contact.email && `email ${contact.email}`].filter(Boolean).join(' or ');
  return (
    <div className="min-h-full grid lg:grid-cols-[1.05fr_1fr] bg-white">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-10 xl:p-14 text-white" style={{ background: 'linear-gradient(150deg,#071C44 0%,#0A3270 45%,#1259D4 100%)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative background from the design */}
        <img src={stockUrl('auth-hero')} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 kenburns" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,rgba(7,28,68,.94) 0%,rgba(10,50,112,.82) 50%,rgba(18,89,212,.55) 100%)' }}></div>
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full opacity-40 blur-3xl" style={{ background: '#1A6FFF', animation: 'floatA 14s ease-in-out infinite' }}></div>
        <div className="absolute -bottom-32 -right-20 w-[480px] h-[480px] rounded-full opacity-30 blur-3xl" style={{ background: '#38BDF8', animation: 'floatB 18s ease-in-out infinite' }}></div>
        <div className="absolute inset-0 opacity-[.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '44px 44px' }}></div>
        <div className="relative flex items-center gap-3"><LogoMark className="w-11 h-11 rounded-2xl ring-1 ring-white/25" /><span className="text-[20px] font-extrabold tracking-tight">Builtglory</span></div>
        <div className="relative max-w-md">
          <h2 className="text-[42px] xl:text-[48px] font-extrabold tracking-tight leading-[1.05]" style={{ textWrap: 'balance' }}>Verified homes.<br /><span className="text-sky-300">Zero brokerage.</span></h2>
          <p className="text-white/70 text-[15.5px] mt-4 leading-relaxed">Buy, sell and close your property deal in one transparent place, backed by legal checks at every step.</p>
          <div key={feat} className="mt-10 rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/15 p-5 flex items-start gap-4" style={{ animation: 'featIn .5s cubic-bezier(.2,.8,.25,1)' }}>
            <div className="w-12 h-12 rounded-xl bg-white/15 grid place-items-center shrink-0"><Icon name={fi[0]} size={24} color="#fff" /></div>
            <div><div className="text-[16px] font-bold">{fi[1]}</div><div className="text-[13.5px] text-white/70 mt-0.5">{fi[2]}</div></div>
          </div>
          <div className="flex gap-1.5 mt-4">{AUTH_FEATURES.map((_, i) => <button type="button" aria-label={`Feature ${i + 1}`} key={i} onClick={() => setFeat(i)} className={cx('h-1.5 rounded-full transition-all duration-300', i === feat ? 'w-8 bg-white' : 'w-1.5 bg-white/40')}></button>)}</div>
        </div>
        <div className="relative grid grid-cols-3 gap-4 max-w-md">
          {[[total.data !== null ? total.data.toLocaleString('en-IN') : '—', 'Verified listings'], ['0%', 'Brokerage'], ['4.8★', 'App rating']].map(([v, l]) => <div key={l}><div className="text-[22px] font-extrabold">{v}</div><div className="text-[12px] text-white/60">{l}</div></div>)}
        </div>
      </aside>
      <main className="flex flex-col min-h-full">
        <div className="flex items-center justify-between px-6 sm:px-10 h-16 shrink-0">
          <div className="flex items-center gap-2.5 lg:invisible"><LogoMark className="w-9 h-9 rounded-xl" /><span className="text-[17px] font-extrabold tracking-tight text-ink-900">Builtglory</span></div>
          {step !== 'success' && !gated && <button type="button" onClick={back} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-ink-900 transition"><Icon name="x" size={16} />Continue as guest</button>}
        </div>
        <div className="flex-1 grid place-items-center px-6 sm:px-10 py-8">
          <div className="w-full max-w-[440px]" key={`${shake}`} style={shake ? { animation: 'shakeX .4s ease-in-out' } : undefined}>
            <div key={mode + step} style={{ animation: 'authIn .45s cubic-bezier(.2,.8,.25,1)' }}>{body}</div>
          </div>
        </div>
        <div className="px-6 sm:px-10 pb-6 text-[12px] text-ink-400 flex flex-wrap justify-between gap-2"><span>© 2026 Builtglory Technologies</span><span className="flex gap-4"><button type="button" onClick={() => setLegalDoc('Privacy Policy')} className="hover:text-brand-600 transition">Privacy</button><button type="button" onClick={() => setLegalDoc('Terms of Service')} className="hover:text-brand-600 transition">Terms</button><button type="button" onClick={() => (helpText ? toast(helpText, 'headset') : router.push('/support'))} className="hover:text-brand-600 transition">Help</button></span></div>
      </main>
      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} onSwitch={setLegalDoc} />
    </div>
  );
}
