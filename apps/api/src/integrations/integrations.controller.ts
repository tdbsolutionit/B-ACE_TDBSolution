import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthUser, Roles } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { IntegrationsService } from './integrations.service';
import { UpdateOdooConfigDto } from './dto/integrations.dto';
import { IntegrationManager } from './integration.manager';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly integrationManager: IntegrationManager,
  ) {}

  @Get('odoo')
  getOdooConfig(@CurrentUser() user: AuthUser) {
    return this.integrationsService.getOdooConfig(user);
  }

  @Post('odoo')
  @Roles('admin')
  saveOdooConfig(@CurrentUser() user: AuthUser, @Body() dto: UpdateOdooConfigDto) {
    return this.integrationsService.saveOdooConfig(user, dto);
  }

  @Post('odoo/test')
  @Roles('admin')
  testOdooConnection(@Body() dto: UpdateOdooConfigDto) {
    return this.integrationsService.testOdooConnection(dto);
  }

  @Post('odoo/sync-now')
  @Roles('admin')
  @ApiOperation({ summary: 'Kích hoạt đồng bộ toàn bộ khách hàng sang Odoo ngay lập tức' })
  async syncOdooNow(@CurrentUser() user: AuthUser) {
    return this.integrationManager.manualSyncAllCustomers(user);
  }
}