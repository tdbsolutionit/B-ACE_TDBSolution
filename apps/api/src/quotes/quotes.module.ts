import { BadRequestException, Body, Controller, Get, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { priceQuote } from '@bace/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AuthUser, owned, scope } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { logActivity } from '../common/activity';

class QuoteDto {
  @IsString()
  opportunityId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsIn(['proposal', 'quote', 'po'])
  kind?: 'proposal' | 'quote' | 'po';

  @IsOptional()
  @IsIn(['low', 'mid', 'high', 'custom'])
  scenario?: 'low' | 'mid' | 'high' | 'custom';

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  workingDays!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freelancers!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freelanceRate!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  profitMargin?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class QuoteLineDto {
  @IsString()
  moduleName!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

class QuoteItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  items!: QuoteLineDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  profitMargin?: number;
}

class StatusDto {
  @IsIn(['draft', 'sent', 'accepted', 'rejected', 'expired'])
  status!: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
}

function money(value: bigint | number) {
  return Number(value);
}

@ApiTags('quotes')
@ApiBearerAuth()
@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('q') q?: string, @Query('opportunityId') opportunityId?: string) {
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
      freelanceRate: money(row.freelanceRate),
      personnelCost: money(row.personnelCost),
      otherCost: money(row.otherCost),
      totalCost: money(row.totalCost),
      sellingPrice: money(row.sellingPrice),
      profitMargin: Number(row.profitMargin),
    }));
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
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
      freelanceRate: money(row.freelanceRate),
      personnelCost: money(row.personnelCost),
      otherCost: money(row.otherCost),
      totalCost: money(row.totalCost),
      sellingPrice: money(row.sellingPrice),
      profitMargin: Number(row.profitMargin),
      items: row.items.map((item) => ({
        ...item,
        unitPrice: money(item.unitPrice),
        total: money(item.total),
      })),
    };
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: QuoteDto) {
    const priced = priceQuote({
      workingDays: dto.workingDays,
      freelancers: dto.freelancers,
      freelanceRate: dto.freelanceRate,
      vpsDomain: 1_000_000,
      buffer: 20_000_000,
      commissionRate: 10,
      entertainmentRate: 10,
      otherRate: 8,
      profitMargin: dto.profitMargin ?? 50,
    });
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
          workingDays: dto.workingDays,
          freelancers: dto.freelancers,
          freelanceRate: dto.freelanceRate,
          personnelCost: priced.personnelCost,
          otherCost: priced.otherCost,
          totalCost: priced.totalCost,
          profitMargin: dto.profitMargin ?? 50,
          sellingPrice: priced.sellingPrice,
          notes: dto.notes,
          createdBy: user.sub,
          items: {
            create: [
              {
                tenantId: user.tenantId,
                moduleCode: 'DEV',
                moduleName: 'Triển khai',
                quantity: 1,
                unitPrice: priced.personnelCost,
                total: priced.personnelCost,
                sortOrder: 1,
              },
              {
                tenantId: user.tenantId,
                moduleCode: 'OPS',
                moduleName: 'Vận hành & dự phòng',
                quantity: 1,
                unitPrice: priced.otherCost,
                total: priced.otherCost,
                sortOrder: 2,
              },
            ],
          },
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

  @Patch(':id/items')
  saveItems(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: QuoteItemsDto) {
    const lines = dto.items.map((item) => item.moduleName.trim()).filter(Boolean);
    if (!lines.length) throw new BadRequestException('Cần ít nhất một hạng mục');
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const quote = await tx.quote.findFirstOrThrow({
        where: scope(user.tenantId, {
          id,
          ...(user.role === 'sales' ? { opportunity: { assignedTo: user.sub } } : {}),
        }),
      });
      const margin = dto.profitMargin ?? Number(quote.profitMargin);
      const clean = dto.items
        .map((item, index) => {
          const quantity = Math.max(0, item.quantity);
          const unitPrice = Math.round(Math.max(0, item.unitPrice));
          return {
            tenantId: user.tenantId,
            quoteId: quote.id,
            moduleCode: `L${index + 1}`,
            moduleName: item.moduleName.trim() || `Hạng mục ${index + 1}`,
            quantity,
            unitPrice,
            total: quantity * unitPrice,
            sortOrder: index + 1,
          };
        })
        .filter((item) => item.moduleName);
      const totalCost = clean.reduce((sum, item) => sum + item.total, 0);
      const sellingPrice = Math.round(totalCost * (1 + margin / 100));
      await tx.quoteItem.deleteMany({ where: { quoteId: quote.id, tenantId: user.tenantId } });
      await tx.quoteItem.createMany({ data: clean });
      const updated = await tx.quote.update({
        where: { id: quote.id },
        data: {
          personnelCost: totalCost,
          otherCost: 0,
          totalCost,
          profitMargin: margin,
          sellingPrice,
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

  @Patch(':id/status')
  async setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: StatusDto) {
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

@Module({ controllers: [QuotesController] })
export class QuotesModule {}
