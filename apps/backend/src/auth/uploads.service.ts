import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Client } from 'minio';

type UploadKind = 'profile_photo' | 'resume' | 'verification_doc';

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly bucket = process.env.MINIO_BUCKET ?? 'lexassess-uploads';
  private readonly client = new Client({
    endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: (process.env.MINIO_USE_SSL ?? 'false') === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  });

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
    };

    if (file.size > maxBytesByKind[kind]) {
      throw new BadRequestException('File too large for upload type');
    }

    const extension = this.getExtension(file.originalname);
    const objectKey = `${kind}/${userId}/${Date.now()}-${randomUUID()}${extension}`;

    await this.client.putObject(this.bucket, objectKey, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    const publicBaseUrl = process.env.MINIO_PUBLIC_BASE_URL ?? 'http://localhost:9000';
    return {
      objectKey,
      url: `${publicBaseUrl}/${this.bucket}/${objectKey}`,
    };
  }

  private getExtension(filename: string): string {
    const index = filename.lastIndexOf('.');
    if (index === -1) return '';
    return filename.slice(index);
  }
}
