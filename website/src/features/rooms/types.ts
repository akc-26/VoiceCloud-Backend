import type { ChatMessage, Conversation } from '@/features/messaging/types';

export type RoomParticipantRole = 'host' | 'co_host' | 'moderator' | 'speaker' | 'listener' | string;

export interface VoiceCloudRoomDetail {
  id: string;
  title: string;
  description?: string | null;
  hostId: string;
  coverUrl?: string | null;
  isLocked: boolean;
  isLive: boolean;
  status: string;
  audioQuality?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  language: string;
  category: string;
  listenerCount: number;
  speakerCount: number;
  popularityScore: number;
  scheduledRoomId?: string | null;
  clubId?: string | null;
  isPremium?: boolean;
  isTicketRequired?: boolean;
  isSubscriberOnly?: boolean;
  isInviteOnly?: boolean;
  isVerifiedOnly?: boolean;
  ticketPriceAmount?: number | string;
  currency?: string;
}

export interface RtcPresenceState {
  userId: string;
  roomId: string;
  role: RoomParticipantRole;
  status?: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  handRaised?: boolean;
  username?: string;
  deviceInfo?: string;
  joinedAt?: string;
  reconnectedAt?: string;
}

export interface RtcJoinResult {
  message: string;
  roomId: string;
  userId: string;
  role: RoomParticipantRole;
  token: string;
  provider?: string;
  appId?: string;
  serverUrl?: string;
  expiresAt: string;
  presenceState: RtcPresenceState;
}

export interface RtcParticipantsResult {
  roomId: string;
  totalCount: number;
  participants: RtcPresenceState[];
}

export interface RoomParticipantView extends RtcPresenceState {
  displayName?: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
}

export interface RoomChatState {
  conversation: Conversation;
  messages: ChatMessage[];
}

export type RoomAccessReason =
  | 'locked'
  | 'invite'
  | 'ticket'
  | 'subscription'
  | 'verification'
  | 'club'
  | 'full'
  | 'closed'
  | 'offline'
  | 'unknown';

export interface RoomAccessIssue {
  reason: RoomAccessReason;
  title: string;
  message: string;
}

export interface RoomReactionEvent {
  roomId: string;
  userId: string;
  emoji: string;
  timestamp: string;
}
