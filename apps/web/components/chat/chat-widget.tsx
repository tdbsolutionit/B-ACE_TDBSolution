'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  Send,
  X,
  Hash,
  User as UserIcon,
  ChevronLeft,
} from 'lucide-react';
import { useChat } from '@/lib/chat';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/utils';

export function ChatWidget() {
  const { session } = useAuth();
  const {
    rooms,
    totalUnread,
    activeRoomId,
    messages,
    loading,
    open,
    setOpen,
    setActiveRoom,
    sendMessage,
    typingUsers,
  } = useChat();

  const [input, setInput] = useState('');
  const [showRoomList, setShowRoomList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  // Bảo đảm không có tin nhắn trùng ID gây lỗi duplicate key React
  const uniqueMessages = Array.from(new Map(messages.map((m) => [m.id, m])).values());

  // Auto scroll xuống tin mới nhất
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input khi mở
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function handleSend() {
    const content = input.trim();
    if (!content) return;
    setInput('');
    try {
      await sendMessage(content);
    } catch {
      // rollback đã xử lý trong context
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!session) return null;

  // ─── Bubble chưa mở ─────────────────────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Mở chat"
      >
        <MessageCircle size={24} />
        {totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white ring-2 ring-background">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
    );
  }

  // ─── Panel mở ───────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2">
          {!showRoomList && activeRoom && (
            <button
              type="button"
              onClick={() => setShowRoomList(true)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              aria-label="Quay lại danh sách"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <MessageCircle size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {showRoomList ? 'Chat nội bộ' : activeRoom?.name || 'Chat'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {showRoomList
                ? `${rooms.length} phòng`
                : `${activeRoom?.memberCount || 0} thành viên`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          aria-label="Đóng chat"
        >
          <X size={16} />
        </button>
      </header>

      {/* Body */}
      {showRoomList ? (
        <RoomList onPick={(roomId) => {
          setActiveRoom(roomId);
          setShowRoomList(false);
        }} />
      ) : (
        <>
          {/* Messages */}
          <div className="subtle-scrollbar flex-1 overflow-y-auto bg-muted/20 px-4 py-3">
            {loading && (
              <p className="py-8 text-center text-xs text-muted-foreground">Đang tải…</p>
            )}

            {!loading && uniqueMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle size={22} className="text-primary" />
                </div>
                <p className="text-xs font-medium">Chưa có tin nhắn</p>
                <p className="text-[10px] text-muted-foreground">
                  Hãy bắt đầu cuộc trò chuyện
                </p>
              </div>
            )}

            {uniqueMessages.map((m, idx) => {
              const isMine = m.senderId === session.user.sub;
              const prev = uniqueMessages[idx - 1];
              const showAvatar = !prev || prev.senderId !== m.senderId;

              return (
                <div
                  key={m.id}
                  className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'} ${
                    showAvatar ? 'mt-3' : 'mt-0.5'
                  }`}
                >
                  {!isMine && (
                    <div className="w-7 shrink-0">
                      {showAvatar && (
                        <div className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                          {initials(m.senderName)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    {showAvatar && !isMine && (
                      <p className="mb-1 px-1 text-[10px] font-medium text-muted-foreground">
                        {m.senderName}
                      </p>
                    )}

                    <div
                      className={`group relative rounded-2xl px-3 py-2 text-sm ${
                        isMine
                          ? 'rounded-br-sm bg-primary text-primary-foreground'
                          : 'rounded-bl-sm bg-card shadow-sm'
                      }`}
                    >
                      {/* Reply quote */}
                      {m.replyTo && (
                        <div
                          className={`mb-1.5 border-l-2 pl-2 text-[11px] ${
                            isMine
                              ? 'border-primary-foreground/40 text-primary-foreground/80'
                              : 'border-primary/40 text-muted-foreground'
                          }`}
                        >
                          <p className="font-semibold">{m.replyTo.senderName}</p>
                          <p className="line-clamp-1">{m.replyTo.content}</p>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap break-words">{m.content}</p>

                      {/* Reactions */}
                      {Object.keys(m.reactions).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {Object.entries(m.reactions).map(([emoji, data]) => (
                            <span
                              key={emoji}
                              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                                isMine
                                  ? 'bg-primary-foreground/20'
                                  : 'bg-muted'
                              }`}
                            >
                              {emoji} {data.count}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Edit indicator */}
                      {m.editedAt && (
                        <span className={`ml-2 text-[9px] ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          (đã sửa)
                        </span>
                      )}
                    </div>

                    <p className={`mt-0.5 px-1 text-[9px] text-muted-foreground ${isMine ? 'text-right' : ''}`}>
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingUsers.size > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-muted">
                  <span className="text-[10px]">...</span>
                </div>
                <p className="text-[10px] italic text-muted-foreground">
                  {Array.from(typingUsers.values()).join(', ')} đang gõ…
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card px-3 py-2.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn… (Enter để gửi)"
                rows={1}
                className="max-h-24 min-h-[38px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                aria-label="Gửi"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RoomList
// ═══════════════════════════════════════════════════════════

function RoomList({ onPick }: { onPick: (roomId: string) => void }) {
  const { rooms } = useChat();

  if (rooms.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-center text-xs text-muted-foreground">
          Chưa có phòng chat nào
        </p>
      </div>
    );
  }

  return (
    <div className="subtle-scrollbar flex-1 overflow-y-auto">
      {rooms.map((room) => {
        const Icon = room.type === 'general' ? Hash : UserIcon;
        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onPick(room.id)}
            className="flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">
                  {room.name || 'Chat'}
                </p>
                {room.unreadCount > 0 && (
                  <span className="shrink-0 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {room.unreadCount > 9 ? '9+' : room.unreadCount}
                  </span>
                )}
              </div>
              {room.lastMessage ? (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  <strong className="font-medium">{room.lastMessage.senderName}:</strong>{' '}
                  {room.lastMessage.content}
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                  Chưa có tin nhắn
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60_000) return 'vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}p trước`;

  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}