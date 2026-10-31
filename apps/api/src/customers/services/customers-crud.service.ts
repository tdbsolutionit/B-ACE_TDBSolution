import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { AuthUser, owned, scope } from '../../common/auth';
import { logActivity } from '../../common/activity';
import { CustomerDto, CustomerPatchDto } from '../dto/customer.dto';
import { CustomerStatus } from '@prisma/client';
import { OdooService } from '../odoo.service';
import { CustomerHelperService } from './customer-helper.service';

@Injectable()
export class CustomersCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly odooService: OdooService,
    private readonly helper: CustomerHelperService,
  ) {}

  async list(user: AuthUser, q?: string, status?: string, tab?: string, page: number = 1, limit: number = 20) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const conditions: any[] = [];
      if (status) conditions.push({ status: status as CustomerStatus }); 
      if (q) {
        conditions.push({
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { company: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q, mode: 'insensitive' as const } },
            { taxCode: { contains: q, mode: 'insensitive' as const } },
            { code: { contains: q, mode: 'insensitive' as const } },
            { shortCode: { contains: q, mode: 'insensitive' as const } },
          ],
        });
      }

      const baseWhere = owned(user, { ...(conditions.length > 0 ? { AND: conditions } : {}) });
      const tabWhere = {
        ...(tab === 'lead' ? { status: CustomerStatus.lead } : {}),
        ...(tab === 'customer' ? { status: CustomerStatus.active } : {}),
        ...(tab === 'has_opp' ? { opportunities: { some: {} } } : {}),
      };

      const [rows, totalCount, leadCount, activeCount, hasOppCount] = await Promise.all([
        tx.customer.findMany({
          where: { ...baseWhere, ...tabWhere },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { opportunities: { select: { id: true, status: true, stage: { select: { name: true } } } } },
        }),
        tx.customer.count({ where: baseWhere }),
        tx.customer.count({ where: { ...baseWhere, status: 'lead' } }),
        tx.customer.count({ where: { ...baseWhere, status: 'active' } }),
        tx.customer.count({ where: { ...baseWhere, opportunities: { some: {} } } }),
      ]);

      const users = await tx.user.findMany({ where: scope(user.tenantId), select: { id: true, name: true } });
      const names = new Map(users.map((item) => [item.id, item.name]));

      return {
        data: rows.map((row) => this.helper.present(row, names)),
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit) || 1,
          stats: { lead: leadCount, active: activeCount, hasOpp: hasOppCount }
        }
      };
    });
  }

  async create(user: AuthUser, dto: CustomerDto) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      const created = await tx.customer.create({
        data: {
          tenantId: user.tenantId,
          name: dto.name.trim(),
          company: this.helper.blank(dto.company),
          phone: this.helper.blank(dto.phone),
          email: this.helper.blank(dto.email),
          address: this.helper.blank(dto.address),
          taxCode: this.helper.blank(dto.taxCode),
          industry: this.helper.blank(dto.industry),
          contactName: this.helper.blank(dto.contactName),
          contactPhone: this.helper.blank(dto.contactPhone),
          contactEmail: this.helper.blank(dto.contactEmail),
          type: this.helper.dbType(dto.type),
          status: dto.status ?? 'lead',
          sourceName: this.helper.blank(dto.sourceName),
          notes: this.helper.blank(dto.notes),
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
      return { presented: this.helper.present(created, new Map([[user.sub, user.name]])), raw: created };
    });

    this.realtime.emit('customer:created', { id: result.presented.id, name: result.presented.name, company: result.presented.company }, { tenantId: user.tenantId });

    this.odooService.pushCustomerToOdoo(result.raw).then(async (odooId) => {
      if (odooId) {
        await this.prisma.withTenant(user.tenantId, (tx) =>
          tx.customer.update({ where: { id: result.raw.id }, data: { odooPartnerId: String(odooId) } }),
        );
      }
    }).catch(console.error);

    return result.presented;
  }

  async update(user: AuthUser, id: string, dto: CustomerPatchDto, fromOdoo: boolean = false) {
    const result = await this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.customer.findFirstOrThrow({ where: owned(user, { id }) });
      const updated = await tx.customer.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.company !== undefined ? { company: this.helper.blank(dto.company) } : {}),
          ...(dto.phone !== undefined ? { phone: this.helper.blank(dto.phone) } : {}),
          ...(dto.email !== undefined ? { email: this.helper.blank(dto.email) } : {}),
          ...(dto.address !== undefined ? { address: this.helper.blank(dto.address) } : {}),
          ...(dto.taxCode !== undefined ? { taxCode: this.helper.blank(dto.taxCode) } : {}),
          ...(dto.industry !== undefined ? { industry: this.helper.blank(dto.industry) } : {}),
          ...(dto.contactName !== undefined ? { contactName: this.helper.blank(dto.contactName) } : {}),
          ...(dto.contactPhone !== undefined ? { contactPhone: this.helper.blank(dto.contactPhone) } : {}),
          ...(dto.contactEmail !== undefined ? { contactEmail: this.helper.blank(dto.contactEmail) } : {}),
          ...(dto.type !== undefined ? { type: this.helper.dbType(dto.type) } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.sourceName !== undefined ? { sourceName: this.helper.blank(dto.sourceName) } : {}),
          ...(dto.notes !== undefined ? { notes: this.helper.blank(dto.notes) } : {}),
        },
        include: { opportunities: { select: { id: true, status: true, stage: { select: { name: true } } } } },
      });
      await logActivity(tx, user, {
        type: 'note',
        subject: fromOdoo ? 'Cập nhật từ Odoo' : (dto.notes !== undefined ? 'Cập nhật ghi chú' : 'Cập nhật khách hàng'),
        content: updated.name,
        relatedType: 'customer',
        relatedId: updated.id,
      });
      return { presented: this.helper.present(updated, new Map([[user.sub, user.name]])), raw: updated };
    });

    this.realtime.emit('customer:updated', result.presented, { tenantId: user.tenantId });

    if (!fromOdoo) {
      this.odooService.pushCustomerToOdoo(result.raw).then(async (odooId) => {
        if (odooId && !result.raw.odooPartnerId) {
          await this.prisma.withTenant(user.tenantId, (tx) =>
            tx.customer.update({ where: { id: result.raw.id }, data: { odooPartnerId: String(odooId) } }),
          );
        }
      }).catch(console.error);
    }

    return result.presented;
  }

  async get(user: AuthUser, id: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const row = await tx.customer.findFirst({
        where: owned(user, { id }),
        include: { opportunities: { include: { stage: true }, orderBy: { updatedAt: 'desc' } } },
      });
      if (!row) return null;
      const users = await tx.user.findMany({ where: scope(user.tenantId), select: { id: true, name: true } });
      const names = new Map(users.map((item) => [item.id, item.name]));
      const activities = await tx.activity.findMany({
        where: scope(user.tenantId, { relatedType: 'customer', relatedId: id }),
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      return {
        ...this.helper.present(row, names),
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
      return this.helper.present(updated, new Map([[user.sub, user.name]]));
    });
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

  async duplicates(user: AuthUser, phone?: string, email?: string, exclude?: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const rows = await tx.customer.findMany({
        where: scope(user.tenantId),
        select: { id: true, name: true, phone: true, email: true, contactPhone: true, contactEmail: true },
      });
      const matches = rows.filter((row) => {
        if (exclude && row.id === exclude) return false;
        return (
          this.helper.sameContact(phone, row.phone) ||
          this.helper.sameContact(phone, row.contactPhone) ||
          this.helper.sameEmail(email, row.email) ||
          this.helper.sameEmail(email, row.contactEmail)
        );
      });
      return { matches: matches.slice(0, 5).map((row) => ({ id: row.id, name: row.name })) };
    });
  }
}