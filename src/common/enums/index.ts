export enum ClubRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
}

export enum ScheduledRoomStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  POSTPONED = 'POSTPONED',
}

export enum TicketStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum VisibilityType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  CLUB_ONLY = 'CLUB_ONLY',
  LINK_ONLY = 'LINK_ONLY',
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum RsvpStatus {
  NONE = 'NONE',
  GOING = 'GOING',
  INTERESTED = 'INTERESTED',
  DECLINED = 'DECLINED',
}

export enum WalletTransactionType {
  PURCHASE = 'PURCHASE',
  GIFT_SENT = 'GIFT_SENT',
  GIFT_RECEIVED = 'GIFT_RECEIVED',
  SUBSCRIPTION = 'SUBSCRIPTION',
  TICKET_PURCHASE = 'TICKET_PURCHASE',
  CREATOR_PAYOUT = 'CREATOR_PAYOUT',
  DIAMOND_CONVERSION = 'DIAMOND_CONVERSION',
  BONUS = 'BONUS',
  REFUND = 'REFUND',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
}

export enum WalletCurrency {
  COIN = 'COIN',
  DIAMOND = 'DIAMOND',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum WalletTransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum CreatorPlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
}

export enum PayoutMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  PAYPAL = 'PAYPAL',
  STRIPE = 'STRIPE',
  CRYPTO = 'CRYPTO',
}

