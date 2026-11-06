import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
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

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async getStream(token: string): Promise<Observable<MessageEvent>> {
    if (!token) {
      throw new UnauthorizedException('Thiếu cookie xác thực');
    }

    let payload: RealtimeTokenPayload;
    try {
      payload = this.jwt.verify<RealtimeTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn hoặc bị thu hồi');
    }

    return new Observable((subscriber) => {
      subscriber.next({ data: { type: 'connected' } } as MessageEvent);

      const subscription = this.events$.subscribe((event) => {
        if (event.tenantId === payload.tenantId) {
          subscriber.next({ data: event } as MessageEvent);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    });
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
  }
}