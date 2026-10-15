import { RealtimeService } from '../realtime/realtime.service';
import { BadRequestException, Body, Controller, Delete, Get, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, owned, scope } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { logActivity } from '../common/activity';

class OpportunityDto {
  @IsString()
  name!: string;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class MoveDto {
  @IsString()
  stageId!: string;

  @IsOptional()
  @IsString()
  lostReason?: string;
}

class OpportunityPatchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

function present(row: {
  id: string;
  name: string;
  customerId: string;
  value: { toString(): string } | number;
  probability: number;
  expectedCloseDate: Date | null;
  status: string;
  description: string | null;
  lostReason: string | null;
  customer: { name: string };
  stage: { id: string; name: string; color: string };
  assignedTo: string | null;
}, names: Map<string, string>) {
  return {
    id: row.id,
    code: (row as any).code ?? null,
    name: row.name,
    customerId: row.customerId,
    customer: row.customer.name,
    stageId: row.stage.id,
    stage: row.stage.name,
    stageColor: row.stage.color,
    value: Number(row.value),
    probability: row.probability,
    closeDate: row.expectedCloseDate ? row.expectedCloseDate.toISOString().slice(0, 10) : '',
    status: row.status,
    isLead: row.stage.name === 'Lead mới',
    owner: row.assignedTo ? names.get(row.assignedTo) ?? '' : '',
    description: row.description,
    lostReason: row.lostReason,
  };
}

@ApiTags('opportunities')
@ApiBearerAuth()
@Controller('opportunities')
export class OpportunitiesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  @Get('stages')
  stages(@CurrentUser() user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.stage.findMany({
        where: scope(user.tenantId),
        orderBy: { orderIndex: 'asc' },
      }),
    );
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string, @Query('customerId') customerId?: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const rows = await tx.opportunity.findMany({
        where: owned(user, {
          ...(customerId ? { customerId } : {}),
          ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
        }),
        include: { customer: true, stage: true },
        orderBy: { updatedAt: 'desc' },
      });
      const names = await this.names(tx, user.tenantId);
      return rows.map((row) => present(row, names));
    });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const row = await tx.opportunity.findFirst({
        where: owned(user, { id }),
        include: { customer: true, stage: true, quotes: { orderBy: { createdAt: 'desc' } } },
      });
      if (!row) return null;
      const names = await this.names(tx, user.tenantId);
      const activities = await tx.activity.findMany({
        where: scope(user.tenantId, { relatedType: 'opportunity', relatedId: id }),
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      return {
        ...present(row, names),
        quotes: row.quotes.map((quote) => ({
          id: quote.id,
          kind: quote.kind,
          number: quote.quoteNumber,
          title: quote.title,
          status: quote.status,
          price: Number(quote.sellingPrice),
          date: quote.createdAt.toISOString().slice(0, 10),
        })),
        activities: activities.map((item) => ({
          id: item.id,
          subject: item.subject,
          content: item.content,
          createdAt: item.createdAt.toISOString().slice(0, 10),
          owner: item.userId ? names.get(item.userId) ?? '' : '',
        })),
      };
    });
  }

    @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: OpportunityDto) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.customer.findFirstOrThrow({ where: scope(user.tenantId, { id: dto.customerId }) });
      const stage = dto.stageId
        ? await tx.stage.findFirstOrThrow({ where: scope(user.tenantId, { id: dto.stageId }) })
        : await tx.stage.findFirstOrThrow({ where: scope(user.tenantId), orderBy: { orderIndex: 'asc' } });
      const created = await tx.opportunity.create({
        data: {
          tenantId: user.tenantId,
          name: dto.name.trim(),
          customerId: dto.customerId,
          stageId: stage.id,
          value: dto.value ?? 0,
          probability: dto.probability ?? 0,
          expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
          description: dto.description,
          status: stage.isWon ? 'won' : stage.isLost ? 'lost' : 'open',
          assignedTo: user.sub,
          createdBy: user.sub,
        },
        include: { customer: true, stage: true },
      });
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Tạo dự án',
        content: created.name,
        relatedType: 'opportunity',
        relatedId: created.id,
      });
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Tạo dự án',
        content: created.name,
        relatedType: 'customer',
        relatedId: created.customerId,
      });
      return present(created, new Map([[user.sub, user.name]]));
    });

    this.realtime.emit(
      'deal:created',
      {
        id: result.id,
        name: result.name,
        value: result.value,
        customer: result.customer,
      },
      { tenantId: user.tenantId },
    );

    return result;
  }

  @Patch(':id/stage')
  async move(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MoveDto) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const stage = await tx.stage.findFirstOrThrow({ where: scope(user.tenantId, { id: dto.stageId }) });
      const current = await tx.opportunity.findFirstOrThrow({ where: owned(user, { id }) });
      if (stage.isLost && !dto.lostReason?.trim()) {
        throw new BadRequestException('Cần lý do thua');
      }
      const updated = await tx.opportunity.update({
        where: { id: current.id },
        data: {
          stageId: stage.id,
          status: stage.isWon ? 'won' : stage.isLost ? 'lost' : 'open',
          probability: stage.isWon ? 100 : stage.isLost ? 0 : undefined,
          lostReason: stage.isLost ? dto.lostReason?.trim() : null,
        },
        include: { customer: true, stage: true },
      });
      await logActivity(tx, user, {
        type: 'note',
        subject: `Chuyển giai đoạn ${stage.name}`,
        content: stage.isLost ? dto.lostReason?.trim() : updated.name,
        relatedType: 'opportunity',
        relatedId: updated.id,
      });
      return present(updated, await this.names(tx, user.tenantId));
    });

    this.realtime.emit(
      'deal:stage-changed',
      {
        id: result.id,
        name: result.name,
        stage: result.stage,
        stageColor: result.stageColor,
        status: result.status,
        value: Number(result.value) || 0,
        owner: result.owner,
      },
      { tenantId: user.tenantId },
    );

    return result;
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: OpportunityPatchDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const current = await tx.opportunity.findFirstOrThrow({ where: owned(user, { id }) });
      const stage = dto.stageId
        ? await tx.stage.findFirstOrThrow({ where: scope(user.tenantId, { id: dto.stageId }) })
        : null;
      const updated = await tx.opportunity.update({
        where: { id: current.id },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.value !== undefined ? { value: dto.value } : {}),
          ...(dto.probability !== undefined ? { probability: dto.probability } : {}),
          ...(dto.expectedCloseDate ? { expectedCloseDate: new Date(dto.expectedCloseDate) } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(stage
            ? { stageId: stage.id, status: stage.isWon ? 'won' : stage.isLost ? 'lost' : 'open' }
            : {}),
        },
        include: { customer: true, stage: true },
      });
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Cập nhật dự án',
        content: updated.name,
        relatedType: 'opportunity',
        relatedId: updated.id,
      });
      return present(updated, await this.names(tx, user.tenantId));
    });
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.prisma.withTenant(user.tenantId, async (tx) => {
      const current = await tx.opportunity.findFirstOrThrow({ where: owned(user, { id }) });
      await tx.opportunity.delete({ where: { id: current.id } });
    });
    return { ok: true };
  }

  private async names(tx: PrismaClient, tenantId: string) {
    const users = await tx.user.findMany({
      where: scope(tenantId),
      select: { id: true, name: true },
    });
    return new Map(users.map((item) => [item.id, item.name]));
  }
}

@Module({ controllers: [OpportunitiesController] })
export class OpportunitiesModule {}
