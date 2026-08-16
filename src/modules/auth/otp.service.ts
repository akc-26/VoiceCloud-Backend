import {
  Injectable,
  Logger,
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpVerification } from './entities/otp-verification.entity';
import { RedisService } from '../../redis/redis.service';
import { AdminSettingsService } from '../admin/admin-settings.service';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { ProviderCategory } from '../admin/entities/provider-config.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import axios from 'axios';

const OTP_REDIS_PREFIX = 'otp:code:';
const OTP_COOLDOWN_PREFIX = 'otp:cooldown:';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(OtpVerification)
    private readonly otpRepo: Repository<OtpVerification>,
    private readonly redisService: RedisService,
    private readonly adminSettingsService: AdminSettingsService,
    private readonly dynamicConfigService: DynamicConfigService,
  ) {}

  private async getOtpTimeoutSeconds(): Promise<number> {
    try {
      const setting = await this.adminSettingsService.findByKey('otp_timeout');
      if (setting?.value) {
        return parseInt(setting.value, 10);
      }
    } catch {
      // Fallback
    }
    return 300; // 5 minutes
  }

  private async getMaxRetryCount(): Promise<number> {
    try {
      const setting =
        await this.adminSettingsService.findByKey('otp_retry_count');
      if (setting?.value) {
        return parseInt(setting.value, 10);
      }
    } catch {
      // Fallback
    }
    return 3;
  }

  private isPlaceholderSecret(value: unknown): boolean {
    if (typeof value !== 'string' || value.trim().length === 0) return true;
    return /(_DEFAULT|_PLACEHOLDER|CHANGE_ME|YOUR_|example|dummy)/i.test(value);
  }

  private async dispatchOtpSms(
    phoneNumber: string,
    otpCode: string,
  ): Promise<void> {
    const smsProvider = await this.dynamicConfigService.getActiveProviderConfig(
      ProviderCategory.SMS,
    );

    if (!smsProvider) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(
          `[Development OTP] No SMS provider configured. OTP for ${phoneNumber}: ${otpCode}`,
        );
        return;
      }
      throw new ServiceUnavailableException(
        'SMS provider is not configured for OTP delivery',
      );
    }

    const config = smsProvider.config || {};
    const providerType = String(smsProvider.providerType || '').toLowerCase();

    if (providerType === 'twilio') {
      const accountSid = String(config.accountSid || config.sid || '');
      const authToken = String(config.authToken || '');
      const senderNumber = String(config.senderNumber || config.from || '');

      const invalidConfig =
        this.isPlaceholderSecret(accountSid) ||
        this.isPlaceholderSecret(authToken) ||
        !senderNumber;

      if (invalidConfig) {
        if (process.env.NODE_ENV !== 'production') {
          this.logger.warn(
            `[Development OTP] Twilio configuration is incomplete. OTP for ${phoneNumber}: ${otpCode}`,
          );
          return;
        }
        throw new ServiceUnavailableException(
          'Twilio SMS provider credentials are incomplete',
        );
      }

      const body = new URLSearchParams({
        To: phoneNumber,
        From: senderNumber,
        Body: `Your VoiceCloud verification code is ${otpCode}.`,
      });

      try {
        await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
          body.toString(),
          {
            auth: { username: accountSid, password: authToken },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000,
          },
        );
        this.logger.log(`OTP dispatched through Twilio to ${phoneNumber}`);
        return;
      } catch (error) {
        this.logger.error(
          `Twilio OTP delivery failed: ${(error as Error).message}`,
        );
        throw new ServiceUnavailableException('Unable to deliver OTP by SMS');
      }
    }

    if (providerType === 'msg91') {
      const authKey = String(config.authKey || '');
      const templateId = String(config.templateId || '');
      if (
        this.isPlaceholderSecret(authKey) ||
        this.isPlaceholderSecret(templateId)
      ) {
        if (process.env.NODE_ENV !== 'production') {
          this.logger.warn(
            `[Development OTP] MSG91 configuration is incomplete. OTP for ${phoneNumber}: ${otpCode}`,
          );
          return;
        }
        throw new ServiceUnavailableException(
          'MSG91 SMS provider credentials are incomplete',
        );
      }

      try {
        await axios.post(
          'https://control.msg91.com/api/v5/otp',
          undefined,
          {
            params: {
              authkey: authKey,
              template_id: templateId,
              mobile: phoneNumber.replace(/^\+/, ''),
              otp: otpCode,
            },
            timeout: 10000,
          },
        );
        this.logger.log(`OTP dispatched through MSG91 to ${phoneNumber}`);
        return;
      } catch (error) {
        this.logger.error(
          `MSG91 OTP delivery failed: ${(error as Error).message}`,
        );
        throw new ServiceUnavailableException('Unable to deliver OTP by SMS');
      }
    }

    throw new ServiceUnavailableException(
      `Unsupported SMS provider '${smsProvider.providerType}'`,
    );
  }

  async sendOtp(phoneNumber: string): Promise<{
    message: string;
    expiresAt: Date;
    resendCooldownSeconds: number;
    otpCode?: string;
  }> {
    const cooldownKey = `${OTP_COOLDOWN_PREFIX}${phoneNumber}`;
    const inCooldown = await this.redisService.get(cooldownKey);
    if (inCooldown) {
      const remainingSecs = await this.redisService.ttl(cooldownKey);
      throw new HttpException(
        `Please wait ${remainingSecs > 0 ? remainingSecs : 60} seconds before requesting a new OTP.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const timeoutSecs = await this.getOtpTimeoutSeconds();

    // Cryptographically secure six-digit OTP. There is intentionally no
    // universal/test-number bypass in the authentication path.
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // Set 60s cooldown key
    await this.redisService.set(cooldownKey, '1', 60);

    // Save OTP code in Redis
    const redisKey = `${OTP_REDIS_PREFIX}${phoneNumber}`;
    await this.redisService.set(
      redisKey,
      JSON.stringify({
        code: otpCode,
        attempts: 0,
        expiresAt: Date.now() + timeoutSecs * 1000,
      }),
      timeoutSecs,
    );

    const expiresAt = new Date(Date.now() + timeoutSecs * 1000);

    // Store in DB entity for audit/history
    const otpRecord = this.otpRepo.create({
      phoneNumber,
      otpCode: await bcrypt.hash(otpCode, 10),
      attempts: 0,
      isVerified: false,
      expiresAt,
    });
    await this.otpRepo.save(otpRecord);

    try {
      await this.dispatchOtpSms(phoneNumber, otpCode);
    } catch (error) {
      // Do not report a successful OTP request when delivery did not happen.
      await this.redisService.del(redisKey);
      await this.redisService.del(cooldownKey);
      await this.otpRepo.delete({ id: otpRecord.id });
      throw error;
    }

    return {
      message: 'OTP sent successfully',
      expiresAt,
      resendCooldownSeconds: 60,
      otpCode: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    };
  }

  async verifyOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    const redisKey = `${OTP_REDIS_PREFIX}${phoneNumber}`;
    const rawData = await this.redisService.get(redisKey);

    let codeToMatch: string | null = null;
    let codeIsHashed = false;
    let attempts = 0;
    let expiresAtMs: number | undefined;

    if (rawData) {
      try {
        const parsed = JSON.parse(rawData) as {
          code: string;
          attempts: number;
          expiresAt?: number;
        };
        codeToMatch = parsed.code;
        attempts = parsed.attempts || 0;
        expiresAtMs = parsed.expiresAt;
      } catch {
        codeToMatch = rawData;
      }
    } else {
      // Check database backup
      const record = await this.otpRepo.findOne({
        where: { phoneNumber, isVerified: false },
        order: { createdAt: 'DESC' },
      });
      if (!record || record.expiresAt < new Date()) {
        throw new BadRequestException(
          'OTP expired or invalid. Please request a new OTP.',
        );
      }
      codeToMatch = record.otpCode;
      codeIsHashed = true;
      attempts = record.attempts;
    }

    if (!codeToMatch) {
      throw new BadRequestException(
        'OTP expired or invalid. Please request a new OTP.',
      );
    }

    if (expiresAtMs && expiresAtMs <= Date.now()) {
      await this.redisService.del(redisKey);
      throw new BadRequestException(
        'OTP expired or invalid. Please request a new OTP.',
      );
    }

    const maxRetries = await this.getMaxRetryCount();
    if (attempts >= maxRetries) {
      await this.redisService.del(redisKey);
      throw new BadRequestException(
        'Maximum OTP retry attempts exceeded. Please request a new OTP.',
      );
    }

    const isMatch = codeIsHashed
      ? await bcrypt.compare(otpCode, codeToMatch)
      : otpCode === codeToMatch;

    if (!isMatch) {
      attempts += 1;
      if (!codeIsHashed) {
        const remainingSeconds = expiresAtMs
          ? Math.max(1, Math.ceil((expiresAtMs - Date.now()) / 1000))
          : await this.getOtpTimeoutSeconds();
        await this.redisService.set(
          redisKey,
          JSON.stringify({ code: codeToMatch, attempts, expiresAt: expiresAtMs }),
          remainingSeconds,
        );
      }

      // Update DB
      await this.otpRepo.update(
        { phoneNumber, isVerified: false },
        { attempts },
      );

      throw new BadRequestException(
        `Invalid OTP code. Attempts remaining: ${maxRetries - attempts}`,
      );
    }

    // Success - delete OTP from Redis & mark as verified in DB
    await this.redisService.del(redisKey);
    await this.otpRepo.update({ phoneNumber }, { isVerified: true });

    return true;
  }
}
