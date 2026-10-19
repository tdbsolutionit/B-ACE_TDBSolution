import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { CustomersService } from './customers.service';
import { CustomerDto, CustomerPatchDto, ImportDto, BulkAssignDto, BulkStatusDto, BulkDeleteDto } from './dto/customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string, @Query('status') status?: string, @Query('tab') tab?: string) {
    return this.customersService.list(user, q, status, tab);
  }

  @Get('duplicates')
  duplicates(@CurrentUser() user: AuthUser, @Query('phone') phone?: string, @Query('email') email?: string, @Query('exclude') exclude?: string) {
    return this.customersService.duplicates(user, phone, email, exclude);
  }

  @Post('import')
  import(@CurrentUser() user: AuthUser, @Body() dto: ImportDto) {
    return this.customersService.import(user, dto);
  }

  @Post('bulk-assign')
  bulkAssign(@CurrentUser() user: AuthUser, @Body() dto: BulkAssignDto) {
    return this.customersService.bulkAssign(user, dto);
  }

  @Post('bulk-status')
  bulkStatus(@CurrentUser() user: AuthUser, @Body() dto: BulkStatusDto) {
    return this.customersService.bulkStatus(user, dto);
  }

  @Post('bulk-delete')
  bulkDelete(@CurrentUser() user: AuthUser, @Body() dto: BulkDeleteDto) {
    return this.customersService.bulkDelete(user, dto);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CustomerDto) {
    return this.customersService.create(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customersService.get(user, id);
  }

  @Post(':id/convert')
  convert(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customersService.convert(user, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CustomerPatchDto) {
    return this.customersService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customersService.remove(user, id);
  }
}