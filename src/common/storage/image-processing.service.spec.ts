import { BadRequestException } from '@nestjs/common';
import { ImageProcessingService } from './image-processing.service';

const mockToBuffer = jest.fn().mockResolvedValue(Buffer.from('optimized'));
const mockWebp = jest.fn().mockReturnValue({ toBuffer: mockToBuffer });
const mockResize = jest.fn().mockReturnValue({ webp: mockWebp });
jest.mock('sharp', () => ({
  __esModule: true,
  default: jest.fn(() => ({ resize: mockResize })),
}));

const mockFileTypeFromBuffer = jest.fn();
jest.mock('file-type', () => ({
  fileTypeFromBuffer: mockFileTypeFromBuffer,
}), { virtual: true });

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;

  beforeEach(() => {
    service = new ImageProcessingService();
    jest.clearAllMocks();
  });

  it('accepts JPEG and returns optimized WebP buffer', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({
      ext: 'jpg',
      mime: 'image/jpeg',
    });
    mockToBuffer.mockResolvedValue(Buffer.from('optimized'));

    const result = await service.optimize(Buffer.from('jpeg-data'));

    expect(mockFileTypeFromBuffer).toHaveBeenCalled();
    expect(result).toEqual(Buffer.from('optimized'));
  });

  it('accepts PNG', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({
      ext: 'png',
      mime: 'image/png',
    });
    mockToBuffer.mockResolvedValue(Buffer.from('optimized'));

    await expect(
      service.optimize(Buffer.from('png-data')),
    ).resolves.toBeDefined();
  });

  it('accepts WebP', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({
      ext: 'webp',
      mime: 'image/webp',
    });
    mockToBuffer.mockResolvedValue(Buffer.from('optimized'));

    await expect(
      service.optimize(Buffer.from('webp-data')),
    ).resolves.toBeDefined();
  });

  it('rejects unsupported MIME types', async () => {
    mockFileTypeFromBuffer.mockResolvedValue({
      ext: 'gif',
      mime: 'image/gif',
    });

    await expect(
      service.optimize(Buffer.from('gif-data')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unrecognizable files (null type)', async () => {
    mockFileTypeFromBuffer.mockResolvedValue(undefined);

    await expect(
      service.optimize(Buffer.from('random')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
