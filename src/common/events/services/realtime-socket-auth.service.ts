import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Socket } from 'socket.io';
import { SocketErrorCode } from '../constants/socket-error-codes.enum';
import {
  JwtAccessTokenPayload,
  JwtTokenService,
} from '../../../modules/auth/jwt-token.service';

export interface AuthenticatedRealtimeSocketUser {
  userId: string;
  creatorId: string;
  username?: string;
  email?: string;
  role: string;
  sessionId?: string;
  jti: string;
}

@Injectable()
export class RealtimeSocketAuthService {
  private readonly logger = new Logger(RealtimeSocketAuthService.name);
  private jwtTokenService?: JwtTokenService;

  constructor(private readonly moduleRef: ModuleRef) {}

  async authenticate(
    client: Socket,
  ): Promise<AuthenticatedRealtimeSocketUser> {
    const token = this.extractToken(client);
    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    if (!this.jwtTokenService) {
      this.jwtTokenService = this.moduleRef.get(JwtTokenService, {
        strict: false,
      });
    }

    const payload = await this.jwtTokenService.verifyAccessToken(token);
    const user = this.toSocketUser(payload);
    client.data.user = user;
    client.data.joinedRoomIds = new Set<string>();
    return user;
  }

  getAuthenticatedUser(client: Socket): AuthenticatedRealtimeSocketUser {
    const user = client.data?.user as
      | AuthenticatedRealtimeSocketUser
      | undefined;
    if (!user?.userId) {
      throw new UnauthorizedException('Authenticated socket user required');
    }
    return user;
  }

  assertJoinedRoom(client: Socket, roomId: string): void {
    const joinedRoomIds = client.data?.joinedRoomIds as
      | Set<string>
      | undefined;
    if (!joinedRoomIds?.has(roomId)) {
      throw {
        code: SocketErrorCode.NOT_IN_ROOM,
        message: 'Join the room before performing this action',
      };
    }
  }

  private toSocketUser(
    payload: JwtAccessTokenPayload,
  ): AuthenticatedRealtimeSocketUser {
    const userId = payload.userId || payload.sub;
    if (!userId) {
      throw new UnauthorizedException('Access token subject is missing');
    }

    return {
      userId,
      creatorId: payload.creatorId || userId,
      username: payload.username,
      email: payload.email,
      role: payload.role || 'USER',
      sessionId: payload.sessionId,
      jti: payload.jti,
    };
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }

    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.startsWith('Bearer ')
        ? authToken.slice(7).trim()
        : authToken.trim();
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim()) {
      return queryToken.startsWith('Bearer ')
        ? queryToken.slice(7).trim()
        : queryToken.trim();
    }

    return null;
  }

  logAuthenticationFailure(client: Socket, error: unknown): void {
    if (process.env.NODE_ENV === 'production') return;
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `[AuthDebug] Realtime socket authentication failed (${client.id}): ${message}`,
    );
  }
}
