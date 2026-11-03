import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto } from './dto/teams.dto';

@ApiTags('teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.teamsService.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateTeamDto) {
    return this.teamsService.create(user, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateTeamDto,
  ) {
    return this.teamsService.update(user, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.teamsService.remove(user, id);
  }
}