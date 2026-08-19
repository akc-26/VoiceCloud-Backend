import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { AdminSettingsService } from '../admin/admin-settings.service';
import { JWT_CONFIG } from '../../config/jwt.config';
import * as crypto from 'crypto';

export interface JwtAccessTokenPayload {
  sub: string;
  userId: string;
  creatorId: string;
  username: string;
  email?: string;
  role: string;
  isGuest: boolean;
  sessionId?: string;
  deviceId?: string;
  jti: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface JwtRefreshTokenPayload {
  sub: string;
  userId: string;
  creatorId: string;
  role?: string;
  sessionId: string;
  jti: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

const BLACKLIST_TOKEN_PREFIX = 'jwt:blacklist:';
const BLACKLIST_SESSION_PREFIX = 'jwt:revoked_session:';
const BLACKLIST_USER_PREFIX = 'jwt:revoked_user:';

@Injectable()
export class JwtTokenService {
  private readonly logger = new Logger(JwtTokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  private async getJwtSecret(): Promise<string> {
    return this.configService.get<string>('JWT_SECRET') || JWT_CONFIG.secret;
  }

  private async getAccessExpirationSeconds(): Promise<number> {
    try {
      const setting =
        await this.adminSettingsService.findByKey('jwt_expiration');
      if (setting?.value) {
        return parseInt(setting.value, 10);
      }
    } catch {
      // Fallback
    }
    return 3600; // 1 hour default
  }

  private async getRefreshExpirationSeconds(): Promise<number> {
    try {
      const setting = await this.adminSettingsService.findByKey(
        'jwt_refresh_expiration',
      );
      if (setting?.value) {
        return parseInt(setting.value, 10);
      }
    } catch {
      // Fallback
    }
    return 604800; // 7 days default
  }

  async generateTokenPair(user: {
    id: string;
    username: string;
    email?: string;
    role: string;
    isGuest: boolean;
    sessionId?: string;
    deviceId?: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
    accessJti: string;
    refreshJti: string;
  }> {
    const secret = await this.getJwtSecret();
    const accessExpiresIn = await this.getAccessExpirationSeconds();
    const refreshExpiresIn = await this.getRefreshExpirationSeconds();

    const accessJti = `acc_${crypto.randomUUID()}`;
    const refreshJti = `ref_${crypto.randomUUID()}`;

    const accessPayload: JwtAccessTokenPayload = {
      sub: user.id,
      userId: user.id,
      creatorId: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'USER',
      isGuest: !!user.isGuest,
      sessionId: user.sessionId,
      deviceId: user.deviceId,
      jti: accessJti,
      type: 'access',
    };

    const refreshPayload: JwtRefreshTokenPayload = {
      sub: user.id,
      userId: user.id,
      creatorId: user.id,
      role: user.role || 'USER',
      sessionId: user.sessionId || '',
      jti: refreshJti,
      type: 'refresh',
    };

    const signOptions = {
      secret,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithm: JWT_CONFIG.algorithm,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      ...signOptions,
      expiresIn: accessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      ...signOptions,
      expiresIn: refreshExpiresIn,
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(
        `[AuthDebug] Issued token pair: sub=${user.id} role=${user.role} accJti=${accessJti} refJti=${refreshJti} exp=${accessExpiresIn}s`,
      );
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      refreshExpiresIn,
      accessJti,
      refreshJti,
    };
  }

  async verifyAccessToken(token: string): Promise<JwtAccessTokenPayload> {
    const secret = await this.getJwtSecret();
    let payload: JwtAccessTokenPayload;

    try {
      payload = this.jwtService.verify<JwtAccessTokenPayload>(token, {
        secret,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
        algorithms: [JWT_CONFIG.algorithm],
      });
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `[AuthDebug] Access token verification failed: ${err?.message || err}`,
        );
      }
      throw new UnauthorizedException(
        err?.message?.includes('expired')
          ? 'Access token has expired'
          : 'Invalid or expired access token',
      );
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    if (payload.jti && (await this.isBlacklisted(payload.jti))) {
      throw new UnauthorizedException('Token has been revoked');
    }

    if (payload.sessionId && (await this.isSessionRevoked(payload.sessionId))) {
      throw new UnauthorizedException(
        'Session has been administratively revoked',
      );
    }

    if (payload.sub && (await this.isUserRevoked(payload.sub))) {
      throw new UnauthorizedException(
        'User tokens have been administratively revoked',
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `[AuthDebug] Access token verified successfully: sub=${payload.sub} jti=${payload.jti}`,
      );
    }

    return payload;
  }

  async verifyRefreshToken(token: string): Promise<JwtRefreshTokenPayload> {
    const secret = await this.getJwtSecret();
    let payload: JwtRefreshTokenPayload;

    try {
      payload = this.jwtService.verify<JwtRefreshTokenPayload>(token, {
        secret,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
        algorithms: [JWT_CONFIG.algorithm],
      });
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `[AuthDebug] Refresh token verification failed: ${err?.message || err}`,
        );
      }
      throw new UnauthorizedException(
        err?.message?.includes('expired')
          ? 'Refresh token has expired'
          : 'Invalid or expired refresh token',
      );
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token type');
    }

    if (payload.jti && (await this.isBlacklisted(payload.jti))) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `[AuthDebug] Refresh token verified successfully: sub=${payload.sub} jti=${payload.jti}`,
      );
    }

    return payload;
  }

  async blacklistToken(jti: string, ttlSeconds = 86400): Promise<void> {
    if (!jti) return;
    const key = `${BLACKLIST_TOKEN_PREFIX}${jti}`;
    await this.redisService.set(key, 'revoked', ttlSeconds);
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    if (!jti) return false;
    const key = `${BLACKLIST_TOKEN_PREFIX}${jti}`;
    const value = await this.redisService.get(key);
    return value === 'revoked';
  }

  async revokeSession(sessionId: string, ttlSeconds = 604800): Promise<void> {
    if (!sessionId) return;
    const key = `${BLACKLIST_SESSION_PREFIX}${sessionId}`;
    await this.redisService.set(key, 'revoked', ttlSeconds);
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    if (!sessionId) return false;
    const key = `${BLACKLIST_SESSION_PREFIX}${sessionId}`;
    const value = await this.redisService.get(key);
    return value === 'revoked';
  }

  async revokeUserTokens(userId: string, ttlSeconds = 604800): Promise<void> {
    if (!userId) return;
    const key = `${BLACKLIST_USER_PREFIX}${userId}`;
    await this.redisService.set(key, 'revoked', ttlSeconds);
  }

  async isUserRevoked(userId: string): Promise<boolean> {
    if (!userId) return false;
    const key = `${BLACKLIST_USER_PREFIX}${userId}`;
    const value = await this.redisService.get(key);
    return value === 'revoked';
  }
}
