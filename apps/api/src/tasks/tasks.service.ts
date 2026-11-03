import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AuthUser, owned, scope } from '../common/auth';
import { logActivity } from '../common/activity';
import { TaskDto, UpdateTaskDto } from './dto/tasks.dto';
import { PRIORITY, dueFlags } from './tasks.helper';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const rows = await tx.task.findMany({
        where: owned(user),
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      });
      const users = await tx.user.findMany({
        where: scope(user.tenantId),
        select: { id: true, name: true },
      });
      const names = new Map(users.map((item) => [item.id, item.name]));
      const customers = await tx.customer.findMany({
        where: scope(user.tenantId),
        select: { id: true, name: true },
      });
      const customerNames = new Map(customers.map((item) => [item.id, item.name]));

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        dueDate: row.dueDate ? row.dueDate.toISOString() : null,
        priority: row.priority,
        priorityLabel: PRIORITY[row.priority],
        status: row.status,
        done: row.status === 'done',
        assignedTo: row.assignedTo,
        assigneeName: row.assignedTo ? names.get(row.assignedTo) ?? null : null,
        ...dueFlags(row.status, row.dueDate),
        customer:
          row.relatedType === 'customer' && row.relatedId
            ? customerNames.get(row.relatedId) ?? 'Nội bộ'
            : 'Nội bộ',
        relatedType: row.relatedType,
        relatedId: row.relatedId,
      }));
    });
  }

  async create(user: AuthUser, dto: TaskDto) {
    const created = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const row = await tx.task.create({
        data: {
          tenantId: user.tenantId,
          title: dto.title.trim(),
          description: dto.description,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(),
          priority: dto.priority ?? 'medium',
          relatedType: dto.relatedType,
          relatedId: dto.relatedId,
          assignedTo: dto.assignedTo
            ? (await tx.user.findFirstOrThrow({ where: scope(user.tenantId, { id: dto.assignedTo }) })).id
            : user.sub,
          createdBy: user.sub,
        },
      });
      await logActivity(tx, user, {
        type: 'task',
        subject: 'Tạo công việc',
        content: row.title,
        relatedType: dto.relatedType,
        relatedId: dto.relatedId,
      });
      return row;
    });

    this.realtime.emit(
      'task:created',
      {
        id: created.id,
        title: created.title,
        priority: created.priority,
        assignedTo: created.assignedTo,
      },
      { tenantId: user.tenantId, userId: created.assignedTo ?? undefined },
    );

    return created;
  }

  async update(user: AuthUser, id: string, dto: UpdateTaskDto) {
    const updated = await this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.task.findFirstOrThrow({ where: owned(user, { id }) });

      const data: any = {};
      if (dto.title !== undefined) data.title = dto.title.trim();
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      if (dto.priority !== undefined) data.priority = dto.priority;
      if (dto.relatedType !== undefined) data.relatedType = dto.relatedType;
      if (dto.relatedId !== undefined) data.relatedId = dto.relatedId;
      if (dto.assignedTo !== undefined) data.assignedTo = dto.assignedTo || null;
      if (dto.status !== undefined) data.status = dto.status;

      return tx.task.update({ where: { id }, data });
    });

    this.realtime.emit(
      'task:updated',
      {
        id: updated.id,
        title: updated.title,
        status: updated.status,
      },
      { tenantId: user.tenantId, userId: updated.assignedTo ?? undefined },
    );

    return updated;
  }
}