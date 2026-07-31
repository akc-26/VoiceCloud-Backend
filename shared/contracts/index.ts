/**
 * Shared Core Domain Contracts
 * Module: @shared/contracts
 */

import { UserRole, VerificationStatus, RoomStatus, RoomType } from '../enums';

export interface UserContract {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenContract {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RoomContract {
  id: string;
  title: string;
  description?: string;
  type: RoomType;
  status: RoomStatus;
  hostId: string;
  hostUsername?: string;
  coverUrl?: string;
  activeListenersCount: number;
  isPrivate: boolean;
  createdAt: string;
}

export interface MediaAssetContract {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  category: string;
  uploadedBy: string;
  createdAt: string;
}

export interface SystemHealthContract {
  status: 'ok' | 'degraded' | 'down';
  database: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
  uptimeSeconds: number;
  timestamp: string;
}

export const SocketEvents = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  CHAT_MESSAGE: 'chat:message',
  GIFT_SENT: 'gift:sent',
  ROOM_STATE_CHANGE: 'room:state_change',
} as const;
