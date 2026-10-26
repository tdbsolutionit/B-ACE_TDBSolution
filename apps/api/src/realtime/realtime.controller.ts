
import {
  Controller,
  Get,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';
import { Public } from '../common/auth';
import { PrismaService } from '../prisma/prisma.service';

type RealtimeTokenPayload = {
  sub: string;
  tenantId: string;
  tokenVersion: number;
};

@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly realtime: RealtimeService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('stream')
  async stream(@Req() req: Request, @Res() res: Response) {
    // Xác thực bằng HttpOnly Cookie, không nhận token qua URL.
    const token = req.cookies?.accessToken;

    if (typeof token !== 'string' || !token) {
      res.status(401).json({ message: 'Chưa đăng nhập' });
      return;
    }

    let payload: RealtimeTokenPayload;

    try {
      payload = this.jwt.verify<RealtimeTokenPayload>(token, {
        secret: process.env.JWT_SECRET,
      });

      if (
        !payload.sub ||
        !payload.tenantId ||
        typeof payload.tokenVersion !== 'number'
      ) {
        throw new UnauthorizedException('Token không hợp lệ');
      }
    } catch {
      res.status(401).json({ message: 'Token không hợp lệ hoặc hết hạn' });
      return;
    }

    // Kiểm tra tài khoản và phiên đăng nhập vẫn còn hiệu lực.
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        tenantId: payload.tenantId,
        status: 'active',
      },
      select: {
        id: true,
        tokenVersion: true,
      },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      res.status(401).json({
        message: 'Phiên đăng nhập đã hết hạn hoặc bị thu hồi',
      });
      return;
    }

    const userId = payload.sub;
    const tenantId = payload.tenantId;

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const ping = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': ping\n\n');
      }
    }, 25000);

    res.write(
      `event: hello\ndata: ${JSON.stringify({ userId })}\n\n`,
    );

    const sub = this.realtime.asObservable().subscribe((event) => {
      if (event.userId && event.userId !== userId) return;
      if (event.tenantId && event.tenantId !== tenantId) return;
      if (res.writableEnded || res.destroyed) return;

      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on('close', () => {
      clearInterval(ping);
      sub.unsubscribe();
      if (!res.writableEnded) {
        res.end();
      }
    });
  }
}
