import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { RealtimeService } from './realtime.service';
import { Public } from '../common/auth';

@ApiTags('realtime')
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Public()
  @Get('stream')
  @ApiOperation({ summary: 'Kết nối Server-Sent Events (SSE) để nhận thông báo realtime' })
  @ApiCookieAuth('accessToken')
  async stream(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies['accessToken'];
    await this.realtimeService.handleStreamConnection(token, req, res);
  }
}