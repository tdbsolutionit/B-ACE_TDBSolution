import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { IntegrationManager } from '../integration.manager';

@Processor('odoo-sync')
export class OdooSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(OdooSyncProcessor.name);

  constructor(private readonly integrationManager: IntegrationManager) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { type, data, config, integrationId } = job.data;
    
    try {
      if (type === 'customer') {
        const odooId = await this.integrationManager.syncSingleCustomer(data, config, integrationId);
        this.logger.log(`[Queue] Đã đồng bộ khách hàng: ${data.name}`);
        return odooId;
      } 
      
      if (type === 'user') {
        const odooId = await this.integrationManager.syncSingleUser(data, config, integrationId);
        this.logger.log(`[Queue] Đã đồng bộ nhân viên: ${data.name}`);
        return odooId;
      }
    } catch (error: any) {
      this.logger.error(`[Queue] Lỗi đồng bộ ${type} ${data.name}: ${error.message}`);
      throw error; 
    }
  }
}