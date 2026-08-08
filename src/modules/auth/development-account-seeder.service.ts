import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums';

interface DevelopmentAccountDefinition {
  email: string;
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
}

@Injectable()
export class DevelopmentAccountSeederService implements OnModuleInit {
  private readonly logger = new Logger(DevelopmentAccountSeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    const enabled = (process.env.DEV_SEED_ACCOUNTS ?? 'true').toLowerCase();
    if (enabled === 'false' || enabled === '0' || enabled === 'no') {
      this.logger.log('Development account seeding is disabled.');
      return;
    }

    const accounts: DevelopmentAccountDefinition[] = [
      {
        email: (
          process.env.DEV_ADMIN_EMAIL ?? 'admin@voicecloud.com'
        ).toLowerCase(),
        username: process.env.DEV_ADMIN_USERNAME ?? 'voicecloud_admin',
        displayName: 'VoiceCloud Super Admin',
        password: process.env.DEV_ADMIN_PASSWORD ?? 'AdminPass123!',
        role: UserRole.SUPER_ADMIN,
      },
      {
        email: (
          process.env.DEV_CREATOR_EMAIL ?? 'creator@voicecloud.com'
        ).toLowerCase(),
        username: process.env.DEV_CREATOR_USERNAME ?? 'voicecloud_creator',
        displayName: 'VoiceCloud Creator',
        password: process.env.DEV_CREATOR_PASSWORD ?? 'CreatorPass123!',
        role: UserRole.CREATOR,
      },
    ];

    for (const account of accounts) {
      await this.ensureAccount(account);
    }
  }

  private async ensureAccount(
    definition: DevelopmentAccountDefinition,
  ): Promise<void> {
    let user = await this.userRepository.findOne({
      where: { email: definition.email },
    });
    let username = definition.username;

    if (!user) {
      const usernameOwner = await this.userRepository.findOne({
        where: { username },
      });
      if (usernameOwner) {
        username = `${definition.username}_${definition.role.toLowerCase()}`;
      }
    }

    let passwordMatches = false;
    if (user?.passwordHash) {
      try {
        passwordMatches = await bcrypt.compare(
          definition.password,
          user.passwordHash,
        );
      } catch {
        passwordMatches = false;
      }
    }
    const shouldResetPassword =
      !user ||
      user.role !== definition.role ||
      !user.passwordHash ||
      !passwordMatches;
    const passwordHash = shouldResetPassword
      ? await bcrypt.hash(definition.password, 10)
      : user.passwordHash;

    if (!user) {
      user = this.userRepository.create({
        username,
        displayName: definition.displayName,
        email: definition.email,
        passwordHash,
        role: definition.role,
        isGuest: false,
        phoneVerified: true,
        failedLoginAttempts: 0,
        isOnline: false,
        followersCount: 0,
        followingCount: 0,
        popularityScore: 0,
        profileCompletion: 100,
      });
    } else {
      user.email = definition.email;
      user.username = user.username || username;
      user.displayName = definition.displayName;
      if (shouldResetPassword) {
        user.passwordHash = passwordHash;
      }
      user.role = definition.role;
      user.isGuest = false;
      user.failedLoginAttempts = 0;
      user.lockoutUntil = undefined;
    }

    await this.userRepository.save(user);
    this.logger.log(
      `Development ${definition.role} account ready: ${definition.email}`,
    );
  }
}
