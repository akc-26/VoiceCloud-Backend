import 'reflect-metadata';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums';
import { Phase18SecurityController } from './phase18-security.controller';

describe('R11 device-security ban RBAC', () => {
  const handler = Phase18SecurityController.prototype.banDevice;

  it('declares only ADMIN and SUPER_ADMIN authority', () => {
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
    ]);
  });

  it('rejects a normal authenticated user with 403 semantics', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: () => handler,
      getClass: () => Phase18SecurityController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'user-1', role: UserRole.USER } }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN])(
    'allows %s',
    (role) => {
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);
      const context = {
        getHandler: () => handler,
        getClass: () => Phase18SecurityController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: 'admin-1', role } }),
        }),
      } as unknown as ExecutionContext;
      expect(guard.canActivate(context)).toBe(true);
    },
  );
});
