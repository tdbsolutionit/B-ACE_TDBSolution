import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';
import { Public } from '../common/auth';

@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly realtime: RealtimeService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Get('stream')
  stream(@Req() req: Request, @Res() res: Response) {
    // CORS
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Verify token từ query (EventSource không gửi được header)
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) {
      res.status(401).json({ message: 'Missing token' });
      return;
    }

    let userId: string;
    let tenantId: string;
    try {
      const payload = this.jwt.verify(token) as { sub: string; tenantId: string };
      userId = payload.sub;
      tenantId = payload.tenantId;
    } catch {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Ping mỗi 25s
    const ping = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    // Hello
    res.write(`event: hello\ndata: {"userId":"${userId}"}\n\n`);

    // Subscribe
    const sub = this.realtime.asObservable().subscribe((event) => {
      if (event.userId && event.userId !== userId) return;
      if (event.tenantId && event.tenantId !== tenantId) return;
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on('close', () => {
      clearInterval(ping);
      sub.unsubscribe();
      res.end();
    });
  }
}
