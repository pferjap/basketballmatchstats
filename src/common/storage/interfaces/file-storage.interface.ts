export const FILE_STORAGE_SERVICE = Symbol('FILE_STORAGE_SERVICE');

export interface IFileStorageService {
  upload(file: Buffer, path: string): Promise<string>;
  delete(path: string): Promise<void>;
}
