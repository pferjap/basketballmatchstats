import { Injectable } from '@nestjs/common';
import { join, dirname } from 'path';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { IFileStorageService } from './interfaces/file-storage.interface';

@Injectable()
export class LocalFileStorageService implements IFileStorageService {
  private readonly basePath = join(process.cwd(), 'uploads');

  async upload(file: Buffer, filePath: string): Promise<string> {
    const fullPath = join(this.basePath, filePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file);

    return `/uploads/${filePath}`;
  }

  async delete(filePath: string): Promise<void> {
    const relativePath = filePath.replace(/^\/uploads\//, '');
    const fullPath = join(this.basePath, relativePath);

    try {
      await unlink(fullPath);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
