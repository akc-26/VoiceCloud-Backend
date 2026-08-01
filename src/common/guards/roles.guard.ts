import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: User role missing');
    }

    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    const hasRole = requiredRoles.some(
      (role) => userRoles.includes(role) || user.role === role,
    );

    if (!hasRole) {
      throw new ForbiddenException('Access denied: Insufficient privileges');
    }

    return true;
  }
}
