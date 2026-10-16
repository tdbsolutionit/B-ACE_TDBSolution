import { Body, Controller, Get, Module, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { Public, AuthUser } from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const users = await this.prisma.user.findMany({
      where: { email: dto.email.toLowerCase(), status: 'active' },
      take: 2,
      include: {
        roleRef: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });
    if (users.length !== 1) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    const user = users[0];
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    
    if (!user.roleId || !user.roleRef) {
      throw new UnauthorizedException(
        'Tài khoản chưa được gán vai trò. Liên hệ quản trị viên.',
      );
    }

    const permissions = user.roleRef.permissions.map((rp) => rp.permission.code);

    const payload: AuthUser = {
      // ─── Field cũ (giữ nguyên để không break code hiện tại) ───
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
      // ─── Field mới ───
      roleId: user.roleId,
      roleName: user.roleRef.name,
      teamId: user.teamId,
      permissions,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: payload,
    };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.user.findFirst({
        where: { id: user.sub, tenantId: user.tenantId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          role: true,
          roleRef: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
        },
      }),
    );
  }
}

@Module({
  controllers: [AuthController],
})
export class AuthModule {}