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
  UseGuards 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FilesService } from './files.service';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/auth';
import { Response } from 'express';
import * as fs from 'fs';
import { join } from 'path';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      }
    })
  }))
  async uploadFile(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('customerId') customerId?: string,
    @Body('opportunityId') opportunityId?: string,
  ) {
    if (!file) {
      throw new Error('Không nhận được file');
    }
    
    const fileUrl = `/uploads/${file.filename}`;
    
    const savedFile = await this.filesService.saveFileInfo(user, file, fileUrl, customerId, opportunityId);
    
    return {
      id: savedFile.id,
      fileUrl: fileUrl, 
    };
  }

  @Get()
  getFiles(
    @CurrentUser() user: AuthUser,
    @Query('customerId') customerId?: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    return this.filesService.getFiles(user, customerId, opportunityId);
  }

  @Get(':id/download')
  async downloadFile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const file = await this.filesService.getFileById(user, id);
    const filePath = join(process.cwd(), 'uploads', file.storedName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.name)}"`,
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Get(':id/preview')
  async previewFile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const file = await this.filesService.getPreviewFile(user, id);
    const filePath = join(process.cwd(), 'uploads', file.storedName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File không tồn tại' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.name)}.pdf"`,
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Delete(':id')
  deleteFile(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.filesService.deleteFile(user, id);
  }
}