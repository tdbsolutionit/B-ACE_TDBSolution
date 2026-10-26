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
    const token = req.cookies['accessToken'];

    if (!token) {
      throw new UnauthorizedException('Thiếu cookie xác thực');
    }

    try {
      const payload = this.jwt.verify<RealtimeTokenPayload>(token);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { tokenVersion: true },
      });

      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn hoặc bị thu hồi');
      }
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders(); 
      this.realtime.addConnection(payload.tenantId, payload.sub, res);

      req.on('close', () => {
        this.realtime.removeConnection(payload.tenantId, payload.sub, res);
        res.end();
      });

    } catch (error) {
      if (!res.headersSent) {
        throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
      } else {
        res.end();
      }
    }
  }
}