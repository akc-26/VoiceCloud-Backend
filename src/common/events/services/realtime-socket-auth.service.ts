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

type SocketAuthData = {
  user?: AuthenticatedRealtimeSocketUser;
  joinedRoomIds?: Set<string>;
  authPromise?: Promise<AuthenticatedRealtimeSocketUser>;
};

@Injectable()
export class RealtimeSocketAuthService {
  private readonly logger = new Logger(RealtimeSocketAuthService.name);
  private jwtTokenService?: JwtTokenService;

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Authenticate the Socket.IO connection. The same promise is shared with
   * message handlers so a valid JWT can never lose a race against Nest's async
   * gateway connection hook.
   */
  async authenticate(
    client: Socket,
  ): Promise<AuthenticatedRealtimeSocketUser> {
    return this.ensureAuthenticatedUser(client);
  }

  /**
   * Await authenticated socket identity, lazily verifying the handshake token
   * when a message arrives before handleConnection() has finished. This keeps
   * security fail-closed while removing transient "Authenticated socket user
   * required" errors for valid clients.
   */
  async ensureAuthenticatedUser(
    client: Socket,
  ): Promise<AuthenticatedRealtimeSocketUser> {
    const data = client.data as SocketAuthData;
    if (data.user?.userId) return data.user;
    if (data.authPromise) return data.authPromise;

    const authPromise = this.verifyAndAttach(client);
    data.authPromise = authPromise;
    try {
      return await authPromise;
    } finally {
      if (data.authPromise === authPromise) delete data.authPromise;
    }
  }

  assertJoinedRoom(client: Socket, roomId: string): void {
    const joinedRoomIds = (client.data as SocketAuthData)?.joinedRoomIds;
    if (!joinedRoomIds?.has(roomId)) {
      throw {
        code: SocketErrorCode.NOT_IN_ROOM,
        message: 'Join the room before performing this action',
      };
    }
  }

  private async verifyAndAttach(
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
    const data = client.data as SocketAuthData;
    data.user = user;
    data.joinedRoomIds ??= new Set<string>();
    return user;
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
