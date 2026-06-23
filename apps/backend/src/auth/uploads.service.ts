import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { StorageService, UPLOAD_PREVIEW_EXPIRY_SECONDS } from '../common/storage.service';

type UploadKind = 'profile_photo' | 'resume' | 'verification_doc' | 'operator_id_card';

export { UPLOAD_PREVIEW_EXPIRY_SECONDS };
/** Expiry for URLs rendered in dashboards/admin lists (long-lived sessions). */
export const READ_URL_EXPIRY_SECONDS = 3600;

const ALLOWED_MIME_TYPES: Record<UploadKind, string[]> = {
  profile_photo: ['image/jpeg', 'image/png', 'image/webp'],
  resume: ['application/pdf'],
  verification_doc: ['application/pdf', 'image/jpeg', 'image/png'],
  operator_id_card: ['image/jpeg', 'image/png', 'image/webp'],
};

@Injectable()
export class UploadsService {
  constructor(private readonly storageService: StorageService) {}

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

    await this.storageService.uploadFile(objectKey, file.buffer, detectedType.mime);

    // The bucket is private. We return the objectKey (the canonical value to
    // persist) plus a short-lived signed URL for immediate preview.
    return {
      objectKey,
      url: await this.getPresignedUrl(objectKey),
    };
  }

  async getPresignedUrl(
    objectKeyOrUrl: string | null | undefined,
    expirySeconds = UPLOAD_PREVIEW_EXPIRY_SECONDS,
  ): Promise<string | null> {
    return this.storageService.getSignedUrl(objectKeyOrUrl, expirySeconds);
  }
}
