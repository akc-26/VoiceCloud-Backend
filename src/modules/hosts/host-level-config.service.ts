import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../admin/entities/system-setting.entity';
import { HostLevelDefinitionDto } from './dto/host-progression-response.dto';
import {
  cloneDefaultHostLevels,
  validateHostLevelDefinitions,
} from './host-level-config.validator';

export const HOST_LEVEL_DEFINITIONS_SETTING = 'host_level_definitions';

@Injectable()
export class HostLevelConfigService {
  private readonly logger = new Logger(HostLevelConfigService.name);

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepository: Repository<SystemSetting>,
  ) {}

  async getDefinitions(): Promise<HostLevelDefinitionDto[]> {
    const setting = await this.settingRepository.findOne({
      where: { key: HOST_LEVEL_DEFINITIONS_SETTING },
    });
    if (!setting) return cloneDefaultHostLevels();

    try {
      const parsed: unknown = JSON.parse(setting.value);
      return validateHostLevelDefinitions(parsed);
    } catch (error) {
      this.logger.error(
        `Invalid Host level configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Host level configuration is invalid',
      );
    }
  }

  getLevelForXp(
    definitions: HostLevelDefinitionDto[],
    xp: number,
  ): HostLevelDefinitionDto {
    const safeXp = Math.max(0, Math.floor(xp || 0));
    const matchedLevel = [...definitions]
      .reverse()
      .find((definition) => safeXp >= definition.minimumXp);

    if (!matchedLevel) {
      throw new ServiceUnavailableException(
        'Host level configuration does not contain a valid base level',
      );
    }

    return matchedLevel;
  }

  getNextLevel(
    definitions: HostLevelDefinitionDto[],
    currentLevel: number,
  ): HostLevelDefinitionDto | null {
    return (
      definitions.find((definition) => definition.level > currentLevel) || null
    );
  }
}
