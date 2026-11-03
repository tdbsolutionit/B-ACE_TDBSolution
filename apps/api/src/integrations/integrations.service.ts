import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth';
import { OdooService, OdooConfig } from './odoo.service';
import { UpdateOdooConfigDto } from './dto/integrations.dto';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly odooService: OdooService,
  ) {}

  async getOdooConfig(user: AuthUser) {
    const integration = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.integration.findUnique({
        where: { tenantId_provider: { tenantId: user.tenantId, provider: 'odoo' } },
      }),
    );

    if (!integration) return null;
    const config = integration.config as any;
    
    return {
      url: config.url,
      db: config.db,
      username: config.username,
      password: config.password,
      isActive: integration.isActive,
      lastSyncedAt: integration.lastSyncedAt,
      syncStatus: integration.syncStatus,
      errorMessage: integration.errorMessage,
    } as OdooConfig & { isActive: boolean; lastSyncedAt: Date | null; syncStatus: string; errorMessage: string | null };
  }

  async getActiveIntegrations(user: AuthUser) {
    const integrations = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.integration.findMany({
        where: { tenantId: user.tenantId, isActive: true },
      }),
    );

    return integrations.map((i) => ({
      provider: i.provider,
      config: i.config as any,
    }));
  }

  async saveOdooConfig(user: AuthUser, dto: UpdateOdooConfigDto) {
    const config = { url: dto.url, db: dto.db, username: dto.username, password: dto.password };
    
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.integration.upsert({
        where: { tenantId_provider: { tenantId: user.tenantId, provider: 'odoo' } },
        update: { config, isActive: dto.isActive ?? true },
        create: { tenantId: user.tenantId, provider: 'odoo', config, isActive: dto.isActive ?? true },
      }),
    );
  }

  async testOdooConnection(dto: UpdateOdooConfigDto) {
    const config: OdooConfig = { url: dto.url, db: dto.db, username: dto.username, password: dto.password };
    try {
      const uid = await this.odooService.authenticate(config);
      return { success: true, message: `Kết nối thành công! UID: ${uid}` };
    } catch (error: any) {
      return { success: false, message: error.message || 'Lỗi kết nối đến Odoo' };
    }
  }

  async updateSyncStatus(user: AuthUser, status: string, errorMessage?: string) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.integration.update({
        where: { tenantId_provider: { tenantId: user.tenantId, provider: 'odoo' } },
        data: {
          syncStatus: status,
          lastSyncedAt: status === 'success' ? new Date() : undefined,
          errorMessage: errorMessage || null,
        },
      }),
    );
  }

  async logSync(user: AuthUser, integrationId: string, action: string, status: string, message: string) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.integrationLog.create({
        data: {
          integrationId,
          action,
          status,
          message,
        },
      }),
    );
  }
}