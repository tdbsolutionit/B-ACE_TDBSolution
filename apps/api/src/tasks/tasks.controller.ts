import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { TasksService } from './tasks.service';
import { TaskDto, UpdateTaskDto } from './dto/tasks.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.tasksService.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: TaskDto) {
    return this.tasksService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user, id, dto);
  }
}