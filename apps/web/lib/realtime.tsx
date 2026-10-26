'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { getApiBase, useAuth } from '@/lib/auth';

type RealtimeEvent = {
  type: string;
  payload: any;
  at: string;
};

type Listener = (event: RealtimeEvent) => void;

type RealtimeContextValue = {
  connected: boolean;
  toastEnabled: boolean;
  setToastEnabled: (v: boolean) => void;
  on: (type: string, listener: Listener) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  toastEnabled: true,
  setToastEnabled: () => { },
  on: () => () => { },
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

const TOAST_KEY = 'bace.realtime.toast';

const TOAST_MAP: Record<string, (p: any) => string | null> = {
  'task:created': (p) => `📋 Task mới: ${p.title}`,
  'task:updated': (p) => `✅ Task cập nhật: ${p.title}`,
  'deal:created': (p) => `💼 Cơ hội mới: ${p.name}`,
  'deal:stage-changed': (p) => `🔄 Deal "${p.name}" → ${p.stage}`,
  'customer:created': (p) => `👤 Khách hàng mới: ${p.name}`,
  'customer:assigned': (p) => `👥 Đã gán ${p.count} khách cho ${p.assigneeName}`,
  'quote:accepted': (p) => `🎉 Báo giá "${p.quoteNumber}" đã được chốt thành công!`,
  'message:created': () => null,
  'message:updated': () => null,
  'message:deleted': () => null,
  'message:reaction': () => null,
  'user:typing': () => null,
  'room:read': () => null,
};

const ALL_EVENTS = Object.keys(TOAST_MAP);

function readToastSetting(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(TOAST_KEY) !== 'false';
}

type ToastBuffer = { count: number; lastPayload: any; timer: number | null; };
const toastBuffers = new Map<string, ToastBuffer>();

function pushToast(type: string, payload: any, enabled: boolean) {
  if (!enabled) return;
  const existing = toastBuffers.get(type);
  if (existing && existing.timer) {
    existing.count += 1;
    existing.lastPayload = payload;
    return;
  }

  const buffer: ToastBuffer = { count: 1, lastPayload: payload, timer: null };
  toastBuffers.set(type, buffer);

  buffer.timer = window.setTimeout(() => {
    const b = toastBuffers.get(type);
    if (!b) return;
    const msg = TOAST_MAP[type]?.(b.lastPayload);
    if (!msg) { toastBuffers.delete(type); return; }
    if (b.count > 1) {
      const prefix = msg.split(':')[0];
      toast.info(`${prefix}: ${b.count} mục mới`, { duration: 4000 });
    } else {
      toast.info(msg, { duration: 4000 });
    }
    toastBuffers.delete(type);
  }, 500);
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [connected, setConnected] = useState(false);
  const [toastEnabled, setToastEnabledState] = useState(true);
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());
  const esRef = useRef<EventSource | null>(null);
  const toastEnabledRef = useRef(true);

  useEffect(() => {
    const value = readToastSetting();
    setToastEnabledState(value);
    toastEnabledRef.current = value;
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== TOAST_KEY) return;
      const value = e.newValue !== 'false';
      setToastEnabledState(value);
      toastEnabledRef.current = value;
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setToastEnabled = useCallback((value: boolean) => {
    window.localStorage.setItem(TOAST_KEY, String(value));
    setToastEnabledState(value);
    toastEnabledRef.current = value;
  }, []);

  // ─── SSE Connection ──────────────────────────────────────────

  // ─── SSE Connection ──────────────────────────────────────────
  useEffect(() => {
    // Session hiện tại có dạng { user: SessionUser }
    if (!session?.user) {
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
      return;
    }

    const url = `${getApiBase()}/realtime/stream`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onerror = () => {
      setConnected(false);
    };

    const handlers = new Map<string, (event: Event) => void>();

    for (const type of ALL_EVENTS) {
      const handler = (event: Event) => {
        try {
          const data = JSON.parse(
            (event as MessageEvent).data,
          ) as RealtimeEvent;

          if (TOAST_MAP[type]?.(data.payload)) {
            pushToast(type, data.payload, toastEnabledRef.current);
          }

          listenersRef.current.get(type)?.forEach((fn) => fn(data));
        } catch (error) {
          console.error(`Không thể xử lý realtime event "${type}"`, error);
        }
      };

      handlers.set(type, handler);
      es.addEventListener(type, handler);
    }

    return () => {
      for (const [type, handler] of handlers) {
        es.removeEventListener(type, handler);
      }

      es.close();

      if (esRef.current === es) {
        esRef.current = null;
      }

      setConnected(false);
    };
  }, [session?.user]);


  const on = useCallback((type: string, listener: Listener) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type)!.add(listener);
    return () => {
      listenersRef.current.get(type)?.delete(listener);
    };
  }, []);
  const contextValue = useMemo(() => ({
    connected,
    toastEnabled,
    setToastEnabled,
    on
  }), [connected, toastEnabled, setToastEnabled, on]);

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}