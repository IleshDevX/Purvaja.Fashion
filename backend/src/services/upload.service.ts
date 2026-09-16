import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 8_000;
const MAX_PIXELS = 40_000_000;
const OUTPUT_DIMENSION = 3_000;
const SIGNED_URL_TTL_SECONDS = 5 * 60;

const FORMAT_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heif: 'image/avif',
  avif: 'image/avif',
};

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

interface UploadContractInput {
  contentType: string;
  sizeBytes: number;
}

interface PersistInput {
  body: Buffer;
  contentType: string;
  extension: string;
}

interface ProductImageStorage {
  createUploadContract(input: UploadContractInput): Promise<{
    mode: 's3'; method: 'POST'; uploadUrl: string; publicUrl: string; key: string; formFields: Record<string, string>; expiresInSeconds: number;
  }>;
  persistDirectUpload(input: PersistInput): Promise<{ url: string; key: string }>;
  deleteObject(key: string): Promise<void>;
}

function assertAllowedSize(sizeBytes: number): void {
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw new BadRequestError('A positive integer sizeBytes is required.', 'INVALID_UPLOAD_SIZE');
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError('File exceeds the maximum allowed size of 5 MB.', 'FILE_TOO_LARGE');
  }
}

function objectKey(extension: string): string {
  return `products/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
}

export function getLocalUploadsRoot(): string {
  const fallback = fileURLToPath(new URL('../../../uploads', import.meta.url));
  const configured = env.UPLOADS_DIRECTORY;
  return configured ? (isAbsolute(configured) ? configured : resolve(configured)) : fallback;
}

class LocalProductImageStorage implements ProductImageStorage {
  constructor(private readonly root = getLocalUploadsRoot()) {}

  async createUploadContract(_input: UploadContractInput): Promise<never> {
    throw new BadRequestError('Presigned uploads are unavailable in local storage mode.', 'PRESIGNED_UPLOAD_UNAVAILABLE');
  }

  async persistDirectUpload(input: PersistInput): Promise<{ url: string; key: string }> {
    const key = objectKey(input.extension);
    const path = join(this.root, ...key.split('/'));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.body, { flag: 'wx' });
    return { url: `/uploads/${key}`, key };
  }

  async deleteObject(key: string): Promise<void> {
    const normalized = key.replaceAll('\\', '/');
    if (!normalized.startsWith('products/') || normalized.includes('..')) {
      throw new BadRequestError('Invalid product image key.', 'INVALID_UPLOAD_KEY');
    }
    await unlink(join(this.root, ...normalized.split('/')));
  }
}

class S3CompatibleProductImageStorage implements ProductImageStorage {
  private readonly client: S3Client;
  private readonly bucket = env.OBJECT_STORAGE_BUCKET!;
  private readonly publicBase = env.OBJECT_STORAGE_PUBLIC_URL!.replace(/\/$/, '');

  constructor() {
    this.client = new S3Client({
      region: env.OBJECT_STORAGE_REGION,
      endpoint: env.OBJECT_STORAGE_ENDPOINT,
      forcePathStyle: Boolean(env.OBJECT_STORAGE_ENDPOINT),
      credentials: {
        accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY!,
      },
    });
  }

  async createUploadContract(input: UploadContractInput) {
    assertAllowedSize(input.sizeBytes);
    const extension = MIME_EXTENSION[input.contentType];
    if (!extension) throw new BadRequestError('Unsupported image content type.', 'INVALID_IMAGE_TYPE');
    const key = objectKey(extension);
    const post = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: key,
      Expires: SIGNED_URL_TTL_SECONDS,
      Fields: { 'Content-Type': input.contentType },
      Conditions: [
        ['eq', '$key', key],
        ['eq', '$Content-Type', input.contentType],
        ['content-length-range', input.sizeBytes, input.sizeBytes],
      ],
    });
    return {
      mode: 's3' as const,
      method: 'POST' as const,
      uploadUrl: post.url,
      publicUrl: `${this.publicBase}/${key}`,
      key,
      formFields: post.fields,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    };
  }

  async persistDirectUpload(input: PersistInput): Promise<{ url: string; key: string }> {
    const key = objectKey(input.extension);
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      ContentLength: input.body.length,
    }));
    return { url: `${this.publicBase}/${key}`, key };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

function decodeStrictBase64(value: string, claimedMime: string): Buffer {
  const dataUri = value.match(/^data:([^;,]+);base64,(.*)$/s);
  if (dataUri && dataUri[1] !== claimedMime) {
    throw new BadRequestError('Data URI content type does not match the declared type.', 'IMAGE_TYPE_MISMATCH');
  }
  const encoded = (dataUri?.[2] ?? value).trim();
  if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new BadRequestError('Image data is not valid base64.', 'INVALID_BASE64_DATA');
  }
  const body = Buffer.from(encoded, 'base64');
  if (body.length === 0) throw new BadRequestError('Uploaded file is empty.', 'EMPTY_FILE');
  assertAllowedSize(body.length);
  return body;
}

async function validateAndNormalizeImage(body: Buffer, claimedMime: string): Promise<PersistInput> {
  try {
    const image = sharp(body, { failOn: 'error', limitInputPixels: MAX_PIXELS });
    const metadata = await image.metadata();
    const actualMime = metadata.format ? FORMAT_MIME[metadata.format] : undefined;
    if (!actualMime) throw new BadRequestError('Unsupported or unrecognized image data.', 'INVALID_IMAGE_DATA');
    if (actualMime !== claimedMime) {
      throw new BadRequestError('Declared content type does not match the image bytes.', 'IMAGE_TYPE_MISMATCH');
    }
    if (!metadata.width || !metadata.height || metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      throw new BadRequestError('Image dimensions exceed the allowed limit.', 'IMAGE_DIMENSIONS_EXCEEDED');
    }
    const pipeline = image.rotate().resize({ width: OUTPUT_DIMENSION, height: OUTPUT_DIMENSION, fit: 'inside', withoutEnlargement: true });
    const normalized = claimedMime === 'image/jpeg'
      ? await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer()
      : claimedMime === 'image/png'
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : claimedMime === 'image/webp'
          ? await pipeline.webp({ quality: 88 }).toBuffer()
          : await pipeline.avif({ quality: 60 }).toBuffer();
    assertAllowedSize(normalized.length);
    return { body: normalized, contentType: claimedMime, extension: MIME_EXTENSION[claimedMime]! };
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError('Image bytes could not be safely decoded.', 'INVALID_IMAGE_DATA');
  }
}

export class UploadService {
  private readonly storage: ProductImageStorage = env.UPLOAD_PROVIDER === 's3'
    ? new S3CompatibleProductImageStorage()
    : new LocalProductImageStorage();

  async getPresignedUploadUrl(_filename: string, contentType: string, sizeBytes: number) {
    return this.storage.createUploadContract({ contentType, sizeBytes });
  }

  async handleDirectUpload(input: { filename: string; contentType: string; base64Data: string }) {
    if (!MIME_EXTENSION[input.contentType]) {
      throw new BadRequestError('Unsupported image content type.', 'INVALID_IMAGE_TYPE');
    }
    const decoded = decodeStrictBase64(input.base64Data, input.contentType);
    const normalized = await validateAndNormalizeImage(decoded, input.contentType);
    const stored = await this.storage.persistDirectUpload(normalized);
    logger.info({ key: stored.key, sizeBytes: normalized.body.length, contentType: normalized.contentType }, 'Product image stored.');
    return { ...stored, sizeBytes: normalized.body.length };
  }

  deleteObject(key: string): Promise<void> {
    return this.storage.deleteObject(key);
  }
}

export const uploadService = new UploadService();
