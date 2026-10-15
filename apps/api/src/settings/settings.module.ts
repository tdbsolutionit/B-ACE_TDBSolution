import {
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { PrismaService } from '../prisma/prisma.service';
import { Roles, AuthUser} from '../common/auth';
import { CurrentUser } from '../common/current-user.decorator';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getCompanySettings(@CurrentUser() user: AuthUser) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.tenant.findUniqueOrThrow({
        where: {
          id: user.tenantId,
        },
        select: {
          name: true,
          taxCode: true,
          email: true,
          phone: true,
          timezone: true,
          currency: true,
          language: true,
          dateFormat: true,
        },
      }),
    );
  }

  @Patch()
  @Roles('admin')
  async updateCompanySettings(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateCompanySettingsDto,
  ) {
    return this.prisma.withTenant(user.tenantId, (tx) =>
      tx.tenant.update({
        where: {
          id: user.tenantId,
        },
        data: {
          name: body.name,
          taxCode: body.taxCode ?? null,
          email: body.email || null,
          phone: body.phone ?? null,
          timezone: body.timezone,
          currency: body.currency,
          language: body.language,
          dateFormat: body.dateFormat,
        },
        select: {
          name: true,
          taxCode: true,
          email: true,
          phone: true,
          timezone: true,
          currency: true,
          language: true,
          dateFormat: true,
        },
      }),
    );
  }
}

import { Module } from '@nestjs/common';

@Module({
  controllers: [SettingsController],
})
export class SettingsModule {}