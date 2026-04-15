import { Injectable } from '@nestjs/common';
import {
  S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import * as path from 'path';

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly cdnBase: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? '';
    this.cdnBase = (process.env.CDN_BASE_URL ?? '').replace(/\/$/, '');

    this.client = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint: process.env.S3_ENDPOINT, // set for Cloudflare R2 / MinIO
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  /**
   * Upload an avatar image.
   * Validates MIME type and size before upload.
   * Returns the public URL of the uploaded file.
   */
  async uploadAvatar(userId: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      throw new Error('Only JPEG, PNG, and WebP images are allowed.');
    }
    if (buffer.byteLength > MAX_AVATAR_BYTES) {
      throw new Error('File size exceeds the 5 MB limit.');
    }

    // Magic byte validation
    this.assertImageMagicBytes(buffer, mimeType);

    const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
    const key = `avatars/${userId}/${crypto.randomBytes(8).toString('hex')}.${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        // Never publicly list object contents
        ACL: 'public-read',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return `${this.cdnBase}/${key}`;
  }

  /** Generate a signed URL for a private object (e.g. data export ZIP). */
  async getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  /** Delete an object by its full key. */
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private assertImageMagicBytes(buffer: Buffer, mimeType: string) {
    if (mimeType === 'image/jpeg') {
      if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
        throw new Error('File content does not match JPEG magic bytes.');
      }
    } else if (mimeType === 'image/png') {
      const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      if (!png.every((b, i) => buffer[i] === b)) {
        throw new Error('File content does not match PNG magic bytes.');
      }
    } else if (mimeType === 'image/webp') {
      // RIFF....WEBP
      if (
        buffer[0] !== 0x52 || buffer[1] !== 0x49 ||
        buffer[8] !== 0x57 || buffer[9] !== 0x45
      ) {
        throw new Error('File content does not match WebP magic bytes.');
      }
    }
  }
}
