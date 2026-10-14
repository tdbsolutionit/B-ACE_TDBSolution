import { Body, Controller, Get, Module, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, owned, scope } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { logActivity } from '../common/activity';
import { RealtimeService } from '../realtime/realtime.service';

class TaskDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsString()
  relatedId?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}

class TaskStatusDto {
  @IsIn(['pending', 'done'])
  status!: 'pending' | 'done';
}

const PRIORITY = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function dueFlags(status: string, dueDate: Date | null) {
  if (status !== 'pending' || !dueDate) return { overdue: false, dueToday: false, dueTomorrow: false };
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = startOfToday().getTime();
  const day = 24 * 60 * 60 * 1000;
  return {
    overdue: due.getTime() < today,
    dueToday: due.getTime() === today,
    dueTomorrow: due.getTime() === today + day,
  };
}

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const rows = await tx.task.findMany({
        where: owned(user),
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      });
      const users = await tx.user.findMany({ where: scope(user.tenantId), select: { id: true, name: true } });
      const names = new Map(users.map((item) => [item.id, item.name]));
      const customers = await tx.customer.findMany({ where: scope(user.tenantId), select: { id: true, name: true } });
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
        customer: row.relatedType === 'customer' && row.relatedId ? customerNames.get(row.relatedId) ?? 'Nội bộ' : 'Nội bộ',
      }));
    });
  }

    @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: TaskDto) {
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

    // Emit sau khi transaction thành công
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

  @Patch(':id')
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: TaskStatusDto) {
    const updated = await this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.task.findFirstOrThrow({ where: owned(user, { id }) });
      return tx.task.update({ where: { id }, data: { status: dto.status } });
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

@Module({ controllers: [TasksController] })
export class TasksModule {}
