import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationListener {
  private readonly logger = new Logger(IntegrationListener.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('odoo-sync') private readonly odooQueue: Queue,
  ) {}

  @OnEvent('customer.sync.odoo', { async: true })
  async handleCustomerSync(payload: { customer: any; user: any }) {
    const { customer, user } = payload;

    const integration = await this.prisma.integration.findFirst({
      where: { tenantId: user.tenantId, provider: 'odoo', isActive: true }
    });

    if (!integration) return;

    await this.odooQueue.add(
      'sync-customer', 
      { 
        type: 'customer', 
        data: customer, 
        config: integration.config,
        integrationId: integration.id
      },
      { 
        attempts: 3, 
        backoff: { type: 'exponential', delay: 2000 }, 
        removeOnComplete: true 
      }
    );
    
    this.logger.log(`[Queue] Đã đưa khách hàng ${customer.name} vào hàng đợi.`);
  }

  @OnEvent('user.sync.odoo', { async: true })
  async handleUserSync(payload: { userData: any; currentUser: any }) {
    const { userData, currentUser } = payload;

    const integration = await this.prisma.integration.findFirst({
      where: { tenantId: currentUser.tenantId, provider: 'odoo', isActive: true }
    });

    if (!integration) return;

    await this.odooQueue.add(
      'sync-user', 
      { 
        type: 'user', 
        data: userData, 
        config: integration.config,
        integrationId: integration.id
      },
      { 
        attempts: 3, 
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true 
      }
    );

    this.logger.log(`[Queue] Đã đưa nhân viên ${userData.name} vào hàng đợi.`);
  }
}