import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { StagesService } from './stages.service';
import { ReplaceStagesDto } from './dto/stages.dto';

@ApiTags('stages')
@ApiBearerAuth()
@Controller('stages')
export class StagesController {
  constructor(private readonly stagesService: StagesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.stagesService.list(user);
  }

  @Put()
  replaceAll(@CurrentUser() user: AuthUser, @Body() dto: ReplaceStagesDto) {
    return this.stagesService.replaceAll(user, dto.stages);
  }
}