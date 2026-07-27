import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { AdminSettingsService } from '../admin/admin-settings.service';
import * as crypto from 'crypto';

export interface JwtAccessTokenPayload {
  sub: string;
  username: string;
  email?: string;
  role: string;
  isGuest: boolean;
  sessionId?: string;
  deviceId?: string;
  jti: string;
  type: 'access';
}

export interface JwtRefreshTokenPayload {
  sub: string;
  sessionId: string;
  jti: string;
  type: 'refresh';
}

const BLACKLIST_TOKEN_PREFIX = 'jwt:blacklist:';

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
    return (
      this.configService.get<string>('JWT_SECRET') ||
      'voicecloud_secure_jwt_secret_key_2026_phase16'
    );
  }

  private async getAccessExpirationSeconds(): Promise<number> {
    try {
      const setting = await this.adminSettingsService.findByKey('jwt_expiration');
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
      const setting =
        await this.adminSettingsService.findByKey('jwt_refresh_expiration');
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
      sessionId: user.sessionId || '',
      jti: refreshJti,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret,
      expiresIn: accessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret,
      expiresIn: refreshExpiresIn,
    });

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
      });
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    if (payload.jti && (await this.isBlacklisted(payload.jti))) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return payload;
  }

  async verifyRefreshToken(token: string): Promise<JwtRefreshTokenPayload> {
    const secret = await this.getJwtSecret();
    let payload: JwtRefreshTokenPayload;

    try {
      payload = this.jwtService.verify<JwtRefreshTokenPayload>(token, {
        secret,
      });
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token type');
    }

    if (payload.jti && (await this.isBlacklisted(payload.jti))) {
      throw new UnauthorizedException('Refresh token has been revoked');
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
}
