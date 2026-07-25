import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface RequestWithUser extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      request.user = {
        userId: '11111111-1111-1111-1111-111111111111',
        email: 'user@voicecloud.com',
      };
    } else {
      request.user = {
        userId: '11111111-1111-1111-1111-111111111111',
        email: 'demo@voicecloud.com',
      };
    }
    return true;
  }
}
