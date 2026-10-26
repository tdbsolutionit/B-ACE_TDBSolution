
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as libre from 'libreoffice-convert';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { fromFile } from 'file-type';

const convertAsync = promisify(libre.convert);
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

// Chỉ những định dạng được chủ động hỗ trợ xem trước.
// Controller upload phải có allowlist tương ứng.
const OFFICE_EXTENSIONS = new Set([
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.odt',
  '.ods',
  '.odp',
]);

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  private safePath(filename: string): string {
    // Chỉ nhận tên file, tuyệt đối không nhận đường dẫn từ client.
    if (
      !filename ||
      filename !== path.basename(filename) ||
      filename.includes('\0')
    ) {
      throw new BadRequestException('Tên file không hợp lệ');
    }

    const resolved = path.resolve(UPLOAD_DIR, filename);

    if (path.dirname(resolved) !== UPLOAD_DIR) {
      throw new BadRequestException('Đường dẫn file không hợp lệ');
    }

    return resolved;
  }

  private async removeFile(filename?: string | null): Promise<void> {
    if (!filename) return;

    const fullPath = this.safePath(filename);

    try {
      await unlink(fullPath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== 'ENOENT') {
        // Ghi log để phát hiện file mồ côi và xử lý sau.
        console.error('Không thể xóa file vật lý:', code);
      }
    }
  }

  async saveFileInfo(
    user: AuthUser,
    file: Express.Multer.File,
    _fileUrl: string,
    customerId?: string,
    opportunityId?: string,
  ) {
    if (
      !file.filename ||
      file.filename !== path.basename(file.filename)
    ) {
      throw new BadRequestException('Tên file lưu trữ không hợp lệ');
    }

    return this.prisma.withTenant(user.tenantId, async (tx) => {
      return tx.projectFile.create({
        data: {
          tenantId: user.tenantId,
          name: path.basename(file.originalname || 'upload'),
          storedName: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          customerId: customerId || undefined,
          opportunityId: opportunityId || undefined,
          createdBy: user.sub,
        },
      });
    });
  }

  async getFiles(
    user: AuthUser,
    customerId?: string,
    opportunityId?: string,
  ) {
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
    const file = await this.prisma.withTenant(
      user.tenantId,
      (tx) =>
        tx.projectFile.findFirst({
          where: {
            id,
            tenantId: user.tenantId,
          },
        }),
    );

    if (!file) {
      throw new NotFoundException('Không tìm thấy file trong hệ thống');
    }

    return file;
  }

  async getPreviewFile(user: AuthUser, id: string) {
    const file = await this.getFileById(user, id);
    const extension = path.extname(file.storedName).toLowerCase();
    const inputPath = this.safePath(file.storedName);

    if (!fs.existsSync(inputPath)) {
      throw new NotFoundException('Không tìm thấy file gốc trên ổ cứng');
    }

    const detected = await fromFile(inputPath);

    if (extension === '.pdf') {
      if (detected?.mime !== 'application/pdf') {
        throw new BadRequestException('Nội dung PDF không hợp lệ');
      }

      return {
        ...file,
        mimeType: 'application/pdf',
      };
    }

    // Ảnh cần endpoint preview riêng; controller hiện tại trả PDF.
    if (['.jpg', '.jpeg', '.png'].includes(extension)) {
      throw new BadRequestException(
        'File ảnh cần được xem qua endpoint preview ảnh riêng',
      );
    }

    if (!OFFICE_EXTENSIONS.has(extension)) {
      throw new BadRequestException(
        'Định dạng file này không được hỗ trợ xem trước',
      );
    }

    // Không tái sử dụng PDF preview cũ nếu file không còn là PDF hợp lệ.
    if (file.previewName) {
      const existingPreviewPath = this.safePath(file.previewName);

      if (fs.existsSync(existingPreviewPath)) {
        const previewType = await fromFile(existingPreviewPath);

        if (previewType?.mime === 'application/pdf') {
          return {
            ...file,
            storedName: file.previewName,
            mimeType: 'application/pdf',
          };
        }
      }
    }

    let previewName: string | undefined;

    try {
      // Giới hạn dung lượng ở controller là bắt buộc.
      // Đọc file vào bộ nhớ chỉ phù hợp khi đã giới hạn kích thước.
      const inputBuffer = await fs.promises.readFile(inputPath);

      const pdfBuffer = await convertAsync(
        inputBuffer,
        '.pdf',
        undefined,
      );

      if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
        throw new Error('LibreOffice returned an empty result');
      }

      // Tên ngẫu nhiên giúp tránh ghi đè file hoặc file preview khác.
      previewName = `preview-${randomUUID()}.pdf`;
      const outputPath = this.safePath(previewName);

      // Ghi file độc quyền, không ghi đè file đã tồn tại.
      await fs.promises.writeFile(outputPath, pdfBuffer, {
        flag: 'wx',
        mode: 0o600,
      });

      // Kiểm tra nội dung PDF được tạo trước khi trả cho client.
      const outputType = await fromFile(outputPath);

      if (outputType?.mime !== 'application/pdf') {
        throw new Error('Generated preview is not a valid PDF');
      }

      // Cập nhật theo tenant; không cập nhật chỉ dựa vào ID.
      const updated = await this.prisma.withTenant(
        user.tenantId,
        (tx) =>
          tx.projectFile.updateMany({
            where: {
              id: file.id,
              tenantId: user.tenantId,
            },
            data: {
              previewName,
            },
          }),
      );

      if (updated.count !== 1) {
        throw new NotFoundException(
          'Không thể cập nhật bản xem trước của file',
        );
      }

      return {
        ...file,
        storedName: previewName,
        previewName,
        mimeType: 'application/pdf',
      };
    } catch (error) {
      if (previewName) {
        await this.removeFile(previewName);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Không thể tạo bản xem trước cho tài liệu này',
      );
    }
  }

  async deleteFile(user: AuthUser, id: string) {
    const file = await this.getFileById(user, id);

    // Xóa bản ghi trong đúng tenant.
    await this.prisma.withTenant(user.tenantId, async (tx) => {
      await tx.projectFile.deleteMany({
        where: {
          id,
          tenantId: user.tenantId,
        },
      });
    });

    await this.removeFile(file.storedName);

    if (
      file.previewName &&
      /^preview-[0-9a-f-]{36}\.pdf$/i.test(file.previewName)
    ) {
      await this.removeFile(file.previewName);
    }

    return { ok: true };
  }
}
