import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Xử lý đăng nhập và cấp Token */
  async login(dto: LoginDto, res: Response) {
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
      throw new UnauthorizedException('Tài khoản chưa được gán vai trò. Liên hệ quản trị viên.');
    }

    return this.generateTokensAndSetCookie(user, res);
  }

  /** Cấp lại Token mới khi Refresh Token còn hạn */
  async refreshTokens(userId: string, refreshToken: string, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    if (!user || !user.hashedRefreshToken || !user.roleId || !user.roleRef) {
      throw new UnauthorizedException('Truy cập bị từ chối');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã bị thu hồi');
    }

    return this.generateTokensAndSetCookie(user, res);
  }

  /** Đăng xuất và xóa Cookie */
  async logout(userId: string, res: Response) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });

    const secure = process.env.NODE_ENV === 'production';

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/api/auth',
    });

    return {
      success: true,
      message: 'Đăng xuất thành công',
    };
  }

  /** Tạo Token và gắn vào HttpOnly Cookie */
  private async generateTokensAndSetCookie(
    user: {
      id: string;
      tenantId: string;
      role: AuthUser['role'];
      email: string;
      name: string;
      roleId: string | null;
      teamId: string | null;
      tokenVersion: number;
      roleRef: {
        name: string;
        permissions: Array<{
          permission: { code: string };
        }>;
      } | null;
    },
    res: Response,
  ) {
    if (!user.roleId || !user.roleRef) {
      throw new UnauthorizedException('Tài khoản chưa được gán vai trò hợp lệ');
    }
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('Thiếu cấu hình JWT_SECRET hoặc JWT_REFRESH_SECRET');
    }

    const permissions = user.roleRef.permissions.map((item) => item.permission.code);

    const payload: AuthUser = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.roleRef.name,
      teamId: user.teamId,
      permissions,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      },
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    const secure = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user: payload };
  }

  /** Đổi mật khẩu và thu hồi toàn bộ Refresh Token cũ */
  async changePassword(user: AuthUser, dto: ChangePasswordDto) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      const dbUser = await tx.user.findUnique({ where: { id: user.sub } });
      if (!dbUser) throw new UnauthorizedException('Người dùng không tồn tại');

      const ok = await bcrypt.compare(dto.currentPassword, dbUser.passwordHash);
      if (!ok) throw new BadRequestException('Mật khẩu hiện tại không đúng');

      if (dto.currentPassword === dto.newPassword) {
        throw new BadRequestException('Mật khẩu mới phải khác mật khẩu cũ');
      }

      const newHash = await bcrypt.hash(dto.newPassword, 10);
      
      await tx.user.update({
        where: { id: user.sub },
        data: { 
          passwordHash: newHash,
          hashedRefreshToken: null 
        },
      });

      return { success: true, message: 'Đổi mật khẩu thành công' };
    });
  }

  /** Lấy thông tin User hiện tại */
  async getMe(user: AuthUser) {
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

  /** Xác thực Refresh Token từ Cookie */
  async refreshFromCookie(refreshToken: string, res: Response) {
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('Thiếu cấu hình JWT_REFRESH_SECRET');
    }

    let payload: { sub: string };

    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    return this.refreshTokens(payload.sub, refreshToken, res);
  }
}