import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Client } from 'minio';
import { fileTypeFromBuffer } from 'file-type';

type UploadKind = 'profile_photo' | 'resume' | 'verification_doc' | 'operator_id_card';

/** Expiry for one-off URLs returned right after upload (short preview window). */
export const UPLOAD_PREVIEW_EXPIRY_SECONDS = 300;
/** Expiry for URLs rendered in dashboards/admin lists (long-lived sessions). */
export const READ_URL_EXPIRY_SECONDS = 3600;

const ALLOWED_MIME_TYPES: Record<UploadKind, string[]> = {
  profile_photo: ['image/jpeg', 'image/png', 'image/webp'],
  resume: ['application/pdf'],
  verification_doc: ['application/pdf', 'image/jpeg', 'image/png'],
  operator_id_card: ['image/jpeg', 'image/png', 'image/webp'],
};

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
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

    // The bucket is private. We return the objectKey (the canonical value to
    // persist) plus a short-lived presigned URL for immediate preview.
    return {
      objectKey,
      url: await this.getPresignedUrl(objectKey),
    };
  }

  /**
   * Resolve a stored value to a fresh, short-lived presigned GET URL.
   * Accepts either a bare objectKey (the canonical persisted value) or a
   * legacy full URL (older rows) and extracts the key from it.
   */
  async getPresignedUrl(
    objectKeyOrUrl: string | null | undefined,
    expirySeconds = UPLOAD_PREVIEW_EXPIRY_SECONDS,
  ): Promise<string | null> {
    if (!objectKeyOrUrl) return null;

    const objectKey = this.toObjectKey(objectKeyOrUrl);
    if (!objectKey) return null;

    try {
      return await this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
    } catch (error) {
      // A storage outage should degrade to a missing link, not 500 the whole
      // profile/admin endpoint that embeds this URL.
      this.logger.error(`Failed to presign object "${objectKey}"`, error as Error);
      return null;
    }
  }

  /** Strip any host/bucket prefix from a legacy full URL to recover the objectKey. */
  private toObjectKey(value: string): string | null {
    if (!value) return null;
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      return value; // already an objectKey
    }
    try {
      const { pathname } = new URL(value);
      // pathname looks like /<bucket>/<objectKey...>
      const trimmed = pathname.replace(/^\/+/, '');
      const prefix = `${this.bucket}/`;
      return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
    } catch {
      return null;
    }
  }
}
