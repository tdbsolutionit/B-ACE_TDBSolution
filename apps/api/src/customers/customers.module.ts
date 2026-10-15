import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, owned, scope } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { logActivity } from '../common/activity';
import { RealtimeService } from '../realtime/realtime.service';

class CustomerDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsIn(['personal', 'business', 'individual'])
  type?: 'personal' | 'business' | 'individual';

  @IsOptional()
  @IsIn(['lead', 'active', 'inactive'])
  status?: 'lead' | 'active' | 'inactive';

  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class CustomerPatchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsIn(['personal', 'business', 'individual'])
  type?: 'personal' | 'business' | 'individual';

  @IsOptional()
  @IsIn(['lead', 'active', 'inactive'])
  status?: 'lead' | 'active' | 'inactive';

  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class ImportRow {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  taxCode?: string;
}

class ImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportRow)
  rows!: ImportRow[];
}

class BulkAssignDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsString()
  assignedTo!: string;
}

class BulkStatusDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsIn(['lead', 'active', 'inactive'])
  status!: 'lead' | 'active' | 'inactive';
}

class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

function blank(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

function dbType(type?: string) {
  return type === 'business' ? 'business' : 'personal';
}

function uiType(type: string) {
  return type === 'business' ? 'business' : 'individual';
}

function digits(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

function sameContact(left?: string | null, right?: string | null) {
  const a = digits(left);
  const b = digits(right);
  return a.length >= 8 && a === b;
}

function sameEmail(left?: string | null, right?: string | null) {
  const a = (left || '').trim().toLowerCase();
  const b = (right || '').trim().toLowerCase();
  return a.includes('@') && a === b;
}

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('tab') tab?: string,
  ) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const where = owned(user, {
        ...(status ? { status } : {}),
        ...(tab === 'lead' ? { status: 'lead' } : {}),
        ...(tab === 'customer' ? { status: 'active' } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { company: { contains: q, mode: 'insensitive' as const } },
                { email: { contains: q, mode: 'insensitive' as const } },
                { phone: { contains: q, mode: 'insensitive' as const } },
                { taxCode: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      });
      const rows = await tx.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { opportunities: { select: { id: true, status: true, stage: { select: { name: true } } } } },
      });
      const users = await tx.user.findMany({
        where: scope(user.tenantId),
        select: { id: true, name: true },
      });
      const names = new Map(users.map((item) => [item.id, item.name]));
      return rows
        .map((row) => this.present(row, names))
        .filter((row) => (tab === 'has_opp' ? row.oppCount > 0 : true));
    });
  }

  @Get('duplicates')
  duplicates(
    @CurrentUser() user: AuthUser,
    @Query('phone') phone?: string,
    @Query('email') email?: string,
    @Query('exclude') exclude?: string,
  ) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const rows = await tx.customer.findMany({
        where: scope(user.tenantId),
        select: { id: true, name: true, phone: true, email: true, contactPhone: true, contactEmail: true },
      });
      const matches = rows.filter((row) => {
        if (exclude && row.id === exclude) return false;
        return (
          sameContact(phone, row.phone) ||
          sameContact(phone, row.contactPhone) ||
          sameEmail(email, row.email) ||
          sameEmail(email, row.contactEmail)
        );
      });
      return { matches: matches.slice(0, 5).map((row) => ({ id: row.id, name: row.name })) };
    });
  }

  @Post('import')
  async import(@CurrentUser() user: AuthUser, @Body() dto: ImportDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const existing = await tx.customer.findMany({
        where: scope(user.tenantId),
        select: { id: true, phone: true, email: true, contactPhone: true, contactEmail: true },
      });

      const skipped: Array<{ name: string; reason: string }> = [];
      const toCreate: ImportRow[] = [];

      for (const row of dto.rows || []) {
        const name = (row.name || '').trim();
        if (!name) continue;

        const phone = blank(row.phone);
        const email = blank(row.email);

        const isDupe = existing.some(
          (ex) =>
            sameContact(phone, ex.phone) ||
            sameContact(phone, ex.contactPhone) ||
            sameEmail(email, ex.email) ||
            sameEmail(email, ex.contactEmail),
        );

        if (isDupe) {
          skipped.push({ name, reason: 'Số điện thoại hoặc email đã tồn tại' });
          continue;
        }

        existing.push({ id: '', phone, email, contactPhone: null, contactEmail: null });
        toCreate.push(row);
      }

      let createdCount = 0;
      for (const row of toCreate) {
        await tx.customer.create({
          data: {
            tenantId: user.tenantId,
            name: row.name.trim(),
            phone: blank(row.phone),
            email: blank(row.email),
            company: blank(row.company),
            taxCode: blank(row.taxCode),
            type: row.company ? 'business' : 'personal',
            status: 'lead',
            sourceName: 'Import CSV',
            assignedTo: user.sub,
            createdBy: user.sub,
          },
        });
        createdCount++;
      }

      if (createdCount > 0) {
        await logActivity(tx, user, {
          type: 'note',
          subject: 'Import khách hàng',
          content: `Import thành công ${createdCount} khách hàng (${skipped.length} bỏ qua)`,
          relatedType: 'customer',
        });
      }

      return { created: createdCount, skipped };
    });
  }

  @Post('bulk-assign')
  async bulkAssign(@CurrentUser() user: AuthUser, @Body() dto: BulkAssignDto) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const targetUser = await tx.user.findFirstOrThrow({
        where: scope(user.tenantId, { id: dto.assignedTo }),
      });
      const updated = await tx.customer.updateMany({
        where: owned(user, { id: { in: dto.ids } }),
        data: { assignedTo: dto.assignedTo },
      });
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Chuyển nhượng khách hàng',
        content: `Gán ${updated.count} khách cho ${targetUser.name}`,
        relatedType: 'customer',
      });
      return { count: updated.count, assigneeName: targetUser.name };
    });

    this.realtime.emit(
      'customer:assigned',
      {
        count: result.count,
        assigneeName: result.assigneeName,
        assignedTo: dto.assignedTo,
      },
      { tenantId: user.tenantId },
    );

    return result;
  }

  @Post('bulk-status')
  async bulkStatus(@CurrentUser() user: AuthUser, @Body() dto: BulkStatusDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const updated = await tx.customer.updateMany({
        where: owned(user, { id: { in: dto.ids } }),
        data: { status: dto.status },
      });
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Đổi trạng thái khách hàng',
        content: `Cập nhật trạng thái ${updated.count} khách sang ${dto.status}`,
        relatedType: 'customer',
      });
      return { count: updated.count };
    });
  }

  @Post('bulk-delete')
  async bulkDelete(@CurrentUser() user: AuthUser, @Body() dto: BulkDeleteDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const deleted = await tx.customer.deleteMany({
        where: owned(user, { id: { in: dto.ids } }),
      });
      return { count: deleted.count };
    });
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CustomerDto) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const created = await tx.customer.create({
        data: {
          tenantId: user.tenantId,
          name: dto.name.trim(),
          company: blank(dto.company),
          phone: blank(dto.phone),
          email: blank(dto.email),
          address: blank(dto.address),
          taxCode: blank(dto.taxCode),
          industry: blank(dto.industry),
          contactName: blank(dto.contactName),
          contactPhone: blank(dto.contactPhone),
          contactEmail: blank(dto.contactEmail),
          type: dbType(dto.type),
          status: dto.status ?? 'lead',
          sourceName: blank(dto.sourceName),
          notes: blank(dto.notes),
          assignedTo: user.sub,
          createdBy: user.sub,
        },
        include: { opportunities: { select: { id: true, status: true, stage: { select: { name: true } } } } },
      });
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Tạo khách hàng',
        content: created.name,
        relatedType: 'customer',
        relatedId: created.id,
      });
      return this.present(created, new Map([[user.sub, user.name]]));
    });

    this.realtime.emit(
      'customer:created',
      {
        id: result.id,
        name: result.name,
        company: result.company,
      },
      { tenantId: user.tenantId },
    );

    return result;
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const row = await tx.customer.findFirst({
        where: owned(user, { id }),
        include: {
          opportunities: { include: { stage: true }, orderBy: { updatedAt: 'desc' } },
        },
      });
      if (!row) return null;
      const users = await tx.user.findMany({
        where: scope(user.tenantId),
        select: { id: true, name: true },
      });
      const names = new Map(users.map((item) => [item.id, item.name]));
      const activities = await tx.activity.findMany({
        where: scope(user.tenantId, { relatedType: 'customer', relatedId: id }),
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      return {
        ...this.present(row, names),
        opportunities: row.opportunities.map((item) => ({
          id: item.id,
          code: item.code || null,
          name: item.name,
          stage: item.stage.name,
          stageColor: item.stage.color,
          value: Number(item.value),
          probability: item.probability,
          closeDate: item.expectedCloseDate ? item.expectedCloseDate.toISOString().slice(0, 10) : '',
          status: item.status,
          isLead: item.stage.name === 'Lead mới',
          description: item.description,
        })),
        activities: activities.map((item) => ({
          id: item.id,
          type: item.type,
          subject: item.subject,
          content: item.content,
          owner: item.userId ? names.get(item.userId) ?? '' : '',
          createdAt: item.createdAt,
        })),
      };
    });
  }

  @Post(':id/convert')
  convert(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const current = await tx.customer.findFirstOrThrow({ where: owned(user, { id }) });
      const updated = await tx.customer.update({
        where: { id: current.id },
        data: { type: 'business', status: current.status === 'lead' ? 'active' : current.status },
        include: { opportunities: { select: { id: true, status: true, stage: { select: { name: true } } } } },
      });
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Chuyển thành doanh nghiệp',
        content: updated.name,
        relatedType: 'customer',
        relatedId: updated.id,
      });
      return this.present(updated, new Map([[user.sub, user.name]]));
    });
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CustomerPatchDto) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.customer.findFirstOrThrow({ where: owned(user, { id }) });
      const updated = await tx.customer.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.company !== undefined ? { company: blank(dto.company) } : {}),
          ...(dto.phone !== undefined ? { phone: blank(dto.phone) } : {}),
          ...(dto.email !== undefined ? { email: blank(dto.email) } : {}),
          ...(dto.address !== undefined ? { address: blank(dto.address) } : {}),
          ...(dto.taxCode !== undefined ? { taxCode: blank(dto.taxCode) } : {}),
          ...(dto.industry !== undefined ? { industry: blank(dto.industry) } : {}),
          ...(dto.contactName !== undefined ? { contactName: blank(dto.contactName) } : {}),
          ...(dto.contactPhone !== undefined ? { contactPhone: blank(dto.contactPhone) } : {}),
          ...(dto.contactEmail !== undefined ? { contactEmail: blank(dto.contactEmail) } : {}),
          ...(dto.type !== undefined ? { type: dbType(dto.type) } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.sourceName !== undefined ? { sourceName: blank(dto.sourceName) } : {}),
          ...(dto.notes !== undefined ? { notes: blank(dto.notes) } : {}),
        },
        include: { opportunities: { select: { id: true, status: true, stage: { select: { name: true } } } } },
      });
      await logActivity(tx, user, {
        type: 'note',
        subject: dto.notes !== undefined ? 'Cập nhật ghi chú' : 'Cập nhật khách hàng',
        content: updated.name,
        relatedType: 'customer',
        relatedId: updated.id,
      });
      return this.present(updated, new Map([[user.sub, user.name]]));
    });

    this.realtime.emit(
      'customer:updated',
      result,
      { tenantId: user.tenantId },
    );

    return result;
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.prisma.withTenant(user.tenantId, async (tx) => {
      const current = await tx.customer.findFirstOrThrow({ where: owned(user, { id }) });
      await logActivity(tx, user, {
        type: 'note',
        subject: 'Xoá khách hàng',
        content: current.name,
        relatedType: 'customer',
        relatedId: current.id,
      });
      await tx.customer.delete({ where: { id: current.id } });
    });
    return { ok: true };
  }

  private present(
    row: {
      id: string;
      name: string;
      company: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      taxCode: string | null;
      industry: string | null;
      contactName: string | null;
      contactPhone: string | null;
      contactEmail: string | null;
      type: string;
      status: string;
      sourceName: string | null;
      notes: string | null;
      assignedTo: string | null;
      createdAt: Date;
      opportunities: Array<{ id: string; status: string; stage?: { name: string } }>;
    },
    names: Map<string, string>,
  ) {
    return {
      id: row.id,
      code: (row as any).code ?? null,
      shortCode: (row as any).shortCode ?? null,
      name: row.name,
      company: row.company,
      phone: row.phone,
      email: row.email,
      address: row.address,
      taxCode: row.taxCode,
      industry: row.industry,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      type: uiType(row.type),
      status: row.status,
      sourceName: row.sourceName,
      notes: row.notes,
      assigneeName: row.assignedTo ? names.get(row.assignedTo) ?? null : null,
      oppCount: row.opportunities.length,
      openOppCount: row.opportunities.filter((item) => item.status === 'open').length,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

@Module({ controllers: [CustomersController] })
export class CustomersModule {}
