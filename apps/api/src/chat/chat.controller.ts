import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { ChatService } from './chat.service';
import { SendMessageDto, EditMessageDto, ReactDto, CreateRoomDto, TypingDto } from './dto/chat.dto';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  rooms(@CurrentUser() user: AuthUser) {
    return this.chatService.rooms(user);
  }

  @Get('rooms/:id/messages')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('id') roomId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.messages(user, roomId, limit, before);
  }

  @Post('messages')
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.chatService.send(user, dto);
  }

  @Patch('messages/:id')
  edit(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatService.edit(user, id, dto);
  }

  @Delete('messages/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chatService.remove(user, id);
  }

  @Post('messages/:id/reactions')
  react(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReactDto,
  ) {
    return this.chatService.react(user, id, dto);
  }

  @Post('rooms')
  createRoom(@CurrentUser() user: AuthUser, @Body() dto: CreateRoomDto) {
    return this.chatService.createRoom(user, dto);
  }

  @Post('rooms/:id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') roomId: string) {
    return this.chatService.markRead(user, roomId);
  }

  @Post('typing')
  typing(@CurrentUser() user: AuthUser, @Body() dto: TypingDto) {
    return this.chatService.typing(user, dto);
  }

  @Get('users')
  users(@CurrentUser() user: AuthUser) {
    return this.chatService.users(user);
  }
}