import type { RtcPresenceState, VoiceCloudRoomDetail } from '@/features/rooms/types';

export interface HostProfileSummary {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | string;
  realName?: string;
  hostLevel?: number;
  followersCount?: number;
  totalRoomsHosted?: number;
}

export interface OwnedRoom extends VoiceCloudRoomDetail {
  createdAt?: string;
  updatedAt?: string;
  hostName?: string;
  hostUsername?: string | null;
  participantCount?: number;
  isPrivate?: boolean;
}

export interface OwnedRoomPage {
  data: OwnedRoom[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateRoomInput {
  title: string;
  description?: string;
  category?: string;
  audioQuality?: string;
  language?: string;
  coverUrl?: string;
  clubId?: string;
  scheduledRoomId?: string;
  isPrivate?: boolean;
  isLocked?: boolean;
  isPremium?: boolean;
  isTicketRequired?: boolean;
  ticketPriceAmount?: number;
  isSubscriberOnly?: boolean;
  isVerifiedOnly?: boolean;
  isInviteOnly?: boolean;
}

export interface ScheduledRoomInput {
  title: string;
  description?: string;
  category?: string;
  language?: string;
  tags?: string[];
  coverUrl?: string;
  clubId?: string;
  scheduledStartTime: string;
  durationMinutes?: number;
  timeZone?: string;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'CLUB_ONLY' | 'LINK_ONLY' | string;
  isInviteOnly?: boolean;
  maxParticipants?: number;
  isPremium?: boolean;
  ticketPriceAmount?: number;
  currency?: string;
}

export interface ScheduledRoom extends ScheduledRoomInput {
  id: string;
  hostId: string;
  status: string;
  rsvpCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduledRoomPage {
  data: ScheduledRoom[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StageState {
  roomId: string;
  handQueue: Array<{ userId: string; seatIndex?: number; timestamp?: number }>;
  speakers: Array<{ userId: string; username?: string; isMuted?: boolean; role?: string; joinedStageAt?: string }>;
  participants: RtcPresenceState[];
  activeSession?: { id?: string; roomId?: string; status?: string } | null;
}

export interface HostSearchUser {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  role?: string;
}

export interface HostSearchPage {
  data: HostSearchUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PollOptionView {
  id: string;
  optionText?: string;
  text?: string;
  voteCount?: number;
  votesCount?: number;
  percentage?: number;
}

export interface RoomPoll {
  id: string;
  roomId: string;
  creatorId: string;
  title: string;
  pollType: 'single' | 'multiple' | string;
  status: 'created' | 'active' | 'stopped' | string;
  expiresAt?: string | null;
  options: PollOptionView[];
  userVoteOptionIds?: string[];
}

export interface QuizQuestionView {
  id?: string;
  roundNumber: number;
  questionText: string;
  options: string[];
  durationSeconds?: number;
  points?: number;
}

export interface RoomQuiz {
  id: string;
  roomId: string;
  creatorId: string;
  title: string;
  description?: string | null;
  status: 'draft' | 'active' | 'completed' | string;
  currentRound: number;
  totalRounds: number;
  questions: QuizQuestionView[];
}
