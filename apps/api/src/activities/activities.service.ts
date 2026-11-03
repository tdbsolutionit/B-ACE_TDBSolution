import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, scope } from '../common/auth';
import { ActivityDto } from './dto/activities.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, relatedType?: string, relatedId?: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const rows = await tx.activity.findMany({
        where: scope(user.tenantId, {
          ...(relatedType ? { relatedType } : {}),
          ...(relatedId ? { relatedId } : {}),
        }),
        orderBy: { createdAt: 'desc' },
        take: 40,
      });
      const users = await tx.user.findMany({ 
        where: scope(user.tenantId), 
        select: { id: true, name: true } 
      });
      const names = new Map(users.map((item) => [item.id, item.name]));
      
      return rows.map((row) => ({
        id: row.id,
        type: row.type,
        subject: row.subject,
        content: row.content,
        relatedType: row.relatedType,
        relatedId: row.relatedId,
        owner: row.userId ? names.get(row.userId) ?? '' : '',
        createdAt: row.createdAt,
      }));
    });
  }

  async create(user: AuthUser, dto: ActivityDto) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.activity.create({
        data: {
          tenantId: user.tenantId,
          type: dto.type,
          subject: dto.subject,
          content: dto.content,
          relatedType: dto.relatedType,
          relatedId: dto.relatedId,
          userId: user.sub,
        },
      }),
    );
  }
}