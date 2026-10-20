import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AuthUser, owned, scope } from '../common/auth';
import { logActivity } from '../common/activity';
import { CustomerDto, CustomerPatchDto, ImportDto, ImportRow, BulkAssignDto, BulkStatusDto, BulkDeleteDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(user: AuthUser, q?: string, status?: string, tab?: string) {
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
                { code: { contains: q, mode: 'insensitive' as const } },
                { shortCode: { contains: q, mode: 'insensitive' as const } },
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

  async duplicates(user: AuthUser, phone?: string, email?: string, exclude?: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const rows = await tx.customer.findMany({
        where: scope(user.tenantId),
        select: { id: true, name: true, phone: true, email: true, contactPhone: true, contactEmail: true },
      });
      const matches = rows.filter((row) => {
        if (exclude && row.id === exclude) return false;
        return (
          this.sameContact(phone, row.phone) ||
          this.sameContact(phone, row.contactPhone) ||
          this.sameEmail(email, row.email) ||
          this.sameEmail(email, row.contactEmail)
        );
      });
      return { matches: matches.slice(0, 5).map((row) => ({ id: row.id, name: row.name })) };
    });
  }

  async import(user: AuthUser, dto: ImportDto) {
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

        const phone = this.blank(row.phone);
        const email = this.blank(row.email);

        const isDupe = existing.some(
          (ex) =>
            this.sameContact(phone, ex.phone) ||
            this.sameContact(phone, ex.contactPhone) ||
            this.sameEmail(email, ex.email) ||
            this.sameEmail(email, ex.contactEmail),
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
            code: this.blank(row.code),
            shortCode: this.blank(row.shortCode),
            phone: this.blank(row.phone),
            email: this.blank(row.email),
            company: this.blank(row.company),
            taxCode: this.blank(row.taxCode),
            address: this.blank(row.address),
            industry: this.blank(row.industry),
            type: row.company || row.type === 'business' ? 'business' : 'personal',
            status: (row.status === 'active' || row.status === 'inactive') ? row.status : 'lead',
            sourceName: this.blank(row.sourceName) || 'Import Excel/CSV',
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

  async bulkAssign(user: AuthUser, dto: BulkAssignDto) {
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

  async bulkStatus(user: AuthUser, dto: BulkStatusDto) {
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

  async bulkDelete(user: AuthUser, dto: BulkDeleteDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const deleted = await tx.customer.deleteMany({
        where: owned(user, { id: { in: dto.ids } }),
      });
      return { count: deleted.count };
    });
  }

  async create(user: AuthUser, dto: CustomerDto) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const created = await tx.customer.create({
        data: {
          tenantId: user.tenantId,
          name: dto.name.trim(),
          company: this.blank(dto.company),
          phone: this.blank(dto.phone),
          email: this.blank(dto.email),
          address: this.blank(dto.address),
          taxCode: this.blank(dto.taxCode),
          industry: this.blank(dto.industry),
          contactName: this.blank(dto.contactName),
          contactPhone: this.blank(dto.contactPhone),
          contactEmail: this.blank(dto.contactEmail),
          type: this.dbType(dto.type),
          status: dto.status ?? 'lead',
          sourceName: this.blank(dto.sourceName),
          notes: this.blank(dto.notes),
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
      { id: result.id, name: result.name, company: result.company },
      { tenantId: user.tenantId },
    );

    return result;
  }

  async get(user: AuthUser, id: string) {
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

  async convert(user: AuthUser, id: string) {
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

  async update(user: AuthUser, id: string, dto: CustomerPatchDto) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.customer.findFirstOrThrow({ where: owned(user, { id }) });
      const updated = await tx.customer.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.company !== undefined ? { company: this.blank(dto.company) } : {}),
          ...(dto.phone !== undefined ? { phone: this.blank(dto.phone) } : {}),
          ...(dto.email !== undefined ? { email: this.blank(dto.email) } : {}),
          ...(dto.address !== undefined ? { address: this.blank(dto.address) } : {}),
          ...(dto.taxCode !== undefined ? { taxCode: this.blank(dto.taxCode) } : {}),
          ...(dto.industry !== undefined ? { industry: this.blank(dto.industry) } : {}),
          ...(dto.contactName !== undefined ? { contactName: this.blank(dto.contactName) } : {}),
          ...(dto.contactPhone !== undefined ? { contactPhone: this.blank(dto.contactPhone) } : {}),
          ...(dto.contactEmail !== undefined ? { contactEmail: this.blank(dto.contactEmail) } : {}),
          ...(dto.type !== undefined ? { type: this.dbType(dto.type) } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.sourceName !== undefined ? { sourceName: this.blank(dto.sourceName) } : {}),
          ...(dto.notes !== undefined ? { notes: this.blank(dto.notes) } : {}),
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

    this.realtime.emit('customer:updated', result, { tenantId: user.tenantId });
    return result;
  }

  async remove(user: AuthUser, id: string) {
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

  // --- Helper methods ---

  private blank(value?: string | null) {
    const text = value?.trim();
    return text ? text : null;
  }

  private dbType(type?: string) {
    return type === 'business' ? 'business' : 'personal';
  }

  private uiType(type: string) {
    return type === 'business' ? 'business' : 'individual';
  }

  private digits(value?: string | null) {
    return (value || '').replace(/\D/g, '');
  }

  private sameContact(left?: string | null, right?: string | null) {
    const a = this.digits(left);
    const b = this.digits(right);
    return a.length >= 8 && a === b;
  }

  private sameEmail(left?: string | null, right?: string | null) {
    const a = (left || '').trim().toLowerCase();
    const b = (right || '').trim().toLowerCase();
    return a.includes('@') && a === b;
  }

  private present(row: any, names: Map<string, string>) {
    return {
      id: row.id,
      code: row.code ?? null,
      shortCode: row.shortCode ?? null,
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
      type: this.uiType(row.type),
      status: row.status,
      sourceName: row.sourceName,
      notes: row.notes,
      assigneeName: row.assignedTo ? names.get(row.assignedTo) ?? null : null,
      oppCount: row.opportunities.length,
      openOppCount: row.opportunities.filter((item: any) => item.status === 'open').length,
      createdAt: row.createdAt.toISOString(),
    };
  }
}