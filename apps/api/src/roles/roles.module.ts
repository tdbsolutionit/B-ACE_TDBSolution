import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Module,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';

class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsArray()
  permissionCodes?: string[];
}

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const roles = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.role.findMany({
        where: { tenantId: user.tenantId },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      }),
    );

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissionCodes: r.permissions.map((p) => p.permission.code),
    }));
  }

  @Put(':id/permissions')
  async updatePermissions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { permissions: string[] },
  ) {
    const role = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.role.findFirst({
        where: { id, tenantId: user.tenantId },
      }),
    );
    if (!role) throw new NotFoundException('Không tìm thấy vai trò');

    const codes = Array.isArray(body.permissions) ? body.permissions : [];

    const perms = await this.prisma.permission.findMany({
      where: { code: { in: codes } },
      select: { id: true },
    });

    await this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (perms.length > 0) {
        await tx.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }
    });

    return { success: true, count: perms.length };
  }
    @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateRoleDto) {
    const name = body.name.trim();

    const existing = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.role.findFirst({
        where: { tenantId: user.tenantId, name },
      }),
    );
    if (existing) throw new ConflictException('Vai trò này đã tồn tại');

    const role = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.role.create({
        data: {
          tenantId: user.tenantId,
          name,
          description: body.description?.trim() || null,
          isSystem: false,
        },
      }),
    );

    const codes = Array.isArray(body.permissionCodes) ? body.permissionCodes : [];
    let permissionCodes: string[] = [];

    if (codes.length > 0) {
      const perms = await this.prisma.permission.findMany({
        where: { code: { in: codes } },
        select: { id: true, code: true },
      });
      if (perms.length > 0) {
        await this.prisma.withTenant(user.tenantId, (tx) =>
          tx.rolePermission.createMany({
            data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
            skipDuplicates: true,
          }),
        );
        permissionCodes = perms.map((p) => p.code);
      }
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissionCodes,
    };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const role = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.role.findFirst({ where: { id, tenantId: user.tenantId } }),
    );
    if (!role) throw new NotFoundException('Không tìm thấy vai trò');
    if (role.isSystem) {
      throw new ConflictException('Không thể xóa vai trò hệ thống');
    }

    // Kiểm tra có user đang dùng role này không
    const userCount = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.user.count({ where: { roleId: id } }),
    );
    if (userCount > 0) {
      throw new ConflictException(
        `Có ${userCount} người dùng đang dùng vai trò này. Chuyển họ sang vai trò khác trước.`,
      );
    }

    await this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });

    return { success: true };
  }
}

@Module({
  controllers: [RolesController],
})
export class RolesModule {}