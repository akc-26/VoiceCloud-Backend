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
    this.providers.set('default_mock', defaultMockProvider);
  }

  async getActiveProvider(): Promise<IRtcProvider> {
    const activeConfig = await this.dynamicConfigService.getActiveProviderConfig(
      ProviderCategory.RTC,
    );

    if (activeConfig && this.providers.has(activeConfig.providerType)) {
      return this.providers.get(activeConfig.providerType)!;
    }

    return this.agoraProvider;
  }

  getProvider(providerType?: string): IRtcProvider {
    const key = providerType ? providerType.toLowerCase() : 'agora';
    const provider = this.providers.get(key);
    if (!provider) {
      return this.agoraProvider;
    }
    return provider;
  }
}
