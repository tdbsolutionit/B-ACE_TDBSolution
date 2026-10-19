import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, owned, scope } from '../common/auth';
import { logActivity } from '../common/activity';
import { RealtimeService } from '../realtime/realtime.service';
import { OpportunityDto, OpportunityPatchDto, MoveDto } from './dto/opportunity.dto';

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async getStages(user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.stage.findMany({
        where: scope(user.tenantId),
        orderBy: { orderIndex: 'asc' },
      }),
    );
  }

  async findAll(user: AuthUser, q?: string, customerId?: string) {
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
      return rows.map((row) => this.present(row, names));
    });
  }

  async findOne(user: AuthUser, id: string) {
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
        ...this.present(row, names),
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

  async create(user: AuthUser, dto: OpportunityDto) {
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
      return this.present(created, new Map([[user.sub, user.name]]));
    });

    this.realtime.emit(
      'deal:created',
      { id: result.id, name: result.name, value: result.value, customer: result.customer },
      { tenantId: user.tenantId },
    );

    return result;
  }

  async importOpportunities(user: AuthUser, rows: any[]) {
    if (!rows || !Array.isArray(rows)) {
      throw new BadRequestException('Dữ liệu import không hợp lệ');
    }

    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const customers = await tx.customer.findMany({ where: scope(user.tenantId) });
      const stages = await tx.stage.findMany({
        where: scope(user.tenantId),
        orderBy: { orderIndex: 'asc' }
      });

      if (stages.length === 0) {
        throw new BadRequestException('Hệ thống chưa có giai đoạn nào. Vui lòng tạo giai đoạn trước khi import.');
      }

      let createdCount = 0;
      const skipped = [];

      for (const row of rows) {
        try {
          const customerName = String(row.customerName || '').trim().toLowerCase();
          const customer = customers.find(c => c.name.trim().toLowerCase() === customerName);

          if (!customer) {
            skipped.push({ name: row.name, reason: `Không tìm thấy khách hàng: ${row.customerName}` });
            continue;
          }

          const stageName = String(row.stageName || '').trim().toLowerCase();
          const stage = stages.find(s => s.name.trim().toLowerCase() === stageName) || stages[0];

          let closeDate = null;
          if (row.closeDate) {
            const parsedDate = new Date(row.closeDate);
            if (!isNaN(parsedDate.getTime())) closeDate = parsedDate;
          }

          const created = await tx.opportunity.create({
            data: {
              tenantId: user.tenantId,
              name: String(row.name).trim(),
              customerId: customer.id,
              stageId: stage.id,
              value: Number(row.value || 0),
              probability: Number(row.probability || 0),
              expectedCloseDate: closeDate,
              status: stage.isWon ? 'won' : stage.isLost ? 'lost' : 'open',
              assignedTo: user.sub,
              createdBy: user.sub,
            },
          });

          await logActivity(tx, user, {
            type: 'note',
            subject: 'Tạo dự án từ Import',
            content: created.name,
            relatedType: 'opportunity',
            relatedId: created.id,
          });

          createdCount++;
        } catch (err) {
          skipped.push({ name: row.name, reason: 'Lỗi dữ liệu không hợp lệ' });
        }
      }

      return { created: createdCount, skipped };
    });
  }

  async move(user: AuthUser, id: string, dto: MoveDto) {
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

      return this.present(updated, await this.names(tx, user.tenantId));
    });

    this.realtime.emit(
      'deal:stage-changed',
      {
        id: result.id, name: result.name, stage: result.stage, stageColor: result.stageColor,
        status: result.status, value: Number(result.value) || 0, owner: result.owner,
      },
      { tenantId: user.tenantId },
    );

    return result;
  }

  async update(user: AuthUser, id: string, dto: OpportunityPatchDto) {
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
          ...(stage ? { stageId: stage.id, status: stage.isWon ? 'won' : stage.isLost ? 'lost' : 'open' } : {}),
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
      
      return this.present(updated, await this.names(tx, user.tenantId));
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.prisma.withTenant(user.tenantId, async (tx) => {
      const current = await tx.opportunity.findFirstOrThrow({ where: owned(user, { id }) });
      await tx.opportunity.delete({ where: { id: current.id } });
    });
    return { ok: true };
  }

  // --- Các hàm Helper dùng nội bộ ---

  private async names(tx: PrismaClient, tenantId: string) {
    const users = await tx.user.findMany({
      where: scope(tenantId),
      select: { id: true, name: true },
    });
    return new Map(users.map((item) => [item.id, item.name]));
  }

  private present(row: any, names: Map<string, string>) {
    return {
      id: row.id,
      code: row.code ?? null,
      name: row.name,
      customerId: row.customerId,
      customer: row.customer?.name ?? 'Khách vãng lai', 
      stageId: row.stage?.id,                           
      stage: row.stage?.name ?? 'Chưa xác định',        
      stageColor: row.stage?.color ?? '#ccc',           
      value: Number(row.value || 0),
      probability: row.probability || 0,
      closeDate: row.expectedCloseDate ? new Date(row.expectedCloseDate).toISOString().slice(0, 10) : '',
      status: row.status,
      isLead: row.stage?.name === 'Lead mới',
      owner: row.assignedTo ? names.get(row.assignedTo) ?? '' : '',
      description: row.description,
      lostReason: row.lostReason,
    };
  }
}