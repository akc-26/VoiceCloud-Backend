import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegionalPricingConfig } from './entities/regional-pricing-config.entity';
import { CreateRegionalPricingDto } from './dto/create-regional-pricing.dto';
import { ConvertPriceDto } from './dto/convert-price.dto';
import { CalculateEarningsDto } from './dto/calculate-earnings.dto';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RegionalPricingService {
  private readonly logger = new Logger(RegionalPricingService.name);

  constructor(
    @InjectRepository(RegionalPricingConfig)
    private readonly pricingRepository: Repository<RegionalPricingConfig>,
    private readonly redisService: RedisService,
  ) {}

  async createOrUpdateConfig(
    dto: CreateRegionalPricingDto,
  ): Promise<RegionalPricingConfig> {
    const code = dto.countryCode.toUpperCase();
    let config = await this.pricingRepository.findOne({
      where: { countryCode: code },
    });

    if (config) {
      Object.assign(config, {
        ...dto,
        countryCode: code,
      });
    } else {
      config = this.pricingRepository.create({
        ...dto,
        countryCode: code,
      });
    }

    const saved = await this.pricingRepository.save(config);

    // Invalidate Redis Cache
    await this.redisService.del(`regional_pricing:${code}`);
    await this.redisService.del('regional_pricing:all');

    return saved;
  }

  async getAllConfigs(): Promise<RegionalPricingConfig[]> {
    const cached = await this.redisService.get('regional_pricing:all');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    const configs = await this.pricingRepository.find({
      order: { countryName: 'ASC' },
    });

    await this.redisService.set(
      'regional_pricing:all',
      JSON.stringify(configs),
      3600,
    );

    return configs;
  }

  async getConfigByCountry(countryCode: string): Promise<RegionalPricingConfig> {
    const code = countryCode.toUpperCase();
    const cacheKey = `regional_pricing:${code}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    let config = await this.pricingRepository.findOne({
      where: { countryCode: code, isActive: true },
    });

    if (!config) {
      // Fallback default US / Standard
      config = await this.pricingRepository.findOne({
        where: { countryCode: 'US' },
      });
      if (!config) {
        config = this.pricingRepository.create({
          countryCode: code,
          countryName: code,
          currencyCode: 'USD',
          exchangeRateToCoin: 1.0,
          localTaxPercentage: 0.0,
          creatorEarningShareRate: 0.7,
          isActive: true,
        });
      }
    }

    await this.redisService.set(cacheKey, JSON.stringify(config), 3600);
    return config;
  }

  async convertPrice(dto: ConvertPriceDto) {
    const config = await this.getConfigByCountry(dto.countryCode);

    // Coins to Local Currency
    const localCurrencyValue = Number(
      (dto.amount / config.exchangeRateToCoin).toFixed(2),
    );
    const taxAmount = Number(
      ((localCurrencyValue * config.localTaxPercentage) / 100).toFixed(2),
    );
    const totalLocalPriceWithTax = Number(
      (localCurrencyValue + taxAmount).toFixed(2),
    );

    return {
      coinAmount: dto.amount,
      countryCode: config.countryCode,
      currencyCode: config.currencyCode,
      exchangeRateToCoin: config.exchangeRateToCoin,
      localCurrencyAmountBeforeTax: localCurrencyValue,
      localTaxPercentage: config.localTaxPercentage,
      localTaxAmount: taxAmount,
      totalLocalPriceWithTax,
    };
  }

  async calculateCreatorEarnings(dto: CalculateEarningsDto) {
    const config = await this.getConfigByCountry(dto.countryCode);

    const grossCoins = dto.giftCoinsAmount;
    const creatorCoins = Math.round(grossCoins * config.creatorEarningShareRate);
    const platformCoins = grossCoins - creatorCoins;

    const creatorLocalGross = Number(
      (creatorCoins / config.exchangeRateToCoin).toFixed(2),
    );

    return {
      grossCoins,
      countryCode: config.countryCode,
      currencyCode: config.currencyCode,
      creatorShareRate: config.creatorEarningShareRate,
      creatorCoinsEarned: creatorCoins,
      platformCoinsRetained: platformCoins,
      estimatedCreatorLocalCurrencyEarnings: creatorLocalGross,
    };
  }

  async deleteConfig(countryCode: string): Promise<{ success: boolean }> {
    const code = countryCode.toUpperCase();
    const config = await this.pricingRepository.findOne({
      where: { countryCode: code },
    });
    if (!config) {
      throw new NotFoundException(`Pricing config for country ${code} not found`);
    }

    await this.pricingRepository.remove(config);
    await this.redisService.del(`regional_pricing:${code}`);
    await this.redisService.del('regional_pricing:all');

    return { success: true };
  }
}
