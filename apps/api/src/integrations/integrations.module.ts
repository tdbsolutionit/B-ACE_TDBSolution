import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { OdooService } from './odoo.service';
import { IntegrationManager } from './integration.manager';
import { IntegrationListener } from './integration.listener';
import { IntegrationCron } from './integration.cron';
import { OdooSyncProcessor } from './processors/odoo-sync.processor';
import { CustomerHelperService } from '../customers/services/customer-helper.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'odoo-sync',
    }),
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService, 
    OdooService, 
    IntegrationManager,
    IntegrationListener,
    IntegrationCron,
    OdooSyncProcessor,
    CustomerHelperService,
  ],
  exports: [IntegrationsService, OdooService, IntegrationManager],
})
export class IntegrationsModule {}