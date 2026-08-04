import {
  BadRequestException,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatorController } from '../creator/creator.controller';
import { DevelopmentAccountSeederService } from './development-account-seeder.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';


jest.mock('./google-auth.service', () => ({
  GoogleAuthService: class GoogleAuthService {},
}));

const { AuthService } = jest.requireActual<typeof import('./auth.service')>(
  './auth.service',
);

function createAuthService(userRepository: any) {
  return new AuthService(
    userRepository,
    {
      generateTokenPair: jest.fn(),
    } as any,
    {} as any,
    {} as any,
    {
      registerDevice: jest.fn(),
      createSession: jest.fn(),
      logConnectionHistory: jest.fn(),
    } as any,
    {
      findByKey: jest.fn(),
    } as any,
  );
}

function createExecutionContext({
  request = {},
  handler = jest.fn(),
  controller = class TestController {},
}: {
  request?: unknown;
  handler?: () => unknown;
  controller?: new (...args: never[]) => object;
} = {}): ExecutionContext {
  const args = [request];

  return {
    getClass: () => controller,
    getHandler: () => handler,
    getArgs: () => args,
    getArgByIndex: (index: number) => args[index],
    switchToRpc: () => ({
      getData: () => undefined,
      getContext: () => undefined,
    }),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    switchToWs: () => ({
      getClient: () => undefined,
      getData: () => undefined,
      getPattern: () => undefined,
    }),
    getType: () => 'http',
  } as unknown as ExecutionContext;
}

describe('Authentication and portal authorization security', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSeedAccounts = process.env.DEV_SEED_ACCOUNTS;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalSeedAccounts === undefined) {
      delete process.env.DEV_SEED_ACCOUNTS;
    } else {
      process.env.DEV_SEED_ACCOUNTS = originalSeedAccounts;
    }
    jest.restoreAllMocks();
  });

  it('requires a password for email/password login DTOs', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'creator@voicecloud.com',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it('requires a password of at least eight characters for registration', async () => {
    const dto = plainToInstance(RegisterDto, {
      username: 'creator',
      displayName: 'Creator',
      email: 'creator@voicecloud.com',
      password: 'short',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it('rejects login without exactly one identifier before database access', async () => {
    const repository = {
      findOne: jest.fn(),
    };
    const service = createAuthService(repository);

    await expect(
      service.login({ password: 'Password123!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('does not auto-provision an unknown login identity', async () => {
    const repository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = createAuthService(repository);

    await expect(
      service.login({
        email: 'random@voicecloud.com',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects password login for accounts without a password hash', async () => {
    const repository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'google-user@voicecloud.com',
        username: 'google_user',
        passwordHash: undefined,
      }),
      save: jest.fn(),
    };
    const service = createAuthService(repository);

    await expect(
      service.login({
        email: 'google-user@voicecloud.com',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('issues a token carrying the server-authoritative account role', async () => {
    const passwordHash = await bcrypt.hash('AdminPass123!', 4);
    const user = {
      id: 'admin-id',
      username: 'voicecloud_admin',
      displayName: 'VoiceCloud Super Admin',
      email: 'admin@voicecloud.com',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isGuest: false,
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
      isOnline: false,
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockResolvedValue(user),
    };
    const jwtTokenService = {
      generateTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        refreshJti: 'refresh-jti',
        expiresIn: 900,
      }),
    };
    const deviceSessionService = {
      registerDevice: jest.fn().mockResolvedValue({ deviceId: 'device-id' }),
      createSession: jest.fn().mockResolvedValue({ id: 'session-id' }),
      logConnectionHistory: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(
      repository as any,
      jwtTokenService as any,
      {} as any,
      {} as any,
      deviceSessionService as any,
      { findByKey: jest.fn() } as any,
    );

    const result = await service.login({
      email: 'ADMIN@VOICECLOUD.COM',
      password: 'AdminPass123!',
    });

    expect(jwtTokenService.generateTokenPair).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.SUPER_ADMIN }),
    );
    expect(result.user.role).toBe(UserRole.SUPER_ADMIN);
  });

  it('seeds deterministic Admin and Creator accounts only outside production', async () => {
    process.env.NODE_ENV = 'development';
    const savedUsers: any[] = [];
    const repository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (value) => {
        savedUsers.push(value);
        return value;
      }),
    };
    const service = new DevelopmentAccountSeederService(repository as any);

    await service.onModuleInit();

    expect(savedUsers).toHaveLength(2);
    expect(savedUsers.map((user) => user.role)).toEqual([
      UserRole.SUPER_ADMIN,
      UserRole.CREATOR,
    ]);
    expect(savedUsers[0].passwordHash).not.toBe('AdminPass123!');
    expect(savedUsers[1].passwordHash).not.toBe('CreatorPass123!');
  });

  it('repairs previously auto-created local USER accounts for acceptance', async () => {
    process.env.NODE_ENV = 'development';
    const adminUser = {
      id: 'admin-id',
      email: 'admin@voicecloud.com',
      username: 'user_old_admin',
      displayName: 'Old User',
      passwordHash: 'old-hash',
      role: UserRole.USER,
      isGuest: false,
      failedLoginAttempts: 2,
      lockoutUntil: new Date(),
    };
    const creatorUser = {
      id: 'creator-id',
      email: 'creator@voicecloud.com',
      username: 'user_old_creator',
      displayName: 'Old Creator',
      passwordHash: 'old-hash',
      role: UserRole.USER,
      isGuest: false,
      failedLoginAttempts: 1,
      lockoutUntil: new Date(),
    };
    const repository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(creatorUser),
      create: jest.fn(),
      save: jest.fn(async (value) => value),
    };
    const service = new DevelopmentAccountSeederService(repository as any);

    await service.onModuleInit();

    expect(adminUser.role).toBe(UserRole.SUPER_ADMIN);
    expect(creatorUser.role).toBe(UserRole.CREATOR);
    expect(adminUser.failedLoginAttempts).toBe(0);
    expect(creatorUser.failedLoginAttempts).toBe(0);
    expect(adminUser.lockoutUntil).toBeUndefined();
    expect(creatorUser.lockoutUntil).toBeUndefined();
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it('repairs stale passwords for existing same-role development accounts', async () => {
    process.env.NODE_ENV = 'development';
    const staleHash = await bcrypt.hash('OldPassword123!', 4);
    const adminUser = {
      id: 'admin-id',
      email: 'admin@voicecloud.com',
      username: 'voicecloud_admin',
      displayName: 'VoiceCloud Super Admin',
      passwordHash: staleHash,
      role: UserRole.SUPER_ADMIN,
      isGuest: false,
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
    };
    const creatorUser = {
      id: 'creator-id',
      email: 'creator@voicecloud.com',
      username: 'voicecloud_creator',
      displayName: 'VoiceCloud Creator',
      passwordHash: await bcrypt.hash('CreatorPass123!', 4),
      role: UserRole.CREATOR,
      isGuest: false,
      failedLoginAttempts: 0,
      lockoutUntil: undefined,
    };
    const repository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(creatorUser),
      create: jest.fn(),
      save: jest.fn(async (value) => value),
    };
    const service = new DevelopmentAccountSeederService(repository as any);

    await service.onModuleInit();

    expect(await bcrypt.compare('AdminPass123!', adminUser.passwordHash)).toBe(
      true,
    );
    expect(await bcrypt.compare('CreatorPass123!', creatorUser.passwordHash)).toBe(
      true,
    );
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it('never seeds development accounts in production', async () => {
    process.env.NODE_ENV = 'production';
    const repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new DevelopmentAccountSeederService(repository as any);

    await service.onModuleInit();

    expect(repository.findOne).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('preserves authenticated user subscription routes while keeping public plans public', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, CreatorController);
    const controllerRoles = Reflect.getMetadata(ROLES_KEY, CreatorController);
    const publicPlans = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      CreatorController.prototype.getPublicPlans,
    );

    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard]));
    expect(guards).not.toContain(RolesGuard);
    expect(controllerRoles).toBeUndefined();
    expect(publicPlans).toBe(true);
  });

  it('does not let malformed public metadata bypass JWT authentication', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    };
    const guard = new JwtAuthGuard(reflector as any, {} as any);
    const context = createExecutionContext({
      request: { headers: {}, method: 'GET', url: '/admin' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('allows public routes to bypass role evaluation', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValueOnce(true),
    };
    const guard = new RolesGuard(reflector as any);
    const handler = jest.fn();
    class PublicController {}
    const context = createExecutionContext({
      handler,
      controller: PublicController,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      handler,
      PublicController,
    ]);
  });

  it('does not treat non-boolean metadata as a public-route bypass', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce([UserRole.ADMIN])
        .mockReturnValueOnce([UserRole.ADMIN]),
    };
    const guard = new RolesGuard(reflector as any);
    const context = createExecutionContext({
      request: {
        user: { role: UserRole.USER, roles: [UserRole.USER] },
      },
    });

    expect(() => guard.canActivate(context)).toThrow(
      'Access denied: Insufficient privileges',
    );
  });

  it('removes fake Admin login and enforces Creator email and role contracts', () => {
    const adminLogin = fs.readFileSync(
      path.join(process.cwd(), 'admin/src/pages/LoginPage.tsx'),
      'utf8',
    );
    const creatorLogin = fs.readFileSync(
      path.join(process.cwd(), 'creator/src/pages/LoginPage.tsx'),
      'utf8',
    );

    expect(adminLogin).not.toContain('fakeToken');
    expect(adminLogin).not.toContain('Admin Role Profile');
    expect(adminLogin).toContain('data.user.role');
    expect(creatorLogin).toContain('type="email"');
    expect(creatorLogin).toContain("authResponse.user?.role !== 'CREATOR'");
    expect(creatorLogin).not.toContain('{ username: identifier, password }');
    const adminStore = fs.readFileSync(
      path.join(process.cwd(), 'admin/src/store/auth.store.ts'),
      'utf8',
    );
    const creatorStore = fs.readFileSync(
      path.join(process.cwd(), 'creator/src/store/auth.store.ts'),
      'utf8',
    );
    expect(adminStore).toContain('voicecloud_admin_auth_v3');
    expect(creatorStore).toContain('voicecloud-creator-auth-v3');
  });
});
