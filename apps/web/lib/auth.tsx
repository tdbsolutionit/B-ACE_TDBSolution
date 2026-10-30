'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { handleApiError } from '@/lib/error-handler';

export type SessionUser = {
  sub?: string;
  id?: string;
  tenantId?: string;
  role: 'admin' | 'manager' | 'sales';
  email: string;
  name: string;
  roleId?: string;
  roleName?: string;
  teamId?: string | null;
  permissions?: string[];
};

type Session = {
  user: SessionUser;
};

type AuthValue = {
  ready: boolean;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);
const KEY = 'bace.session';

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;

  if (!candidate.user || typeof candidate.user !== 'object') {
    return false;
  }

  const user = candidate.user as Record<string, unknown>;

  return (
    (typeof user.sub === 'string' || typeof user.id === 'string') &&
    typeof user.email === 'string' &&
    typeof user.role === 'string'
  );
}

function readSession(): Session | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const value: unknown = JSON.parse(raw);

    if (!isSession(value)) {
      localStorage.removeItem(KEY);
      return null;
    }

    return value;
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}

export function getApiBase(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    let url: URL;

    try {
      url = new URL(configuredUrl);
    } catch {
      throw new Error('NEXT_PUBLIC_API_URL không phải URL hợp lệ');
    }

    const isPrivateIp =
      url.hostname.startsWith('192.168.') ||
      url.hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(url.hostname);

    const isLocal =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1' ||
      isPrivateIp;

    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      url.protocol !== 'https:' &&
      !isLocal
    ) {
      throw new Error('API production phải sử dụng HTTPS');
    }

    if (url.protocol !== 'https:' && !isLocal) {
      throw new Error('API phải sử dụng HTTPS ngoài môi trường local/LAN');
    }

    return url.toString().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const isPrivateIp =
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

    if (hostname === 'localhost' || hostname === '127.0.0.1' || isPrivateIp) {
      return `${protocol}//${hostname}:3001/api`;
    }

    if (protocol === 'https:') {
      throw new Error(
        'Thiếu NEXT_PUBLIC_API_URL. Không thể gọi API qua HTTP từ website HTTPS.'
      );
    }

    throw new Error(
      'Chưa cấu hình NEXT_PUBLIC_API_URL cho môi trường triển khai.'
    );
  }

  throw new Error('Chưa cấu hình NEXT_PUBLIC_API_URL');
}

function forceLogout() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(KEY);
  } finally {
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
}

function buildApiUrl(path: string): string {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\')
  ) {
    throw new Error('Đường dẫn API không hợp lệ');
  }

  return `${getApiBase()}${path}`;
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      let next: unknown;

      try {
        const res = await fetch(buildApiUrl('/auth/login'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          throw new Error(
            res.status === 401
              ? 'Email hoặc mật khẩu không đúng'
              : 'Không thể đăng nhập. Vui lòng thử lại.'
          );
        }

        next = await res.json();

        if (!isSession(next)) {
          console.error("Login Response:", next);
          throw new Error('Phản hồi đăng nhập không đúng định dạng');
        }

        localStorage.setItem(KEY, JSON.stringify(next));
        setSession(next);
      } catch (error: unknown) {
        handleApiError(error);
        throw error;
      }
    },
    []
  );

  const logout = useCallback(() => {
    forceLogout();
    setSession(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      ready,
      session,
      login,
      logout,
    }),
    [ready, session, login, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('AuthProvider missing');
  }

  return value;
}

async function requestApi(
  path: string,
  options: RequestInit = {},
  skipErrorToast = false
): Promise<Response> {
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = new Headers(options.headers || {});

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (error: unknown) {
    if (!skipErrorToast) handleApiError(error);
    throw error;
  }

if (response.status === 401 && !path.includes('/auth/login')) {
  try {
    await fetch(buildApiUrl('/auth/refresh'), { method: 'POST', credentials: 'include' });
    return requestApi(path, options, skipErrorToast);
  } catch (err) {
    forceLogout();
    throw new Error('Unauthorized');
  }
}

  if (!response.ok) {
    const error = new Error(
      `Yêu cầu API thất bại (HTTP ${response.status})`
    );

    if (!skipErrorToast) handleApiError(error);

    throw error;
  }

  return response;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  skipErrorToast = false
): Promise<T> {
  const response = await requestApi(path, options, skipErrorToast);

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();

  if (!text) return null as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('API trả về dữ liệu JSON không hợp lệ');
  }
}

export async function apiForm<T>(
  path: string,
  body: FormData
): Promise<T> {
  const response = await requestApi(path, {
    method: 'POST',
    body,
  });

  if (response.status === 204) return null as T;

  return response.json() as Promise<T>;
}

export async function apiBlob(path: string): Promise<Blob> {
  const response = await requestApi(path);
  return response.blob();
}