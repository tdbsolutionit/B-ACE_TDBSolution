import { Body, Controller, Get, Param, Patch, Post, Query, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { QuotesService } from './quotes.service';
import { QuoteDto, QuoteItemsDto, StatusDto } from './dto/quotes.dto';
import { BulkDeleteDto } from '../common/dto/bulk-delete.dto';

@ApiTags('quotes')
@ApiBearerAuth()
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách báo giá (Hỗ trợ lọc & sắp xếp)' })
  @ApiQuery({ name: 'q', required: false, description: 'Tìm theo số báo giá hoặc tiêu đề' })
  @ApiQuery({ name: 'status', required: false, description: 'Lọc theo trạng thái', enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'] })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Trường sắp xếp', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Chiều sắp xếp' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.quotesService.list(user, q, status, sortBy, sortOrder);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết báo giá' })
  @ApiParam({ name: 'id', description: 'ID của báo giá' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.get(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo báo giá mới (Dạng nháp)' })
  @ApiBody({ type: QuoteDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: QuoteDto) {
    return this.quotesService.create(user, dto);
  }

  @Patch(':id/items')
  @ApiOperation({ summary: 'Cập nhật danh sách hạng mục của báo giá' })
  @ApiParam({ name: 'id', description: 'ID của báo giá' })
  @ApiBody({ type: QuoteItemsDto })
  saveItems(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: QuoteItemsDto) {
    return this.quotesService.saveItems(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái báo giá' })
  @ApiParam({ name: 'id', description: 'ID của báo giá' })
  @ApiBody({ type: StatusDto })
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: StatusDto) {
    return this.quotesService.setStatus(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa báo giá' })
  @ApiParam({ name: 'id', description: 'ID của báo giá cần xóa' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.remove(user, id);
  }
  
  @Post('bulk-delete')
  @ApiOperation({ summary: 'Xóa hàng loạt báo giá' })
  @ApiBody({ type: BulkDeleteDto })
  bulkDelete(@CurrentUser() user: AuthUser, @Body() dto: BulkDeleteDto) {
    return this.quotesService.bulkDelete(user, dto.ids);
  }
}