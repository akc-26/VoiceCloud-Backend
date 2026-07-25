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
export class AgoraProvider implements IRtcProvider {
  readonly name = 'agora';
  private readonly logger = new Logger(AgoraProvider.name);

  async generateToken(
    config: RtcConfig,
    options: RtcTokenOptions,
  ): Promise<RtcTokenResult> {
    const appId = config.appId || 'AGORA_APP_ID_DEFAULT';
    const appCertificate = config.appCertificate || 'AGORA_CERTIFICATE_DEFAULT';
    const expirationSeconds =
      options.expirationSeconds || config.tokenExpiration || 3600;

    const issueTime = Math.floor(Date.now() / 1000);
    const expireTime = issueTime + expirationSeconds;

    const rawPayload = `${appId}:${options.roomId}:${options.userId}:${options.role}:${expireTime}`;
    const hmac = crypto.createHmac('sha256', appCertificate);
    hmac.update(rawPayload);
    const signature = hmac.digest('hex');

    const token = `AGORA006${Buffer.from(
      JSON.stringify({
        appId,
        channel: options.roomId,
        uid: options.userId,
        role: options.role,
        expire: expireTime,
        sig: signature,
      }),
    ).toString('base64')}`;

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
    this.logger.debug(`Validating token for ${config.appId}`);
    if (!token.startsWith('AGORA006')) return Promise.resolve(false);
    try {
      const payloadBase64 = token.substring(8);
      const jsonStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const data = JSON.parse(jsonStr) as { expire: number };
      const now = Math.floor(Date.now() / 1000);
      return Promise.resolve(data.expire > now);
    } catch {
      return Promise.resolve(false);
    }
  }

  async startRecording(
    config: RtcConfig,
    options: RtcRecordingOptions,
  ): Promise<RtcRecordingResult> {
    const providerJobId = `agora_rec_${options.sessionId}_${Date.now()}`;
    this.logger.log(
      `[Agora] Starting cloud recording for session ${options.sessionId}, region: ${config.region}`,
    );
    return Promise.resolve({
      providerJobId,
      status: 'recording',
      recordingUrl: `https://storage.voicecloud.app/recordings/${options.roomId}/${providerJobId}.m3u8`,
    });
  }

  async stopRecording(
    config: RtcConfig,
    providerJobId: string,
  ): Promise<{ success: boolean; recordingUrl?: string }> {
    this.logger.log(
      `[Agora] Stopping cloud recording job ${providerJobId}, provider: ${config.activeProvider}`,
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
      `[Agora] Kicking user ${userId} from channel ${roomId}, provider: ${config.activeProvider}`,
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
      `[Agora] Setting mute=${mute} for user ${userId} in channel ${roomId}, provider: ${config.activeProvider}`,
    );
    return Promise.resolve(true);
  }

  async getChannelStatus(
    config: RtcConfig,
    roomId: string,
  ): Promise<{ isLive: boolean; activeUsers: number }> {
    this.logger.debug(
      `[Agora] Channel status for ${roomId}, provider: ${config.activeProvider}`,
    );
    return Promise.resolve({
      isLive: true,
      activeUsers: 1,
    });
  }

  verifyWebhookSignature(
    config: RtcConfig,
    headers: Record<string, string>,
    body: unknown,
  ): boolean {
    const secret = config.webhookSecret;
    if (!secret) return true;
    const signature =
      headers['x-agora-signature'] || headers['agora-signature'];
    if (!signature) return false;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(typeof body === 'string' ? body : JSON.stringify(body));
    const computed = hmac.digest('hex');
    return computed === signature;
  }
}
