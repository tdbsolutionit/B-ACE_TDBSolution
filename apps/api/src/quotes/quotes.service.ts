import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AuthUser, owned, scope } from '../common/auth';
import { logActivity } from '../common/activity';
import { QuoteDto, QuoteItemsDto, StatusDto } from './dto/quotes.dto';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  private money(value: bigint | number) {
    return Number(value);
  }

  async list(user: AuthUser, q?: string, opportunityId?: string) {
    const rows = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.quote.findMany({
        where: scope(user.tenantId, {
          ...(user.role === 'sales' ? { opportunity: { assignedTo: user.sub } } : {}),
          ...(opportunityId ? { opportunityId } : {}),
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: 'insensitive' as const } },
                  { quoteNumber: { contains: q, mode: 'insensitive' as const } },
                ],
              }
            : {}),
        }),
        include: { customer: true, opportunity: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
    
    return rows.map((row) => ({
      ...row,
      freelanceRate: this.money(row.freelanceRate),
      personnelCost: this.money(row.personnelCost),
      otherCost: this.money(row.otherCost),
      totalCost: this.money(row.totalCost),
      sellingPrice: this.money(row.sellingPrice),
      profitMargin: Number(row.profitMargin),
    }));
  }

  async get(user: AuthUser, id: string) {
    const row = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.quote.findFirst({
        where: scope(user.tenantId, {
          id,
          ...(user.role === 'sales' ? { opportunity: { assignedTo: user.sub } } : {}),
        }),
        include: { customer: true, opportunity: true, items: true },
      }),
    );
    if (!row) return null;
    
    return {
      ...row,
      freelanceRate: this.money(row.freelanceRate),
      personnelCost: this.money(row.personnelCost),
      otherCost: this.money(row.otherCost),
      totalCost: this.money(row.totalCost),
      sellingPrice: this.money(row.sellingPrice),
      profitMargin: Number(row.profitMargin),
      items: row.items.map((item) => ({
        ...item,
        unitPrice: this.money(item.unitPrice),
        total: this.money(item.total),
      })),
    };
  }

  async create(user: AuthUser, dto: QuoteDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const opportunity = await tx.opportunity.findFirstOrThrow({
        where: owned(user, { id: dto.opportunityId }),
      });
      const kind = dto.kind ?? 'quote';
      const prefix = kind === 'proposal' ? 'DX' : kind === 'po' ? 'PO' : 'BG';
      const count = await tx.quote.count({ where: scope(user.tenantId, { kind }) });
      
      const quote = await tx.quote.create({
        data: {
          tenantId: user.tenantId,
          opportunityId: opportunity.id,
          customerId: opportunity.customerId,
          quoteNumber: `${prefix}-${String(count + 1).padStart(4, '0')}`,
          kind,
          title: dto.title,
          scenario: dto.scenario ?? 'mid',
          workingDays: 0,
          freelancers: 0,
          freelanceRate: 0,
          personnelCost: 0,
          otherCost: 0,
          totalCost: 0,
          profitMargin: 0,
          sellingPrice: 0,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          notes: dto.notes,
          createdBy: user.sub,
        },
        include: { customer: true, opportunity: true, items: true },
      });
      
      await logActivity(tx, user, {
        type: 'note',
        subject: `Tạo ${kind === 'proposal' ? 'đề xuất' : kind === 'po' ? 'đơn hàng' : 'báo giá'}`,
        content: quote.quoteNumber,
        relatedType: 'opportunity',
        relatedId: opportunity.id,
      });
      
      return {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        kind: quote.kind,
        title: quote.title,
        status: quote.status,
        sellingPrice: Number(quote.sellingPrice),
      };
    });
  }

  async saveItems(user: AuthUser, id: string, dto: QuoteItemsDto) {
    const lines = dto.items.map((item) => item.moduleName.trim()).filter(Boolean);
    if (!lines.length) throw new BadRequestException('Cần ít nhất một hạng mục');
    
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const quote = await tx.quote.findFirstOrThrow({
        where: scope(user.tenantId, {
          id,
          ...(user.role === 'sales' ? { opportunity: { assignedTo: user.sub } } : {}),
        }),
      });
      
      const clean = dto.items
        .map((item, index) => {
          const quantity = Math.max(0, item.quantity);
          const unitPrice = Math.round(Math.max(0, item.unitPrice));
          return {
            tenantId: user.tenantId,
            quoteId: quote.id,
            moduleCode: `L${index + 1}`,
            moduleName: item.moduleName.trim() || `Hạng mục ${index + 1}`,
            unit: item.unit || 'Gói',
            quantity,
            unitPrice,
            total: quantity * unitPrice,
            sortOrder: index + 1,
          };
        })
        .filter((item) => item.moduleName);
        
      const totalCost = clean.reduce((sum, item) => sum + item.total, 0);
      
      await tx.quoteItem.deleteMany({ where: { quoteId: quote.id, tenantId: user.tenantId } });
      await tx.quoteItem.createMany({ data: clean });
      
      const updated = await tx.quote.update({
        where: { id: quote.id },
        data: {
          personnelCost: totalCost,
          otherCost: 0,
          totalCost: totalCost,
          profitMargin: 0,
          sellingPrice: totalCost,
          scenario: 'custom',
        },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
      
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Cập nhật hạng mục báo giá',
        content: quote.quoteNumber,
        relatedType: 'opportunity',
        relatedId: quote.opportunityId ?? undefined,
      });
      
      return {
        id: updated.id,
        totalCost: Number(updated.totalCost),
        sellingPrice: Number(updated.sellingPrice),
        profitMargin: Number(updated.profitMargin),
        items: updated.items.map((item) => ({
          id: item.id,
          moduleName: item.moduleName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
      };
    });
  }

  async setStatus(user: AuthUser, id: string, dto: StatusDto) {
    const updated = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const quote = await tx.quote.findFirstOrThrow({
        where: scope(user.tenantId, {
          id,
          ...(user.role === 'sales' ? { opportunity: { assignedTo: user.sub } } : {}),
        }),
      });
      
      const res = await tx.quote.update({ where: { id }, data: { status: dto.status } });
      
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Cập nhật trạng thái chứng từ',
        content: `${quote.quoteNumber} → ${dto.status}`,
        relatedType: 'quote',
        relatedId: quote.id,
      });
      
      return {
        id: res.id,
        quoteNumber: res.quoteNumber,
        title: res.title,
        status: res.status,
        sellingPrice: Number(res.sellingPrice),
      };
    });

    if (dto.status === 'accepted') {
      this.realtime.emit(
        'quote:accepted',
        {
          id: updated.id,
          quoteNumber: updated.quoteNumber,
          title: updated.title,
          price: updated.sellingPrice,
        },
        { tenantId: user.tenantId },
      );
    }

    return updated;
  }
}