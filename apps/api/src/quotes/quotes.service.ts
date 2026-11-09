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

  async list(
    user: AuthUser, 
    q?: string, 
    status?: string, 
    sortBy: string = 'createdAt', 
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const allowedFields = ['quoteNumber', 'title', 'status', 'kind', 'createdAt'];
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
        include: { 
          customer: true, 
          opportunity: true,
          items: { select: { total: true } } 
        },
        orderBy: { [safeSortBy]: safeSortOrder },
      });
    });
    
    return rows.map((row: any) => {
      const calculatedTotal = row.items.reduce((sum: number, item: any) => sum + Number(item.total), 0);
      const { items, ...quoteData } = row;
      return {
        ...quoteData,
        totalAmount: calculatedTotal,
      };
    });
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
    
    const calculatedTotal = row.items.reduce((sum: number, item: any) => sum + Number(item.total), 0);

    return {
      ...row,
      totalAmount: calculatedTotal,
      items: row.items.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
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
        totalAmount: 0,
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
        
      const totalAmount = clean.reduce((sum, item) => sum + item.total, 0);
      
      await tx.quoteItem.deleteMany({ where: { quoteId: quote.id, tenantId: user.tenantId } });
      await tx.quoteItem.createMany({ data: clean });
      
      const updated: any = await tx.quote.update({
        where: { id: quote.id },
        data: {
          scenario: 'custom',
          paymentTerms: (dto.paymentTerms || []) as any,
          productInfo: dto.productInfo || '',
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
        totalAmount: totalAmount,
        paymentTerms: updated.paymentTerms,
        productInfo: updated.productInfo,
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
      };
    });

    if (dto.status === 'accepted') {
      this.realtime.emit(
        'quote:accepted',
        {
          id: updated.id,
          quoteNumber: updated.quoteNumber,
          title: updated.title,
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