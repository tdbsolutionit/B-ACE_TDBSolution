'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const TOAST_KEY = 'bace.realtime.toast';

const TOAST_MAP: Record<string, (p: any) => string | null> = {
  'task:created': (p) => `📋 Task mới: ${p.title}`,
  'task:updated': (p) => `✅ Task cập nhật: ${p.title}`,
  'deal:created': (p) => `💼 Cơ hội mới: ${p.name}`,
  'deal:stage-changed': (p) => `🔄 Deal "${p.name}" → ${p.stage}`,
  'customer:created': (p) => `👤 Khách hàng mới: ${p.name}`,
  // Chat events — chỉ listen, KHÔNG toast (để UI tự handle)
  'message:created': () => null,
  'message:updated': () => null,
  'message:deleted': () => null,
  'message:reaction': () => null,
  'user:typing': () => null,
  'room:read': () => null,
};

// Tất cả events cần đăng ký SSE listener
const ALL_EVENTS = Object.keys(TOAST_MAP);

// ─── Đọc setting từ localStorage ───────────────────────────────
function readToastSetting(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(TOAST_KEY) !== 'false';
}

// ─── Buffer để gộp toast khi nhiều event cùng lúc ──────────────
type ToastBuffer = {
  count: number;
  lastPayload: any;
  timer: number | null;
};
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

  // Đợi 500ms để gộp các event cùng loại
  buffer.timer = window.setTimeout(() => {
    const b = toastBuffers.get(type);
    if (!b) return;

    const msg = TOAST_MAP[type]?.(b.lastPayload);
    if (!msg) {
      toastBuffers.delete(type);
      return;
    }

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

  // Đọc setting lần đầu
  useEffect(() => {
    const value = readToastSetting();
    setToastEnabledState(value);
    toastEnabledRef.current = value;
  }, []);

  // Lắng nghe thay đổi setting từ tab khác
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
  useEffect(() => {
    if (!session) {
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
      return;
    }

    const token = session.accessToken;
    const url = `${API_BASE}/realtime/stream?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    for (const type of ALL_EVENTS) {
      es.addEventListener(type, (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as RealtimeEvent;

          // Toast (chỉ với events có trong TOAST_MAP trả string, không phải null)
          const toastFn = TOAST_MAP[type];
          const msg = toastFn ? toastFn(data.payload) : null;
          if (msg) {
            pushToast(type, data.payload, toastEnabledRef.current);
          }

          // Lưu vào activity feed (chỉ với events chính, không phải chat)
          if (!type.startsWith('message:') && !type.startsWith('user:') && !type.startsWith('room:')) {
            setEvents((prev) => {
              const item: ActivityItem = {
                id: `${data.at}-${Math.random()}`,
                type: data.type,
                payload: data.payload,
                at: data.at,
              };
              return [item, ...prev].slice(0, 30);
            });
          }

          // Custom listeners LUÔN chạy
          const set = listenersRef.current.get(type);
          set?.forEach((fn) => fn(data));
        } catch { }
      });
    }

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [session]);

  const on = useCallback((type: string, listener: Listener) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type)!.add(listener);
    return () => {
      listenersRef.current.get(type)?.delete(listener);
    };
  }, []);

  return (
    <RealtimeContext.Provider
      value={{ connected, toastEnabled, setToastEnabled, on }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
