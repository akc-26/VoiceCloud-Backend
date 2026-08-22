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
  serverUrl?: string;
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

export interface RTCTokenProvider {
  generateToken(
    config: RtcConfig,
    options: RtcTokenOptions,
  ): Promise<RtcTokenResult>;
  validateToken(config: RtcConfig, token: string): Promise<boolean>;
  refreshToken?(
    config: RtcConfig,
    oldToken: string,
    options: RtcTokenOptions,
  ): Promise<RtcTokenResult>;
}

export interface RTCRoomProvider {
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
  syncParticipantState?(
    config: RtcConfig,
    roomId: string,
  ): Promise<{ activeParticipants: string[] }>;
}

export interface RTCRecordingProvider {
  startRecording(
    config: RtcConfig,
    options: RtcRecordingOptions,
  ): Promise<RtcRecordingResult>;
  pauseRecording?(
    config: RtcConfig,
    providerJobId: string,
  ): Promise<{ success: boolean; status: string }>;
  resumeRecording?(
    config: RtcConfig,
    providerJobId: string,
  ): Promise<{ success: boolean; status: string }>;
  stopRecording(
    config: RtcConfig,
    providerJobId: string,
  ): Promise<{ success: boolean; recordingUrl?: string }>;
}

export interface IRtcProvider
  extends RTCTokenProvider, RTCRoomProvider, RTCRecordingProvider {
  readonly name: string;

  verifyWebhookSignature(
    config: RtcConfig,
    headers: Record<string, string>,
    body: unknown,
    rawBody?: Buffer,
  ): boolean;
}

export type RTCProvider = IRtcProvider;
