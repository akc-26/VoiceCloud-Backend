import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../admin/entities/system-setting.entity';
import {
  HostLevelBenefitDto,
  HostLevelDefinitionDto,
} from './dto/host-progression-response.dto';

export const HOST_LEVEL_DEFINITIONS_SETTING = 'host_level_definitions';

const DEFAULT_HOST_LEVELS: HostLevelDefinitionDto[] = [
  {
    level: 1,
    name: 'Starter Host',
    minimumXp: 0,
    benefits: [{ key: 'host_badge', label: 'Host badge and standard room tools' }],
  },
  {
    level: 2,
    name: 'Rising Host',
    minimumXp: 1000,
    benefits: [{ key: 'priority_discovery', label: 'Priority placement in Host discovery' }],
  },
  {
    level: 3,
    name: 'Established Host',
    minimumXp: 5000,
    benefits: [{ key: 'enhanced_analytics', label: 'Enhanced Host analytics' }],
  },
  {
    level: 4,
    name: 'Elite Host',
    minimumXp: 15000,
    benefits: [{ key: 'featured_eligibility', label: 'Eligibility for featured placement' }],
  },
  {
    level: 5,
    name: 'Premier Host',
    minimumXp: 50000,
    benefits: [{ key: 'premier_support', label: 'Premier Host support benefits' }],
  },
];

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
    if (!setting) return this.cloneDefaults();

    try {
      const parsed: unknown = JSON.parse(setting.value);
      return this.validateDefinitions(parsed);
    } catch (error) {
      this.logger.error(
        `Invalid Host level configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Host level configuration is invalid',
      );
    }
  }

  getLevelForXp(definitions: HostLevelDefinitionDto[], xp: number) {
    const safeXp = Math.max(0, Math.floor(xp || 0));
    return [...definitions]
      .reverse()
      .find((definition) => safeXp >= definition.minimumXp)!;
  }

  getNextLevel(
    definitions: HostLevelDefinitionDto[],
    currentLevel: number,
  ): HostLevelDefinitionDto | null {
    return (
      definitions.find((definition) => definition.level > currentLevel) || null
    );
  }

  private validateDefinitions(value: unknown): HostLevelDefinitionDto[] {
    if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
      throw new Error('definitions must be a non-empty array');
    }

    const definitions = value.map((entry, index) =>
      this.validateDefinition(entry, index),
    );
    definitions.sort((a, b) => a.level - b.level);

    if (definitions[0].level !== 1 || definitions[0].minimumXp !== 0) {
      throw new Error('level 1 with zero minimum XP is required');
    }

    for (let index = 1; index < definitions.length; index += 1) {
      const previous = definitions[index - 1];
      const current = definitions[index];
      if (current.level !== previous.level + 1) {
        throw new Error('Host levels must be contiguous');
      }
      if (current.minimumXp <= previous.minimumXp) {
        throw new Error('Host XP thresholds must increase strictly');
      }
    }

    return definitions;
  }

  private validateDefinition(value: unknown, index: number): HostLevelDefinitionDto {
    if (!value || typeof value !== 'object') {
      throw new Error(`definition ${index} is invalid`);
    }
    const candidate = value as Record<string, unknown>;
    const level = Number(candidate.level);
    const minimumXp = Number(candidate.minimumXp);
    const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';

    if (!Number.isSafeInteger(level) || level < 1 || level > 100) {
      throw new Error(`definition ${index} has an invalid level`);
    }
    if (!Number.isSafeInteger(minimumXp) || minimumXp < 0 || minimumXp > 1_000_000_000) {
      throw new Error(`definition ${index} has an invalid XP threshold`);
    }
    if (!name || name.length > 100) {
      throw new Error(`definition ${index} has an invalid name`);
    }
    if (!Array.isArray(candidate.benefits) || candidate.benefits.length > 50) {
      throw new Error(`definition ${index} has invalid benefits`);
    }

    const benefits = candidate.benefits.map((benefit, benefitIndex) =>
      this.validateBenefit(benefit, index, benefitIndex),
    );
    return { level, name, minimumXp, benefits };
  }

  private validateBenefit(
    value: unknown,
    definitionIndex: number,
    benefitIndex: number,
  ): HostLevelBenefitDto {
    if (!value || typeof value !== 'object') {
      throw new Error(
        `definition ${definitionIndex} benefit ${benefitIndex} is invalid`,
      );
    }
    const candidate = value as Record<string, unknown>;
    const key = typeof candidate.key === 'string' ? candidate.key.trim() : '';
    const label =
      typeof candidate.label === 'string' ? candidate.label.trim() : '';
    if (!/^[a-z0-9_]{1,64}$/.test(key) || !label || label.length > 200) {
      throw new Error(
        `definition ${definitionIndex} benefit ${benefitIndex} is invalid`,
      );
    }
    return { key, label };
  }

  private cloneDefaults(): HostLevelDefinitionDto[] {
    return DEFAULT_HOST_LEVELS.map((definition) => ({
      ...definition,
      benefits: definition.benefits.map((benefit) => ({ ...benefit })),
    }));
  }
}
