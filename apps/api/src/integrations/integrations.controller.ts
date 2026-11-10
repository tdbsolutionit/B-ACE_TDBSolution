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
  @ApiOperation({ summary: 'Lấy cấu hình kết nối Odoo hiện tại' })
  getOdooConfig(@CurrentUser() user: AuthUser) {
    return this.integrationsService.getOdooConfig(user);
  }

  @Post('odoo')
  @Roles('admin')
  @ApiOperation({ summary: 'Lưu cấu hình kết nối Odoo' })
  saveOdooConfig(@CurrentUser() user: AuthUser, @Body() dto: UpdateOdooConfigDto) {
    return this.integrationsService.saveOdooConfig(user, dto);
  }

  @Post('odoo/test')
  @Roles('admin')
  @ApiOperation({ summary: 'Kiểm tra kết nối tới Odoo (Test Connection)' })
  testOdooConnection(@Body() dto: UpdateOdooConfigDto) {
    return this.integrationsService.testOdooConnection(dto);
  }

  @Post('odoo/sync-now')
  @Roles('admin')
  @ApiOperation({ summary: 'Đồng bộ các khách hàng MỚI (chưa có ID Odoo) sang Odoo' })
  async syncOdooNow(@CurrentUser() user: AuthUser) {
    return this.integrationManager.manualSyncAllCustomers(user);
  }

  @Post('odoo/sync-users')
  @Roles('admin')
  @ApiOperation({ summary: 'Đồng bộ toàn bộ nhân viên sang Odoo' })
  async syncUsers(@CurrentUser() user: AuthUser) {
    return this.integrationManager.syncAllUsers(user);
  }

  @Post('odoo/repair-sync')
  @Roles('admin')
  @ApiOperation({ summary: 'Quét toàn bộ và phục hồi dữ liệu bị xóa bên Odoo (Repair Sync)' })
  async repairSync(@CurrentUser() user: AuthUser) {
    return this.integrationManager.repairSyncAllCustomers(user);
  }

  @Get('odoo/logs')
  @ApiOperation({ summary: 'Lấy lịch sử lỗi đồng bộ' })
  getLogs(@CurrentUser() user: AuthUser) {
    return this.integrationManager.getLogs(user);
  }

  @Post('odoo/pull-now')
  @Roles('admin')
  @ApiOperation({ summary: 'Kéo dữ liệu cập nhật từ Odoo về CRM' })
  async pullOdooData(@CurrentUser() user: AuthUser) {
    return this.integrationManager.pullCustomersFromOdoo(user);
  }
}