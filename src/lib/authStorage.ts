// Customer session tokens and per-device ids live in localStorage: the API authenticates
// with `Authorization: Bearer`, so the browser has to hold the token between page loads.
const ACCESS = 'bg_access_token';
const REFRESH = 'bg_refresh_token';
const GUEST = 'bg_guest';
const DEVICE = 'bg_device_id';

const read = (key: string) => {
  try { return typeof window === 'undefined' ? null : window.localStorage.getItem(key); } catch { return null; }
};
const write = (key: string, value: string | null) => {
  try {
    if (typeof window === 'undefined') return;
    if (value === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, value);
  } catch { /* storage unavailable (private mode) — session lasts for this page only */ }
};

export const getAccessToken = () => read(ACCESS);
export const getRefreshToken = () => read(REFRESH);
export const setTokens = (accessToken: string, refreshToken: string) => { write(ACCESS, accessToken); write(REFRESH, refreshToken); };
export const clearTokens = () => { write(ACCESS, null); write(REFRESH, null); };

export const isGuest = () => read(GUEST) === '1';
export const setGuest = (on: boolean) => write(GUEST, on ? '1' : null);

export const getDeviceId = () => {
  let id = read(DEVICE);
  if (!id) {
    id = `web-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    write(DEVICE, id);
  }
  return id;
};

export const readPref = (key: string) => read(`bg_pref_${key}`);
export const writePref = (key: string, value: string) => write(`bg_pref_${key}`, value);

export const SESSION_EXPIRED_EVENT = 'bg:session-expired';
