import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

export type RealtimeEvent = {
  type: string;
  payload: any;
  userId?: string;
  tenantId?: string;
  at: string;
};

type RealtimeTokenPayload = {
  sub: string;
  tenantId: string;
  tokenVersion: number;
};

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('Realtime');
  private readonly events$ = new Subject<RealtimeEvent>();
  private clients = new Map<string, Set<Response>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleStreamConnection(token: string, req: Request, res: Response) {
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
      
      this.addConnection(payload.tenantId, payload.sub, res);

      req.on('close', () => {
        this.removeConnection(payload.tenantId, payload.sub, res);
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

  emit(type: string, payload: any, opts?: { userId?: string; tenantId?: string }) {
    const event: RealtimeEvent = {
      type,
      payload,
      userId: opts?.userId,
      tenantId: opts?.tenantId,
      at: new Date().toISOString(),
    };
    
    this.logger.log(`→ ${type}${opts?.userId ? ` (user: ${opts.userId})` : ''}`);
    
    this.events$.next(event);

    if (opts?.tenantId) {
      const tenantClients = this.clients.get(opts.tenantId);
      if (tenantClients) {
        const sseMessage = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
        tenantClients.forEach((res) => {
          try {
            res.write(sseMessage);
          } catch (err) {
            this.logger.error('Lỗi khi gửi SSE tới client', err);
          }
        });
      }
    }
  }

  asObservable(): Observable<RealtimeEvent> {
    return this.events$.asObservable();
  }

  addConnection(tenantId: string, userId: string, res: Response) {
    if (!this.clients.has(tenantId)) {
      this.clients.set(tenantId, new Set());
    }
    this.clients.get(tenantId)!.add(res);
  }

  removeConnection(tenantId: string, userId: string, res: Response) {
    const tenantClients = this.clients.get(tenantId);
    if (tenantClients) {
      tenantClients.delete(res);
      if (tenantClients.size === 0) {
        this.clients.delete(tenantId);
      }
    }
  }
}