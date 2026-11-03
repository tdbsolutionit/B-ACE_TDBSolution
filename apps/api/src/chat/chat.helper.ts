export function formatMessagePayload(m: any) {
  const reactions: Record<string, { count: number; users: Array<{ id: string; name: string }> }> = {};
  for (const r of m.reactions ?? []) {
    if (!reactions[r.emoji]) reactions[r.emoji] = { count: 0, users: [] };
    reactions[r.emoji].count += 1;
    reactions[r.emoji].users.push({ id: r.user.id, name: r.user.name });
  }

  return {
    id: m.id,
    roomId: m.roomId,
    senderId: m.senderId,
    senderName: m.sender?.name ?? 'Unknown',
    content: m.content,
    type: m.type,
    editedAt: m.editedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          content: m.replyTo.content,
          senderName: m.replyTo.sender?.name ?? 'Unknown',
        }
      : null,
    attachments: (m.attachments ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      mimeType: a.mimeType,
      size: a.size,
    })),
    reactions,
    reads: (m.reads ?? []).map((r: any) => ({
      userId: r.userId,
      readAt: r.readAt.toISOString(),
    })),
  };
}