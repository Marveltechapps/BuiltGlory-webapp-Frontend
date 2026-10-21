'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Card, Toggle } from '../ui/Card';
import { PageWrap, SectionHead } from '../ui/PageWrap';
import { useSession } from '../../context/SessionContext';
import { useToast } from '../../context/ToastContext';
import { useBack } from '../../hooks/useNavigation';
import { getMe, updateMe } from '../../services/userService';
import { errorMessage } from '../../services/api';
import { readPref, writePref } from '../../lib/authStorage';
import { nearestCity } from '../../lib/catalog';
import { cx } from '../../lib/format';
import { displayName, mobileOf } from '../../lib/user';
import type { ChannelPreference, NotificationPreferences, PreferenceChannel } from '../../types/user';

function Sec({ title, children }: { title: string; children: ReactNode }) {
  return <div className="mb-6"><div className="text-[12px] font-semibold text-ink-400 uppercase tracking-wide mb-2">{title}</div><Card className="divide-y divide-ink-100">{children}</Card></div>;
}

function Row({ icon, title, sub, onClick }: { icon: string; title: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-4 p-4 hover:bg-ink-50 transition text-left">
      <div className="w-10 h-10 rounded-xl bg-ink-100 grid place-items-center shrink-0"><Icon name={icon} size={18} color="#334155" /></div>
      <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-ink-900">{title}</div>{sub && <div className="text-[12px] text-ink-400">{sub}</div>}</div>
      <Icon name="chevron-right" size={17} color="#CBD5E1" />
    </button>
  );
}

// ── SETTINGS ─────────────────────────────────────────────────
export function Settings() {
  const router = useRouter();
  const { signedIn, openLogout, requireAuth } = useSession();
  const go = (path: string, auth = true) => (auth ? requireAuth(() => router.push(path)) : router.push(path));
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <SectionHead title="Settings" sub="Manage your account, notifications and preferences" />
      <Sec title="Account">
        <Row icon="user-cog" title="Account Settings" sub="Profile, phone number, session" onClick={() => go('/settings/account')} />
        <Row icon="bell" title="Notification Settings" sub="Push, WhatsApp, SMS, email" onClick={() => go('/settings/notifications')} />
        <Row icon="sliders-horizontal" title="App Settings" sub="Language, location" onClick={() => go('/settings/app', false)} />
        <Row icon="lock" title="Privacy & data" sub="Control how your data is used" onClick={() => go('/settings/privacy')} />
      </Sec>
      <Sec title="Support">
        <Row icon="life-buoy" title="Help & FAQs" onClick={() => go('/help', false)} />
        <Row icon="headset" title="Customer Support" onClick={() => go('/support', false)} />
        <Row icon="info" title="About Builtglory" onClick={() => go('/about', false)} />
      </Sec>
      {signedIn && <button type="button" onClick={openLogout} className="w-full h-12 rounded-2xl border border-rose-200 text-rose-600 font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-rose-50 transition"><Icon name="log-out" size={17} />Log out</button>}
    </PageWrap>
  );
}

// ── ACCOUNT SETTINGS ─────────────────────────────────────────
export function AccountSettings() {
  const router = useRouter();
  const back = useBack('/settings');
  const { user, openLogout } = useSession();
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink-900 mb-5"><Icon name="arrow-left" size={19} />Account Settings</button>
      <Card className="p-5">
        <h3 className="text-[16px] font-bold text-ink-900">Signed in account</h3>
        <div className="mt-3"><div className="text-[15px] font-bold text-ink-900">{displayName(user)}</div><div className="text-[13.5px] font-semibold text-ink-500">+91 {mobileOf(user)}</div><div className="text-[13px] text-ink-400">{user?.email || 'Email not added'}</div></div>
        <button type="button" onClick={() => router.push('/profile/edit')} className="w-full h-12 rounded-xl border border-ink-200 text-[14.5px] font-bold text-ink-800 mt-4 hover:bg-ink-50 transition">Edit Profile</button>
        <button type="button" onClick={() => router.push('/profile/change-phone')} className="w-full h-12 rounded-xl border border-ink-200 text-[14.5px] font-bold text-ink-800 mt-3 hover:bg-ink-50 transition">Change Phone Number</button>
      </Card>
      <Card className="p-5 mt-4">
        <h3 className="text-[16px] font-bold text-ink-900">Session</h3>
        <p className="text-[13px] text-ink-500 mt-1">Logout revokes your refresh token on the backend and clears the local session.</p>
        <button type="button" onClick={openLogout} className="w-full h-12 rounded-xl bg-ink-900 text-white text-[15px] font-bold mt-4 hover:bg-ink-800 transition">Logout</button>
      </Card>
      <button type="button" onClick={() => router.push('/settings/delete-account')} className="w-full flex items-center justify-center gap-2 text-[14.5px] font-bold text-rose-600 mt-6 hover:underline"><Icon name="trash-2" size={17} color="#E11D48" />Delete Account</button>
    </PageWrap>
  );
}

// ── NOTIFICATION SETTINGS ────────────────────────────────────
const CHANNELS: Array<{ k: PreferenceChannel; title: string; sub: string }> = [
  { k: 'push', title: 'Push notifications', sub: 'App alerts for enquiries, visits and deals' },
  { k: 'whatsapp', title: 'WhatsApp updates', sub: 'Verified property and transaction reminders' },
  { k: 'sms', title: 'SMS updates', sub: 'Critical OTP, visit and payment messages' },
  { k: 'email', title: 'Email updates', sub: 'Documents, receipts and long-form updates' },
  { k: 'in_app', title: 'In-app inbox', sub: 'Notifications inside the Builtglory app' },
];
// users/schema.js defaults: transactional on, marketing off.
const pref = (p: NotificationPreferences | undefined, k: PreferenceChannel): Required<ChannelPreference> => ({ transactional: p?.[k]?.transactional ?? true, marketing: p?.[k]?.marketing ?? false });

export function NotifSettings() {
  const back = useBack('/settings');
  const { user, setUser } = useSession();
  const { toastError } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const prefs = user?.notificationPreferences;
  const set = (k: PreferenceChannel, kind: keyof ChannelPreference) => async (v: boolean) => {
    if (!user) return;
    // PATCH /me sets notificationPreferences as a whole, so send every channel.
    const full = Object.fromEntries(CHANNELS.map((c) => [c.k, c.k === k ? { ...pref(prefs, c.k), [kind]: v } : pref(prefs, c.k)])) as NotificationPreferences;
    setSaving(`${k}.${kind}`);
    setUser({ ...user, notificationPreferences: full });
    try {
      setUser(await updateMe({ notificationPreferences: full }));
    } catch (e) {
      setUser(user);
      toastError(errorMessage(e, 'Could not update notification settings.'));
    } finally { setSaving(null); }
  };
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink-900 mb-5"><Icon name="arrow-left" size={19} />Notification Settings</button>
      <div className="space-y-5">
        {CHANNELS.map((g) => {
          const v = pref(prefs, g.k);
          return (
            <div key={g.k}>
              <div className="text-[16px] font-bold text-ink-900">{g.title}</div>
              <div className="text-[13px] text-ink-500 mb-2">{g.sub}</div>
              <Card className="divide-y divide-ink-100">
                <div className="flex items-center gap-4 p-4"><span className="flex-1 text-[14.5px] font-semibold text-ink-800">Transactional</span><Toggle on={v.transactional} disabled={saving === `${g.k}.transactional`} onChange={(x) => void set(g.k, 'transactional')(x)} /></div>
                <div className="flex items-center gap-4 p-4"><span className="flex-1 text-[14.5px] font-semibold text-ink-800">Marketing & offers</span><Toggle on={v.marketing} disabled={saving === `${g.k}.marketing`} onChange={(x) => void set(g.k, 'marketing')(x)} /></div>
              </Card>
            </div>
          );
        })}
      </div>
    </PageWrap>
  );
}

// ── APP SETTINGS ─────────────────────────────────────────────
export function AppSettings() {
  const router = useRouter();
  const back = useBack('/settings');
  const { signedIn, setUser, requireAuth } = useSession();
  const { toast, toastError } = useToast();
  const [lang, setLang] = useState(() => readPref('language') || 'English');
  const [loc, setLoc] = useState(() => readPref('location') || 'gps');
  const [locating, setLocating] = useState(false);

  const pickLanguage = (l: string) => {
    setLang(l);
    writePref('language', l);
    toast(`Language: ${l}`);
    if (!signedIn) return;
    void updateMe({ preferences: { language: l === 'Tamil' ? 'Tamil' : 'English' } }).then(setUser).catch((e) => toastError(errorMessage(e, 'Could not save language.')));
  };
  const useGps = () => requireAuth(() => {
    if (!navigator.geolocation) { toastError('GPS is not available on this device', 'crosshair'); return; }
    setLoc('gps'); writePref('location', 'gps'); setLocating(true);
    toast('Detecting your location…', 'crosshair');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        setUser(await updateMe({ latitude, longitude, city: nearestCity(latitude, longitude) }));
        toast(`Location updated · ${nearestCity(latitude, longitude)}`, 'map-pin');
      } catch (e) { toastError(errorMessage(e, 'Could not save your location.')); } finally { setLocating(false); }
    }, () => { setLocating(false); toastError('Location access was blocked', 'crosshair'); }, { enableHighAccuracy: true, timeout: 10000 });
  });
  const useManual = () => { setLoc('manual'); writePref('location', 'manual'); if (signedIn) router.push('/onboarding?stage=prefs'); else toast('Pick your city', 'map-pin'); };

  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink-900 mb-6"><Icon name="arrow-left" size={19} />App Settings</button>
      <div className="text-[12px] font-semibold text-ink-400 uppercase tracking-wide mb-2">Language</div>
      <div className="grid grid-cols-2 gap-3">
        {['English', 'Tamil'].map((l) => <button type="button" key={l} onClick={() => pickLanguage(l)} className={cx('h-14 rounded-2xl text-[15px] font-bold border transition', lang === l ? 'bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-100' : 'bg-white border-ink-200 text-ink-700 hover:border-brand-300')}>{l}</button>)}
      </div>
      <div className="text-[12px] font-semibold text-ink-400 uppercase tracking-wide mt-6 mb-2">Location</div>
      <div className="space-y-3">
        {([['gps', 'crosshair', 'Use GPS', 'Auto-detect my location', useGps], ['manual', 'map-pin', 'Manual entry', 'Pick city and area myself', useManual]] as const).map(([id, ic, t, sub, fn]) => (
          <button type="button" key={id} onClick={fn} disabled={locating && id === 'gps'} className={cx('w-full flex items-center gap-3.5 rounded-2xl border p-4 text-left transition', loc === id ? 'bg-brand-50 border-brand-500 ring-2 ring-brand-100' : 'bg-white border-ink-200 hover:border-brand-300')}>
            <Icon name={locating && id === 'gps' ? 'loader-circle' : ic} size={20} color={loc === id ? '#1A6FFF' : '#64748B'} style={locating && id === 'gps' ? { animation: 'spin 1s linear infinite' } : undefined} />
            <div><div className={cx('text-[15px] font-bold', loc === id ? 'text-brand-700' : 'text-ink-900')}>{t}</div><div className="text-[12.5px] text-ink-500">{sub}</div></div>
          </button>
        ))}
      </div>
    </PageWrap>
  );
}

// ── PRIVACY & DATA ───────────────────────────────────────────
const PRIVACY_ROWS: Array<[string, string, string, string]> = [
  ['sparkles', 'Personalised recommendations', 'Use my activity to tailor listings', 'personalise'],
  ['users', 'Share data with verified sellers', 'Only after I submit an enquiry', 'share'],
  ['bar-chart-3', 'Usage analytics', 'Help improve the app anonymously', 'analytics'],
  ['map-pin', 'Location services', 'Detect my city for nearby listings', 'location'],
];
const PRIVACY_DEFAULTS: Record<string, boolean> = { personalise: true, share: false, analytics: true, location: true };

export function Privacy() {
  const router = useRouter();
  const back = useBack('/settings');
  const { signedIn, setUser } = useSession();
  const { toast, toastError } = useToast();
  const [s, setS] = useState<Record<string, boolean>>(() => Object.fromEntries(Object.entries(PRIVACY_DEFAULTS).map(([k, d]) => [k, (readPref(`privacy_${k}`) ?? String(d)) === 'true'])));
  const [exporting, setExporting] = useState(false);
  const set = (k: string) => (v: boolean) => {
    const next = { ...s, [k]: v };
    setS(next);
    writePref(`privacy_${k}`, String(v));
    if (!signedIn) return;
    void updateMe({
      privacy: {
        personalise: next.personalise,
        shareWithSellers: next.share,
        analytics: next.analytics,
        location: next.location,
      },
    }).then(setUser).catch((e) => toastError(errorMessage(e, 'Could not save privacy settings.')));
  };
  const download = async () => {
    setExporting(true);
    try {
      const me = await getMe();
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile: me }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'builtglory-my-data.json'; a.click();
      URL.revokeObjectURL(url);
      toast('Your data export is ready', 'download');
    } catch (e) { toastError(errorMessage(e, 'Could not export your data.')); } finally { setExporting(false); }
  };
  return (
    <PageWrap className="!max-w-[1120px] web-split">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-500 hover:text-brand-600 mb-4"><Icon name="arrow-left" size={16} />Back</button>
      <SectionHead title="Privacy & data" sub="Control how your information is used" />
      <Card className="divide-y divide-ink-100">
        {PRIVACY_ROWS.map(([ic, t, sub, k]) => (
          <div key={k} className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-ink-100 grid place-items-center shrink-0"><Icon name={ic} size={18} color="#334155" /></div>
            <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-ink-900">{t}</div><div className="text-[12px] text-ink-400">{sub}</div></div>
            <Toggle on={s[k] ?? false} onChange={set(k)} />
          </div>
        ))}
      </Card>
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <Button variant="outline" icon="download" loading={exporting} onClick={() => void download()}>Download my data</Button>
        <Button variant="outline" icon="trash-2" className="!text-rose-600 !border-rose-200 hover:!bg-rose-50" onClick={() => router.push('/settings/delete-account')}>Delete my data</Button>
      </div>
    </PageWrap>
  );
}
