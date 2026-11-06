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

  async list(
    user: AuthUser, 
    q?: string, 
    status?: string, 
    sortBy: string = 'createdAt', 
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const allowedFields = ['quoteNumber', 'title', 'status', 'kind', 'sellingPrice', 'createdAt'];
    const safeSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const rows: any[] = await this.prisma.withTenant(user.tenantId, async (tx) => {
      return tx.quote.findMany({
        where: scope(user.tenantId, {
          ...(user.role === 'sales' ? { opportunity: { assignedTo: user.sub } } : {}),
          ...(status ? { status: status as any } : {}),
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
        orderBy: { [safeSortBy]: safeSortOrder },
      });
    });
    
    return rows.map((row: any) => ({
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
    const row: any = await this.prisma.withTenant(user.tenantId, async (tx) => {
      return tx.quote.findFirst({
        where: scope(user.tenantId, {
          id,
          ...(user.role === 'sales' ? { opportunity: { assignedTo: user.sub } } : {}),
        }),
        include: { customer: true, opportunity: true, items: true },
      });
    });
    
    if (!row) return null;
    
    return {
      ...row,
      freelanceRate: this.money(row.freelanceRate),
      personnelCost: this.money(row.personnelCost),
      otherCost: this.money(row.otherCost),
      totalCost: this.money(row.totalCost),
      sellingPrice: this.money(row.sellingPrice),
      profitMargin: Number(row.profitMargin),
      items: row.items.map((item: any) => ({
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
      
      const lastQuote = await tx.quote.findFirst({
        where: scope(user.tenantId, { kind }),
        orderBy: { createdAt: 'desc' },
        select: { quoteNumber: true }
      });

      let nextSeq = 1;
      if (lastQuote && lastQuote.quoteNumber) {
        const parts = lastQuote.quoteNumber.split('-');
        const lastSeqStr = parts[parts.length - 1];
        const lastSeq = parseInt(lastSeqStr, 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }
      
      const quoteNumber = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
      
      const quote: any = await tx.quote.create({
        data: {
          tenantId: user.tenantId,
          opportunityId: opportunity.id,
          customerId: opportunity.customerId,
          quoteNumber,
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
          const vat = Math.max(0, item.vat || 0);
          const subTotal = quantity * unitPrice;
          const vatAmount = subTotal * (vat / 100);
          const total = subTotal + vatAmount;

          return {
            tenantId: user.tenantId,
            quoteId: quote.id,
            moduleCode: `L${index + 1}`,
            moduleName: item.moduleName.trim() || `Hạng mục ${index + 1}`,
            unit: item.unit || 'Gói',
            quantity,
            unitPrice,
            vat,
            total,
            sortOrder: index + 1,
          };
        })
        .filter((item) => item.moduleName);
        
      const totalCost = clean.reduce((sum, item) => sum + item.total, 0);
      
      await tx.quoteItem.deleteMany({ where: { quoteId: quote.id, tenantId: user.tenantId } });
      await tx.quoteItem.createMany({ data: clean });
      
      const updated: any = await tx.quote.update({
        where: { id: quote.id },
        data: {
          personnelCost: totalCost,
          otherCost: 0,
          totalCost: totalCost,
          profitMargin: 0,
          sellingPrice: totalCost,
          scenario: 'custom',
          paymentTerms: (dto.paymentTerms || []) as any,
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
        paymentTerms: updated.paymentTerms,
        items: updated.items.map((item: any) => ({
          id: item.id,
          moduleName: item.moduleName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          vat: item.vat,
          total: Number(item.total),
        })),
      };
    });
  }

  async setStatus(user: AuthUser, id: string, dto: StatusDto) {
    const updated: any = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const quote = await tx.quote.findFirstOrThrow({
        where: scope(user.tenantId, {
          id,
          ...(user.role === 'sales' ? { opportunity: { assignedTo: user.sub } } : {}),
        }),
      });
      
      const res: any = await tx.quote.update({ where: { id }, data: { status: dto.status } });
      
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

  async remove(user: AuthUser, id: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const quote = await tx.quote.findFirstOrThrow({
        where: scope(user.tenantId, {
          id,
          ...(user.role === 'sales' ? { opportunity: { assignedTo: user.sub } } : {}),
        }),
      });
      
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Xóa báo giá',
        content: quote.quoteNumber,
        relatedType: 'quote',
        relatedId: quote.id,
      });
      
      await tx.quote.delete({ where: { id: quote.id } });
      
      return { ok: true };
    });
  }

  async bulkDelete(user: AuthUser, ids: string[]) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const deleted = await tx.quote.deleteMany({
        where: scope(user.tenantId, {
          id: { in: ids },
          ...(user.role === 'sales' ? { opportunity: { assignedTo: user.sub } } : {}),
        }),
      });
      return { count: deleted.count };
    });
  }
}