import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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
import { DynamicConfigService } from '../../config/dynamic-config.service';
import { ProviderCategory } from '../../admin/entities/provider-config.entity';

interface LiveKitParticipantInfo {
  identity?: string;
  tracks?: Array<{ sid?: string; type?: string; muted?: boolean }>;
}

@Injectable()
export class LiveKitProvider implements IRtcProvider {
  readonly name = 'livekit';
  private readonly logger = new Logger(LiveKitProvider.name);

  constructor(private readonly dynamicConfigService: DynamicConfigService) {}

  private requireCredentials(config: RtcConfig): { apiKey: string; apiSecret: string } {
    const apiKey = config.apiKey?.trim();
    const apiSecret = config.secret?.trim();
    if (
      !apiKey ||
      !apiSecret ||
      /DEFAULT|LIVEKIT_API_KEY|LIVEKIT_API_SECRET/i.test(apiKey) ||
      /DEFAULT|LIVEKIT_API_KEY|LIVEKIT_API_SECRET/i.test(apiSecret)
    ) {
      throw new ServiceUnavailableException(
        'LiveKit credentials are not configured with real provider values',
      );
    }
    return { apiKey, apiSecret };
  }

  private signJwt(
    apiKey: string,
    apiSecret: string,
    subject: string,
    expirationSeconds: number,
    video: Record<string, unknown>,
  ): { token: string; expiresAt: Date } {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + expirationSeconds;
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      iss: apiKey,
      sub: subject,
      nbf: now - 5,
      exp,
      video,
    };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
    return {
      token: `${encodedHeader}.${encodedPayload}.${signature}`,
      expiresAt: new Date(exp * 1000),
    };
  }

  private async getHttpBaseUrl(): Promise<string> {
    const provider = await this.dynamicConfigService.getProviderConfig(
      ProviderCategory.RTC,
      this.name,
    );
    const host = String(provider?.config?.host || '').trim();
    if (!host || /voicecloud\.app$/i.test(host.replace(/^wss?:\/\//, ''))) {
      throw new ServiceUnavailableException(
        'LiveKit server URL is not configured with a real provider endpoint',
      );
    }
    const httpHost = host
      .replace(/^wss:\/\//i, 'https://')
      .replace(/^ws:\/\//i, 'http://')
      .replace(/\/$/, '');
    if (!/^https?:\/\//i.test(httpHost)) {
      throw new ServiceUnavailableException('LiveKit server URL must use ws/wss/http/https');
    }
    return httpHost;
  }

  private async roomServiceRequest<T>(
    config: RtcConfig,
    method: string,
    roomId: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const { apiKey, apiSecret } = this.requireCredentials(config);
    const baseUrl = await this.getHttpBaseUrl();
    const { token } = this.signJwt(apiKey, apiSecret, 'voicecloud-server', 120, {
      room: roomId,
      roomAdmin: true,
      roomList: true,
    });
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/twirp/livekit.RoomService/${method}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        `LiveKit RoomService ${method} could not be reached: ${(error as Error).message}`,
      );
    }
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new ServiceUnavailableException(
        `LiveKit RoomService ${method} failed (${response.status}): ${detail}`,
      );
    }
    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  async generateToken(
    config: RtcConfig,
    options: RtcTokenOptions,
  ): Promise<RtcTokenResult> {
    const { apiKey, apiSecret } = this.requireCredentials(config);
    const expirationSeconds =
      options.expirationSeconds || config.tokenExpiration || 3600;
    const canPublish =
      options.role === SpeakerRole.HOST ||
      options.role === SpeakerRole.CO_HOST ||
      options.role === SpeakerRole.MODERATOR ||
      options.role === SpeakerRole.SPEAKER;
    const { token, expiresAt } = this.signJwt(
      apiKey,
      apiSecret,
      options.userId,
      expirationSeconds,
      {
        room: options.roomId,
        roomJoin: true,
        canPublish,
        canSubscribe: true,
        canPublishData: canPublish,
      },
    );
    return {
      token,
      provider: this.name,
      appId: apiKey,
      roomId: options.roomId,
      userId: options.userId,
      role: options.role,
      expiresAt,
    };
  }

  async validateToken(config: RtcConfig, token: string): Promise<boolean> {
    try {
      const { apiKey, apiSecret } = this.requireCredentials(config);
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const expected = crypto
        .createHmac('sha256', apiSecret)
        .update(`${parts[0]}.${parts[1]}`)
        .digest('base64url');
      const a = Buffer.from(parts[2]);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as { exp?: number; nbf?: number; iss?: string };
      const now = Math.floor(Date.now() / 1000);
      return (
        payload.iss === apiKey &&
        typeof payload.exp === 'number' &&
        payload.exp > now &&
        (typeof payload.nbf !== 'number' || payload.nbf <= now + 5)
      );
    } catch {
      return false;
    }
  }

  async startRecording(
    _config: RtcConfig,
    _options: RtcRecordingOptions,
  ): Promise<RtcRecordingResult> {
    throw new ServiceUnavailableException(
      'LiveKit Egress recording is not configured with an authoritative output/storage adapter',
    );
  }

  async pauseRecording(
    _config: RtcConfig,
    _providerJobId: string,
  ): Promise<{ success: boolean; status: string }> {
    throw new ServiceUnavailableException(
      'LiveKit Egress pause is not supported by the configured server adapter',
    );
  }

  async resumeRecording(
    _config: RtcConfig,
    _providerJobId: string,
  ): Promise<{ success: boolean; status: string }> {
    throw new ServiceUnavailableException(
      'LiveKit Egress resume is not supported by the configured server adapter',
    );
  }

  async stopRecording(
    _config: RtcConfig,
    _providerJobId: string,
  ): Promise<{ success: boolean; recordingUrl?: string }> {
    throw new ServiceUnavailableException(
      'LiveKit Egress stop is unavailable until the authoritative Egress adapter is configured',
    );
  }

  async kickUser(config: RtcConfig, roomId: string, userId: string): Promise<boolean> {
    await this.roomServiceRequest(config, 'RemoveParticipant', roomId, {
      room: roomId,
      identity: userId,
    });
    return true;
  }

  async muteUser(
    config: RtcConfig,
    roomId: string,
    userId: string,
    mute: boolean,
  ): Promise<boolean> {
    const list = await this.roomServiceRequest<{ participants?: LiveKitParticipantInfo[] }>(
      config,
      'ListParticipants',
      roomId,
      { room: roomId },
    );
    const participant = (list.participants || []).find((p) => p.identity === userId);
    if (!participant) {
      throw new ServiceUnavailableException(
        `LiveKit participant ${userId} is not active in room ${roomId}`,
      );
    }
    const audioTracks = (participant.tracks || []).filter(
      (track) => track.sid && (!track.type || /audio/i.test(track.type)),
    );
    if (audioTracks.length === 0) {
      return true;
    }
    for (const track of audioTracks) {
      await this.roomServiceRequest(config, 'MutePublishedTrack', roomId, {
        room: roomId,
        identity: userId,
        track_sid: track.sid,
        muted: mute,
      });
    }
    return true;
  }

  async getChannelStatus(
    config: RtcConfig,
    roomId: string,
  ): Promise<{ isLive: boolean; activeUsers: number }> {
    const list = await this.roomServiceRequest<{ participants?: LiveKitParticipantInfo[] }>(
      config,
      'ListParticipants',
      roomId,
      { room: roomId },
    );
    const activeUsers = (list.participants || []).length;
    return { isLive: activeUsers > 0, activeUsers };
  }

  async refreshToken(
    config: RtcConfig,
    _oldToken: string,
    options: RtcTokenOptions,
  ): Promise<RtcTokenResult> {
    return this.generateToken(config, options);
  }

  async syncParticipantState(
    config: RtcConfig,
    roomId: string,
  ): Promise<{ activeParticipants: string[] }> {
    const list = await this.roomServiceRequest<{ participants?: LiveKitParticipantInfo[] }>(
      config,
      'ListParticipants',
      roomId,
      { room: roomId },
    );
    return {
      activeParticipants: (list.participants || [])
        .map((participant) => participant.identity)
        .filter((identity): identity is string => !!identity),
    };
  }

  verifyWebhookSignature(
    config: RtcConfig,
    headers: Record<string, string>,
    _body: unknown,
  ): boolean {
    try {
      const { apiKey, apiSecret } = this.requireCredentials(config);
      const rawAuth = headers.authorization || headers.Authorization;
      if (!rawAuth?.startsWith('Bearer ')) return false;
      const token = rawAuth.slice(7).trim();
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const expected = crypto
        .createHmac('sha256', apiSecret)
        .update(`${parts[0]}.${parts[1]}`)
        .digest('base64url');
      const actualBuffer = Buffer.from(parts[2]);
      const expectedBuffer = Buffer.from(expected);
      if (
        actualBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
      ) {
        return false;
      }
      const claims = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as { iss?: string; exp?: number; nbf?: number };
      const now = Math.floor(Date.now() / 1000);
      return (
        claims.iss === apiKey &&
        typeof claims.exp === 'number' &&
        claims.exp > now &&
        (typeof claims.nbf !== 'number' || claims.nbf <= now + 5)
      );
    } catch (error) {
      this.logger.warn(`LiveKit webhook verification failed: ${(error as Error).message}`);
      return false;
    }
  }
}
