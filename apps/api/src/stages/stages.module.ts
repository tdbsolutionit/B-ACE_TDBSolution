import {
  Body,
  Controller,
  Get,
  Module,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';

type StageInput = {
  id?: string;
  name: string;
  color: string;
  orderIndex: number;
  isWon: boolean;
  isLost: boolean;
};

@ApiTags('stages')
@ApiBearerAuth()
@Controller('stages')
export class StagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
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

  @Put()
  async replaceAll(
    @CurrentUser() user: AuthUser,
    @Body() body: { stages: StageInput[] },
  ) {
    const incoming = Array.isArray(body.stages) ? body.stages : [];

    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const existing = await tx.stage.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((s) => s.id));
      const incomingIds = new Set(
        incoming.filter((s) => s.id && existingIds.has(s.id)).map((s) => s.id!),
      );

      // Xóa stage cũ không còn trong danh sách (nhưng bỏ qua isWon/isLost để an toàn)
      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await tx.stage.deleteMany({
          where: { id: { in: toDelete }, tenantId: user.tenantId, isWon: false, isLost: false },
        });
      }

      // Update / Create
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

@Module({
  controllers: [StagesController],
})
export class StagesModule {}