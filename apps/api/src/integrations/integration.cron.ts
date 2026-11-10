import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationManager } from './integration.manager';
import { AuthUser } from '../common/auth';

@Injectable()
export class IntegrationCron {
  private readonly logger = new Logger(IntegrationCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationManager: IntegrationManager,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    this.logger.log('Bắt đầu quét dữ liệu chưa đồng bộ sang Odoo...');

    const integrations = await this.prisma.integration.findMany({
      where: { provider: 'odoo', isActive: true }
    });

    for (const integration of integrations) {
      const config = integration.config as any;
      const tenantId = integration.tenantId;

      const unSyncedCustomers = await this.prisma.customer.findMany({
        where: { tenantId, odooPartnerId: null },
        take: 50
      });

      for (const customer of unSyncedCustomers) {
        const odooId = await this.integrationManager.syncSingleCustomer(customer, config, integration.id);
        if (odooId) {
          await this.prisma.customer.update({
            where: { id: customer.id },
            data: { odooPartnerId: odooId }
          });
          this.logger.log(`[Cronjob] Đã đồng bộ bù khách hàng: ${customer.name}`);
        }
      }

      const unSyncedUsers = await this.prisma.user.findMany({
        where: { tenantId, odooUserId: null },
        take: 50
      });

      for (const u of unSyncedUsers) {
        const odooId = await this.integrationManager.syncSingleUser(u, config, integration.id);
        if (odooId) {
          await this.prisma.user.update({
            where: { id: u.id },
            data: { odooUserId: odooId }
          });
          this.logger.log(`[Cronjob] Đã đồng bộ bù nhân viên: ${u.name}`);
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async pullFromOdoo() {
    const integrations = await this.prisma.integration.findMany({
      where: { provider: 'odoo', isActive: true }
    });

    for (const integration of integrations) {
      try {
        const user = { tenantId: integration.tenantId } as AuthUser;
        await this.integrationManager.pullCustomersFromOdoo(user);
      } catch (error) {
        this.logger.error(`[Cronjob] Lỗi kéo dữ liệu Odoo: ${error}`);
      }
    }
  }
}