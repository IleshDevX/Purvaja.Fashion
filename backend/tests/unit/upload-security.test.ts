import { afterEach, describe, expect, it } from 'vitest';
import { UploadService } from '../../src/services/upload.service.js';

const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('product image upload boundary', () => {
  const service = new UploadService();
  const createdKeys: string[] = [];

  afterEach(async () => {
    await Promise.all(createdKeys.splice(0).map(key => service.deleteObject(key)));
  });

  it('decodes, validates, re-encodes, and stores a real image', async () => {
    const result = await service.handleDirectUpload({
      filename: 'pixel.png',
      contentType: 'image/png',
      base64Data: `data:image/png;base64,${PNG_1X1}`,
    });
    createdKeys.push(result.key);
    expect(result.url).toMatch(/^\/uploads\/products\//);
    expect(result.key).toMatch(/^products\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]+\.png$/);
    expect(result.sizeBytes).toBeGreaterThan(0);
  });

  it('rejects HTML renamed as a JPEG', async () => {
    const html = Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
    await expect(service.handleDirectUpload({
      filename: 'attack.jpg',
      contentType: 'image/jpeg',
      base64Data: html,
    })).rejects.toMatchObject({ code: 'INVALID_IMAGE_DATA' });
  });

  it('rejects a claimed MIME type that differs from the decoded image', async () => {
    await expect(service.handleDirectUpload({
      filename: 'pixel.jpg',
      contentType: 'image/jpeg',
      base64Data: PNG_1X1,
    })).rejects.toMatchObject({ code: 'IMAGE_TYPE_MISMATCH' });
  });

  it('does not fabricate a presigned URL in local mode', async () => {
    await expect(service.getPresignedUploadUrl('pixel.png', 'image/png', 128))
      .rejects.toMatchObject({ code: 'PRESIGNED_UPLOAD_UNAVAILABLE' });
  });
});
