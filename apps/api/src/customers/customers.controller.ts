import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiOkResponse, ApiBody } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Lấy danh sách khách hàng' })
  @ApiQuery({ name: 'q', required: false, description: 'Từ khóa tìm kiếm' })
  @ApiQuery({ name: 'status', required: false, description: 'Trạng thái' })
  @ApiQuery({ name: 'tab', required: false, description: 'Tab hiển thị' })
  @ApiQuery({ name: 'page', required: false, description: 'Trang', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng/trang', example: 20 })
  list(
    @CurrentUser() user: AuthUser, 
    @Query('q') q?: string, 
    @Query('status') status?: string, 
    @Query('tab') tab?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.list(
      user, q, status, tab, 
      page ? parseInt(page) : 1, 
      limit ? parseInt(limit) : 20
    );
  }

  @Get('duplicates')
  @ApiOperation({ summary: 'Kiểm tra trùng lặp khách hàng' })
  duplicates(@CurrentUser() user: AuthUser, @Query('phone') phone?: string, @Query('email') email?: string, @Query('exclude') exclude?: string) {
    return this.customersService.duplicates(user, phone, email, exclude);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import khách hàng từ file' })
  import(@CurrentUser() user: AuthUser, @Body() dto: ImportDto) {
    return this.customersService.import(user, dto);
  }

  @Post('bulk-assign')
  @ApiOperation({ summary: 'Gán hàng loạt khách hàng cho nhân viên' })
  bulkAssign(@CurrentUser() user: AuthUser, @Body() dto: BulkAssignDto) {
    return this.customersService.bulkAssign(user, dto);
  }

  @Post('bulk-status')
  @ApiOperation({ summary: 'Cập nhật trạng thái hàng loạt' })
  bulkStatus(@CurrentUser() user: AuthUser, @Body() dto: BulkStatusDto) {
    return this.customersService.bulkStatus(user, dto);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Xóa hàng loạt khách hàng' })
  bulkDelete(@CurrentUser() user: AuthUser, @Body() dto: BulkDeleteDto) {
    return this.customersService.bulkDelete(user, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo khách hàng mới' })
  @ApiBody({ type: CustomerDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CustomerDto) {
    return this.customersService.create(user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết khách hàng' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customersService.get(user, id);
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Chuyển đổi Lead thành Khách hàng chính thức' })
  convert(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customersService.convert(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin khách hàng' })
  @ApiBody({ type: CustomerPatchDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CustomerPatchDto) {
    return this.customersService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa khách hàng' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.customersService.remove(user, id);
  }
}