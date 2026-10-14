import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, scope } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { RealtimeService } from '../realtime/realtime.service';

// ═══════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════

class SendMessageDto {
  @IsString()
  roomId!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsIn(['text', 'file', 'system'])
  type?: 'text' | 'file' | 'system';

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsArray()
  attachments?: Array<{ name: string; url: string; mimeType: string; size: number }>;
}

class EditMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;
}

class ReactDto {
  @IsString()
  emoji!: string;
}

class CreateRoomDto {
  @IsIn(['dm', 'deal', 'customer'])
  type!: 'dm' | 'deal' | 'customer';

  @IsString()
  refId!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

class TypingDto {
  @IsString()
  roomId!: string;
}

// ═══════════════════════════════════════════════════════════
// CONTROLLER
// ═══════════════════════════════════════════════════════════

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  // ───────────────────────────────────────────────────────
  // GET /chat/rooms — Danh sách phòng
  // ───────────────────────────────────────────────────────
  @Get('rooms')
  async rooms(@CurrentUser() user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      // Lấy hết members của user hiện tại
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

      // Đếm unread cho từng phòng
      const rooms = await Promise.all(
        memberships.map(async (m) => {
          const room = m.room;
          const lastMessage = room.messages[0] ?? null;

          // Đếm tin chưa đọc = tin mới hơn lastReadAt và không phải của mình
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

      // Sort theo tin cuối
      rooms.sort((a, b) => {
        const aAt = a.lastMessage?.at || a.lastReadAt;
        const bAt = b.lastMessage?.at || b.lastReadAt;
        return bAt.localeCompare(aAt);
      });

      return { rooms };
    });
  }

  // ───────────────────────────────────────────────────────
  // GET /chat/rooms/:id/messages — Tin nhắn của phòng
  // ───────────────────────────────────────────────────────
  @Get('rooms/:id/messages')
  async messages(
    @CurrentUser() user: AuthUser,
    @Param('id') roomId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const take = Math.min(Number(limit) || 50, 100);

    return this.prisma.withTenant(user.tenantId, async (tx) => {
      // Verify member
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
          replyTo: {
            include: { sender: { select: { id: true, name: true } } },
          },
          attachments: true,
          reactions: { include: { user: { select: { id: true, name: true } } } },
          reads: { select: { userId: true, readAt: true } },
        },
      });

      return rows.reverse().map((m) => this.present(m));
    });
  }

  // ───────────────────────────────────────────────────────
  // POST /chat/messages — Gửi tin
  // ───────────────────────────────────────────────────────
  @Post('messages')
  async send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
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

      // Cập nhật lastReadAt cho sender
      await tx.chatMember.update({
        where: { id: member.id },
        data: { lastReadAt: new Date() },
      });

      // Update room.updatedAt
      await tx.chatRoom.update({
        where: { id: dto.roomId },
        data: { updatedAt: new Date() },
      });

      return msg;
    });

    const payload = this.present(created);

    // Emit cho toàn tenant
    this.realtime.emit('message:created', payload, { tenantId: user.tenantId });

    return payload;
  }

  // ───────────────────────────────────────────────────────
  // PATCH /chat/messages/:id — Sửa tin (trong 5 phút)
  // ───────────────────────────────────────────────────────
  @Patch('messages/:id')
  async edit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: EditMessageDto,
  ) {
    const updated = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const msg = await tx.message.findUnique({ where: { id } });
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

    const payload = this.present(updated);
    this.realtime.emit('message:updated', payload, { tenantId: user.tenantId });
    return payload;
  }

  // ───────────────────────────────────────────────────────
  // DELETE /chat/messages/:id — Xóa tin (soft delete)
  // ───────────────────────────────────────────────────────
  @Delete('messages/:id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const msg = await tx.message.findUnique({ where: { id } });
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

  // ───────────────────────────────────────────────────────
  // POST /chat/messages/:id/reactions — React
  // ───────────────────────────────────────────────────────
  @Post('messages/:id/reactions')
  async react(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReactDto,
  ) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const msg = await tx.message.findUnique({ where: { id } });
      if (!msg) throw new NotFoundException('Tin nhắn không tồn tại');

      // Toggle reaction
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

    const payload = this.present(result);
    this.realtime.emit('message:reaction', payload, { tenantId: user.tenantId });
    return payload;
  }

  // ───────────────────────────────────────────────────────
  // POST /chat/rooms — Tạo phòng (DM, deal, customer)
  // ───────────────────────────────────────────────────────
  @Post('rooms')
  async createRoom(@CurrentUser() user: AuthUser, @Body() dto: CreateRoomDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      let roomId: string;
      let roomName = dto.name || '';

      if (dto.type === 'dm') {
        // DM: roomId deterministic để 2 user luôn vào cùng phòng
        const ids = [user.sub, dto.refId].sort();
        roomId = `dm-${user.tenantId}-${ids[0]}-${ids[1]}`;

        // Kiểm tra đã tồn tại chưa
        const existing = await tx.chatRoom.findUnique({ where: { id: roomId } });
        if (existing) {
          return { id: existing.id, type: existing.type, name: existing.name };
        }

        // Lấy tên user kia
        const other = await tx.user.findFirst({
          where: scope(user.tenantId, { id: dto.refId }),
          select: { name: true },
        });
        roomName = other?.name || 'Chat';
      } else {
        // deal-{id} hoặc customer-{id}
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

      // Tạo room
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

      // Add members
      if (dto.type === 'dm') {
        await tx.chatMember.createMany({
          data: [
            { roomId, userId: user.sub },
            { roomId, userId: dto.refId },
          ],
        });
      } else {
        // deal/customer: add tất cả users trong tenant
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

  // ───────────────────────────────────────────────────────
  // POST /chat/rooms/:id/read — Đánh dấu đã đọc
  // ───────────────────────────────────────────────────────
  @Post('rooms/:id/read')
  async markRead(@CurrentUser() user: AuthUser, @Param('id') roomId: string) {
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

  // ───────────────────────────────────────────────────────
  // POST /chat/typing — Typing indicator
  // ───────────────────────────────────────────────────────
  @Post('typing')
  async typing(@CurrentUser() user: AuthUser, @Body() dto: TypingDto) {
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

  // ───────────────────────────────────────────────────────
  // GET /chat/users — Danh sách user để chat DM
  // ───────────────────────────────────────────────────────
  @Get('users')
  async users(@CurrentUser() user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const users = await tx.user.findMany({
        where: { tenantId: user.tenantId, id: { not: user.sub } },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' },
      });
      return users;
    });
  }

  // ───────────────────────────────────────────────────────
  // Helper — transform message
  // ───────────────────────────────────────────────────────
  private present(m: any) {
    // Group reactions: { emoji: { count, users: [...] } }
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
}

@Module({ controllers: [ChatController] })
export class ChatModule {}