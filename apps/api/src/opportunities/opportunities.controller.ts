import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { OpportunitiesService } from './opportunities.service';
import { OpportunityDto, OpportunityPatchDto, MoveDto } from './dto/opportunity.dto';

@ApiTags('opportunities')
@ApiBearerAuth()
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) { }

  @Get('stages')
  @ApiOperation({ summary: 'Lấy danh sách các giai đoạn (Stages)' })
  getStages(@CurrentUser() user: AuthUser) {
    return this.opportunitiesService.getStages(user);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách cơ hội / dự án' })
  @ApiQuery({ name: 'q', required: false, description: 'Từ khóa tìm kiếm', example: 'Dự án ERP' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Lọc theo ID khách hàng', example: '123e4567-e89b-12d3-a456-426614174000' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('customerId') customerId?: string
  ) {
    return this.opportunitiesService.findAll(user, q, customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một cơ hội / dự án' })
  @ApiParam({ name: 'id', description: 'ID của cơ hội / dự án' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.opportunitiesService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo cơ hội / dự án mới' })
  @ApiBody({ type: OpportunityDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: OpportunityDto) {
    return this.opportunitiesService.create(user, dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import danh sách cơ hội / dự án' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        rows: { type: 'array', items: { type: 'object' }, description: 'Mảng dữ liệu dự án' } 
      } 
    } 
  })
  importOpportunities(@CurrentUser() user: AuthUser, @Body() body: { rows: any[] }) {
    return this.opportunitiesService.importOpportunities(user, body.rows);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Chuyển đổi giai đoạn (Kéo thả Kanban)' })
  @ApiParam({ name: 'id', description: 'ID của cơ hội / dự án' })
  @ApiBody({ type: MoveDto })
  move(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MoveDto) {
    return this.opportunitiesService.move(user, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin cơ hội / dự án' })
  @ApiParam({ name: 'id', description: 'ID của cơ hội / dự án' })
  @ApiBody({ type: OpportunityPatchDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: OpportunityPatchDto) {
    return this.opportunitiesService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa cơ hội / dự án' })
  @ApiParam({ name: 'id', description: 'ID của cơ hội / dự án' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.opportunitiesService.remove(user, id);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Xóa hàng loạt cơ hội / dự án' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        ids: { type: 'array', items: { type: 'string' }, example: ['uuid-1', 'uuid-2'] } 
      } 
    } 
  })
  bulkDelete(@CurrentUser() user: AuthUser, @Body() body: { ids: string[] }) {
    return this.opportunitiesService.bulkDelete(user, body.ids);
  }

  @Post('bulk-status')
  @ApiOperation({ summary: 'Cập nhật trạng thái hàng loạt' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        ids: { type: 'array', items: { type: 'string' }, example: ['uuid-1', 'uuid-2'] },
        status: { type: 'string', enum: ['open', 'won', 'lost'], example: 'won' }
      } 
    } 
  })
  bulkStatus(@CurrentUser() user: AuthUser, @Body() body: { ids: string[]; status: 'open' | 'won' | 'lost' }) {
    return this.opportunitiesService.bulkStatus(user, body.ids, body.status);
  }

  @Post('bulk-assign')
  @ApiOperation({ summary: 'Gán hàng loạt cơ hội / dự án cho nhân viên' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        ids: { type: 'array', items: { type: 'string' }, example: ['uuid-1', 'uuid-2'] },
        assignedTo: { type: 'string', description: 'ID của nhân viên', example: 'user-uuid' }
      } 
    } 
  })
  bulkAssign(@CurrentUser() user: AuthUser, @Body() body: { ids: string[]; assignedTo: string }) {
    return this.opportunitiesService.bulkAssign(user, body.ids, body.assignedTo);
  }
}