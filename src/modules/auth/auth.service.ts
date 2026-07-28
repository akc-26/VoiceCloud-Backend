import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto, VerifyOtpDto, PhoneLoginDto } from './dto/phone-otp.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { GuestLoginDto, GuestUpgradeDto, GuestMigrateDto } from './dto/guest-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtTokenService } from './jwt-token.service';
import { OtpService } from './otp.service';
import { GoogleAuthService } from './google-auth.service';
import { DeviceSessionService } from './device-session.service';
import { AdminSettingsService } from '../admin/admin-settings.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtTokenService: JwtTokenService,
    private readonly otpService: OtpService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly deviceSessionService: DeviceSessionService,
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  private async generateUniqueReferralCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = `VC${Math.floor(100000 + Math.random() * 900000)}`;
      const existing = await this.userRepository.findOne({
        where: { referralCode: code },
      });
      if (!existing) return code;
    }
    return `VC${Date.now().toString().slice(-6)}`;
  }

  private async checkSettingEnabled(key: string, featureName: string): Promise<void> {
    const setting = await this.adminSettingsService.findByKey(key);
    if (setting && setting.value === 'false') {
      throw new ForbiddenException(`${featureName} is currently disabled by system policy.`);
    }
  }

  private mapUserToProfileDto(user: User) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      isVip: user.isVip,
      isGuest: user.isGuest,
      role: user.role || 'USER',
      referralCode: user.referralCode,
    };
  }

  // --- Send & Verify OTP ---
  async sendPhoneOtp(sendOtpDto: SendOtpDto) {
    await this.checkSettingEnabled('allow_phone_login', 'Phone Login');
    return this.otpService.sendOtp(sendOtpDto.phoneNumber);
  }

  async verifyPhoneOtp(verifyOtpDto: VerifyOtpDto) {
    const verified = await this.otpService.verifyOtp(
      verifyOtpDto.phoneNumber,
      verifyOtpDto.otpCode,
    );
    return { verified, message: 'OTP verified successfully' };
  }

  // --- Phone Login / Register ---
  async phoneLogin(dto: PhoneLoginDto, clientIp?: string, userAgent?: string): Promise<AuthResponseDto> {
    await this.checkSettingEnabled('allow_phone_login', 'Phone Login');

    if (dto.otpCode) {
      await this.otpService.verifyOtp(dto.phoneNumber, dto.otpCode);
    } else if (dto.firebaseIdToken) {
      await this.googleAuthService.verifyGoogleIdToken(dto.firebaseIdToken);
    } else {
      throw new BadRequestException('Either otpCode or firebaseIdToken is required');
    }

    let user = await this.userRepository.findOne({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (!user) {
      const phoneSuffix = dto.phoneNumber.replace(/\D/g, '').slice(-6);
      const username = `user_${phoneSuffix}_${Math.floor(100 + Math.random() * 900)}`;
      const referralCode = await this.generateUniqueReferralCode();

      user = this.userRepository.create({
        username,
        displayName: `VoiceUser_${phoneSuffix}`,
        phoneNumber: dto.phoneNumber,
        phoneVerified: true,
        isGuest: false,
        role: 'USER',
        referralCode,
        referredByUserId: dto.referralCode,
        isOnline: true,
        followersCount: 0,
        followingCount: 0,
        popularityScore: 100,
        profileCompletion: 80,
      });

      user = await this.userRepository.save(user);
    } else {
      user.phoneVerified = true;
      user.isOnline = true;
      user.lastActiveAt = new Date();
      await this.userRepository.save(user);
    }

    const device = await this.deviceSessionService.registerDevice(user.id, {
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      deviceType: dto.deviceType,
      osVersion: dto.osVersion,
      appVersion: dto.appVersion,
      manufacturer: dto.manufacturer,
      model: dto.model,
      ipAddress: clientIp,
    });

    const tokenPair = await this.jwtTokenService.generateTokenPair({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isGuest: user.isGuest,
      deviceId: device.deviceId,
    });

    const session = await this.deviceSessionService.createSession(
      user.id,
      device.deviceId,
      tokenPair.refreshJti,
      {
        deviceType: dto.deviceType,
        deviceName: dto.deviceName,
        ipAddress: clientIp,
        userAgent,
      },
    );

    await this.deviceSessionService.logConnectionHistory({
      userId: user.id,
      sessionId: session.id,
      deviceId: device.deviceId,
      action: 'LOGIN',
      loginMethod: 'PHONE_OTP',
      ipAddress: clientIp,
      userAgent,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokenPair.expiresIn,
      user: this.mapUserToProfileDto(user),
      sessionId: session.id,
      deviceId: device.deviceId,
    };
  }

  // --- Google Login ---
  async googleLogin(dto: GoogleLoginDto, clientIp?: string, userAgent?: string): Promise<AuthResponseDto> {
    await this.checkSettingEnabled('allow_google_login', 'Google Login');

    const verifiedGoogle = await this.googleAuthService.verifyGoogleIdToken(dto.idToken);

    let user = await this.userRepository.findOne({
      where: [{ email: verifiedGoogle.email }],
    });

    if (!user) {
      const emailUsername = verifiedGoogle.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      const username = `${emailUsername}_${Math.floor(100 + Math.random() * 900)}`;
      const referralCode = await this.generateUniqueReferralCode();

      user = this.userRepository.create({
        username,
        displayName: verifiedGoogle.displayName,
        email: verifiedGoogle.email,
        avatarUrl: verifiedGoogle.avatarUrl,
        isVerified: verifiedGoogle.emailVerified,
        isGuest: false,
        role: 'USER',
        referralCode,
        referredByUserId: dto.referralCode,
        isOnline: true,
        followersCount: 0,
        followingCount: 0,
        popularityScore: 100,
        profileCompletion: 85,
      });

      user = await this.userRepository.save(user);
    } else {
      user.isOnline = true;
      user.lastActiveAt = new Date();
      if (verifiedGoogle.avatarUrl && !user.avatarUrl) {
        user.avatarUrl = verifiedGoogle.avatarUrl;
      }
      await this.userRepository.save(user);
    }

    const device = await this.deviceSessionService.registerDevice(user.id, {
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      deviceType: dto.deviceType,
      osVersion: dto.osVersion,
      appVersion: dto.appVersion,
      ipAddress: clientIp,
    });

    const tokenPair = await this.jwtTokenService.generateTokenPair({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isGuest: user.isGuest,
      deviceId: device.deviceId,
    });

    const session = await this.deviceSessionService.createSession(
      user.id,
      device.deviceId,
      tokenPair.refreshJti,
      {
        deviceType: dto.deviceType,
        deviceName: dto.deviceName,
        ipAddress: clientIp,
        userAgent,
      },
    );

    await this.deviceSessionService.logConnectionHistory({
      userId: user.id,
      sessionId: session.id,
      deviceId: device.deviceId,
      action: 'LOGIN',
      loginMethod: 'GOOGLE',
      ipAddress: clientIp,
      userAgent,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokenPair.expiresIn,
      user: this.mapUserToProfileDto(user),
      sessionId: session.id,
      deviceId: device.deviceId,
    };
  }

  // --- Guest Login ---
  async guestLogin(dto: GuestLoginDto, clientIp?: string, userAgent?: string): Promise<AuthResponseDto> {
    await this.checkSettingEnabled('allow_guest_login', 'Guest Login');

    const guestUuid = crypto.randomUUID().slice(0, 8);
    const username = `guest_${guestUuid}`;
    const referralCode = await this.generateUniqueReferralCode();

    let user = this.userRepository.create({
      username,
      displayName: `Guest_${guestUuid.slice(0, 4)}`,
      email: `${username}@guest.voicecloud.app`,
      isGuest: true,
      role: 'GUEST',
      hostBadge: 'GUEST',
      referralCode,
      referredByUserId: dto.referralCode,
      isOnline: true,
      followersCount: 0,
      followingCount: 0,
      popularityScore: 20,
      profileCompletion: 30,
    });

    user = await this.userRepository.save(user);

    const device = await this.deviceSessionService.registerDevice(user.id, {
      deviceId: dto.deviceId,
      deviceName: dto.deviceName || 'Guest Device',
      deviceType: dto.deviceType || 'mobile',
      ipAddress: clientIp,
    });

    const tokenPair = await this.jwtTokenService.generateTokenPair({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isGuest: true,
      deviceId: device.deviceId,
    });

    const session = await this.deviceSessionService.createSession(
      user.id,
      device.deviceId,
      tokenPair.refreshJti,
      {
        deviceType: dto.deviceType || 'mobile',
        deviceName: dto.deviceName || 'Guest Device',
        ipAddress: clientIp,
        userAgent,
      },
    );

    await this.deviceSessionService.logConnectionHistory({
      userId: user.id,
      sessionId: session.id,
      deviceId: device.deviceId,
      action: 'LOGIN',
      loginMethod: 'GUEST',
      ipAddress: clientIp,
      userAgent,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokenPair.expiresIn,
      user: this.mapUserToProfileDto(user),
      sessionId: session.id,
      deviceId: device.deviceId,
    };
  }

  // --- Upgrade Guest Account ---
  async upgradeGuestAccount(
    userId: string,
    dto: GuestUpgradeDto,
    clientIp?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User account not found');
    }

    if (!user.isGuest) {
      throw new BadRequestException('User account is already a registered account.');
    }

    if (dto.method === 'phone' || dto.phoneNumber) {
      if (!dto.phoneNumber) throw new BadRequestException('phoneNumber is required for phone upgrade');
      if (dto.otpCode) {
        await this.otpService.verifyOtp(dto.phoneNumber, dto.otpCode);
      }
      user.phoneNumber = dto.phoneNumber;
      user.phoneVerified = true;
    } else if (dto.method === 'google' || dto.googleIdToken) {
      if (!dto.googleIdToken) throw new BadRequestException('googleIdToken is required for google upgrade');
      const verified = await this.googleAuthService.verifyGoogleIdToken(dto.googleIdToken);
      user.email = verified.email;
      if (verified.avatarUrl) user.avatarUrl = verified.avatarUrl;
    } else if (dto.email && dto.password) {
      const existing = await this.userRepository.findOne({ where: { email: dto.email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Email already in use by another account');
      }
      user.email = dto.email;
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    user.isGuest = false;
    user.role = 'USER';
    user.hostBadge = '';
    if (dto.displayName) user.displayName = dto.displayName;
    user.profileCompletion = 80;

    const savedUser = await this.userRepository.save(user);

    const tokenPair = await this.jwtTokenService.generateTokenPair({
      id: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role,
      isGuest: false,
    });

    const session = await this.deviceSessionService.createSession(
      savedUser.id,
      'dev_upgraded',
      tokenPair.refreshJti,
      { ipAddress: clientIp, userAgent },
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokenPair.expiresIn,
      user: this.mapUserToProfileDto(savedUser),
      sessionId: session.id,
    };
  }

  // --- Email & Password Auth ---
  async register(registerDto: RegisterDto, clientIp?: string, userAgent?: string): Promise<AuthResponseDto> {
    const existing = await this.userRepository.findOne({
      where: [{ email: registerDto.email }, { username: registerDto.username }],
    });

    if (existing) {
      throw new ConflictException('Username or email already exists');
    }

    let passwordHash: string | undefined;
    if (registerDto.password) {
      passwordHash = await bcrypt.hash(registerDto.password, 10);
    }

    const referralCode = await this.generateUniqueReferralCode();

    const user = this.userRepository.create({
      username: registerDto.username,
      displayName: registerDto.displayName,
      email: registerDto.email,
      passwordHash,
      isGuest: false,
      role: 'USER',
      referralCode,
      isOnline: true,
      followersCount: 0,
      followingCount: 0,
      popularityScore: 50,
      profileCompletion: 70,
    });

    const savedUser = await this.userRepository.save(user);

    const device = await this.deviceSessionService.registerDevice(savedUser.id, {
      ipAddress: clientIp,
    });

    const tokenPair = await this.jwtTokenService.generateTokenPair({
      id: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role,
      isGuest: false,
      deviceId: device.deviceId,
    });

    const session = await this.deviceSessionService.createSession(
      savedUser.id,
      device.deviceId,
      tokenPair.refreshJti,
      { ipAddress: clientIp, userAgent },
    );

    await this.deviceSessionService.logConnectionHistory({
      userId: savedUser.id,
      sessionId: session.id,
      deviceId: device.deviceId,
      action: 'REGISTER',
      loginMethod: 'EMAIL_PASSWORD',
      ipAddress: clientIp,
      userAgent,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokenPair.expiresIn,
      user: this.mapUserToProfileDto(savedUser),
      sessionId: session.id,
      deviceId: device.deviceId,
    };
  }

  async login(loginDto: LoginDto, clientIp?: string, userAgent?: string): Promise<AuthResponseDto> {
    let user: User | null = null;

    if (loginDto.email) {
      user = await this.userRepository.findOne({ where: { email: loginDto.email } });
    } else if (loginDto.username) {
      user = await this.userRepository.findOne({ where: { username: loginDto.username } });
    }

    if (!user) {
      // Auto-provision demo account for developer testing or initial login
      const username = loginDto.username || `user_${Math.random().toString(36).substring(2, 8)}`;
      const email = loginDto.email || `${username}@voicecloud.app`;
      const referralCode = await this.generateUniqueReferralCode();

      user = this.userRepository.create({
        username,
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        email,
        passwordHash: loginDto.password ? await bcrypt.hash(loginDto.password, 10) : undefined,
        isGuest: false,
        role: 'USER',
        referralCode,
        isOnline: true,
        followersCount: 0,
        followingCount: 0,
        popularityScore: 100,
        profileCompletion: 80,
      });

      user = await this.userRepository.save(user);
    } else {
      // Account lockout check
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
        throw new ForbiddenException(`Account is locked due to multiple failed login attempts. Try again in ${remainingMinutes} minutes.`);
      }

      if (user.passwordHash && loginDto.password) {
        const passwordMatches = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!passwordMatches) {
          user.failedLoginAttempts += 1;

          const lockoutThresholdSetting = await this.adminSettingsService.findByKey('failed_login_lockout_attempts');
          const maxAttempts = lockoutThresholdSetting?.value ? parseInt(lockoutThresholdSetting.value, 10) : 5;

          if (user.failedLoginAttempts >= maxAttempts) {
            const lockoutDurationSetting = await this.adminSettingsService.findByKey('failed_login_lockout_duration');
            const lockoutMins = lockoutDurationSetting?.value ? parseInt(lockoutDurationSetting.value, 10) : 15;
            user.lockoutUntil = new Date(Date.now() + lockoutMins * 60 * 1000);
            this.logger.warn(`Account '${user.id}' locked for ${lockoutMins} mins after ${user.failedLoginAttempts} failed attempts`);
          }

          await this.userRepository.save(user);

          await this.deviceSessionService.logConnectionHistory({
            userId: user.id,
            action: 'FAILED_LOGIN',
            loginMethod: 'EMAIL_PASSWORD',
            ipAddress: clientIp,
            userAgent,
          });

          throw new UnauthorizedException('Invalid username or password');
        }
      }

      // Reset failed attempts on success
      user.failedLoginAttempts = 0;
      user.lockoutUntil = undefined;
      user.isOnline = true;
      user.lastActiveAt = new Date();
      await this.userRepository.save(user);
    }

    const device = await this.deviceSessionService.registerDevice(user.id, {
      ipAddress: clientIp,
    });

    const tokenPair = await this.jwtTokenService.generateTokenPair({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isGuest: user.isGuest,
      deviceId: device.deviceId,
    });

    const session = await this.deviceSessionService.createSession(
      user.id,
      device.deviceId,
      tokenPair.refreshJti,
      { ipAddress: clientIp, userAgent },
    );

    await this.deviceSessionService.logConnectionHistory({
      userId: user.id,
      sessionId: session.id,
      deviceId: device.deviceId,
      action: 'LOGIN',
      loginMethod: 'EMAIL_PASSWORD',
      ipAddress: clientIp,
      userAgent,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokenPair.expiresIn,
      user: this.mapUserToProfileDto(user),
      sessionId: session.id,
      deviceId: device.deviceId,
    };
  }

  // --- Token Refresh ---
  async refreshToken(dto: RefreshTokenDto, rawTokenHeader?: string): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  }> {
    const token = dto.refreshToken || rawTokenHeader?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const payload = await this.jwtTokenService.verifyRefreshToken(token);

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    // Blacklist old refresh token (Token Rotation)
    await this.jwtTokenService.blacklistToken(payload.jti, 604800);

    const tokenPair = await this.jwtTokenService.generateTokenPair({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isGuest: user.isGuest,
      sessionId: payload.sessionId,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokenPair.expiresIn,
    };
  }

  // --- Logout & Session Termination ---
  async logout(userId: string, sessionId?: string, tokenJti?: string) {
    if (sessionId) {
      await this.deviceSessionService.revokeSession(sessionId, userId);
    }
    if (tokenJti) {
      await this.jwtTokenService.blacklistToken(tokenJti, 86400);
    }

    await this.deviceSessionService.logConnectionHistory({
      userId,
      sessionId,
      action: 'LOGOUT',
    });

    return { message: 'Logged out successfully' };
  }

  async logoutAllDevices(userId: string) {
    const count = await this.deviceSessionService.revokeAllSessions(userId);

    await this.deviceSessionService.logConnectionHistory({
      userId,
      action: 'LOGOUT_ALL',
    });

    return { message: 'Logged out from all devices successfully', revokedSessionsCount: count };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }
    return user;
  }

  async validateReferralCode(code: string) {
    const user = await this.userRepository.findOne({ where: { referralCode: code } });
    if (!user) {
      throw new NotFoundException('Referral code is invalid or expired');
    }
    return {
      valid: true,
      referrer: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
