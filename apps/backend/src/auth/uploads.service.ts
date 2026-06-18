import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Client } from 'minio';
import { fileTypeFromBuffer } from 'file-type';

type UploadKind = 'profile_photo' | 'resume' | 'verification_doc' | 'operator_id_card';

const ALLOWED_MIME_TYPES: Record<UploadKind, string[]> = {
  profile_photo: ['image/jpeg', 'image/png', 'image/webp'],
  resume: ['application/pdf'],
  verification_doc: ['application/pdf', 'image/jpeg', 'image/png'],
  operator_id_card: ['image/jpeg', 'image/png', 'image/webp'],
};

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly client: Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET') || 'lexassess-uploads';
    this.client = new Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: Number(this.configService.get<string>('MINIO_PORT') || 9000),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: this.configService.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
  }

  async onModuleInit(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
    }
  }

  async uploadFile(userId: string, kind: UploadKind, file: Express.Multer.File) {
    const maxBytesByKind: Record<UploadKind, number> = {
      profile_photo: 1 * 1024 * 1024,
      resume: 2 * 1024 * 1024,
      verification_doc: 2 * 1024 * 1024,
      operator_id_card: 2 * 1024 * 1024,
    };

    if (file.size > maxBytesByKind[kind]) {
      throw new BadRequestException('File too large for upload type');
    }

    const detectedType = await fileTypeFromBuffer(file.buffer);
    if (!detectedType || !ALLOWED_MIME_TYPES[kind].includes(detectedType.mime)) {
      throw new BadRequestException('File content does not match an allowed type for this upload');
    }

    const objectKey = `${kind}/${userId}/${Date.now()}-${randomUUID()}.${detectedType.ext}`;

    await this.client.putObject(this.bucket, objectKey, file.buffer, file.size, {
      'Content-Type': detectedType.mime,
    });

    const publicBaseUrl = this.configService.get<string>('MINIO_PUBLIC_BASE_URL') || 'http://localhost:9000';
    return {
      objectKey,
      url: `${publicBaseUrl}/${this.bucket}/${objectKey}`,
    };
  }
}
