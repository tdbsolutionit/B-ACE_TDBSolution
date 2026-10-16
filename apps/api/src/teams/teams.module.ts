import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';

class CreateTeamDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

@ApiTags('teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
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

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateTeamDto) {
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

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateTeamDto,
  ) {
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

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
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

@Module({
  controllers: [TeamsController],
})
export class TeamsModule {}