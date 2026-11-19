import type { ApiEnvelope, ApiErrorBody, ApiErrorDetail } from '../types/api';
import { clearTokens, getAccessToken, getDeviceId, getRefreshToken, setTokens, SESSION_EXPIRED_EVENT } from '../lib/authStorage';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1';

export class ApiError extends Error {
  status: number;
  code?: string;
  details: ApiErrorDetail[];
  constructor(status: number, message: string, code?: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const url = (path: string) => `${apiBase.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

let refreshing: Promise<boolean> | null = null;

/** POST /auth/refresh once for all concurrent 401s (refresh tokens are single-use on the backend). */
const refreshSession = () => {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;
      try {
        const res = await fetch(url('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-device-id': getDeviceId() },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const body = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
        setTokens(body.data.accessToken, body.data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => { refreshing = null; });
  }
  return refreshing;
};

const send = (path: string, init: RequestInit | undefined, token: string | null) => {
  const headers = new Headers(init?.headers);
  headers.set('x-device-id', getDeviceId());
  // QA-BUG-012: trusted client identifier for enquiry source (server must not trust body.source).
  if (!headers.has('X-Client')) headers.set('X-Client', 'web');
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url(path), { ...init, headers });
};

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  let response = await send(path, init, token);
  if (response.status === 401 && token) {
    if (await refreshSession()) {
      response = await send(path, init, getAccessToken());
    } else {
      clearTokens();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
  }
  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try { body = (await response.json()) as ApiErrorBody; } catch { body = null; }
    throw new ApiError(
      response.status,
      body?.error?.message || `API request failed: ${response.status}`,
      body?.error?.code,
      body?.error?.details ?? [],
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

type Query = Record<string, string | number | boolean | undefined | null>;

export const withQuery = (path: string, query?: Query) => {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

/** GET and unwrap the `{ data, meta }` envelope. */
export async function apiGet<T>(path: string, query?: Query, signal?: AbortSignal): Promise<T> {
  const res = await apiRequest<ApiEnvelope<T>>(withQuery(path, query), { signal });
  return res.data;
}

/** GET a list endpoint and keep its pagination meta. */
export async function apiList<T>(path: string, query?: Query, signal?: AbortSignal) {
  const res = await apiRequest<ApiEnvelope<T[]>>(withQuery(path, query), { signal });
  return { items: res.data, meta: res.meta };
}

/** JSON mutation (POST / PATCH / PUT / DELETE) and unwrap the envelope. */
export async function apiSend<T>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const res = await apiRequest<ApiEnvelope<T> | undefined>(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res?.data as T;
}

/** Multipart upload (POST /documents). */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await apiRequest<ApiEnvelope<T>>(path, { method: 'POST', body: form });
  return res.data;
}

/** First human-readable message from an API failure. */
export const errorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.') => {
  if (error instanceof ApiError) return error.details[0]?.message || error.message || fallback;
  if (error instanceof TypeError) return 'Could not reach the Builtglory server. Check your connection and try again.';
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};
