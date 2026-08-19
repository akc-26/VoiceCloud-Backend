import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../common/enums';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminWalletController } from './admin-wallet.controller';
import { GiftsController } from '../gifts/gifts.controller';
import { AdminTasksAchievementsController } from '../tasks-achievements/controllers/admin-tasks-achievements.controller';
import { VipController } from '../vip/vip.controller';
import { NotificationsController } from '../notifications/notifications.controller';

describe('Admin economy RBAC', () => {
  const expectedRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

  it('protects every Admin Wallet route with JWT and Admin role guards', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminWalletController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminWalletController)).toEqual(
      expectedRoles,
    );
  });

  it('protects every gift, VIP and notification Admin economy route', () => {
    const assertAdminMethods = (
      controller: any,
      expectedGuards: any[],
    ) => {
      const methods = Object.getOwnPropertyNames(controller.prototype)
        .filter((name) => name !== 'constructor')
        .map((name) => controller.prototype[name])
        .filter((method) => {
          const path = Reflect.getMetadata(PATH_METADATA, method);
          return typeof path === 'string' && path.startsWith('admin');
        });

      expect(methods.length).toBeGreaterThan(0);
      for (const method of methods) {
        expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual(
          expectedGuards,
        );
        expect(Reflect.getMetadata(ROLES_KEY, method)).toEqual(expectedRoles);
      }
    };

    assertAdminMethods(GiftsController, [JwtAuthGuard, RolesGuard]);
    assertAdminMethods(VipController, [RolesGuard]);
    assertAdminMethods(NotificationsController, [RolesGuard]);

    expect(
      Reflect.getMetadata(GUARDS_METADATA, AdminTasksAchievementsController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminTasksAchievementsController),
    ).toEqual(expectedRoles);
  });

  it.each([UserRole.USER, UserRole.CREATOR])(
    'rejects %s from Admin Wallet economy operations',
    (role) => {
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);
      const context = {
        getHandler: () => AdminWalletController.prototype.creditWallet,
        getClass: () => AdminWalletController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { role, roles: [role] } }),
        }),
      } as any;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    },
  );

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN])(
    'allows %s to Admin Wallet economy operations',
    (role) => {
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);
      const context = {
        getHandler: () => AdminWalletController.prototype.creditWallet,
        getClass: () => AdminWalletController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { role, roles: [role] } }),
        }),
      } as any;

      expect(guard.canActivate(context)).toBe(true);
    },
  );
});
