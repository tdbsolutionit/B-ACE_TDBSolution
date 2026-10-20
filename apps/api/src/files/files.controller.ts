import { Controller, Post, Get, Delete, Param, Query, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FilesService } from './files.service';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/auth';

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
    
    // Lưu đường dẫn file vào DB
    const fileUrl = `/uploads/${file.filename}`;
    
    // Lưu vào Database
    const savedFile = await this.filesService.saveFileInfo(user, file, fileUrl, customerId, opportunityId);
    
    // TRẢ VỀ ĐƯỜNG DẪN CHO FRONTEND
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

  @Delete(':id')
  deleteFile(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.filesService.deleteFile(user, id);
  }
}