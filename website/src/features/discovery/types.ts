export interface PaginatedItems<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VoiceCloudUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  statusMessage?: string | null;
  country?: string | null;
  preferredLanguage?: string;
  interests?: string[] | null;
  badges?: string[] | null;
  customTags?: string[] | null;
  hostBadge?: string | null;
  agencyBadge?: string | null;
  vipBadge?: string | null;
  isOnline?: boolean;
  isVerified?: boolean;
  isVip?: boolean;
  followersCount?: number;
  followingCount?: number;
  popularityScore?: number;
  wealthLevel?: number;
  charmLevel?: number;
  createdAt?: string;
}

export interface FollowMutationResult {
  isFollowing: boolean;
}

export interface VoiceCloudProfile extends VoiceCloudUser {
  profileCompletionPercentage?: number;
  wealthTitle?: string;
  charmTitle?: string;
  relationship?: {
    isFollowing: boolean;
    isFollowedBy: boolean;
    isMutual: boolean;
  };
  stats?: {
    followersCount: number;
    followingCount: number;
    badgesCount: number;
    visitorsCount: number;
  };
}

export interface VoiceCloudRoom {
  id: string;
  title: string;
  description?: string | null;
  hostId: string;
  coverUrl?: string | null;
  isLocked: boolean;
  isLive: boolean;
  status: string;
  language: string;
  category: string;
  listenerCount: number;
  speakerCount: number;
  popularityScore: number;
  isPremium?: boolean;
  isTicketRequired?: boolean;
  isSubscriberOnly?: boolean;
  isInviteOnly?: boolean;
  isVerifiedOnly?: boolean;
  createdAt?: string;
}

export interface VoiceCloudClub {
  id: string;
  name: string;
  handle: string;
  description: string;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  category: string;
  visibility: string;
  memberCount: number;
  hostCount: number;
  upcomingRoomsCount: number;
  isVerified: boolean;
}

export interface VoiceCloudScheduledRoom {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  language: string;
  coverUrl?: string | null;
  hostId: string;
  scheduledStartTime: string;
  durationMinutes: number;
  status: string;
  rsvpCount: number;
  host?: VoiceCloudUser;
}

export interface FriendListItem {
  friendshipId: string;
  category?: string;
  alias?: string | null;
  addedAt?: string;
  user: VoiceCloudUser;
}

export interface PendingFriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  sender?: VoiceCloudUser;
  receiver?: VoiceCloudUser;
}

export interface PendingFriendRequests {
  incoming: PendingFriendRequest[];
  outgoing: PendingFriendRequest[];
}

export interface GlobalSearchResponse {
  query: string;
  type?: string;
  results: {
    users?: PaginatedItems<VoiceCloudUser>;
    rooms?: PaginatedItems<VoiceCloudRoom>;
    hosts?: PaginatedItems<Record<string, unknown>>;
  };
}
