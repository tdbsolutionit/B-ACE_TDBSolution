'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type SessionUser = {
  sub: string;
  tenantId: string;
  role: 'admin' | 'manager' | 'sales';
  email: string;
  name: string;
};

type Session = { accessToken: string; user: SessionUser };

type AuthValue = {
  ready: boolean;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);
const KEY = 'bace.session';

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    if (hostname) {
      return `http://${hostname}:3001/api`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Session;
        if (parsed.accessToken === 'demo') localStorage.removeItem(KEY);
        else setSession(parsed);
      } catch {
        localStorage.removeItem(KEY);
      }
    }
    setReady(true);
  }, []);

  async function login(email: string, password: string) {
    const base = getApiBase();
    let next: Session | null = null;
    try {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('Email hoặc mật khẩu không đúng');
      next = (await res.json()) as Session;
    } catch (error) {
      if (error instanceof Error && error.message === 'Email hoặc mật khẩu không đúng') throw error;
      throw new Error('Không kết nối được máy chủ. Hãy kiểm tra API đang chạy.');
    }
    localStorage.setItem(KEY, JSON.stringify(next));
    setSession(next);
  }

  function logout() {
    localStorage.removeItem(KEY);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ ready, session, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const raw = typeof window === 'undefined' ? null : localStorage.getItem(KEY);
  const session = raw ? (JSON.parse(raw) as Session) : null;
  if (!session?.accessToken) throw new Error('Chưa đăng nhập');
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

function authHeader() {
  const raw = typeof window === 'undefined' ? null : localStorage.getItem(KEY);
  const session = raw ? (JSON.parse(raw) as Session) : null;
  if (!session?.accessToken) throw new Error('Chưa đăng nhập');
  return { token: session.accessToken, base: getApiBase() };
}

export async function apiForm<T>(path: string, body: FormData): Promise<T> {
  const { token, base } = authHeader();
  const res = await fetch(`${base}${path}`, { method: 'POST', body, headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function apiBlob(path: string): Promise<Blob> {
  const { token, base } = authHeader();
  const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}
