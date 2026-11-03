import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { OdooService } from './odoo.service';
import { IntegrationManager } from './integration.manager';

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, OdooService, IntegrationManager],
  exports: [IntegrationsService, OdooService, IntegrationManager],
})
export class IntegrationsModule {}