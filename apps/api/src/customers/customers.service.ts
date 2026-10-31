import { Injectable } from '@nestjs/common';
import { AuthUser } from '../common/auth';
import { CustomerDto, CustomerPatchDto, ImportDto, BulkAssignDto, BulkStatusDto, BulkDeleteDto } from './dto/customer.dto';
import { CustomersCrudService } from './services/customers-crud.service';
import { CustomersBulkService } from './services/customers-bulk.service';
import { CustomersImportService } from './services/customers-import.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly crudService: CustomersCrudService,
    private readonly bulkService: CustomersBulkService,
    private readonly importService: CustomersImportService,
  ) {}

  list(user: AuthUser, q?: string, status?: string, tab?: string, page?: number, limit?: number) {
    return this.crudService.list(user, q, status, tab, page, limit);
  }

  get(user: AuthUser, id: string) {
    return this.crudService.get(user, id);
  }

  create(user: AuthUser, dto: CustomerDto) {
    return this.crudService.create(user, dto);
  }

  update(user: AuthUser, id: string, dto: CustomerPatchDto, fromOdoo?: boolean) {
    return this.crudService.update(user, id, dto, fromOdoo);
  }

  remove(user: AuthUser, id: string) {
    return this.crudService.remove(user, id);
  }

  convert(user: AuthUser, id: string) {
    return this.crudService.convert(user, id);
  }

  duplicates(user: AuthUser, phone?: string, email?: string, exclude?: string) {
    return this.crudService.duplicates(user, phone, email, exclude);
  }

  import(user: AuthUser, dto: ImportDto) {
    return this.importService.import(user, dto);
  }

  bulkAssign(user: AuthUser, dto: BulkAssignDto) {
    return this.bulkService.bulkAssign(user, dto);
  }

  bulkStatus(user: AuthUser, dto: BulkStatusDto) {
    return this.bulkService.bulkStatus(user, dto);
  }

  bulkDelete(user: AuthUser, dto: BulkDeleteDto) {
    return this.bulkService.bulkDelete(user, dto);
  }
}