import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(user: AuthUser) {
    return this.prisma.tenant.findUniqueOrThrow({
      where: { id: user.tenantId },
      select: {
        id: true, name: true, slug: true, taxCode: true, email: true, phone: true,
        website: true, address: true, logoUrl: true, bankName: true, bankAccount: true, bankOwner: true
      }
    });
  }

  async updateProfile(user: AuthUser, dto: UpdateTenantDto) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Chỉ quản trị viên mới có quyền cập nhật thông tin công ty');
    }

    return this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.taxCode !== undefined ? { taxCode: dto.taxCode.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim() } : {}), 
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.website !== undefined ? { website: dto.website.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl.trim() } : {}),
        ...(dto.bankName !== undefined ? { bankName: dto.bankName.trim() } : {}),
        ...(dto.bankAccount !== undefined ? { bankAccount: dto.bankAccount.trim() } : {}),
        ...(dto.bankOwner !== undefined ? { bankOwner: dto.bankOwner.trim() } : {}),
        ...(dto.directorName !== undefined ? { directorName: dto.directorName.trim() } : {}),
        ...(dto.quoteTerms !== undefined ? { quoteTerms: dto.quoteTerms.trim() } : {}),
        ...(dto.quoteNotes !== undefined ? { quoteNotes: dto.quoteNotes.trim() } : {}),
        ...(dto.quoteUnit !== undefined ? { quoteUnit: dto.quoteUnit.trim() } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone.trim() } : {}), 
        ...(dto.currency !== undefined ? { currency: dto.currency.trim() } : {}), 
        ...(dto.language !== undefined ? { language: dto.language.trim() } : {}), 
        ...(dto.dateFormat !== undefined ? { dateFormat: dto.dateFormat.trim() } : {}), 
      },
    });
  }
}