
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC, ROLES_KEY, AuthUser } from './auth';
import { PrismaService } from '../prisma/prisma.service';

type AccessTokenPayload = AuthUser & {
  tokenVersion: number;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // Ưu tiên HttpOnly cookie; vẫn hỗ trợ Bearer token
    // để tương thích với các client cũ trong giai đoạn chuyển đổi.
    const header = String(request.headers.authorization || '');
    const bearerToken = header.startsWith('Bearer ')
      ? header.slice(7)
      : '';

    const token =
      request.cookies?.accessToken || bearerToken;

    if (!token) {
      throw new UnauthorizedException('Chưa đăng nhập');
    }

    try {
      const payload =
        this.jwt.verify<AccessTokenPayload>(token, {
          secret: process.env.JWT_SECRET,
        });

      if (
        !payload.sub ||
        !payload.tenantId ||
        typeof payload.tokenVersion !== 'number'
      ) {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      // Kiểm tra tài khoản và phiên bản token hiện tại trong database.
      const user = await this.prisma.user.findFirst({
        where: {
          id: payload.sub,
          tenantId: payload.tenantId,
          status: 'active',
        },
        select: {
          id: true,
          tokenVersion: true,
        },
      });

      if (
        !user ||
        user.tokenVersion !== payload.tokenVersion
      ) {
        throw new UnauthorizedException(
          'Phiên đăng nhập đã hết hạn hoặc bị thu hồi',
        );
      }

      request.user = payload;

      const roles = this.reflector.getAllAndOverride<
        AuthUser['role'][]
      >(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (roles?.length && !roles.includes(payload.role)) {
        return false;
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
