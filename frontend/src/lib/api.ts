// Client API : gestion des tokens (access + refresh) avec renouvellement
// automatique et transparent sur 401.

const BASE = '/api/backend';

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string | null;
  twoFactorEnabled?: boolean;
  schoolId?: string | null;
}

export interface ApiSchool {
  id: string;
  code: string;
  name: string;
  type: string;
  logoUrl?: string | null;
  city?: string | null;
  currency: string;
}

const storage = {
  get access() { return typeof window === 'undefined' ? null : localStorage.getItem('scolaris.access'); },
  get refresh() { return typeof window === 'undefined' ? null : localStorage.getItem('scolaris.refresh'); },
  setTokens(access: string, refresh: string) {
    localStorage.setItem('scolaris.access', access);
    localStorage.setItem('scolaris.refresh', refresh);
  },
  clear() {
    localStorage.removeItem('scolaris.access');
    localStorage.removeItem('scolaris.refresh');
    localStorage.removeItem('scolaris.user');
    localStorage.removeItem('scolaris.school');
  },
};

export class ApiRequestError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;

const tryRefresh = async (): Promise<boolean> => {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refresh = storage.refresh;
    if (!refresh) return false;
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    storage.setTokens(data.accessToken, data.refreshToken);
    return true;
  })().finally(() => { refreshing = null; });
  return refreshing;
};

export const api = async <T = any>(
  path: string,
  options: RequestInit & { raw?: boolean } = {},
): Promise<T> => {
  const doFetch = () =>
    fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body && !(options.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(storage.access ? { Authorization: `Bearer ${storage.access}` } : {}),
        ...options.headers,
      },
    });

  let res = await doFetch();
  if (res.status === 401 && storage.refresh && !path.startsWith('/auth/')) {
    const ok = await tryRefresh();
    if (ok) res = await doFetch();
    else {
      storage.clear();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiRequestError(res.status, body.error ?? 'Erreur inattendue', body.details ?? body.conflicts);
  }
  if (options.raw) return res as unknown as T;
  return res.json();
};

export const apiDownload = async (path: string, filename: string) => {
  const res = await api<Response>(path, { raw: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const authStore = {
  storage,
  saveSession(data: { accessToken: string; refreshToken: string; user: ApiUser; school?: ApiSchool | null }) {
    storage.setTokens(data.accessToken, data.refreshToken);
    localStorage.setItem('scolaris.user', JSON.stringify(data.user));
    if (data.school) localStorage.setItem('scolaris.school', JSON.stringify(data.school));
  },
  get user(): ApiUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('scolaris.user');
    return raw ? JSON.parse(raw) : null;
  },
  get school(): ApiSchool | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('scolaris.school');
    return raw ? JSON.parse(raw) : null;
  },
  async logout() {
    const refresh = storage.refresh;
    if (refresh) {
      await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: refresh }) }).catch(() => undefined);
    }
    storage.clear();
    window.location.href = '/login';
  },
};
