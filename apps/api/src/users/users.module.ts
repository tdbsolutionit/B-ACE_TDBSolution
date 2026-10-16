import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Module,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, Roles, scope } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';

class UserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  // ⚠️ MỚI: nhận roleId động
  @IsOptional()
  @IsString()
  roleId?: string;

  // ⚠️ MỚI: nhận teamId (null để bỏ khỏi team)
  @IsOptional()
  @IsString()
  teamId?: string | null;

  // Fallback cho tương thích ngược
  @IsOptional()
  @IsIn(['admin', 'manager', 'sales'])
  role?: 'admin' | 'manager' | 'sales';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}

class MeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

// Map role.name → legacy enum để không break @Roles() decorator
function legacyRoleFor(roleName: string): 'admin' | 'manager' | 'sales' {
  const n = roleName.toLowerCase();
  if (n.includes('quản trị') || n.includes('admin')) return 'admin';
  if (n.includes('quản lý') || n.includes('manager') || n.includes('trưởng')) return 'manager';
  return 'sales';
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.user.findMany({
        where: scope(user.tenantId),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          roleId: true,
          teamId: true,
          roleRef: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          phone: true,
          status: true,
          createdAt: true,
        },
      }),
    );
  }

  @Post()
  @Roles('admin')
  async create(@CurrentUser() user: AuthUser, @Body() dto: UserDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const passwordHash = await bcrypt.hash(dto.password || 'password', 10);

      let roleId = dto.roleId;
      let legacyRole: 'admin' | 'manager' | 'sales' = dto.role ?? 'sales';

      if (!roleId) {
        // Fallback: tìm role hệ thống theo legacy enum
        const fallbackName =
          legacyRole === 'admin'
            ? 'Quản trị viên'
            : legacyRole === 'manager'
              ? 'Quản lý'
              : 'Nhân viên Sales';
        const fallbackRole = await tx.role.findFirst({
          where: { tenantId: user.tenantId, name: fallbackName },
        });
        if (!fallbackRole) {
          throw new ForbiddenException(
            'Không tìm thấy vai trò mặc định. Vui lòng chọn vai trò cụ thể.',
          );
        }
        roleId = fallbackRole.id;
      } else {
        const role = await tx.role.findFirst({
          where: { id: roleId, tenantId: user.tenantId },
        });
        if (!role) throw new ForbiddenException('Vai trò không tồn tại');
        legacyRole = legacyRoleFor(role.name);
      }

      return tx.user.create({
        data: {
          tenantId: user.tenantId,
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash,
          role: legacyRole,
          roleId,
          teamId: dto.teamId ?? null,
          phone: dto.phone,
          status: dto.status ?? 'active',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          roleId: true,
          teamId: true,
          roleRef: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          phone: true,
          status: true,
          createdAt: true,
        },
      });
    });
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: MeDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const data: { name?: string; phone?: string; passwordHash?: string } = {};
      if (dto.name) data.name = dto.name;
      if (dto.phone !== undefined) data.phone = dto.phone;
      if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
      return tx.user.update({
        where: { id: user.sub },
        data,
        select: { id: true, name: true, email: true, role: true, phone: true, status: true },
      });
    });
  }

  @Patch(':id')
  @Roles('admin')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UserDto,
  ) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.user.findFirstOrThrow({ where: scope(user.tenantId, { id }) });

      const data: Record<string, unknown> = {
        name: dto.name,
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        status: dto.status,
      };

      if (dto.password) {
        data.passwordHash = await bcrypt.hash(dto.password, 10);
      }

      if (dto.roleId) {
        const role = await tx.role.findFirst({
          where: { id: dto.roleId, tenantId: user.tenantId },
        });
        if (!role) throw new ForbiddenException('Vai trò không tồn tại');
        data.roleId = role.id;
        data.role = legacyRoleFor(role.name);
      } else if (dto.role) {
        data.role = dto.role;
      }

      if (dto.teamId !== undefined) {
        data.teamId = dto.teamId ?? null;
      }

      return tx.user.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          roleId: true,
          teamId: true,
          roleRef: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          phone: true,
          status: true,
          createdAt: true,
        },
      });
    });
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (id === user.sub) throw new ForbiddenException('Không thể xoá chính mình');
    await this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.user.findFirstOrThrow({ where: scope(user.tenantId, { id }) });
      await tx.user.delete({ where: { id } });
    });
    return { ok: true };
  }
}

@Module({ controllers: [UsersController] })
export class UsersModule {}