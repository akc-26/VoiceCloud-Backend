import { Injectable, BadRequestException } from '@nestjs/common';
import { IRtcProvider } from './rtc-provider.interface';
import { AgoraProvider } from './agora.provider';
import { LiveKitProvider } from './livekit.provider';
import { ZegoCloudProvider } from './zegocloud.provider';
import { DefaultMockProvider } from './default-mock.provider';
import { RtcProviderType } from '../entities/rtc-config.entity';

@Injectable()
export class RtcProviderFactory {
  private readonly providers: Map<string, IRtcProvider> = new Map();

  constructor(
    private readonly agoraProvider: AgoraProvider,
    private readonly liveKitProvider: LiveKitProvider,
    private readonly zegoCloudProvider: ZegoCloudProvider,
    private readonly defaultMockProvider: DefaultMockProvider,
  ) {
    this.providers.set(RtcProviderType.AGORA, agoraProvider);
    this.providers.set(RtcProviderType.LIVEKIT, liveKitProvider);
    this.providers.set(RtcProviderType.ZEGOCLOUD, zegoCloudProvider);
    this.providers.set(RtcProviderType.DEFAULT_MOCK, defaultMockProvider);
  }

  getProvider(providerType?: string): IRtcProvider {
    const key = providerType || RtcProviderType.DEFAULT_MOCK;
    const provider = this.providers.get(key);
    if (!provider) {
      throw new BadRequestException(
        `Unsupported or invalid RTC Provider type: ${key}. Supported options: ${Array.from(
          this.providers.keys(),
        ).join(', ')}`,
      );
    }
    return provider;
  }
}
