import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export type RealtimeEvent = {
  type: string;
  payload: any;
  userId?: string;
  tenantId?: string;
  at: string;
};

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('Realtime');
  private readonly events$ = new Subject<RealtimeEvent>();

  /** Emit event tới tất cả subscriber đang mở SSE */
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

  /** Observable để controller subscribe */
  asObservable(): Observable<RealtimeEvent> {
    return this.events$.asObservable();
  }
}