'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { clearTokens, getAccessToken, isGuest, setGuest, setTokens, SESSION_EXPIRED_EVENT } from '../lib/authStorage';
import { getMe } from '../services/userService';
import { logout as apiLogout } from '../services/authService';
import { getFavorites, saveProperty, unsaveProperty } from '../services/propertyService';
import { getUnreadCount } from '../services/notificationService';
import { errorMessage } from '../services/api';
import { useToast } from './ToastContext';
import type { AuthSession, User } from '../types/user';

export type SessionStatus = 'loading' | 'signedIn' | 'guest' | 'anonymous';

interface SessionValue {
  status: SessionStatus;
  user: User | null;
  signedIn: boolean;
  completeSignIn: (session: AuthSession) => Promise<User>;
  signOut: () => Promise<void>;
  enterGuest: () => void;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User) => void;
  favorites: Set<string>;
  toggleFavorite: (propertyId: string) => void;
  requireAuth: (cb?: () => void) => void;
  authModalOpen: boolean;
  closeAuthModal: () => void;
  logoutOpen: boolean;
  openLogout: () => void;
  closeLogout: () => void;
  unreadCount: number;
  refreshUnread: () => void;
}

const SessionCtx = createContext<SessionValue | null>(null);

/** Stored token → GET /me. Resolves null when there is no usable session. */
async function restoreSession(signal: AbortSignal): Promise<User | null> {
  if (!getAccessToken()) return null;
  try {
    return await getMe(signal);
  } catch {
    if (!signal.aborted) clearTokens();
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { toast, toastError } = useToast();
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUserState] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pendingFav = useRef<Set<string>>(new Set());

  const loadFavorites = useCallback(() => {
    getFavorites().then((list) => setFavorites(new Set(list.map((p) => p._id)))).catch(() => { /* favourites just stay empty */ });
  }, []);

  const refreshUnread = useCallback(() => {
    if (!getAccessToken()) return;
    getUnreadCount().then((r) => setUnreadCount(r.count)).catch(() => { /* badge hidden on failure */ });
  }, []);

  // Restore the session on first load.
  useEffect(() => {
    const controller = new AbortController();
    restoreSession(controller.signal).then((me) => {
      if (controller.signal.aborted) return;
      if (me) { setUserState(me); setStatus('signedIn'); loadFavorites(); refreshUnread(); }
      else setStatus(isGuest() ? 'guest' : 'anonymous');
    });
    return () => controller.abort();
  }, [loadFavorites, refreshUnread]);

  // Access + refresh token both rejected by the API.
  useEffect(() => {
    const onExpired = () => {
      setUserState(null);
      setFavorites(new Set());
      setStatus(isGuest() ? 'guest' : 'anonymous');
      toastError('Your session has expired. Please sign in again.', 'log-out');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [toastError]);

  useEffect(() => {
    if (status !== 'signedIn') return undefined;
    const iv = setInterval(refreshUnread, 60000);
    return () => clearInterval(iv);
  }, [status, refreshUnread]);

  const completeSignIn = useCallback(async (session: AuthSession) => {
    setTokens(session.accessToken, session.refreshToken);
    setGuest(false);
    const me = await getMe();
    setUserState(me);
    setStatus('signedIn');
    setAuthModalOpen(false);
    loadFavorites();
    refreshUnread();
    return me;
  }, [loadFavorites, refreshUnread]);

  const signOut = useCallback(async () => {
    try { await apiLogout(); } catch { /* token already revoked or server unreachable — clear locally regardless */ }
    clearTokens();
    setGuest(false);
    setUserState(null);
    setFavorites(new Set());
    setUnreadCount(0);
    setLogoutOpen(false);
    setStatus('anonymous');
  }, []);

  const enterGuest = useCallback(() => {
    setGuest(true);
    setStatus('guest');
    toast('Browsing as guest', 'user-round');
  }, [toast]);

  const refreshUser = useCallback(async () => {
    try { const me = await getMe(); setUserState(me); return me; } catch { return null; }
  }, []);

  const signedIn = status === 'signedIn';

  const requireAuth = useCallback((cb?: () => void) => {
    if (signedIn) { cb?.(); return; }
    setAuthModalOpen(true);
  }, [signedIn]);

  const toggleFavorite = useCallback((propertyId: string) => {
    if (!signedIn) { setAuthModalOpen(true); return; }
    if (pendingFav.current.has(propertyId)) return;
    pendingFav.current.add(propertyId);
    const wasSaved = favorites.has(propertyId);
    setFavorites((f) => { const n = new Set(f); if (wasSaved) n.delete(propertyId); else n.add(propertyId); return n; });
    (wasSaved ? unsaveProperty(propertyId) : saveProperty(propertyId))
      .then(() => toast(wasSaved ? 'Removed from saved' : 'Saved to your list', 'heart'))
      .catch((e: unknown) => {
        setFavorites((f) => { const n = new Set(f); if (wasSaved) n.add(propertyId); else n.delete(propertyId); return n; });
        toastError(errorMessage(e, 'Could not update saved properties.'));
      })
      .finally(() => pendingFav.current.delete(propertyId));
  }, [signedIn, favorites, toast, toastError]);

  const value = useMemo<SessionValue>(() => ({
    status, user, signedIn, completeSignIn, signOut, enterGuest, refreshUser,
    setUser: setUserState, favorites, toggleFavorite, requireAuth,
    authModalOpen, closeAuthModal: () => setAuthModalOpen(false),
    logoutOpen, openLogout: () => setLogoutOpen(true), closeLogout: () => setLogoutOpen(false),
    unreadCount, refreshUnread,
  }), [status, user, signedIn, completeSignIn, signOut, enterGuest, refreshUser, favorites, toggleFavorite, requireAuth, authModalOpen, logoutOpen, unreadCount, refreshUnread]);

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export const useSession = () => {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
};
