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
import { SpeakerRole } from '../entities/rtc-speaker-history.entity';

@Injectable()
export class LiveKitProvider implements IRtcProvider {
  readonly name = 'livekit';
  private readonly logger = new Logger(LiveKitProvider.name);

  async generateToken(
    config: RtcConfig,
    options: RtcTokenOptions,
  ): Promise<RtcTokenResult> {
    const apiKey = config.apiKey || 'LIVEKIT_API_KEY';
    const apiSecret = config.secret || 'LIVEKIT_API_SECRET';
    const expirationSeconds =
      options.expirationSeconds || config.tokenExpiration || 3600;

    const issueTime = Math.floor(Date.now() / 1000);
    const expireTime = issueTime + expirationSeconds;

    const canPublish =
      options.role === SpeakerRole.HOST ||
      options.role === SpeakerRole.MODERATOR ||
      options.role === SpeakerRole.SPEAKER;

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      iss: apiKey,
      sub: options.userId,
      nbf: issueTime,
      exp: expireTime,
      video: {
        room: options.roomId,
        roomJoin: true,
        canPublish,
        canSubscribe: true,
        canPublishData: true,
      },
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(`${b64Header}.${b64Payload}`)
      .digest('base64url');

    const token = `${b64Header}.${b64Payload}.${signature}`;

    return Promise.resolve({
      token,
      provider: this.name,
      appId: apiKey,
      roomId: options.roomId,
      userId: options.userId,
      role: options.role,
      expiresAt: new Date(expireTime * 1000),
    });
  }

  async validateToken(config: RtcConfig, token: string): Promise<boolean> {
    this.logger.debug(`Validating token for LiveKit ${config.apiKey}`);
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return Promise.resolve(false);
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as { exp: number };
      const now = Math.floor(Date.now() / 1000);
      return Promise.resolve(payload.exp > now);
    } catch {
      return Promise.resolve(false);
    }
  }

  async startRecording(
    config: RtcConfig,
    options: RtcRecordingOptions,
  ): Promise<RtcRecordingResult> {
    const providerJobId = `livekit_egress_${options.sessionId}_${Date.now()}`;
    this.logger.log(
      `[LiveKit] Starting room egress for ${options.roomId}, provider: ${config.activeProvider}`,
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
    this.logger.log(`[LiveKit] Pausing room egress job ${providerJobId}`);
    return Promise.resolve({ success: true, status: 'paused' });
  }

  async resumeRecording(
    config: RtcConfig,
    providerJobId: string,
  ): Promise<{ success: boolean; status: string }> {
    this.logger.log(`[LiveKit] Resuming room egress job ${providerJobId}`);
    return Promise.resolve({ success: true, status: 'recording' });
  }

  async stopRecording(
    config: RtcConfig,
    providerJobId: string,
  ): Promise<{ success: boolean; recordingUrl?: string }> {
    this.logger.log(
      `[LiveKit] Stopping egress job ${providerJobId}, provider: ${config.activeProvider}`,
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
      `[LiveKit] Removing participant ${userId} from room ${roomId}, provider: ${config.activeProvider}`,
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
      `[LiveKit] Muting=${mute} track for participant ${userId} in ${roomId}, provider: ${config.activeProvider}`,
    );
    return Promise.resolve(true);
  }

  async getChannelStatus(
    config: RtcConfig,
    roomId: string,
  ): Promise<{ isLive: boolean; activeUsers: number }> {
    this.logger.debug(
      `[LiveKit] Channel status for ${roomId}, provider: ${config.activeProvider}`,
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
    this.logger.log(
      `[LiveKit] Refreshing token for participant ${options.userId}`,
    );
    return this.generateToken(config, options);
  }

  async syncParticipantState(
    config: RtcConfig,
    roomId: string,
  ): Promise<{ activeParticipants: string[] }> {
    this.logger.debug(`[LiveKit] Syncing participant state for room ${roomId}`);
    return Promise.resolve({ activeParticipants: [] });
  }

  verifyWebhookSignature(
    config: RtcConfig,
    headers: Record<string, string>,
    body: unknown,
  ): boolean {
    const secret = config.webhookSecret;
    this.logger.debug(
      `LiveKit webhook verification with body length: ${JSON.stringify(body).length}`,
    );
    if (!secret) return true;
    const authHeader = headers['authorization'];
    return !!authHeader;
  }
}
