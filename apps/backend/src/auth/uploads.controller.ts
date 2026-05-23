import { BadRequestException, Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async upload(
    @Req() req: { user: { sub: string } },
    @Body('kind') kind: 'profile_photo' | 'resume' | 'verification_doc' | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');

    if (!kind || !['profile_photo', 'resume', 'verification_doc'].includes(kind)) {
      throw new BadRequestException('Invalid upload kind');
    }

    return this.uploadsService.uploadFile(req.user.sub, kind, file);
  }
}
