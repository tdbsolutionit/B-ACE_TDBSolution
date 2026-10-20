import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth';
import * as fs from 'fs';
import * as path from 'path';
import * as libre from 'libreoffice-convert';
import { promisify } from 'util';

const convertAsync = promisify(libre.convert);

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
      return tx.projectFile.findMany({
        where: {
          tenantId: user.tenantId,
          ...(customerId ? { customerId } : {}),
          ...(opportunityId ? { opportunityId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async getFileById(user: AuthUser, id: string) {
    const file = await this.prisma.withTenant(user.tenantId, (tx) =>
      tx.projectFile.findFirst({
        where: { id, tenantId: user.tenantId },
      })
    );
    if (!file) {
      throw new NotFoundException('Không tìm thấy file trong hệ thống');
    }
    return file;
  }

  async deleteFile(user: AuthUser, id: string) {
    return this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.projectFile.delete({ 
        where: { id, tenantId: user.tenantId } 
      });
      return { ok: true };
    });
  }

  async getPreviewFile(user: AuthUser, id: string) {
    const file = await this.getFileById(user, id);
    const fileExt = path.extname(file.storedName).toLowerCase();

    if (['.pdf', '.jpg', '.jpeg', '.png'].includes(fileExt)) {
      return file;
    }

    if (file.previewName) {
      return { ...file, storedName: file.previewName, mimeType: 'application/pdf' };
    }

    const inputPath = path.join(process.cwd(), 'uploads', file.storedName);
    if (!fs.existsSync(inputPath)) {
      throw new NotFoundException('Không tìm thấy file gốc trên ổ cứng');
    }

    try {
      const pdfBuffer = await fs.promises.readFile(inputPath).then((buf) => {
        return convertAsync(buf, '.pdf', undefined);
      });

      const previewName = `${path.parse(file.storedName).name}.pdf`;
      const outputPath = path.join(process.cwd(), 'uploads', previewName);

      await fs.promises.writeFile(outputPath, pdfBuffer);

      await this.prisma.projectFile.update({
        where: { id: file.id },
        data: { previewName },
      });

      return { ...file, storedName: previewName, mimeType: 'application/pdf' };
    } catch (error) {
      console.error('Lỗi khi convert file:', error);
      throw new Error('Không thể tạo bản xem trước cho file này');
    }
  }
}