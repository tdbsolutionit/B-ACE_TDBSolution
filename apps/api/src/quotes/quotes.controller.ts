import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { QuotesService } from './quotes.service';
import { QuoteDto, QuoteItemsDto, StatusDto } from './dto/quotes.dto';

@ApiTags('quotes')
@ApiBearerAuth()
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách báo giá / đề xuất' })
  @ApiQuery({ name: 'q', required: false, description: 'Từ khóa tìm kiếm', example: 'Báo giá ERP' })
  @ApiQuery({ name: 'opportunityId', required: false, description: 'Lọc theo ID dự án', example: '123e4567-e89b-12d3-a456-426614174000' })
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string, @Query('opportunityId') opportunityId?: string) {
    return this.quotesService.list(user, q, opportunityId);
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
}