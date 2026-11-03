import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth';
import { StageDto } from './dto/stages.dto';

@Injectable()
export class StagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.stage.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          color: true,
          orderIndex: true,
          isWon: true,
          isLost: true,
        },
      }),
    );
  }

  async replaceAll(user: AuthUser, stages: StageDto[]) {
    const incoming = Array.isArray(stages) ? stages : [];

    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const existing = await tx.stage.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((s) => s.id));
      const incomingIds = new Set(
        incoming.filter((s) => s.id && existingIds.has(s.id)).map((s) => s.id!),
      );

      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await tx.stage.deleteMany({
          where: { id: { in: toDelete }, tenantId: user.tenantId, isWon: false, isLost: false },
        });
      }

      for (let i = 0; i < incoming.length; i++) {
        const s = incoming[i];
        if (s.id && existingIds.has(s.id)) {
          await tx.stage.update({
            where: { id: s.id },
            data: {
              name: s.name,
              color: s.color,
              orderIndex: i,
              isWon: s.isWon,
              isLost: s.isLost,
            },
          });
        } else {
          await tx.stage.create({
            data: {
              tenantId: user.tenantId,
              name: s.name,
              color: s.color,
              orderIndex: i,
              isWon: s.isWon,
              isLost: s.isLost,
            },
          });
        }
      }

      return tx.stage.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          color: true,
          orderIndex: true,
          isWon: true,
          isLost: true,
        },
      });
    });
  }
}