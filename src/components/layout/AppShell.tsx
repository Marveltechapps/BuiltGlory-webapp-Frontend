'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { LogoMark } from '../ui/LogoMark';
import { Modal, ToastHost } from '../ui/Modal';
import { PageLoading } from '../ui/StateViews';
import { SidebarNav } from './SidebarNav';
import { Header } from './Header';
import { AuthScreen } from '../auth/AuthScreen';
import { useSession } from '../../context/SessionContext';
import { cx } from '../../lib/format';

/** Client shell: auth gate, sidebar + header layout, mobile drawer, sign-in and log-out dialogs, toast. */
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { status, authModalOpen, closeAuthModal, logoutOpen, closeLogout, signOut } = useSession();
  const [drawer, setDrawer] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => { document.getElementById('wa-main')?.scrollTo(0, 0); }, [path]);

  const openAuth = (mode: 'login' | 'signup') => {
    closeAuthModal();
    setDrawer(false);
    router.push(`/login?mode=${mode}&next=${encodeURIComponent(path)}`);
  };

  const fullScreen = path.startsWith('/login') || path.startsWith('/onboarding');

  if (status === 'loading') return <div className="h-full w-full overflow-y-auto bg-ink-100"><PageLoading label="Loading Builtglory" /></div>;

  if (fullScreen) return (
    <div className={cx('h-full w-full overflow-y-auto', path.startsWith('/onboarding') && 'wa-bg')}>
      {children}
      <ToastHost />
    </div>
  );

  if (status === 'anonymous') return (
    <div className="h-full w-full overflow-y-auto">
      <AuthScreen gated initialMode="login" next={path} />
      <ToastHost />
    </div>
  );

  const doSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    router.push('/');
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-ink-100 text-ink-900">
      <aside className="hidden md:block w-[264px] shrink-0 border-r border-ink-200"><SidebarNav onAuth={openAuth} /></aside>
      {drawer && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <div className="absolute inset-0 bg-black/40 fade-in" onClick={() => setDrawer(false)}></div>
          <div className="absolute left-0 top-0 bottom-0 w-[280px] shadow-2xl" style={{ animation: 'sheetLeft .24s cubic-bezier(.2,.8,.25,1)' }}><SidebarNav onAuth={openAuth} onClose={() => setDrawer(false)} /></div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Header onMenu={() => setDrawer(true)} onAuth={openAuth} />
        <main id="wa-main" className="flex-1 min-h-0 overflow-y-auto wa-bg">{children}</main>
      </div>

      <Modal open={logoutOpen} onClose={closeLogout}>
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 grid place-items-center mx-auto"><Icon name="log-out" size={28} color="#E11D48" /></div>
          <h2 className="text-[19px] font-extrabold tracking-tight text-ink-900 mt-4">Log out of Builtglory?</h2>
          <p className="text-[13.5px] text-ink-500 mt-1.5">You&apos;ll need to sign in again with your phone number to access your saved properties and enquiries.</p>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={closeLogout} className="flex-1 h-11 rounded-xl border border-ink-200 text-[14px] font-semibold text-ink-700 hover:bg-ink-50 transition">Cancel</button>
            <button type="button" disabled={signingOut} onClick={doSignOut} className="flex-1 h-11 rounded-xl bg-rose-600 text-white text-[14px] font-semibold hover:bg-rose-700 transition disabled:opacity-60">{signingOut ? 'Logging out…' : 'Log out'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={authModalOpen} onClose={closeAuthModal}>
        <div className="p-6 text-center">
          <LogoMark className="w-16 h-16 rounded-2xl mx-auto shadow-[0_10px_30px_-6px_rgba(26,111,255,.6)]" />
          <h2 className="text-[19px] font-extrabold tracking-tight text-ink-900 mt-4">Sign in to continue</h2>
          <p className="text-[13.5px] text-ink-500 mt-1.5">Create an account or sign in to submit enquiries, list your property and manage your profile.</p>
          <button type="button" onClick={() => openAuth('login')} className="w-full h-12 rounded-xl bg-brand-600 text-white text-[14.5px] font-bold mt-6 hover:bg-brand-700 transition flex items-center justify-center gap-2">Log in<Icon name="arrow-right" size={17} color="#fff" /></button>
          <button type="button" onClick={() => openAuth('signup')} className="w-full h-12 rounded-xl border border-ink-200 text-ink-900 text-[14px] font-bold mt-2.5 hover:bg-ink-50 transition">Create an account</button>
          <button type="button" onClick={closeAuthModal} className="w-full h-10 text-ink-500 text-[13.5px] font-semibold mt-1.5 hover:text-ink-800 transition">Continue as guest</button>
        </div>
      </Modal>

      <ToastHost />
    </div>
  );
}
