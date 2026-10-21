'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageWrap } from '../ui/PageWrap';
import { CoverImg } from '../ui/Photo';
import { FormError, TextInput } from '../ui/FormFields';
import { OtpBoxes, emptyOtp } from '../ui/OtpBoxes';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { useBack } from '../../hooks/useNavigation';
import { useTimer } from '../../hooks/useCountdown';
import { updateMe } from '../../services/userService';
import { uploadDocument } from '../../services/documentService';
import { sendCustomerOtp, verifyPhoneChangeOtp } from '../../services/authService';
import { errorMessage } from '../../services/api';
import { digits, initials } from '../../lib/format';
import { displayName, mobileOf, roleLabel } from '../../lib/user';

// ── PROFILE ──────────────────────────────────────────────────
export function Profile() {
  const router = useRouter();
  const { user, openLogout } = useSession();
  const details: Array<[string, string, string]> = [
    ['user', 'Full name', displayName(user)],
    ['phone', 'Mobile number', '+91 ' + mobileOf(user)],
    ['mail', 'Email', user?.email || 'Not added'],
    ['map-pin', 'City', user?.city || 'Not added'],
    ['briefcase', 'I am a', roleLabel(user)],
  ];
  const actions: Array<[string, string, string, string]> = [
    ['pencil', 'Edit Profile', 'Update your name, email and city', '/profile/edit'],
    ['smartphone', 'Change Phone Number', 'Verify a new mobile number with OTP', '/profile/change-phone'],
    ['user-cog', 'Account Settings', 'Signed in account and session', '/settings/account'],
  ];
  return (
    <PageWrap className="!max-w-[1120px]">
      <h1 className="text-[26px] font-extrabold tracking-tight text-ink-900">Profile</h1>
      <p className="text-[13.5px] text-ink-500 mt-0.5 mb-6">Your personal details and account</p>
      <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start">
        <Card className="p-6 text-center lg:sticky lg:top-4">
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center mx-auto text-white text-[30px] font-extrabold ring-8 ring-brand-50 overflow-hidden">{initials(displayName(user))}{user?.profilePhoto && <CoverImg src={user.profilePhoto} />}</div>
          <h2 className="text-[20px] font-extrabold text-ink-900 mt-4">{displayName(user)}</h2>
          <div className="text-[13.5px] text-ink-500">+91 {mobileOf(user)}</div>
          {user?.isVerified && <div className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 mt-2"><Icon name="badge-check" size={14} color="#059669" />Verified</div>}
          <Button className="w-full mt-5" icon="pencil" onClick={() => router.push('/profile/edit')}>Edit Profile</Button>
          <button type="button" onClick={openLogout} className="w-full h-11 rounded-xl border border-rose-200 text-rose-600 font-semibold text-[14px] mt-2.5 flex items-center justify-center gap-2 hover:bg-rose-50 transition"><Icon name="log-out" size={17} />Logout</button>
        </Card>
        <div className="space-y-5">
          <Card className="p-6">
            <h3 className="text-[16px] font-bold text-ink-900 mb-4">Personal details</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {details.map(([i, l, v]) => (
                <div key={l} className="flex items-center gap-3 rounded-xl bg-ink-50 p-3.5">
                  <div className="w-10 h-10 rounded-full bg-white grid place-items-center shrink-0"><Icon name={i} size={17} color="#1A6FFF" /></div>
                  <div className="min-w-0"><div className="text-[11.5px] font-semibold text-ink-400 uppercase tracking-wide">{l}</div><div className="text-[14.5px] font-semibold text-ink-900 truncate">{v}</div></div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="divide-y divide-ink-100">
            {actions.map(([i, l, sub, r]) => (
              <button type="button" key={l} onClick={() => router.push(r)} className="w-full p-4 flex items-center gap-3.5 hover:bg-ink-50 transition text-left first:rounded-t-2xl last:rounded-b-2xl">
                <div className="w-11 h-11 rounded-full bg-ink-100 grid place-items-center shrink-0"><Icon name={i} size={19} color="#334155" /></div>
                <div className="flex-1 min-w-0"><div className="text-[15px] font-bold text-ink-900">{l}</div><div className="text-[12.5px] text-ink-500">{sub}</div></div>
                <Icon name="chevron-right" size={18} color="#CBD5E1" />
              </button>
            ))}
          </Card>
        </div>
      </div>
    </PageWrap>
  );
}

// ── EDIT PROFILE ─────────────────────────────────────────────
export function EditProfile() {
  const back = useBack('/profile');
  const { user, setUser } = useSession();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    setUploading(true);
    setErr(null);
    try {
      const doc = await uploadDocument(file, 'user', user._id, 'property_media', 'profile_photo');
      if (!doc.url) throw new Error('Upload did not return a file URL.');
      setUser(await updateMe({ profilePhoto: doc.url }));
      toast('Profile photo updated', 'camera');
    } catch (x) { setErr(errorMessage(x, 'Could not upload the photo.')); } finally { setUploading(false); }
  };

  const save = async () => {
    setErr(null);
    if (name.trim().length < 2) { setErr('Enter your full name.'); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { setErr('Enter a valid email address.'); return; }
    setSaving(true);
    try {
      setUser(await updateMe({ name: name.trim(), email: email.trim() || null, city: city.trim() || null }));
      toast('Profile updated');
      back();
    } catch (x) { setErr(errorMessage(x, 'Could not update your profile.')); setSaving(false); }
  };

  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[15px] font-bold text-ink-900 mb-6"><Icon name="arrow-left" size={18} />Edit Profile</button>
      <div className="flex justify-center mb-7">
        <div className="relative">
          <div className="relative w-24 h-24 rounded-full bg-brand-50 grid place-items-center overflow-hidden"><Icon name="user" size={40} color="#1A6FFF" />{user?.profilePhoto && <CoverImg src={user.profilePhoto} />}{uploading && <div className="absolute inset-0 bg-black/40 grid place-items-center"><Icon name="loader-circle" size={22} color="#fff" style={{ animation: 'spin .8s linear infinite' }} /></div>}</div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void onPhoto(e)} />
          <button type="button" aria-label="Change photo" disabled={uploading} onClick={() => fileInput.current?.click()} className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-brand-600 grid place-items-center ring-4 ring-white hover:bg-brand-700 transition"><Icon name="camera" size={16} color="#fff" /></button>
        </div>
      </div>
      <div className="space-y-5">
        <div>
          <label htmlFor="ep-name" className="block text-[13px] font-bold text-ink-800 mb-1.5">Full Name<span className="text-rose-500"> *</span></label>
          <TextInput id="ep-name" icon="user" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-[13px] font-bold text-ink-800 mb-1.5">Phone Number</label>
          <div className="flex items-center gap-2 h-12 px-3.5 bg-ink-50 border border-ink-200 rounded-xl"><Icon name="phone" size={16} color="#94A3B8" /><span className="flex-1 text-[14px] text-ink-500">+91 {mobileOf(user)}</span><Icon name="lock" size={16} color="#94A3B8" /></div>
          <p className="text-[12px] text-ink-400 mt-1.5">Verified — change it from Change Phone Number</p>
        </div>
        <div>
          <label htmlFor="ep-email" className="block text-[13px] font-bold text-ink-800 mb-1.5">Email Address</label>
          <TextInput id="ep-email" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aarav@example.com" />
        </div>
        <div>
          <label htmlFor="ep-city" className="block text-[13px] font-bold text-ink-800 mb-1.5">City</label>
          <TextInput id="ep-city" icon="map-pin" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Chennai" />
        </div>
      </div>
      <FormError message={err} />
      <Button size="lg" className="w-full mt-7" loading={saving} onClick={() => void save()}>Save Changes</Button>
    </PageWrap>
  );
}

// ── CHANGE PHONE ─────────────────────────────────────────────
export function ChangePhone() {
  const back = useBack('/settings/account');
  const { user, setUser } = useSession();
  const { toast } = useToast();
  const [step, setStep] = useState<'enter' | 'verify'>('enter');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(emptyOtp());
  const [requestId, setRequestId] = useState<string | null>(null);
  const [expires, setExpires] = useState(300);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [timer, setTimer] = useTimer(30, step === 'verify');
  const full = otp.every((d) => d);
  const target = digits(phone);

  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await sendCustomerOtp(target, 'change_phone');
      setRequestId(res.requestId);
      setExpires(res.expiresInSeconds);
      setTimer(Math.max(1, Math.round((new Date(res.canResendAt).getTime() - Date.now()) / 1000)) || 30);
      setOtp(emptyOtp());
      setStep('verify');
    } catch (x) { setErr(errorMessage(x, 'Could not send the code.')); } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true);
    setErr(null);
    try {
      await verifyPhoneChangeOtp(target, otp.join(''), requestId);
      setUser(await updateMe({ mobileNumber: target }));
      toast('Phone number updated');
      back();
    } catch (x) { setErr(errorMessage(x, 'Invalid code. Please try again.')); setBusy(false); }
  };

  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-500 hover:text-brand-600 mb-4"><Icon name="arrow-left" size={16} />Back to settings</button>
      <Card className="p-6">
        {step === 'enter' ? (
          <>
            <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">Change phone number</h1>
            <p className="text-[13.5px] text-ink-500 mt-1">Current number: <b className="text-ink-800">+91 {mobileOf(user)}</b></p>
            <div className="mt-6">
              <label className="block">
                <div className="mb-1.5 text-[13px] font-semibold text-ink-700">New mobile number<span className="text-rose-500"> *</span></div>
                <div className="flex items-center gap-2 h-12 px-3.5 bg-white border border-ink-200 rounded-xl focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                  <span className="text-ink-700 text-[14px] font-semibold">🇮🇳 +91</span><div className="w-px h-5 bg-ink-200"></div>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" maxLength={11} placeholder="90000 00000" className="flex-1 bg-transparent outline-none text-[15px] text-ink-900 placeholder:text-ink-400" />
                </div>
              </label>
              <FormError message={err} />
              <Button size="lg" className="w-full mt-4" iconRight="arrow-right" loading={busy} disabled={target.length !== 10} onClick={() => void send()}>Send code</Button>
            </div>
          </>
        ) : (
          <>
            <button type="button" onClick={() => { setStep('enter'); setErr(null); }} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-brand-600 mb-4"><Icon name="arrow-left" size={15} />Change number</button>
            <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">Verify new number</h1>
            <p className="text-[13.5px] text-ink-500 mt-1">Enter the {otp.length}-digit code sent to <b className="text-ink-800">+91 {target}</b>.</p>
            <div className="mt-6"><OtpBoxes value={otp} onChange={(v) => { setOtp(v); setErr(null); }} variant="plain" /></div>
            <div className="text-center mt-4 text-[13px] text-ink-500">{timer > 0 ? <>Resend code in <b className="text-ink-800 tabular-nums">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</b></> : <button type="button" onClick={() => void send()} className="text-brand-600 font-semibold">Resend code</button>}</div>
            <FormError message={err} />
            <Button size="lg" className="w-full mt-5" icon="check" loading={busy} disabled={!full} onClick={() => void verify()}>Update number</Button>
            <div className="mt-4 p-3 rounded-xl bg-ink-50 flex items-center gap-2 text-[12px] text-ink-500 justify-center"><Icon name="info" size={14} color="#1A6FFF" />The code is valid for {Math.max(1, Math.round(expires / 60))} minutes.</div>
          </>
        )}
      </Card>
    </PageWrap>
  );
}
