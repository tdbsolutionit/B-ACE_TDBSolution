import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth';
import { CreateTeamDto, UpdateTeamDto } from './dto/teams.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const teams = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.team.findMany({
        where: { tenantId: user.tenantId },
        include: {
          users: {
            select: { id: true, name: true, email: true },
          },
          _count: { select: { users: true } },
        },
        orderBy: { name: 'asc' },
      }),
    );

    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      members: t.users,
      _count: t._count,
    }));
  }

  async create(user: AuthUser, body: CreateTeamDto) {
    const team = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.team.create({
        data: {
          tenantId: user.tenantId,
          name: body.name.trim(),
          description: body.description?.trim() || null,
        },
      }),
    );
    return { ...team, members: [], _count: { users: 0 } };
  }

  async update(user: AuthUser, id: string, body: UpdateTeamDto) {
    const existing = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.team.findFirst({ where: { id, tenantId: user.tenantId } }),
    );
    if (!existing) throw new NotFoundException('Không tìm thấy team');

    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.team.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name.trim() }),
          ...(body.description !== undefined && {
            description: body.description?.trim() || null,
          }),
        },
      }),
    );
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.team.findFirst({ where: { id, tenantId: user.tenantId } }),
    );
    if (!existing) throw new NotFoundException('Không tìm thấy team');

    await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.team.delete({ where: { id } }),
    );

    return { success: true };
  }
}