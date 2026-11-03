import { HttpStatus } from '@nestjs/common';
import { BaseBusinessException } from './base.exception';

export class OdooConnectionException extends BaseBusinessException {
  constructor(message = 'Không thể kết nối đến Odoo') {
    super(message, 'INTEGRATION_ODOO_CONNECTION_FAILED', HttpStatus.BAD_GATEWAY);
  }
}

export class IntegrationConfigMissingException extends BaseBusinessException {
  constructor() {
    super('Chưa cấu hình thông tin tích hợp', 'INTEGRATION_CONFIG_MISSING', HttpStatus.BAD_REQUEST);
  }
}