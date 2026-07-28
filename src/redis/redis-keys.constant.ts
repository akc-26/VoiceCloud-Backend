export const REDIS_KEYS = {
  USER_PRESENCE: (userId: string) => `vc:user:${userId}:presence`,
  USER_SOCKETS: (userId: string) => `vc:user:${userId}:sockets`,
  ROOM_META: (roomId: string) => `vc:room:${roomId}:meta`,
  ROOM_MODERATORS: (roomId: string) => `vc:room:${roomId}:moderators`,
  ROOM_SPEAKERS: (roomId: string) => `vc:room:${roomId}:speakers`,
  ROOM_PARTICIPANTS: (roomId: string) => `vc:room:${roomId}:participants`,
  ROOM_QUEUE: (roomId: string) => `vc:room:${roomId}:queue`,
  ROOM_INVITATIONS: (roomId: string) => `vc:room:${roomId}:invitations`,
  ROOM_TYPING: (roomId: string) => `vc:room:${roomId}:typing`,
  ROOM_LAYOUT: (roomId: string) => `vc:room:${roomId}:layout`,
  ROOM_PINNED_MESSAGE: (roomId: string) => `vc:room:${roomId}:pinned`,
  GLOBAL_PUBSUB_CHANNEL: 'vc:events:global',
};

export const DEFAULT_TTLS = {
  PRESENCE_SECONDS: 120,
  TYPING_SECONDS: 10,
  INVITATION_SECONDS: 300,
  ROOM_STATE_SECONDS: 86400, // 24 hours
};
