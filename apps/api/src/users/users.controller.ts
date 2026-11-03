import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, Roles } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { UsersService } from './users.service';
import { UserDto, MeDto } from './dto/users.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.usersService.list(user);
  }

  @Post()
  @Roles('admin')
  create(@CurrentUser() user: AuthUser, @Body() dto: UserDto) {
    return this.usersService.create(user, dto);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: MeDto) {
    return this.usersService.updateMe(user, dto);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UserDto,
  ) {
    return this.usersService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.remove(user, id);
  }
}