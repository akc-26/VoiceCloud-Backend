import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  IRtcProvider,
  RtcTokenOptions,
  RtcTokenResult,
  RtcRecordingOptions,
  RtcRecordingResult,
} from './rtc-provider.interface';
import { RtcConfig } from '../entities/rtc-config.entity';

@Injectable()
export class AgoraProvider implements IRtcProvider {
  readonly name = 'agora';
  private readonly logger = new Logger(AgoraProvider.name);

  private unavailable(operation: string): never {
    throw new ServiceUnavailableException(
      `Agora ${operation} requires the official server-side Agora adapter; VoiceCloud will not fabricate provider success`,
    );
  }

  async generateToken(
    _config: RtcConfig,
    _options: RtcTokenOptions,
  ): Promise<RtcTokenResult> {
    return this.unavailable('token generation');
  }

  async validateToken(_config: RtcConfig, _token: string): Promise<boolean> {
    return false;
  }

  async startRecording(
    _config: RtcConfig,
    _options: RtcRecordingOptions,
  ): Promise<RtcRecordingResult> {
    return this.unavailable('cloud recording');
  }

  async pauseRecording(
    _config: RtcConfig,
    _providerJobId: string,
  ): Promise<{ success: boolean; status: string }> {
    return this.unavailable('recording pause');
  }

  async resumeRecording(
    _config: RtcConfig,
    _providerJobId: string,
  ): Promise<{ success: boolean; status: string }> {
    return this.unavailable('recording resume');
  }

  async stopRecording(
    _config: RtcConfig,
    _providerJobId: string,
  ): Promise<{ success: boolean; recordingUrl?: string }> {
    return this.unavailable('recording stop');
  }

  async kickUser(
    _config: RtcConfig,
    _roomId: string,
    _userId: string,
  ): Promise<boolean> {
    return this.unavailable('participant removal');
  }

  async muteUser(
    _config: RtcConfig,
    _roomId: string,
    _userId: string,
    _mute: boolean,
  ): Promise<boolean> {
    return this.unavailable('participant mute');
  }

  async getChannelStatus(
    _config: RtcConfig,
    _roomId: string,
  ): Promise<{ isLive: boolean; activeUsers: number }> {
    return this.unavailable('channel status');
  }

  async refreshToken(
    config: RtcConfig,
    _oldToken: string,
    options: RtcTokenOptions,
  ): Promise<RtcTokenResult> {
    return this.generateToken(config, options);
  }

  async syncParticipantState(
    _config: RtcConfig,
    _roomId: string,
  ): Promise<{ activeParticipants: string[] }> {
    return this.unavailable('participant synchronization');
  }

  verifyWebhookSignature(
    _config: RtcConfig,
    _headers: Record<string, string>,
    _body: unknown,
  ): boolean {
    this.logger.warn(
      'Agora webhook rejected because an official signature verifier is not configured',
    );
    return false;
  }
}
