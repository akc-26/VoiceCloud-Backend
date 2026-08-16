import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { IRtcProvider } from './rtc-provider.interface';
import { AgoraProvider } from './agora.provider';
import { LiveKitProvider } from './livekit.provider';
import { ZegoCloudProvider } from './zegocloud.provider';
import { DefaultMockProvider } from './default-mock.provider';
import { DynamicConfigService } from '../../config/dynamic-config.service';
import { ProviderCategory } from '../../admin/entities/provider-config.entity';

@Injectable()
export class RtcProviderFactory {
  private readonly logger = new Logger(RtcProviderFactory.name);
  private readonly providers: Map<string, IRtcProvider> = new Map();

  constructor(
    private readonly agoraProvider: AgoraProvider,
    private readonly liveKitProvider: LiveKitProvider,
    private readonly zegoCloudProvider: ZegoCloudProvider,
    private readonly defaultMockProvider: DefaultMockProvider,
    private readonly dynamicConfigService: DynamicConfigService,
  ) {
    this.providers.set('agora', agoraProvider);
    this.providers.set('livekit', liveKitProvider);
    this.providers.set('zegocloud', zegoCloudProvider);
    if (this.isMockAllowed()) {
      this.providers.set('default_mock', defaultMockProvider);
      this.logger.warn('RTC mock provider enabled for non-production development only');
    }
  }

  private isMockAllowed(): boolean {
    return (
      process.env.NODE_ENV !== 'production' &&
      process.env.ENABLE_RTC_MOCK_PROVIDER === 'true'
    );
  }

  private resolveProvider(providerType: string): IRtcProvider {
    const key = providerType.trim().toLowerCase();
    if (key === 'default_mock' && !this.isMockAllowed()) {
      throw new BadRequestException(
        'The RTC mock provider is disabled. Configure a real RTC provider.',
      );
    }
    const provider = this.providers.get(key);
    if (!provider) {
      throw new BadRequestException(`Unsupported RTC provider: ${providerType}`);
    }
    return provider;
  }

  async getActiveProvider(): Promise<IRtcProvider> {
    const activeConfig =
      await this.dynamicConfigService.getActiveProviderConfig(
        ProviderCategory.RTC,
      );

    if (!activeConfig) {
      throw new BadRequestException(
        'No enabled RTC provider configuration is available',
      );
    }

    return this.resolveProvider(activeConfig.providerType);
  }

  getProvider(providerType?: string): IRtcProvider {
    if (!providerType) {
      throw new BadRequestException('RTC provider type is required');
    }
    return this.resolveProvider(providerType);
  }
}
