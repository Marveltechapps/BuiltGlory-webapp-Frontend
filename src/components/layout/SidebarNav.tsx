'use client';

import { Fragment } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { LogoMark } from '../ui/LogoMark';
import { cx, initials } from '../../lib/format';
import { displayName, roleLabel } from '../../lib/user';
import { useSession } from '../../context/SessionContext';
import { NAV, isActive } from './navConfig';

interface SidebarProps {
  onClose?: () => void;
  onAuth: (mode: 'login' | 'signup') => void;
}

export function SidebarNav({ onClose, onAuth }: SidebarProps) {
  const path = usePathname();
  const router = useRouter();
  const { user, signedIn, requireAuth, openLogout, unreadCount } = useSession();
  const go = (href: string) => { onClose?.(); router.push(href); };
  const goProfile = () => requireAuth(() => go('/profile'));
  const groups = NAV
    .map((g) => ({ ...g, items: signedIn ? g.items : g.items.filter((it) => !it.authOnly) }))
    .filter((g) => (signedIn || !g.authOnly) && g.items.length > 0);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-ink-100">
        <LogoMark className="w-9 h-9 rounded-xl" />
        <div className="min-w-0"><div className="text-[15px] font-extrabold tracking-tight leading-none text-ink-900">Builtglory</div><div className="text-[10.5px] text-ink-400 mt-1 leading-none">Verified real estate</div></div>
        {onClose && <button type="button" aria-label="Close menu" onClick={onClose} className="md:hidden ml-auto w-9 h-9 grid place-items-center rounded-lg hover:bg-ink-100"><Icon name="x" size={18} color="#64748B" /></button>}
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto hide-scroll px-3 py-4">
        {groups.map((g) => (
          <div key={g.group} className="mb-5">
            <div className="px-2 pb-1.5 text-[10px] uppercase tracking-[.14em] text-ink-400 font-semibold">{g.group}</div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const inModule = isActive(it, path) || (it.subs ?? []).some((s) => s.href === path);
                const active = inModule;
                const badge = it.unreadBadge && unreadCount > 0 ? unreadCount : null;
                return (
                  <Fragment key={it.href}>
                    <button type="button" onClick={() => (it.href === '/profile' ? goProfile() : go(it.href))} className={cx('w-full flex items-center gap-3 px-3 h-11 rounded-xl text-[14px] font-medium transition', active ? 'bg-brand-600 text-white shadow-[0_6px_16px_rgba(26,111,255,.3)]' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900')}>
                      <Icon name={it.icon} size={19} strokeWidth={active ? 2.3 : 2} /><span className="flex-1 text-left truncate">{it.label}</span>
                      {badge && <span className={cx('text-[10.5px] font-bold rounded-full px-1.5 min-w-[18px] text-center', active ? 'bg-white text-brand-700' : 'bg-rose-500 text-white')}>{badge > 99 ? '99+' : badge}</span>}
                      {it.subs && <Icon name={inModule ? 'chevron-up' : 'chevron-down'} size={15} />}
                    </button>
                    {it.subs && inModule && (
                      <div className="ml-[22px] pl-3 border-l border-ink-200 my-1 space-y-0.5 fade-in">
                        {it.subs.map((s) => (
                          <button type="button" key={s.href} onClick={() => go(s.href)} className={cx('w-full text-left px-3 h-9 rounded-lg text-[13px] transition', path === s.href ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900')}>{s.label}</button>
                        ))}
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {!signedIn && (
        <div className="shrink-0 border-t border-ink-100 p-3">
          <div className="rounded-2xl p-4 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0A3270,#1A6FFF)' }}>
            <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/10"></div>
            <div className="relative flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-white/15 grid place-items-center"><Icon name="user-round" size={16} color="#fff" /></div><div className="text-[13.5px] font-bold">Guest mode</div></div>
            <p className="relative text-[12px] text-white/80 mt-2 leading-snug">Sign in to save properties, submit enquiries and list your property.</p>
            <div className="relative grid grid-cols-2 gap-2 mt-3">
              <button type="button" onClick={() => { onClose?.(); onAuth('login'); }} className="h-9 rounded-lg bg-white text-brand-700 text-[12.5px] font-bold hover:bg-brand-50 transition">Log in</button>
              <button type="button" onClick={() => { onClose?.(); onAuth('signup'); }} className="h-9 rounded-lg bg-white/15 text-white text-[12.5px] font-bold hover:bg-white/25 transition">Sign up</button>
            </div>
          </div>
        </div>
      )}
      {signedIn && (
        <div className="shrink-0 border-t border-ink-100 p-3 flex items-center gap-1">
          <button type="button" onClick={goProfile} className="flex-1 min-w-0 flex items-center gap-3 p-2 rounded-xl hover:bg-ink-100 transition">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white text-[13px] font-bold shrink-0">{initials(displayName(user))}</div>
            <div className="min-w-0 text-left"><div className="text-[13px] font-semibold text-ink-900 truncate">{displayName(user)}</div><div className="text-[11px] text-ink-400 truncate">{[roleLabel(user), user?.city].filter(Boolean).join(' · ')}</div></div>
          </button>
          <button type="button" onClick={() => { onClose?.(); openLogout(); }} title="Log out" className="w-9 h-9 shrink-0 grid place-items-center rounded-xl text-ink-400 hover:bg-rose-50 hover:text-rose-600 transition"><Icon name="log-out" size={17} /></button>
        </div>
      )}
    </div>
  );
}
