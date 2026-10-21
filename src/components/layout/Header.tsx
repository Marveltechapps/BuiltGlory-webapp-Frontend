'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { LogoMark } from '../ui/LogoMark';
import { initials } from '../../lib/format';
import { displayName } from '../../lib/user';
import { useSession } from '../../context/SessionContext';
import { useBack } from '../../hooks/useNavigation';
import { isRootPath, titleFor } from './navConfig';

export function Header({ onMenu, onAuth }: { onMenu: () => void; onAuth: (mode: 'login' | 'signup') => void }) {
  const path = usePathname();
  const router = useRouter();
  const back = useBack('/');
  const { user, signedIn, requireAuth, unreadCount } = useSession();
  return (
    <header className="h-16 shrink-0 bg-white border-b border-ink-200 flex items-center gap-3 px-4 lg:px-6 z-20">
      <button type="button" aria-label="Open menu" onClick={onMenu} className="md:hidden w-10 h-10 grid place-items-center rounded-xl hover:bg-ink-100"><Icon name="menu" size={20} color="#334155" /></button>
      {!isRootPath(path) && <button type="button" aria-label="Back" onClick={back} className="hidden md:grid w-10 h-10 place-items-center rounded-xl hover:bg-ink-100"><Icon name="arrow-left" size={19} color="#334155" /></button>}
      <button type="button" aria-label="Builtglory home" onClick={() => router.push('/')} className="shrink-0 rounded-xl">
        <LogoMark className="w-9 h-9 rounded-xl" />
      </button>
      <div className="text-[17px] font-bold tracking-tight text-ink-900 truncate">{titleFor(path)}</div>
      <button type="button" onClick={() => router.push('/search')} className="ml-auto flex items-center gap-2 h-10 px-3.5 rounded-xl bg-ink-100 text-ink-400 hover:bg-ink-200/70 transition min-w-0 sm:w-72"><Icon name="search" size={16} /><span className="text-[13px] truncate hidden sm:block">Search properties, areas, builders…</span></button>
      <button type="button" aria-label="Notifications" onClick={() => requireAuth(() => router.push('/notifications'))} className="relative w-10 h-10 grid place-items-center rounded-xl bg-ink-100 hover:bg-ink-200/70 transition"><Icon name="bell" size={18} color="#334155" />{signedIn && unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>}</button>
      {!signedIn && <div className="hidden sm:flex items-center gap-2 shrink-0"><button type="button" onClick={() => onAuth('login')} className="h-10 px-4 rounded-xl text-[13.5px] font-bold text-ink-700 hover:bg-ink-100 transition">Log in</button><button type="button" onClick={() => onAuth('signup')} className="h-10 px-4 rounded-xl bg-brand-600 text-white text-[13.5px] font-bold hover:bg-brand-700 hover:shadow-[0_10px_24px_-10px_rgba(26,111,255,.7)] transition">Sign up</button></div>}
      <button type="button" aria-label="Profile" onClick={() => requireAuth(() => router.push('/profile'))} className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white text-[13px] font-bold shrink-0">{signedIn ? initials(displayName(user)) : <Icon name="user" size={18} color="#fff" />}</button>
    </header>
  );
}
