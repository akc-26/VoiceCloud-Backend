import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtTokenService } from '../../modules/auth/jwt-token.service';

export interface AuthenticatedUser {
  userId: string;
  creatorId: string;
  username: string;
  email?: string;
  role: string;
  roles: string[];
  isGuest: boolean;
  sessionId?: string;
  deviceId?: string;
  jti?: string;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;

    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      const token = authHeader.substring(7).trim();
      try {
        const payload = await this.jwtTokenService.verifyAccessToken(token);
        const userId = payload.userId || payload.sub;
        const creatorId = payload.creatorId || userId;

        request.user = {
          userId,
          creatorId,
          username: payload.username,
          email: payload.email,
          role: payload.role || 'USER',
          roles: [payload.role || 'USER'],
          isGuest: !!payload.isGuest,
          sessionId: payload.sessionId,
          deviceId: payload.deviceId,
          jti: payload.jti,
        };

        if (process.env.NODE_ENV !== 'production') {
          this.logger.debug(
            `[AuthDebug] REST Guard authorized ${request.method} ${request.url} for sub=${userId} role=${payload.role} jti=${payload.jti}`,
          );
        }
        return true;
      } catch (err: any) {
        if (process.env.NODE_ENV !== 'production') {
          this.logger.warn(
            `[AuthDebug] REST Guard token rejection on ${request.method} ${request.url}: ${err.message}`,
          );
        }
        if (!isPublic) {
          throw new UnauthorizedException(
            err.message || 'Invalid or expired access token',
          );
        }
      }
    }

    if (isPublic) {
      return true;
    }

    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn(
        `[AuthDebug] REST Guard rejected ${request.method} ${request.url}: Bearer token missing`,
      );
    }
    throw new UnauthorizedException('Authentication token required');
  }
}
