import { Controller, Sse, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { RealtimeService } from './realtime.service';
import { Public } from '../common/auth';
import { Observable } from 'rxjs';

@ApiTags('realtime')
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Public()
  @Sse('stream')
  @ApiOperation({ summary: 'Kết nối Server-Sent Events (SSE) để nhận thông báo realtime' })
  @ApiCookieAuth('accessToken')
  stream(@Req() req: Request): Promise<Observable<MessageEvent>> {
    const token = req.cookies['accessToken'];
    return this.realtimeService.getStream(token);
  }
}