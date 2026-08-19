import { apiClient } from '@/api/client';
import type { WebsiteAuthResponse, WebsiteUser } from './auth.types';
import { getWebsiteDeviceMetadata } from './device';

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  displayName: string;
  email: string;
  password: string;
}

export interface OtpResponse {
  message: string;
  expiresAt?: string;
  resendCooldownSeconds?: number;
  otpCode?: string;
}

export interface GuestUpgradeInput {
  method: 'email' | 'phone' | 'google';
  displayName?: string;
  email?: string;
  password?: string;
  phoneNumber?: string;
  otpCode?: string;
  googleIdToken?: string;
}

function normalizeIdentifier(identifier: string) {
  const value = identifier.trim();
  return value.includes('@')
    ? { email: value.toLowerCase() }
    : { username: value };
}

export const websiteAuthApi = {
  async login(input: LoginInput): Promise<WebsiteAuthResponse> {
    const { data } = await apiClient.post<WebsiteAuthResponse>('/auth/login', {
      ...normalizeIdentifier(input.identifier),
      password: input.password,
    });
    return data;
  },

  async register(input: RegisterInput): Promise<WebsiteAuthResponse> {
    const { data } = await apiClient.post<WebsiteAuthResponse>('/auth/register', {
      username: input.username.trim(),
      displayName: input.displayName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    return data;
  },

  async sendPhoneOtp(phoneNumber: string): Promise<OtpResponse> {
    const { data } = await apiClient.post<OtpResponse>('/auth/phone/send-otp', {
      phoneNumber: phoneNumber.trim(),
    });
    return data;
  },

  async phoneLogin(phoneNumber: string, otpCode: string, referralCode?: string): Promise<WebsiteAuthResponse> {
    const device = getWebsiteDeviceMetadata();
    const { data } = await apiClient.post<WebsiteAuthResponse>('/auth/phone/login', {
      phoneNumber: phoneNumber.trim(),
      otpCode: otpCode.trim(),
      referralCode: referralCode?.trim() || undefined,
      ...device,
    });
    return data;
  },

  async guestLogin(referralCode?: string): Promise<WebsiteAuthResponse> {
    const device = getWebsiteDeviceMetadata();
    const { data } = await apiClient.post<WebsiteAuthResponse>('/auth/guest/login', {
      referralCode: referralCode?.trim() || undefined,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
    });
    return data;
  },

  async googleLogin(idToken: string, referralCode?: string): Promise<WebsiteAuthResponse> {
    const device = getWebsiteDeviceMetadata();
    const { data } = await apiClient.post<WebsiteAuthResponse>('/auth/google/login', {
      idToken,
      referralCode: referralCode?.trim() || undefined,
      ...device,
    });
    return data;
  },

  async upgradeGuest(input: GuestUpgradeInput): Promise<WebsiteAuthResponse> {
    const { data } = await apiClient.post<WebsiteAuthResponse>('/auth/guest/upgrade', input);
    return data;
  },

  async me(): Promise<WebsiteUser> {
    const { data } = await apiClient.get<WebsiteUser>('/auth/me');
    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
