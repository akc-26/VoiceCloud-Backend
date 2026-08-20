import type { VoiceCloudScheduledRoom, VoiceCloudUser } from '@/features/discovery/types';

export interface CommunityOwner extends VoiceCloudUser {}

export interface Community {
  id: string;
  name: string;
  handle: string;
  description: string;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  category: string;
  rules?: string[];
  visibility: string;
  memberCount: number;
  hostCount: number;
  upcomingRoomsCount: number;
  ownerId: string;
  isVerified: boolean;
  owner?: CommunityOwner;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommunityMember {
  id: string;
  clubId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user?: VoiceCloudUser;
}

export interface CommunityPage<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReminderResult {
  message: string;
  scheduledRoomId: string;
  userId: string;
  rsvpCount: number;
  settings: { enablePush?: boolean; enableEmail?: boolean };
}

export type CommunityScheduledRoom = VoiceCloudScheduledRoom & {
  clubId?: string | null;
  club?: Community | null;
  visibility?: string;
  isPremium?: boolean;
};
