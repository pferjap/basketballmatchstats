import { Global, Module } from '@nestjs/common';
import { FILE_STORAGE_SERVICE } from './interfaces/file-storage.interface';
import { LocalFileStorageService } from './local-file-storage.service';
import { ImageProcessingService } from './image-processing.service';

@Global()
@Module({
  providers: [
    { provide: FILE_STORAGE_SERVICE, useClass: LocalFileStorageService },
    ImageProcessingService,
  ],
  exports: [FILE_STORAGE_SERVICE, ImageProcessingService],
})
export class StorageModule {}
