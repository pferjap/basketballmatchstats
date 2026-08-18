import { Club } from '../../domain/entities/club.entity';
import { ClubNotFoundException } from '../../domain/exceptions/club-not-found.exception';
import { IClubRepository } from '../../domain/interfaces/club.repository.interface';
import { IFileStorageService } from '../../../../common/storage/interfaces/file-storage.interface';
import { ImageProcessingService } from '../../../../common/storage/image-processing.service';
import { CreateClubUseCase } from './create-club.use-case';
import { DeleteClubUseCase } from './delete-club.use-case';
import { GetClubUseCase } from './get-club.use-case';
import { ListClubsUseCase } from './list-clubs.use-case';
import { UpdateClubUseCase } from './update-club.use-case';
import { UploadClubLogoUseCase } from './upload-club-logo.use-case';
import { DeleteClubLogoUseCase } from './delete-club-logo.use-case';

function buildClub(overrides: Partial<Club> = {}): Club {
  return new Club({
    id: overrides.id ?? '11111111-1111-1111-1111-111111111111',
    name: overrides.name ?? 'Chicago Bulls',
    city: overrides.city ?? 'Chicago',
    logoUrl: overrides.logoUrl ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-01-02T00:00:00.000Z'),
  });
}

function buildRepository(): jest.Mocked<IClubRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateLogoUrl: jest.fn(),
    delete: jest.fn(),
    existsById: jest.fn(),
  };
}

function buildFileStorage(): jest.Mocked<IFileStorageService> {
  return {
    upload: jest.fn(),
    delete: jest.fn(),
  };
}

function buildImageProcessing(): jest.Mocked<Pick<ImageProcessingService, 'optimize'>> {
  return {
    optimize: jest.fn(),
  };
}

describe('Clubs use-cases', () => {
  let repository: jest.Mocked<IClubRepository>;

  beforeEach(() => {
    repository = buildRepository();
  });

  describe('CreateClubUseCase', () => {
    it('creates a club, defaulting a missing city to null', async () => {
      const club = buildClub({ city: null });
      repository.create.mockResolvedValue(club);
      const useCase = new CreateClubUseCase(repository);

      const result = await useCase.execute({ name: 'Chicago Bulls' });

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Chicago Bulls',
        city: null,
      });
      expect(result).toBe(club);
    });
  });

  describe('GetClubUseCase', () => {
    it('returns the club when it exists', async () => {
      const club = buildClub();
      repository.findById.mockResolvedValue(club);
      const useCase = new GetClubUseCase(repository);

      await expect(useCase.execute(club.id)).resolves.toBe(club);
    });

    it('throws ClubNotFoundException when it does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      const useCase = new GetClubUseCase(repository);

      await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
        ClubNotFoundException,
      );
    });
  });

  describe('ListClubsUseCase', () => {
    it('computes skip from page/limit and returns data with total', async () => {
      const clubs = [buildClub()];
      repository.findMany.mockResolvedValue(clubs);
      repository.count.mockResolvedValue(1);
      const useCase = new ListClubsUseCase(repository);

      const result = await useCase.execute(2, 10);

      expect(repository.findMany).toHaveBeenCalledWith({ skip: 10, take: 10 });
      expect(result).toEqual({ data: clubs, total: 1 });
    });
  });

  describe('UpdateClubUseCase', () => {
    it('updates an existing club', async () => {
      const club = buildClub({ name: 'Bulls' });
      repository.existsById.mockResolvedValue(true);
      repository.update.mockResolvedValue(club);
      const useCase = new UpdateClubUseCase(repository);

      const result = await useCase.execute(club.id, { name: 'Bulls' });

      expect(repository.update).toHaveBeenCalledWith(club.id, {
        name: 'Bulls',
        city: undefined,
      });
      expect(result).toBe(club);
    });

    it('throws ClubNotFoundException when the club is missing', async () => {
      repository.existsById.mockResolvedValue(false);
      const useCase = new UpdateClubUseCase(repository);

      await expect(
        useCase.execute('missing', { name: 'Bulls' }),
      ).rejects.toBeInstanceOf(ClubNotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('DeleteClubUseCase', () => {
    it('deletes an existing club', async () => {
      repository.existsById.mockResolvedValue(true);
      repository.delete.mockResolvedValue();
      const useCase = new DeleteClubUseCase(repository);

      await useCase.execute('id');

      expect(repository.delete).toHaveBeenCalledWith('id');
    });

    it('throws ClubNotFoundException when the club is missing', async () => {
      repository.existsById.mockResolvedValue(false);
      const useCase = new DeleteClubUseCase(repository);

      await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
        ClubNotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('UploadClubLogoUseCase', () => {
    let fileStorage: jest.Mocked<IFileStorageService>;
    let imageProcessing: jest.Mocked<Pick<ImageProcessingService, 'optimize'>>;

    beforeEach(() => {
      fileStorage = buildFileStorage();
      imageProcessing = buildImageProcessing();
    });

    it('optimizes the image, uploads it, and updates the club logoUrl', async () => {
      const clubId = '11111111-1111-1111-1111-111111111111';
      const rawBuffer = Buffer.from('raw-image');
      const optimizedBuffer = Buffer.from('optimized-image');
      const club = buildClub({ logoUrl: '/uploads/clubs/' + clubId + '.webp' });

      repository.existsById.mockResolvedValue(true);
      imageProcessing.optimize.mockResolvedValue(optimizedBuffer);
      fileStorage.upload.mockResolvedValue('/uploads/clubs/' + clubId + '.webp');
      repository.updateLogoUrl.mockResolvedValue(club);

      const useCase = new UploadClubLogoUseCase(
        repository,
        fileStorage,
        imageProcessing as unknown as ImageProcessingService,
      );

      const result = await useCase.execute(clubId, rawBuffer);

      expect(repository.existsById).toHaveBeenCalledWith(clubId);
      expect(imageProcessing.optimize).toHaveBeenCalledWith(rawBuffer);
      expect(fileStorage.upload).toHaveBeenCalledWith(
        optimizedBuffer,
        `clubs/${clubId}.webp`,
      );
      expect(repository.updateLogoUrl).toHaveBeenCalledWith(
        clubId,
        '/uploads/clubs/' + clubId + '.webp',
      );
      expect(result).toBe(club);
    });

    it('throws ClubNotFoundException when the club does not exist', async () => {
      repository.existsById.mockResolvedValue(false);
      const useCase = new UploadClubLogoUseCase(
        repository,
        fileStorage,
        imageProcessing as unknown as ImageProcessingService,
      );

      await expect(
        useCase.execute('missing', Buffer.from('data')),
      ).rejects.toBeInstanceOf(ClubNotFoundException);
      expect(imageProcessing.optimize).not.toHaveBeenCalled();
    });
  });

  describe('DeleteClubLogoUseCase', () => {
    let fileStorage: jest.Mocked<IFileStorageService>;

    beforeEach(() => {
      fileStorage = buildFileStorage();
    });

    it('deletes the file and clears logoUrl when club has a logo', async () => {
      const club = buildClub({ logoUrl: '/uploads/clubs/abc.webp' });
      repository.findById.mockResolvedValue(club);
      repository.updateLogoUrl.mockResolvedValue(
        buildClub({ logoUrl: null }),
      );
      fileStorage.delete.mockResolvedValue();

      const useCase = new DeleteClubLogoUseCase(repository, fileStorage);
      await useCase.execute(club.id);

      expect(fileStorage.delete).toHaveBeenCalledWith('/uploads/clubs/abc.webp');
      expect(repository.updateLogoUrl).toHaveBeenCalledWith(club.id, null);
    });

    it('clears logoUrl without deleting file when club has no logo', async () => {
      const club = buildClub({ logoUrl: null });
      repository.findById.mockResolvedValue(club);
      repository.updateLogoUrl.mockResolvedValue(club);

      const useCase = new DeleteClubLogoUseCase(repository, fileStorage);
      await useCase.execute(club.id);

      expect(fileStorage.delete).not.toHaveBeenCalled();
      expect(repository.updateLogoUrl).toHaveBeenCalledWith(club.id, null);
    });

    it('throws ClubNotFoundException when the club does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const useCase = new DeleteClubLogoUseCase(repository, fileStorage);

      await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
        ClubNotFoundException,
      );
      expect(fileStorage.delete).not.toHaveBeenCalled();
    });
  });
});
