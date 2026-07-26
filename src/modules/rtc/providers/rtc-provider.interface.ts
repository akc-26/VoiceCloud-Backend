import { RtcConfig } from '../entities/rtc-config.entity';
import { SpeakerRole } from '../entities/rtc-speaker-history.entity';

export interface RtcTokenOptions {
  roomId: string;
  userId: string;
  role: SpeakerRole;
  expirationSeconds?: number;
}

export interface RtcTokenResult {
  token: string;
  provider: string;
  appId?: string;
  roomId: string;
  userId: string;
  role: SpeakerRole;
  expiresAt: Date;
}

export interface RtcRecordingOptions {
  sessionId: string;
  roomId: string;
  layout?: string;
}

export interface RtcRecordingResult {
  providerJobId: string;
  status: string;
  recordingUrl?: string;
}

export interface IRtcProvider {
  readonly name: string;

  generateToken(
    config: RtcConfig,
    options: RtcTokenOptions,
  ): Promise<RtcTokenResult>;
  validateToken(config: RtcConfig, token: string): Promise<boolean>;
  startRecording(
    config: RtcConfig,
    options: RtcRecordingOptions,
  ): Promise<RtcRecordingResult>;
  stopRecording(
    config: RtcConfig,
    providerJobId: string,
  ): Promise<{ success: boolean; recordingUrl?: string }>;
  kickUser(config: RtcConfig, roomId: string, userId: string): Promise<boolean>;
  muteUser(
    config: RtcConfig,
    roomId: string,
    userId: string,
    mute: boolean,
  ): Promise<boolean>;
  getChannelStatus(
    config: RtcConfig,
    roomId: string,
  ): Promise<{ isLive: boolean; activeUsers: number }>;
  verifyWebhookSignature(
    config: RtcConfig,
    headers: Record<string, string>,
    body: unknown,
  ): boolean;
}
