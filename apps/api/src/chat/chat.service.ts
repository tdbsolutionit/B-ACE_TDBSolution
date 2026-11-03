import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AuthUser, scope } from '../common/auth';
import { SendMessageDto, EditMessageDto, ReactDto, CreateRoomDto, TypingDto } from './dto/chat.dto';
import { formatMessagePayload } from './chat.helper';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async rooms(user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const memberships = await tx.chatMember.findMany({
        where: { userId: user.sub },
        include: {
          room: {
            include: {
              members: { include: { user: { select: { id: true, name: true, role: true } } } },
              messages: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { sender: { select: { id: true, name: true } } },
              },
            },
          },
        },
      });

      const rooms = await Promise.all(
        memberships.map(async (m) => {
          const room = m.room;
          const lastMessage = room.messages[0] ?? null;
          const unreadCount = await tx.message.count({
            where: {
              roomId: room.id,
              createdAt: { gt: m.lastReadAt },
              senderId: { not: user.sub },
              deletedAt: null,
            },
          });

          return {
            id: room.id,
            name: room.name,
            type: room.type,
            refId: room.refId,
            memberCount: room.members.length,
            members: room.members.map((mm) => ({
              id: mm.user.id,
              name: mm.user.name,
              role: mm.user.role,
            })),
            lastMessage: lastMessage
              ? {
                  id: lastMessage.id,
                  content: lastMessage.content,
                  senderId: lastMessage.senderId,
                  senderName: lastMessage.sender.name,
                  at: lastMessage.createdAt.toISOString(),
                }
              : null,
            unreadCount,
            lastReadAt: m.lastReadAt.toISOString(),
          };
        }),
      );

      rooms.sort((a, b) => {
        const aAt = a.lastMessage?.at || a.lastReadAt;
        const bAt = b.lastMessage?.at || b.lastReadAt;
        return bAt.localeCompare(aAt);
      });

      return { rooms };
    });
  }

  async messages(user: AuthUser, roomId: string, limit?: string, before?: string) {
    const take = Math.min(Number(limit) || 50, 100);

    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const member = await tx.chatMember.findUnique({
        where: { roomId_userId: { roomId, userId: user.sub } },
      });
      if (!member) throw new ForbiddenException('Không có quyền truy cập phòng này');

      const rows = await tx.message.findMany({
        where: {
          roomId,
          deletedAt: null,
          ...(before ? { createdAt: { lt: new Date(before) } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          sender: { select: { id: true, name: true } },
          replyTo: { include: { sender: { select: { id: true, name: true } } } },
          attachments: true,
          reactions: { include: { user: { select: { id: true, name: true } } } },
          reads: { select: { userId: true, readAt: true } },
        },
      });

      return rows.reverse().map((m) => formatMessagePayload(m));
    });
  }

  async send(user: AuthUser, dto: SendMessageDto) {
    const created = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const member = await tx.chatMember.findUnique({
        where: { roomId_userId: { roomId: dto.roomId, userId: user.sub } },
      });
      if (!member) throw new ForbiddenException('Không có quyền gửi vào phòng này');

      const msg = await tx.message.create({
        data: {
          tenantId: user.tenantId,
          roomId: dto.roomId,
          senderId: user.sub,
          content: dto.content.trim(),
          type: dto.type ?? 'text',
          replyToId: dto.replyToId,
          ...(dto.attachments?.length
            ? {
                attachments: {
                  create: dto.attachments.map((a) => ({
                    name: a.name,
                    url: a.url,
                    mimeType: a.mimeType,
                    size: a.size,
                  })),
                },
              }
            : {}),
        },
        include: {
          sender: { select: { id: true, name: true } },
          replyTo: { include: { sender: { select: { id: true, name: true } } } },
          attachments: true,
          reactions: true,
          reads: true,
        },
      });

      await tx.chatMember.update({
        where: { id: member.id },
        data: { lastReadAt: new Date() },
      });

      await tx.chatRoom.update({
        where: { id: dto.roomId },
        data: { updatedAt: new Date() },
      });

      return msg;
    });

    const payload = formatMessagePayload(created);
    this.realtime.emit('message:created', payload, { tenantId: user.tenantId });
    return payload;
  }

  async edit(user: AuthUser, id: string, dto: EditMessageDto) {
    const updated = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const msg = await tx.message.findFirst({
        where: { id, tenantId: user.tenantId },  
      });
      if (!msg) throw new NotFoundException('Tin nhắn không tồn tại');
      if (msg.senderId !== user.sub) throw new ForbiddenException('Chỉ sửa tin của mình');

      const ageMs = Date.now() - msg.createdAt.getTime();
      if (ageMs > 5 * 60 * 1000) {
        throw new BadRequestException('Chỉ sửa được trong 5 phút');
      }

      return tx.message.update({
        where: { id },
        data: { content: dto.content.trim(), editedAt: new Date() },
        include: {
          sender: { select: { id: true, name: true } },
          replyTo: { include: { sender: { select: { id: true, name: true } } } },
          attachments: true,
          reactions: { include: { user: { select: { id: true, name: true } } } },
          reads: true,
        },
      });
    });

    const payload = formatMessagePayload(updated);
    this.realtime.emit('message:updated', payload, { tenantId: user.tenantId });
    return payload;
  }

  async remove(user: AuthUser, id: string) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const msg = await tx.message.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!msg) throw new NotFoundException('Tin nhắn không tồn tại');
      if (msg.senderId !== user.sub && user.role !== 'admin') {
        throw new ForbiddenException('Không có quyền xóa');
      }

      return tx.message.update({
        where: { id },
        data: { deletedAt: new Date(), content: '' },
      });
    });

    this.realtime.emit(
      'message:deleted',
      { id: result.id, roomId: result.roomId },
      { tenantId: user.tenantId },
    );

    return { ok: true };
  }

  async react(user: AuthUser, id: string, dto: ReactDto) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const msg = await tx.message.findFirst({
        where: { id, tenantId: user.tenantId },  
      });
      if (!msg) throw new NotFoundException('Tin nhắn không tồn tại');

      const existing = await tx.reaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId: id,
            userId: user.sub,
            emoji: dto.emoji,
          },
        },
      });

      if (existing) {
        await tx.reaction.delete({ where: { id: existing.id } });
      } else {
        await tx.reaction.create({
          data: { messageId: id, userId: user.sub, emoji: dto.emoji },
        });
      }

      const message = await tx.message.findUnique({
        where: { id },
        include: {
          sender: { select: { id: true, name: true } },
          replyTo: { include: { sender: { select: { id: true, name: true } } } },
          attachments: true,
          reactions: { include: { user: { select: { id: true, name: true } } } },
          reads: true,
        },
      });

      return message!;
    });

    const payload = formatMessagePayload(result);
    this.realtime.emit('message:reaction', payload, { tenantId: user.tenantId });
    return payload;
  }

  async createRoom(user: AuthUser, dto: CreateRoomDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      let roomId: string;
      let roomName = dto.name || '';

      if (dto.type === 'dm') {
        const ids = [user.sub, dto.refId].sort();
        roomId = `dm-${user.tenantId}-${ids[0]}-${ids[1]}`;

        const existing = await tx.chatRoom.findUnique({ where: { id: roomId } });
        if (existing) {
          return { id: existing.id, type: existing.type, name: existing.name };
        }

        const other = await tx.user.findFirst({
          where: scope(user.tenantId, { id: dto.refId }),
          select: { name: true },
        });
        roomName = other?.name || 'Chat';
      } else {
        roomId = `${dto.type}-${user.tenantId}-${dto.refId}`;

        const existing = await tx.chatRoom.findUnique({ where: { id: roomId } });
        if (existing) {
          return { id: existing.id, type: existing.type, name: existing.name };
        }

        if (!roomName) {
          if (dto.type === 'deal') {
            const deal = await tx.opportunity.findUnique({
              where: { id: dto.refId },
              select: { name: true },
            });
            roomName = deal ? `Deal: ${deal.name}` : 'Deal';
          } else {
            const c = await tx.customer.findUnique({
              where: { id: dto.refId },
              select: { name: true },
            });
            roomName = c ? `KH: ${c.name}` : 'Khách hàng';
          }
        }
      }

      const room = await tx.chatRoom.create({
        data: {
          id: roomId,
          tenantId: user.tenantId,
          name: roomName,
          type: dto.type,
          refId: dto.refId,
          createdBy: user.sub,
        },
      });

      if (dto.type === 'dm') {
        await tx.chatMember.createMany({
          data: [
            { roomId, userId: user.sub },
            { roomId, userId: dto.refId },
          ],
        });
      } else {
        const allUsers = await tx.user.findMany({
          where: scope(user.tenantId),
          select: { id: true },
        });
        await tx.chatMember.createMany({
          data: allUsers.map((u) => ({ roomId, userId: u.id })),
        });
      }

      return { id: room.id, type: room.type, name: room.name };
    });
  }

  async markRead(user: AuthUser, roomId: string) {
    await this.prisma.withTenant(user.tenantId, async (tx) => {
      const member = await tx.chatMember.findUnique({
        where: { roomId_userId: { roomId, userId: user.sub } },
      });
      if (!member) return;

      await tx.chatMember.update({
        where: { id: member.id },
        data: { lastReadAt: new Date() },
      });
    });

    this.realtime.emit(
      'room:read',
      { roomId, userId: user.sub },
      { tenantId: user.tenantId },
    );

    return { ok: true };
  }

  async typing(user: AuthUser, dto: TypingDto) {
    this.realtime.emit(
      'user:typing',
      {
        roomId: dto.roomId,
        userId: user.sub,
        userName: user.name,
      },
      { tenantId: user.tenantId },
    );
    return { ok: true };
  }

  async users(user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      return tx.user.findMany({
        where: { tenantId: user.tenantId, id: { not: user.sub } },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' },
      });
    });
  }
}