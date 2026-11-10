import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OdooService } from './odoo.service';
import { AuthUser } from '../common/auth';
import { CustomerHelperService } from '../customers/services/customer-helper.service';

@Injectable()
export class IntegrationManager {
  constructor(
    private readonly prisma: PrismaService,
    private readonly odooService: OdooService,
    private readonly customerHelper: CustomerHelperService,
  ) {}

  async syncSingleCustomer(customer: any, config: any, integrationId: string): Promise<string | null> {
    try {
      const odooId = await this.odooService.syncCustomer(customer, config);
      
      if (odooId) {
        await this.prisma.integrationLog.create({
          data: {
            integrationId,
            action: 'SYNC_CUSTOMER',
            status: 'success',
            message: `Đồng bộ thành công (Mã Odoo: ${odooId})`,
            recordId: customer.id,
          }
        });
        return odooId;
      } else {
        await this.prisma.integrationLog.create({
          data: {
            integrationId,
            action: 'SYNC_CUSTOMER',
            status: 'failed',
            message: 'Odoo từ chối tạo hoặc cập nhật',
            recordId: customer.id,
          }
        });
        return null;
      }
    } catch (error: any) {
      await this.prisma.integrationLog.create({
        data: {
          integrationId,
          action: 'SYNC_CUSTOMER',
          status: 'failed',
          message: error.message,
          recordId: customer.id,
        }
      });
      return null;
    }
  }

  async syncSingleUser(user: any, config: any, integrationId: string): Promise<string | null> {
    try {
      const odooId = await this.odooService.syncUser(user, config);
      
      if (odooId) {
        await this.prisma.integrationLog.create({
          data: {
            integrationId,
            action: 'SYNC_USER',
            status: 'success',
            message: `Đồng bộ thành công (Mã Odoo: ${odooId})`,
            recordId: user.id,
          }
        });
        return odooId;
      } else {
        await this.prisma.integrationLog.create({
          data: {
            integrationId,
            action: 'SYNC_USER',
            status: 'failed',
            message: 'Odoo từ chối tạo hoặc cập nhật',
            recordId: user.id,
          }
        });
        return null;
      }
    } catch (error: any) {
      await this.prisma.integrationLog.create({
        data: {
          integrationId,
          action: 'SYNC_USER',
          status: 'failed',
          message: error.message,
          recordId: user.id,
        }
      });
      return null;
    }
  }

  async manualSyncAllCustomers(user: AuthUser) {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId: user.tenantId, provider: 'odoo', isActive: true }
    });

    if (!integration) throw new BadRequestException('Chưa cấu hình Odoo hoặc tính năng đồng bộ đang tắt.');

    const config = integration.config as any;
    const customers = await this.prisma.customer.findMany({
      where: { tenantId: user.tenantId, odooPartnerId: null }
    });

    let count = 0;
    for (const customer of customers) {
      const odooId = await this.syncSingleCustomer(customer, config, integration.id);
      if (odooId) {
        await this.prisma.customer.update({
          where: { id: customer.id },
          data: { odooPartnerId: odooId }
        });
        count++;
      }
    }
    return { count };
  }

  async repairSyncAllCustomers(user: AuthUser) {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId: user.tenantId, provider: 'odoo', isActive: true }
    });

    if (!integration) throw new BadRequestException('Chưa cấu hình Odoo');
    const config = integration.config as any;

    const customers = await this.prisma.customer.findMany({
      where: { tenantId: user.tenantId }
    });

    let count = 0;
    for (const customer of customers) {
      const odooId = await this.syncSingleCustomer(customer, config, integration.id);
      if (odooId) {
        await this.prisma.customer.update({
          where: { id: customer.id },
          data: { odooPartnerId: odooId }
        });
        count++;
      }
    }
    return { count, message: `Đã phục hồi/đồng bộ ${count} khách hàng` };
  }

  async syncAllUsers(user: AuthUser) {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId: user.tenantId, provider: 'odoo', isActive: true }
    });

    if (!integration) throw new BadRequestException('Chưa cấu hình Odoo hoặc tính năng đồng bộ đang tắt.');

    const config = integration.config as any;
    const users = await this.prisma.user.findMany({
      where: { tenantId: user.tenantId }
    });

    let count = 0;
    for (const u of users) {
      const odooId = await this.syncSingleUser(u, config, integration.id);
      if (odooId) {
        await this.prisma.user.update({
          where: { id: u.id },
          data: { odooUserId: odooId }
        });
        count++;
      }
    }
    return { count };
  }

  async getLogs(user: AuthUser) {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId: user.tenantId, provider: 'odoo' }
    });
    
    if (!integration) return [];

    return this.prisma.integrationLog.findMany({
      where: { integrationId: integration.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async pullCustomersFromOdoo(user: AuthUser) {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId: user.tenantId, provider: 'odoo', isActive: true }
    });

    if (!integration) throw new BadRequestException('Chưa cấu hình Odoo hoặc tính năng đồng bộ đang tắt.');
    const config = integration.config as any;
    const lastSync = integration.lastSyncedAt;

    const odooPartners = await this.odooService.pullUpdatedPartners(config, lastSync);

    let createdCount = 0;
    let updatedCount = 0;

    await this.prisma.withTenant(user.tenantId, async (tx) => {
      for (const partner of odooPartners) {
        if (partner.user_ids && partner.user_ids.length > 0) continue;

        const existing = await tx.customer.findFirst({
          where: { tenantId: user.tenantId, odooPartnerId: String(partner.id) }
        });

        if (existing) {
          const updateData: any = {};
          if (partner.name && partner.name !== existing.name) updateData.name = partner.name;
          if (partner.email && partner.email !== existing.email) updateData.email = partner.email;
          if (partner.phone && partner.phone !== existing.phone) updateData.phone = partner.phone;
          if (partner.street && partner.street !== existing.address) updateData.address = partner.street;

          if (Object.keys(updateData).length > 0) {
            await tx.customer.update({ where: { id: existing.id }, data: updateData });
            updatedCount++;
            await tx.integrationLog.create({
              data: { integrationId: integration.id, action: 'PULL_CUSTOMER', status: 'success', message: 'Cập nhật thông tin từ Odoo', recordId: existing.id }
            });
          }
        } else {
          const { code, shortCode } = await this.customerHelper.generateNextCode(tx, user.tenantId);

          const created = await tx.customer.create({
            data: {
              tenantId: user.tenantId,
              odooPartnerId: String(partner.id),
              code,
              shortCode,
              name: partner.name || 'Khách hàng từ Odoo',
              email: partner.email || null,
              phone: partner.phone || null,
              address: partner.street || null,
              type: partner.is_company ? 'business' : 'personal',
              status: 'active',
              sourceName: 'Đồng bộ từ Odoo',
              createdBy: user.sub,
            }
          });
          createdCount++;
          await tx.integrationLog.create({
            data: { integrationId: integration.id, action: 'PULL_CUSTOMER', status: 'success', message: 'Tạo mới khách hàng từ Odoo', recordId: created.id }
          });
        }
      }

      await tx.integration.update({
        where: { id: integration.id },
        data: { lastSyncedAt: new Date() }
      });
    });

    return { count: createdCount + updatedCount, message: `Đã kéo về ${createdCount} khách hàng mới và cập nhật ${updatedCount} khách hàng.` };
  }
}