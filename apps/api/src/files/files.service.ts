import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, scope } from '../common/auth';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async saveFileInfo(user: AuthUser, file: Express.Multer.File, fileUrl: string, customerId?: string, opportunityId?: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      return tx.projectFile.create({
        data: {
          tenantId: user.tenantId,
          name: file.originalname,
          storedName: fileUrl.replace('/uploads/', ''),
          mimeType: file.mimetype,
          size: file.size,
          customerId: customerId || undefined,   
          opportunityId: opportunityId || undefined,
          createdBy: user.sub,
        },
      });
    });
  }

  async getFiles(user: AuthUser, customerId?: string, opportunityId?: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      return tx.projectFile.findMany({ // <-- Đã đổi thành projectFile
        where: {
          tenantId: user.tenantId,
          ...(customerId ? { customerId } : {}),
          ...(opportunityId ? { opportunityId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async deleteFile(user: AuthUser, id: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.projectFile.delete({ // <-- Đã đổi thành projectFile
        where: { id, tenantId: user.tenantId } 
      });
      return { ok: true };
    });
  }
}