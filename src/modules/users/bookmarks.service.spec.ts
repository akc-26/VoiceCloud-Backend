import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { UserBookmark } from './entities/user-bookmark.entity';

describe('BookmarksService', () => {
  let service: BookmarksService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ id: 'bm-123', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'bm-123', ...entity })),
      remove: jest.fn((entity) => Promise.resolve(entity)),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'bm-123',
              userId: 'user-1',
              targetType: 'scheduled_room',
              targetId: 'sr-1',
              title: 'Test Room',
            },
          ],
          1,
        ]),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarksService,
        {
          provide: getRepositoryToken(UserBookmark),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BookmarksService>(BookmarksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBookmark', () => {
    it('should create a new bookmark if none exists', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.createBookmark('user-1', {
        targetType: 'scheduled_room',
        targetId: 'sr-1',
        title: 'Test Room',
      });

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          targetType: 'scheduled_room',
          targetId: 'sr-1',
        },
      });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.title).toBe('Test Room');
    });

    it('should update an existing bookmark if found', async () => {
      const existing = {
        id: 'bm-123',
        userId: 'user-1',
        targetType: 'scheduled_room',
        targetId: 'sr-1',
        title: 'Old Title',
      };
      mockRepository.findOne.mockResolvedValue(existing);

      const result = await service.createBookmark('user-1', {
        targetType: 'scheduled_room',
        targetId: 'sr-1',
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated Title' }),
      );
    });
  });

  describe('getUserBookmarks', () => {
    it('should return paginated user bookmarks', async () => {
      const result = await service.getUserBookmarks('user-1', { page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('removeBookmark', () => {
    it('should remove bookmark if found by ID', async () => {
      const bookmark = { id: 'bm-123', userId: 'user-1', targetId: 'sr-1' };
      mockRepository.findOne.mockResolvedValue(bookmark);

      const result = await service.removeBookmark('user-1', 'bm-123');

      expect(result.success).toBe(true);
      expect(mockRepository.remove).toHaveBeenCalledWith(bookmark);
    });

    it('should throw NotFoundException if bookmark does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.removeBookmark('user-1', 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkIsBookmarked', () => {
    it('should return isBookmarked true if count > 0', async () => {
      mockRepository.count.mockResolvedValue(1);

      const result = await service.checkIsBookmarked('user-1', 'room', 'room-1');

      expect(result.isBookmarked).toBe(true);
    });

    it('should return isBookmarked false if count is 0', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await service.checkIsBookmarked('user-1', 'room', 'room-2');

      expect(result.isBookmarked).toBe(false);
    });
  });
});
