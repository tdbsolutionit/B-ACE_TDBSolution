import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomersCrudService } from './services/customers-crud.service';
import { CustomersBulkService } from './services/customers-bulk.service';
import { CustomersImportService } from './services/customers-import.service';
import { CustomerHelperService } from './services/customer-helper.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomersCrudService,
    CustomersBulkService,
    CustomersImportService,
    CustomerHelperService,
  ],
  exports: [CustomersService]
})
export class CustomersModule {}