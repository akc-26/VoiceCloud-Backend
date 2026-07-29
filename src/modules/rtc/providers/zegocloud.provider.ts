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
export class ZegoCloudProvider implements IRtcProvider {
  readonly name = 'zegocloud';
  private readonly logger = new Logger(ZegoCloudProvider.name);

  async generateToken(
    config: RtcConfig,
    options: RtcTokenOptions,
  ): Promise<RtcTokenResult> {
    const appId = config.appId || 'ZEGO_APP_ID';
    const secret = config.secret || 'ZEGO_SECRET_32_CHARS_DEFAULT_KEY_000';
    const expirationSeconds =
      options.expirationSeconds || config.tokenExpiration || 3600;

    const issueTime = Math.floor(Date.now() / 1000);
    const expireTime = issueTime + expirationSeconds;

    const nonce = crypto.randomBytes(8).toString('hex');
    const payload = JSON.stringify({
      app_id: appId,
      user_id: options.userId,
      room_id: options.roomId,
      role: options.role,
      nonce,
      ctime: issueTime,
      expire: expireTime,
    });

    const cipher = crypto.createCipheriv(
      'aes-128-cbc',
      Buffer.from(secret.substring(0, 16)),
      Buffer.from(secret.substring(16, 32)),
    );
    let encrypted = cipher.update(payload, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const token = `ZEGO04${encrypted}`;

    return Promise.resolve({
      token,
      provider: this.name,
      appId,
      roomId: options.roomId,
      userId: options.userId,
      role: options.role,
      expiresAt: new Date(expireTime * 1000),
    });
  }

  async validateToken(config: RtcConfig, token: string): Promise<boolean> {
    this.logger.debug(`Validating ZEGOCLOUD token for app ${config.appId}`);
    return Promise.resolve(token.startsWith('ZEGO04'));
  }

  async startRecording(
    config: RtcConfig,
    options: RtcRecordingOptions,
  ): Promise<RtcRecordingResult> {
    const providerJobId = `zego_rec_${options.sessionId}_${Date.now()}`;
    this.logger.log(
      `[ZEGOCLOUD] Starting cloud recording for room ${options.roomId}, provider: ${config.activeProvider}`,
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
    this.logger.log(`[ZEGOCLOUD] Pausing recording job ${providerJobId}`);
    return Promise.resolve({ success: true, status: 'paused' });
  }

  async resumeRecording(
    config: RtcConfig,
    providerJobId: string,
  ): Promise<{ success: boolean; status: string }> {
    this.logger.log(`[ZEGOCLOUD] Resuming recording job ${providerJobId}`);
    return Promise.resolve({ success: true, status: 'recording' });
  }

  async stopRecording(
    config: RtcConfig,
    providerJobId: string,
  ): Promise<{ success: boolean; recordingUrl?: string }> {
    this.logger.log(
      `[ZEGOCLOUD] Stopping recording task ${providerJobId}, provider: ${config.activeProvider}`,
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
      `[ZEGOCLOUD] Kicking out user ${userId} from room ${roomId}, provider: ${config.activeProvider}`,
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
      `[ZEGOCLOUD] Muting=${mute} audio for user ${userId} in ${roomId}, provider: ${config.activeProvider}`,
    );
    return Promise.resolve(true);
  }

  async getChannelStatus(
    config: RtcConfig,
    roomId: string,
  ): Promise<{ isLive: boolean; activeUsers: number }> {
    this.logger.debug(
      `[ZEGOCLOUD] Channel status for ${roomId}, provider: ${config.activeProvider}`,
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
    this.logger.log(`[ZEGOCLOUD] Refreshing token for user ${options.userId}`);
    return this.generateToken(config, options);
  }

  async syncParticipantState(
    config: RtcConfig,
    roomId: string,
  ): Promise<{ activeParticipants: string[] }> {
    this.logger.debug(
      `[ZEGOCLOUD] Syncing participant state for room ${roomId}`,
    );
    return Promise.resolve({ activeParticipants: [] });
  }

  verifyWebhookSignature(
    config: RtcConfig,
    headers: Record<string, string>,
    body: unknown,
  ): boolean {
    this.logger.debug(
      `[ZEGOCLOUD] Webhook payload length ${JSON.stringify(body).length}, provider: ${config.activeProvider}, headers: ${Object.keys(headers).length}`,
    );
    return true;
  }
}
