import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { Response } from 'express';

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
  private clients = new Map<string, Set<Response>>();

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