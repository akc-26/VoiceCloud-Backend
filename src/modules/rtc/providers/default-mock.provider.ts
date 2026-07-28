import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IRtcProvider,
  RtcTokenOptions,
  RtcTokenResult,
  RtcRecordingOptions,
  RtcRecordingResult,
} from './rtc-provider.interface';
import { RtcConfig } from '../entities/rtc-config.entity';

@Injectable()
export class DefaultMockProvider implements IRtcProvider {
  readonly name = 'default_mock';
  private readonly logger = new Logger(DefaultMockProvider.name);

  async generateToken(
    config: RtcConfig,
    options: RtcTokenOptions,
  ): Promise<RtcTokenResult> {
    const expirationSeconds =
      options.expirationSeconds || config.tokenExpiration || 3600;
    const issueTime = Math.floor(Date.now() / 1000);
    const expireTime = issueTime + expirationSeconds;

    const mockToken = `MOCK_RTC_TOKEN_${options.roomId}_${options.userId}_${options.role}_${crypto.randomBytes(8).toString('hex')}`;

    return Promise.resolve({
      token: mockToken,
      provider: this.name,
      appId: config.appId || 'MOCK_APP_ID',
      roomId: options.roomId,
      userId: options.userId,
      role: options.role,
      expiresAt: new Date(expireTime * 1000),
    });
  }

  async validateToken(config: RtcConfig, token: string): Promise<boolean> {
    this.logger.debug(
      `[DefaultMock] Validating token for ${config.activeProvider}`,
    );
    return Promise.resolve(token.startsWith('MOCK_RTC_TOKEN_'));
  }

  async startRecording(
    config: RtcConfig,
    options: RtcRecordingOptions,
  ): Promise<RtcRecordingResult> {
    const providerJobId = `mock_rec_${options.sessionId}_${Date.now()}`;
    this.logger.log(
      `[DefaultMock] Starting recording job ${providerJobId}, provider: ${config.activeProvider}`,
    );
    return Promise.resolve({
      providerJobId,
      status: 'recording',
      recordingUrl: `https://storage.voicecloud.app/recordings/${options.roomId}/${providerJobId}.mp4`,
    });
  }

  async pauseRecording(
    config: RtcConfig,
    providerJobId: string,
  ): Promise<{ success: boolean; status: string }> {
    this.logger.log(`[DefaultMock] Pausing recording job ${providerJobId}`);
    return Promise.resolve({ success: true, status: 'paused' });
  }

  async resumeRecording(
    config: RtcConfig,
    providerJobId: string,
  ): Promise<{ success: boolean; status: string }> {
    this.logger.log(`[DefaultMock] Resuming recording job ${providerJobId}`);
    return Promise.resolve({ success: true, status: 'recording' });
  }

  async stopRecording(
    config: RtcConfig,
    providerJobId: string,
  ): Promise<{ success: boolean; recordingUrl?: string }> {
    this.logger.log(
      `[DefaultMock] Stopping recording job ${providerJobId}, provider: ${config.activeProvider}`,
    );
    return Promise.resolve({
      success: true,
      recordingUrl: `https://storage.voicecloud.app/recordings/${providerJobId}.mp4`,
    });
  }

  async kickUser(
    config: RtcConfig,
    roomId: string,
    userId: string,
  ): Promise<boolean> {
    this.logger.log(
      `[DefaultMock] Kicking user ${userId} from ${roomId}, provider: ${config.activeProvider}`,
    );
    return Promise.resolve(true);
  }

  async muteUser(
    config: RtcConfig,
    roomId: string,
    userId: string,
    mute: boolean,
  ): Promise<boolean> {
    this.logger.log(
      `[DefaultMock] Setting mute=${mute} for user ${userId} in ${roomId}, provider: ${config.activeProvider}`,
    );
    return Promise.resolve(true);
  }

  async getChannelStatus(
    config: RtcConfig,
    roomId: string,
  ): Promise<{ isLive: boolean; activeUsers: number }> {
    this.logger.debug(
      `[DefaultMock] Channel status for ${roomId}, provider: ${config.activeProvider}`,
    );
    return Promise.resolve({
      isLive: true,
      activeUsers: 1,
    });
  }

  async refreshToken(
    config: RtcConfig,
    oldToken: string,
    options: RtcTokenOptions,
  ): Promise<RtcTokenResult> {
    this.logger.log(`[DefaultMock] Refreshing token for user ${options.userId}`);
    return this.generateToken(config, options);
  }

  async syncParticipantState(
    config: RtcConfig,
    roomId: string,
  ): Promise<{ activeParticipants: string[] }> {
    this.logger.debug(`[DefaultMock] Syncing participant state for room ${roomId}`);
    return Promise.resolve({ activeParticipants: [] });
  }

  verifyWebhookSignature(
    config: RtcConfig,
    headers: Record<string, string>,
    body: unknown,
  ): boolean {
    this.logger.debug(
      `[DefaultMock] Webhook payload length ${JSON.stringify(body).length}, provider: ${config.activeProvider}, headers: ${Object.keys(headers).length}`,
    );
    return true;
  }
}
