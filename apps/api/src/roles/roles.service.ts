import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
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

  async updatePermissions(user: AuthUser, id: string, dto: UpdateRolePermissionsDto) {
    const role = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.role.findFirst({
        where: { id, tenantId: user.tenantId },
      }),
    );
    if (!role) throw new NotFoundException('Không tìm thấy vai trò');

    const codes = Array.isArray(dto.permissions) ? dto.permissions : [];

    // Tìm ID của các permission từ mã code gửi lên
    const perms = await this.prisma.permission.findMany({
      where: { code: { in: codes } },
      select: { id: true },
    });

    await this.prisma.withTenant(user.tenantId, async (tx) => {
      // Xóa các quyền cũ
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      // Thêm quyền mới
      if (perms.length > 0) {
        await tx.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }
    });

    return { success: true, count: perms.length };
  }

  async create(user: AuthUser, dto: CreateRoleDto) {
    const name = dto.name.trim();

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
          description: dto.description?.trim() || null,
          isSystem: false,
        },
      }),
    );

    const codes = Array.isArray(dto.permissionCodes) ? dto.permissionCodes : [];
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

  async remove(user: AuthUser, id: string) {
    const role = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.role.findFirst({ where: { id, tenantId: user.tenantId } }),
    );
    if (!role) throw new NotFoundException('Không tìm thấy vai trò');
    if (role.isSystem) throw new ConflictException('Không thể xóa vai trò hệ thống');

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