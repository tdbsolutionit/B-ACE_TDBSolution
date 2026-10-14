'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: string;
  editedAt: string | null;
  createdAt: string;
  replyTo: {
    id: string;
    content: string;
    senderName: string;
  } | null;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  reactions: Record<string, { count: number; users: Array<{ id: string; name: string }> }>;
  reads: Array<{ userId: string; readAt: string }>;
};

export type ChatRoom = {
  id: string;
  name: string | null;
  type: 'general' | 'dm' | 'deal' | 'customer';
  refId: string | null;
  memberCount: number;
  members: Array<{ id: string; name: string; role: string }>;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    at: string;
  } | null;
  unreadCount: number;
  lastReadAt: string;
};

// ═══════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════

type ChatContextValue = {
  rooms: ChatRoom[];
  totalUnread: number;
  activeRoomId: string | null;
  messages: ChatMessage[];
  typingUsers: Map<string, string>; // userId → userName
  loading: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  setActiveRoom: (roomId: string | null) => void;
  sendMessage: (content: string, replyToId?: string) => Promise<void>;
  loadMessages: (roomId: string) => Promise<void>;
  markRead: (roomId: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const ChatContext = createContext<ChatContextValue>({
  rooms: [],
  totalUnread: 0,
  activeRoomId: null,
  messages: [],
  typingUsers: new Map(),
  loading: false,
  open: false,
  setOpen: () => {},
  setActiveRoom: () => {},
  sendMessage: async () => {},
  loadMessages: async () => {},
  markRead: async () => {},
  reactToMessage: async () => {},
  editMessage: async () => {},
  deleteMessage: async () => {},
  refresh: async () => {},
});

export function useChat() {
  return useContext(ChatContext);
}

// ═══════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { on } = useRealtime();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const typingTimeouts = useRef<Map<string, number>>(new Map());
  const activeRoomRef = useRef<string | null>(null);
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // ─── Load danh sách phòng ───────────────────────────────
   async function refresh() {
    if (!session) return;
    try {
      const res = await api<{ rooms: ChatRoom[] }>('/chat/rooms');
      setRooms(res.rooms);

      // Tự động chọn phòng đầu tiên — và SET CẢ REF
      if (!activeRoomRef.current && res.rooms.length > 0) {
        const firstRoomId = res.rooms[0].id;
        setActiveRoomId(firstRoomId);
        activeRoomRef.current = firstRoomId;   // ← THÊM DÒNG NÀY
        loadMessages(firstRoomId);              // ← THÊM: load tin luôn
      }
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (!session) {
      setRooms([]);
      setMessages([]);
      setActiveRoomId(null);
      return;
    }
    refresh();
  }, [session]);

  // ─── Load tin nhắn khi đổi phòng ────────────────────────
  async function loadMessages(roomId: string) {
    setLoading(true);
    try {
      const list = await api<ChatMessage[]>(`/chat/rooms/${roomId}/messages?limit=50`);
      setMessages(list);
      await markRead(roomId);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  function setActiveRoom(roomId: string | null) {
    setActiveRoomId(roomId);
    activeRoomRef.current = roomId;   // ← THÊM DÒNG NÀY
    if (roomId) loadMessages(roomId);
  }

  // ─── Gửi tin ────────────────────────────────────────────
  async function sendMessage(content: string, replyToId?: string) {
    if (!activeRoomId || !content.trim()) return;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      roomId: activeRoomId,
      senderId: session?.user.sub || '',
      senderName: session?.user.name || 'Bạn',
      content: content.trim(),
      type: 'text',
      editedAt: null,
      createdAt: new Date().toISOString(),
      replyTo: null,
      attachments: [],
      reactions: {},
      reads: [],
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const created = await api<ChatMessage>('/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ roomId: activeRoomId, content: content.trim(), replyToId }),
      });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? created : m)));
      refresh();
    } catch (err) {
      // Rollback
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      throw err;
    }
  }

  // ─── Đánh dấu đã đọc ────────────────────────────────────
  async function markRead(roomId: string) {
    try {
      await api(`/chat/rooms/${roomId}/read`, { method: 'POST' });
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r)),
      );
    } catch {
      // silent
    }
  }

  // ─── React ──────────────────────────────────────────────
  async function reactToMessage(messageId: string, emoji: string) {
    try {
      await api(`/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
    } catch {
      // silent
    }
  }

  // ─── Edit ───────────────────────────────────────────────
  async function editMessage(messageId: string, content: string) {
    try {
      await api(`/chat/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
    } catch {
      // silent
    }
  }

  // ─── Delete ─────────────────────────────────────────────
  async function deleteMessage(messageId: string) {
    try {
      await api(`/chat/messages/${messageId}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      // silent
    }
  }

  // ─── Realtime listeners ─────────────────────────────────
  useEffect(() => {
    if (!session) return;

    const unsub1 = on('message:created', (event) => {
      const msg = event.payload as ChatMessage;
      if (!msg) return;

      console.log('[chat] message:created', {
    msgRoom: msg.roomId,
    currentRoom: activeRoomRef.current,
    matches: activeRoomRef.current === msg.roomId,
  });

      // Nếu đang mở đúng phòng → append
      if (activeRoomRef.current === msg.roomId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
               // Auto-mark read nếu chat đang mở
        if (openRef.current) markRead(msg.roomId);
      }

      refresh();
    });

    const unsub2 = on('message:updated', (event) => {
      const msg = event.payload as ChatMessage;
      if (!msg) return;
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    });

    const unsub3 = on('message:deleted', (event) => {
      const { id } = event.payload as { id: string };
      setMessages((prev) => prev.filter((m) => m.id !== id));
      refresh();
    });

    const unsub4 = on('message:reaction', (event) => {
      const msg = event.payload as ChatMessage;
      if (!msg) return;
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    });

    const unsub5 = on('user:typing', (event) => {
      const { roomId, userId, userName } = event.payload as {
        roomId: string;
        userId: string;
        userName: string;
      };
      if (userId === session.user.sub) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(userId, userName);
        return next;
      });

      // Clear sau 3s
      const key = `typing-${userId}`;
      const existing = typingTimeouts.current.get(key);
      if (existing) window.clearTimeout(existing);

      const timeout = window.setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
        typingTimeouts.current.delete(key);
      }, 3000);
      typingTimeouts.current.set(key, timeout);
    });

    const unsub6 = on('room:read', () => {
      // Có thể update sau
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      // Clear all timeouts
      typingTimeouts.current.forEach((t) => window.clearTimeout(t));
      typingTimeouts.current.clear();
    };
  }, [session, on]);

  // Tổng số tin chưa đọc
  const totalUnread = rooms.reduce((sum, r) => sum + r.unreadCount, 0);

  return (
    <ChatContext.Provider
      value={{
        rooms,
        totalUnread,
        activeRoomId,
        messages,
        typingUsers,
        loading,
        open,
        setOpen,
        setActiveRoom,
        sendMessage,
        loadMessages,
        markRead,
        reactToMessage,
        editMessage,
        deleteMessage,
        refresh,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
