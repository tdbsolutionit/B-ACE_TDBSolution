import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string, @Query('opportunityId') opportunityId?: string) {
    return this.quotesService.list(user, q, opportunityId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: QuoteDto) {
    return this.quotesService.create(user, dto);
  }

  @Patch(':id/items')
  saveItems(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: QuoteItemsDto) {
    return this.quotesService.saveItems(user, id, dto);
  }

  @Patch(':id/status')
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: StatusDto) {
    return this.quotesService.setStatus(user, id, dto);
  }
}