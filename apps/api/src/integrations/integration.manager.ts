import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { OdooService } from './odoo.service';
import { AuthUser } from '../common/auth';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationManager {
  private readonly logger = new Logger(IntegrationManager.name);

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly odooService: OdooService,
    private readonly prisma: PrismaService,
  ) {}

  async syncCustomerToAll(customer: any, user: AuthUser): Promise<string | null> {
    const activeIntegrations = await this.integrationsService.getActiveIntegrations(user);
    let odooPartnerId: string | null = null;

    for (const integration of activeIntegrations) {
      try {
        if (integration.provider === 'odoo') {
          const id = await this.odooService.syncCustomer(customer, integration.config);
          if (id) odooPartnerId = id;
        }
      } catch (error) {
        this.logger.error(`Lỗi đồng bộ sang ${integration.provider}`, error);
      }
    }

    return odooPartnerId;
  }

  async manualSyncAllCustomers(user: AuthUser) {
    const integration = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.integration.findUnique({
        where: { tenantId_provider: { tenantId: user.tenantId, provider: 'odoo' } },
      }),
    );

    if (!integration || !integration.isActive) {
      throw new BadRequestException('Chưa cấu hình hoặc chưa bật đồng bộ Odoo');
    }

    await this.integrationsService.updateSyncStatus(user, 'syncing');

    try {
      const customers = await this.prisma.withTenant(user.tenantId, (tx) =>
        tx.customer.findMany({
          where: { tenantId: user.tenantId, odooPartnerId: null },
        }),
      );

      let successCount = 0;

      for (const customer of customers) {
        const odooId = await this.odooService.syncCustomer(customer, integration.config as any);
        
        if (odooId) {
          await this.prisma.withTenant(user.tenantId, (tx) =>
            tx.customer.update({
              where: { id: customer.id },
              data: { odooPartnerId: odooId },
            }),
          );
          successCount++;
        }
      }

      const message = `Đã đồng bộ thành công ${successCount}/${customers.length} khách hàng.`;
      await this.integrationsService.updateSyncStatus(user, 'success');
      await this.integrationsService.logSync(user, integration.id, 'sync_all', 'success', message);

      return { success: true, count: successCount };

    } catch (error: any) {
      const errorMsg = error.message || 'Lỗi không xác định khi đồng bộ';
      await this.integrationsService.updateSyncStatus(user, 'error', errorMsg);
      await this.integrationsService.logSync(user, integration.id, 'sync_all', 'failed', errorMsg);
      
      throw error;
    }
  }
}