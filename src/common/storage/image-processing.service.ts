import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Injectable()
export class ImageProcessingService {
  async optimize(buffer: Buffer): Promise<Buffer> {
    const { fileTypeFromBuffer } = await import('file-type');
    const type = await fileTypeFromBuffer(buffer);

    if (!type || !ALLOWED_MIME_TYPES.has(type.mime)) {
      throw new BadRequestException(
        `Unsupported image format. Allowed: JPEG, PNG, WebP.`,
      );
    }

    return sharp(buffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  }
}
