'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  on: (type: string, listener: Listener) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  on: () => () => {},
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const TOAST_MAP: Record<string, (p: any) => string | null> = {
  'task:created': (p) => `📋 Task mới: ${p.title}`,
  'task:updated': (p) => `✅ Task cập nhật: ${p.title}`,
  'deal:created': (p) => `💼 Cơ hội mới: ${p.name}`,
  'deal:stage-changed': (p) => `🔄 Deal "${p.name}" → ${p.stage}`,
  'customer:created': (p) => `👤 Khách hàng mới: ${p.name}`,
};

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());
  const esRef = useRef<EventSource | null>(null);

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

    const knownEvents = Object.keys(TOAST_MAP);
    for (const type of knownEvents) {
      es.addEventListener(type, (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as RealtimeEvent;
          const msg = TOAST_MAP[type]?.(data.payload);
          if (msg) toast.info(msg, { duration: 4000 });
          const set = listenersRef.current.get(type);
          set?.forEach((fn) => fn(data));
        } catch {}
      });
    }

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [session]);

  function on(type: string, listener: Listener) {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type)!.add(listener);
    return () => {
      listenersRef.current.get(type)?.delete(listener);
    };
  }

  return (
    <RealtimeContext.Provider value={{ connected, on }}>
      {children}
    </RealtimeContext.Provider>
  );
}
