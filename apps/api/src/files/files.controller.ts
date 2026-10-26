import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { join, basename } from 'node:path';
import * as fs from 'node:fs';
import { mkdir, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fromFile } from 'file-type';
import type { Response } from 'express';

import { FilesService } from './files.service';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/auth';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
} as const;

type AllowedMime = keyof typeof ALLOWED_TYPES;

// Tạo thư mục upload nếu chưa tồn tại.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function makeContentDisposition(
  disposition: 'attachment' | 'inline',
  originalName: string,
): string {
  // Loại bỏ đường dẫn và các ký tự có thể gây lỗi header.
  const name = basename(originalName || 'download')
    .replace(/[\r\n"]/g, '_')
    .replace(/[\\/]/g, '_');

  // Tên ASCII dự phòng cho client cũ.
  const fallback = name.replace(/[^\x20-\x7E]/g, '_');

  // Mã hóa UTF-8 cho tên file tiếng Việt.
  const encoded = encodeURIComponent(name).replace(
    /['()*]/g,
    (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return (
    `${disposition}; filename="${fallback}"; ` +
    `filename*=UTF-8''${encoded}`
  );
}

@Controller('files')
@ApiTags('files')
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, _file, cb) => {
          // Tên tạm không sử dụng tên file do client gửi lên.
          cb(null, randomUUID());
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fields: 10,
        parts: 11,
      },
    }),
  )
  async uploadFile(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('customerId') customerId?: string,
    @Body('opportunityId') opportunityId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Không nhận được file');
    }

    // Luôn theo dõi đường dẫn hiện tại để dọn file khi lỗi.
    let currentPath = file.path;

    try {
      // Xác định định dạng thực tế từ nội dung file.
      const detected = await fromFile(file.path);

      if (
        !detected ||
        !Object.prototype.hasOwnProperty.call(
          ALLOWED_TYPES,
          detected.mime,
        )
      ) {
        throw new BadRequestException(
          'Chỉ chấp nhận file PDF, PNG hoặc JPEG hợp lệ',
        );
      }

      const mimeType = detected.mime as AllowedMime;
      const extension = ALLOWED_TYPES[mimeType];

      const storedName = `${randomUUID()}.${extension}`;
      const newPath = join(UPLOAD_DIR, storedName);

      await rename(file.path, newPath);
      currentPath = newPath;

      // Chỉ lưu MIME được phát hiện từ nội dung file.
      const verifiedFile = {
        ...file,
        filename: storedName,
        originalname: file.originalname,
        path: newPath,
        destination: UPLOAD_DIR,
        mimetype: mimeType,
      };

      // Giữ nguyên định dạng fileUrl mà service đang sử dụng.
      // Cần bảo đảm service/frontend không coi URL này là route download.
      const fileUrl = `/files/${storedName}`;

      const savedFile = await this.filesService.saveFileInfo(
        user,
        verifiedFile,
        fileUrl,
        customerId,
        opportunityId,
      );

      return {
        id: savedFile.id,
        fileUrl,
        downloadUrl: `/files/${savedFile.id}/download`,
        previewUrl:
          mimeType === 'application/pdf'
            ? `/files/${savedFile.id}/preview`
            : null,
      };
    } catch (error) {
      // Dọn đúng file, kể cả khi rename đã thành công.
      await unlink(currentPath).catch(() => undefined);

      if (error instanceof BadRequestException) {
        throw error;
      }

      // Không trả stack trace hoặc đường dẫn nội bộ cho client.
      if (
        error instanceof Error &&
        error.name === 'NotFoundError'
      ) {
        throw new BadRequestException('Không thể đọc file đã tải lên');
      }

      throw new InternalServerErrorException(
        'Không thể xử lý file tải lên',
      );
    }
  }

  @Get()
  getFiles(
    @CurrentUser() user: AuthUser,
    @Query('customerId') customerId?: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    return this.filesService.getFiles(
      user,
      customerId,
      opportunityId,
    );
  }

  @Get(':id/download')
  async downloadFile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    // Service phải kiểm tra quyền truy cập file của user.
    const file = await this.filesService.getFileById(user, id);
    const filePath = join(UPLOAD_DIR, basename(file.storedName));

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File không tồn tại trên server');
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      makeContentDisposition('attachment', file.name),
    );

    const stream = fs.createReadStream(filePath);

    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy();
      }
    });

    stream.pipe(res);
  }

  @Get(':id/preview')
  async previewFile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    // Service cần xác thực user có quyền xem file này.
    const file = await this.filesService.getPreviewFile(user, id);
    const filePath = join(UPLOAD_DIR, basename(file.storedName));

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File không tồn tại');
    }

    // Không tin MIME lưu trong database; kiểm tra lại nội dung.
    const detected = await fromFile(filePath);

    if (detected?.mime !== 'application/pdf') {
      throw new BadRequestException(
        'Chỉ hỗ trợ xem trước file PDF hợp lệ',
      );
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      makeContentDisposition('inline', file.name),
    );

    const stream = fs.createReadStream(filePath);

    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy();
      }
    });

    stream.pipe(res);
  }

  @Delete(':id')
  deleteFile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.filesService.deleteFile(user, id);
  }
}