import { GiftsService } from './gifts.service';

describe('Admin gift catalog visibility', () => {
  it('returns the complete persisted gift catalog without public availability filtering', async () => {
    const rows = [
      { id: 'gift-active', isActive: true, isArchived: false, isHidden: false },
      {
        id: 'gift-disabled',
        isActive: false,
        isArchived: false,
        isHidden: false,
      },
      {
        id: 'gift-archived',
        isActive: false,
        isArchived: true,
        isHidden: true,
      },
    ];
    const giftRepository = {
      find: jest.fn().mockResolvedValue(rows),
    } as any;
    const categoryRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'category-disabled',
          name: 'Legacy',
          isActive: false,
          sortOrder: 2,
        },
        {
          id: 'category-active',
          name: 'Popular',
          isActive: true,
          sortOrder: 1,
        },
      ]),
    } as any;
    const service = new GiftsService(
      giftRepository,
      categoryRepository,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(service.getAdminCatalog()).resolves.toEqual(rows);
    expect(giftRepository.find).toHaveBeenCalledWith({
      order: { sortOrder: 'ASC', coinPrice: 'ASC' },
    });

    const categories = await service.getAdminCategories();
    expect(categories).toHaveLength(2);
    expect(categoryRepository.find).toHaveBeenCalledWith({
      order: { sortOrder: 'ASC' },
    });
  });
});
