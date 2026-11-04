import { HttpStatus } from '@nestjs/common';
import { BaseBusinessException } from './base.exception';

export class CustomerHasActiveProjectsException extends BaseBusinessException {
  constructor(customerName: string) {
    super(
      `Khách hàng ${customerName} đang có dự án hoạt động, không thể xóa`, 
      'CUSTOMER_HAS_ACTIVE_PROJECTS', 
      HttpStatus.CONFLICT
    );
  }
}

export class DuplicateCustomerException extends BaseBusinessException {
  constructor(message: string = 'Số điện thoại hoặc Email này đã tồn tại trong hệ thống.') {
    super(
      message, 
      'DUPLICATE_CUSTOMER', 
      HttpStatus.CONFLICT
    );
  }
}