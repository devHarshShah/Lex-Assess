import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { Client as MinioClient } from 'minio';

export const UPLOAD_PREVIEW_EXPIRY_SECONDS = 300;
export const READ_URL_EXPIRY_SECONDS = 3600;

interface StorageBackend {
  ensureBucket(): Promise<void>;
  putObject(objectKey: string, buffer: Buffer, contentType: string): Promise<void>;
  getSignedUrl(objectKey: string, expirySeconds: number): Promise<string>;
}

class MinioBackend implements StorageBackend {
  private readonly client: MinioClient;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    this.bucket = configService.get<string>('MINIO_BUCKET') || 'lexassess-uploads';
    this.client = new MinioClient({
      endPoint: configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: Number(configService.get<string>('MINIO_PORT') || 9000),
      useSSL: configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: configService.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
  }

  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
    }
  }

  async putObject(objectKey: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  }

  async getSignedUrl(objectKey: string, expirySeconds: number): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
  }
}

class GcsBackend implements StorageBackend {
  private readonly storage: Storage;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    this.bucket = configService.getOrThrow<string>('GCS_BUCKET');
    this.storage = new Storage({
      projectId: configService.get<string>('GCS_PROJECT_ID'),
    });
  }

  async ensureBucket(): Promise<void> {
    const [exists] = await this.storage.bucket(this.bucket).exists();
    if (!exists) {
      await this.storage.createBucket(this.bucket);
    }
  }

  async putObject(objectKey: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.storage.bucket(this.bucket).file(objectKey).save(buffer, {
      contentType,
      resumable: false,
    });
  }

  async getSignedUrl(objectKey: string, expirySeconds: number): Promise<string> {
    const [url] = await this.storage
      .bucket(this.bucket)
      .file(objectKey)
      .getSignedUrl({
        action: 'read',
        expires: Date.now() + expirySeconds * 1000,
      });
    return url;
  }
}

/**
 * Single storage interface backing both file uploads and certificate PDFs.
 * Provider is env-driven so local dev keeps using docker-compose MinIO while
 * staging/prod point at GCS without any code changes.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly backend: StorageBackend;
  readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const provider = this.configService.get<string>('STORAGE_PROVIDER') || 'minio';
    if (provider === 'gcs') {
      this.bucket = this.configService.getOrThrow<string>('GCS_BUCKET');
      this.backend = new GcsBackend(this.configService);
    } else {
      this.bucket = this.configService.get<string>('MINIO_BUCKET') || 'lexassess-uploads';
      this.backend = new MinioBackend(this.configService);
    }
  }

  async onModuleInit(): Promise<void> {
    await this.backend.ensureBucket();
  }

  async uploadFile(objectKey: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.backend.putObject(objectKey, buffer, contentType);
  }

  /**
   * Resolve a stored value to a fresh, short-lived signed GET URL.
   * Accepts either a bare objectKey (the canonical persisted value) or a
   * legacy full URL (older rows) and extracts the key from it.
   */
  async getSignedUrl(
    objectKeyOrUrl: string | null | undefined,
    expirySeconds = UPLOAD_PREVIEW_EXPIRY_SECONDS,
  ): Promise<string | null> {
    if (!objectKeyOrUrl) return null;

    const objectKey = this.toObjectKey(objectKeyOrUrl);
    if (!objectKey) return null;

    try {
      return await this.backend.getSignedUrl(objectKey, expirySeconds);
    } catch (error) {
      // A storage outage should degrade to a missing link, not 500 the whole
      // profile/admin endpoint that embeds this URL.
      this.logger.error(`Failed to sign object "${objectKey}"`, error as Error);
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
      const trimmed = pathname.replace(/^\/+/, '');
      const prefix = `${this.bucket}/`;
      return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
    } catch {
      return null;
    }
  }
}
