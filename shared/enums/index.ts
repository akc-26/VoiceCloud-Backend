/**
 * Shared Platform Enums
 * Module: @shared/enums
 */

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  CREATOR = 'creator',
  USER = 'user',
  GUEST = 'guest',
}

export enum AppEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

export enum PlatformClient {
  ADMIN_PORTAL = 'admin',
  CREATOR_STUDIO = 'creator',
  LANDING_WEBSITE = 'website',
  ANDROID_APP = 'android',
  IOS_APP = 'ios',
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum RoomStatus {
  IDLE = 'idle',
  LIVE = 'live',
  PAUSED = 'paused',
  ENDED = 'ended',
}

export enum RoomType {
  AUDIO_CHAT = 'audio_chat',
  LIVE_STREAM = 'live_stream',
  PODCAST = 'podcast',
  PRIVATE_CLUB = 'private_club',
}

export enum MediaCategory {
  AVATAR = 'avatar',
  ROOM_COVER = 'room_cover',
  ATTACHMENT = 'attachment',
  BANNER = 'banner',
}

export enum NotificationType {
  SYSTEM = 'system',
  ROOM_INVITE = 'room_invite',
  GIFT_RECEIVED = 'gift_received',
  AGENCY_NOTICE = 'agency_notice',
}

export enum WalletTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  GIFT_SENT = 'gift_sent',
  PURCHASE = 'purchase',
}
