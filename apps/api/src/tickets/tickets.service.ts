import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, scope } from '../common/auth';
import { CreateTicketDto, UpdateTicketDto } from './dto/tickets.dto';
import { logActivity } from '../common/activity';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, customerId?: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      return tx.ticket.findMany({
        where: scope(user.tenantId, { ...(customerId ? { customerId } : {}) }),
        include: { 
          customer: { select: { id: true, name: true, company: true } },
          department: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async get(user: AuthUser, id: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: scope(user.tenantId, { id }),
        include: {
          customer: true,
          department: true,
        },
      });

      if (!ticket) throw new NotFoundException('Không tìm thấy ticket');

      const users = await tx.user.findMany({
        where: scope(user.tenantId),
        select: { id: true, name: true },
      });
      const names = new Map(users.map((u) => [u.id, u.name]));

      const activities = await tx.activity.findMany({
        where: scope(user.tenantId, { relatedType: 'ticket', relatedId: id }),
        orderBy: { createdAt: 'desc' },
      });

      return {
        ...ticket,
        assigneeName: ticket.assignedTo ? names.get(ticket.assignedTo) : null,
        activities: activities.map(a => ({
          ...a,
          owner: a.userId ? names.get(a.userId) : null,
        })),
      };
    });
  }

  async create(user: AuthUser, dto: CreateTicketDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({ where: scope(user.tenantId, { id: dto.customerId }) });
      if (!customer) throw new NotFoundException('Không tìm thấy khách hàng');

      const count = await tx.ticket.count({ where: scope(user.tenantId) });
      const code = `TK-${String(count + 1).padStart(4, '0')}`;

      const ticket = await tx.ticket.create({
        data: {
          tenantId: user.tenantId,
          customerId: dto.customerId,
          departmentId: dto.departmentId,
          code,
          title: dto.title,
          description: dto.description,
          priority: dto.priority ?? 'medium',
          assignedTo: dto.assignedTo,
          createdBy: user.sub,
        },
        include: { 
          customer: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } }
        },
      });

      await logActivity(tx, user, {
        type: 'note',
        subject: 'Tạo ticket',
        content: ticket.title,
        relatedType: 'ticket',
        relatedId: ticket.id,
      });

      return ticket;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateTicketDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const ticket = await tx.ticket.findFirst({ where: scope(user.tenantId, { id }) });
      if (!ticket) throw new NotFoundException('Không tìm thấy ticket');

      const data: any = {};
      if (dto.title !== undefined) data.title = dto.title;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.priority !== undefined) data.priority = dto.priority;
      if (dto.departmentId !== undefined) data.departmentId = dto.departmentId || null;
      if (dto.assignedTo !== undefined) data.assignedTo = dto.assignedTo || null;
      if (dto.status !== undefined) {
        data.status = dto.status;
        if (dto.status === 'closed') data.closedAt = new Date();
        else data.closedAt = null;
      }

      const updated = await tx.ticket.update({ 
        where: { id }, 
        data,
        include: {
          customer: true,
          department: true,
        }
      });

      if (dto.status && dto.status !== ticket.status) {
        await logActivity(tx, user, {
          type: 'note',
          subject: 'Cập nhật trạng thái ticket',
          content: `Đổi trạng thái sang ${dto.status}`,
          relatedType: 'ticket',
          relatedId: ticket.id,
        });
      }

      return updated;
    });
  }
}