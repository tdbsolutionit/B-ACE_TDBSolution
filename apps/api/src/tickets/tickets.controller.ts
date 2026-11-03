import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateTicketDto, UpdateTicketDto } from './dto/tickets.dto';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('customerId') customerId?: string) {
    return this.ticketsService.list(user, customerId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.ticketsService.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(user, id, dto);
  }
}