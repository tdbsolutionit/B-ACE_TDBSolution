import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { OpportunitiesService } from './opportunities.service';
import { OpportunityDto, OpportunityPatchDto, MoveDto } from './dto/opportunity.dto';

@ApiTags('opportunities')
@ApiBearerAuth()
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get('stages')
  getStages(@CurrentUser() user: AuthUser) {
    return this.opportunitiesService.getStages(user);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser, 
    @Query('q') q?: string, 
    @Query('customerId') customerId?: string
  ) {
    return this.opportunitiesService.findAll(user, q, customerId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.opportunitiesService.findOne(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: OpportunityDto) {
    return this.opportunitiesService.create(user, dto);
  }

  @Post('import')
  importOpportunities(@CurrentUser() user: AuthUser, @Body() body: { rows: any[] }) {
    return this.opportunitiesService.importOpportunities(user, body.rows);
  }

  @Patch(':id/stage')
  move(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MoveDto) {
    return this.opportunitiesService.move(user, id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: OpportunityPatchDto) {
    return this.opportunitiesService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.opportunitiesService.remove(user, id);
  }
}