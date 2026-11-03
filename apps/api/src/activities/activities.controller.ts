import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { ActivitiesService } from './activities.service';
import { ActivityDto } from './dto/activities.dto';

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('relatedType') relatedType?: string,
    @Query('relatedId') relatedId?: string,
  ) {
    return this.activitiesService.list(user, relatedType, relatedId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: ActivityDto) {
    return this.activitiesService.create(user, dto);
  }
}