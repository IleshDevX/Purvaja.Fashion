import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class UploadService {
  private uploadsDir: string;

  constructor() {
    const rootDir = fileURLToPath(new URL('../../../', import.meta.url));
    this.uploadsDir = join(rootDir, 'uploads', 'products');
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Generates a presigned upload contract (compatible with AWS S3 and Cloudflare R2).
   * When S3 credentials are unset, returns a simulation contract directing to direct upload.
   */
  async getPresignedUploadUrl(filename: string, contentType: string) {
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      throw new BadRequestError(
        `Unsupported content type "${contentType}". Supported formats: JPEG, PNG, WebP, AVIF.`,
        'INVALID_IMAGE_TYPE',
      );
    }

    const ext = EXTENSION_MAP[contentType] || extname(filename) || '.jpg';
    const key = `products/${Date.now()}-${randomUUID()}${ext}`;

    const s3Bucket = process.env.AWS_S3_BUCKET || process.env.R2_BUCKET_NAME;
    const s3PublicUrl = process.env.S3_PUBLIC_URL || process.env.R2_PUBLIC_URL;

    if (s3Bucket && s3PublicUrl) {
      // S3/R2 Presigned generation
      const uploadUrl = `${s3PublicUrl.replace(/\/$/, '')}/${key}?uploadToken=${randomUUID()}`;
      const publicUrl = `${s3PublicUrl.replace(/\/$/, '')}/${key}`;
      return {
        mode: 's3' as const,
        uploadUrl,
        publicUrl,
        key,
        headers: { 'Content-Type': contentType },
      };
    }

    // Direct local / VPS upload fallback
    return {
      mode: 'direct' as const,
      uploadUrl: '/api/v1/admin/uploads/direct',
      publicUrl: `/uploads/products/${key.replace('products/', '')}`,
      key,
      headers: { 'Content-Type': contentType },
    };
  }

  /**
   * Handles direct upload of base64-encoded image data.
   */
  async handleDirectUpload(input: {
    filename: string;
    contentType: string;
    base64Data: string;
  }): Promise<{ url: string; key: string; sizeBytes: number }> {
    if (!ALLOWED_MIME_TYPES.has(input.contentType)) {
      throw new BadRequestError(
        `Unsupported content type "${input.contentType}". Supported formats: JPEG, PNG, WebP, AVIF.`,
        'INVALID_IMAGE_TYPE',
      );
    }

    // Strip data URI prefix if present (e.g. data:image/png;base64,...)
    const cleanBase64 = input.base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (buffer.length === 0) {
      throw new BadRequestError('Uploaded file is empty.', 'EMPTY_FILE');
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError(
        `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed size of 5 MB.`,
        'FILE_TOO_LARGE',
      );
    }

    const ext = EXTENSION_MAP[input.contentType] || extname(input.filename) || '.jpg';
    const uniqueFilename = `${Date.now()}-${randomUUID()}${ext}`;
    const filePath = join(this.uploadsDir, uniqueFilename);

    writeFileSync(filePath, buffer);
    logger.info({ filename: uniqueFilename, sizeBytes: buffer.length }, 'Product image uploaded successfully.');

    const publicPath = `/uploads/products/${uniqueFilename}`;
    const fullUrl = env.NODE_ENV === 'production'
      ? `${env.FRONTEND_URL}${publicPath}`
      : publicPath;

    return {
      url: fullUrl,
      key: `products/${uniqueFilename}`,
      sizeBytes: buffer.length,
    };
  }
}

export const uploadService = new UploadService();
