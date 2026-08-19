import { ServiceUnavailableException } from '@nestjs/common';
import { HostLevelConfigService } from './host-level-config.service';

const settingRepository = {
  findOne: jest.fn(),
};

describe('HostLevelConfigService (B3-2)', () => {
  let service: HostLevelConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HostLevelConfigService(settingRepository as any);
  });

  it('uses secure default Host level definitions when settings are not seeded', async () => {
    settingRepository.findOne.mockResolvedValue(null);
    const levels = await service.getDefinitions();

    expect(levels.map((level) => level.minimumXp)).toEqual([
      0, 1000, 5000, 15000, 50000,
    ]);
    expect(levels[0].benefits[0].key).toBe('host_badge');
  });

  it('loads backend-configured thresholds, names and benefits', async () => {
    settingRepository.findOne.mockResolvedValue({
      key: 'host_level_definitions',
      value: JSON.stringify([
        { level: 1, name: 'Bronze', minimumXp: 0, benefits: [] },
        {
          level: 2,
          name: 'Silver',
          minimumXp: 250,
          benefits: [{ key: 'silver_badge', label: 'Silver badge' }],
        },
      ]),
    });

    const levels = await service.getDefinitions();
    expect(levels[1]).toEqual({
      level: 2,
      name: 'Silver',
      minimumXp: 250,
      benefits: [{ key: 'silver_badge', label: 'Silver badge' }],
    });
  });

  it('rejects non-contiguous levels', async () => {
    settingRepository.findOne.mockResolvedValue({
      value: JSON.stringify([
        { level: 1, name: 'One', minimumXp: 0, benefits: [] },
        { level: 3, name: 'Three', minimumXp: 100, benefits: [] },
      ]),
    });

    await expect(service.getDefinitions()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('rejects duplicate or decreasing XP thresholds', async () => {
    settingRepository.findOne.mockResolvedValue({
      value: JSON.stringify([
        { level: 1, name: 'One', minimumXp: 0, benefits: [] },
        { level: 2, name: 'Two', minimumXp: 0, benefits: [] },
      ]),
    });

    await expect(service.getDefinitions()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('rejects unsafe benefit keys and malformed JSON', async () => {
    settingRepository.findOne.mockResolvedValue({
      value: JSON.stringify([
        { level: 1, name: 'One', minimumXp: 0, benefits: [] },
        {
          level: 2,
          name: 'Two',
          minimumXp: 100,
          benefits: [{ key: '../unsafe', label: 'Unsafe' }],
        },
      ]),
    });
    await expect(service.getDefinitions()).rejects.toThrow(
      ServiceUnavailableException,
    );

    settingRepository.findOne.mockResolvedValue({ value: '{broken' });
    await expect(service.getDefinitions()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('resolves the configured current and next levels from XP', async () => {
    settingRepository.findOne.mockResolvedValue(null);
    const levels = await service.getDefinitions();

    expect(service.getLevelForXp(levels, 4999).level).toBe(2);
    expect(service.getNextLevel(levels, 2)?.level).toBe(3);
    expect(service.getNextLevel(levels, 5)).toBeNull();
  });
});
