import { Injectable, Logger } from '@nestjs/common';
import {
  ProviderConfig,
  ProviderCategory,
} from './entities/provider-config.entity';
import { EncryptionService } from '../../common/services/encryption.service';
import axios from 'axios';
import * as net from 'net';
import * as crypto from 'crypto';
import { liveKitHttpBaseUrl, resolveLiveKitProviderConfig } from '../rtc/livekit-config.util';

export interface TestConnectionResult {
  success: boolean;
  latencyMs: number;
  message: string;
  details?: Record<string, any>;
  testedAt: Date;
}

@Injectable()
export class ProviderTestConnectionService {
  private readonly logger = new Logger(ProviderTestConnectionService.name);

  constructor(private readonly encryptionService: EncryptionService) {}

  async testProvider(provider: ProviderConfig): Promise<TestConnectionResult> {
    const startTime = Date.now();
    const decryptedConfig = this.encryptionService.decryptConfig(
      provider.config || {},
    );

    try {
      let result: {
        success: boolean;
        message: string;
        details?: Record<string, any>;
      };

      switch (provider.category) {
        case ProviderCategory.RTC:
          result = await this.testRtc(provider.providerType, decryptedConfig);
          break;
        case ProviderCategory.STORAGE:
          result = await this.testStorage(
            provider.providerType,
            decryptedConfig,
          );
          break;
        case ProviderCategory.PAYMENT:
          result = await this.testPayment(
            provider.providerType,
            decryptedConfig,
          );
          break;
        case ProviderCategory.FIREBASE:
          result = await this.testFirebase(decryptedConfig);
          break;
        case ProviderCategory.EMAIL:
          result = await this.testEmail(provider.providerType, decryptedConfig);
          break;
        case ProviderCategory.SMS:
          result = await this.testSms(provider.providerType, decryptedConfig);
          break;
        case ProviderCategory.AI:
          result = await this.testAi(provider.providerType, decryptedConfig);
          break;
        case ProviderCategory.MAPS:
          result = await this.testMaps(decryptedConfig);
          break;
        default:
          result = {
            success: false,
            message: `Unsupported provider category: ${provider.category}`,
          };
      }

      const latencyMs = Date.now() - startTime;
      return {
        success: result.success,
        latencyMs,
        message: result.message,
        details: result.details || {},
        testedAt: new Date(),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        message: (error as Error).message || 'Connection test failed',
        details: { error: (error as Error).stack },
        testedAt: new Date(),
      };
    }
  }

  private async testRtc(providerType: string, config: Record<string, any>) {
    if (providerType === 'default_mock') {
      return {
        success:
          process.env.NODE_ENV !== 'production' &&
          process.env.ENABLE_RTC_MOCK_PROVIDER === 'true',
        message:
          process.env.NODE_ENV !== 'production' &&
          process.env.ENABLE_RTC_MOCK_PROVIDER === 'true'
            ? 'Development RTC mock is explicitly enabled; this is not a real provider connectivity test'
            : 'RTC mock provider is disabled',
        details: { realProvider: false },
      };
    }

    if (providerType === 'agora') {
      const appId = config.appId || config.agoraAppId;
      const certificate = config.appCertificate || config.certificate;
      if (!appId || !certificate || /DEFAULT|PLACEHOLDER/i.test(`${appId}${certificate}`)) {
        return { success: false, message: 'Missing valid Agora App ID or App Certificate' };
      }
      return {
        success: true,
        message: 'Agora credential structure validated; runtime media connectivity still requires a real RTC session test',
        details: { appIdPrefix: String(appId).substring(0, 6) + '...', liveConnectivityVerified: false },
      };
    }

    if (providerType === 'livekit') {
      const liveKit = resolveLiveKitProviderConfig(config);
      if (!liveKit.apiKey || !liveKit.apiSecret || !liveKit.serverUrl) {
        return {
          success: false,
          message: 'Missing LiveKit Project URL, API Key, or API Secret',
          details: {
            required: ['serverUrl', 'apiKey', 'apiSecret'],
            serverUrlConfigured: Boolean(liveKit.serverUrl),
            apiKeyConfigured: Boolean(liveKit.apiKey),
            apiSecretConfigured: Boolean(liveKit.apiSecret),
          },
        };
      }
      if (!/^wss?:\/\//i.test(liveKit.serverUrl)) {
        return { success: false, message: 'LiveKit Project URL must use ws:// or wss://' };
      }
      if (/DEFAULT|PLACEHOLDER|YOUR_|voicecloud\.app/i.test(`${liveKit.serverUrl}${liveKit.apiKey}${liveKit.apiSecret}`)) {
        return {
          success: false,
          message: 'LiveKit configuration still contains placeholder/default values',
        };
      }

      const now = Math.floor(Date.now() / 1000);
      const encodedHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const encodedPayload = Buffer.from(JSON.stringify({
        iss: liveKit.apiKey,
        sub: 'voicecloud-provider-health-check',
        nbf: now - 5,
        exp: now + 90,
        video: { roomList: true },
      })).toString('base64url');
      const signature = crypto
        .createHmac('sha256', liveKit.apiSecret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');
      const token = `${encodedHeader}.${encodedPayload}.${signature}`;
      const endpoint = `${liveKitHttpBaseUrl(liveKit.serverUrl)}/twirp/livekit.RoomService/ListRooms`;

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
      } catch (error) {
        return {
          success: false,
          message: `LiveKit server could not be reached: ${(error as Error).message}`,
          details: { serverUrl: liveKit.serverUrl, liveConnectivityVerified: false },
        };
      }

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        return {
          success: false,
          message: `LiveKit rejected the configured project credentials (${response.status})`,
          details: {
            serverUrl: liveKit.serverUrl,
            apiKeyPrefix: `${liveKit.apiKey.slice(0, 6)}...`,
            liveConnectivityVerified: false,
            providerResponse: detail,
          },
        };
      }

      return {
        success: true,
        message: 'LiveKit connection verified successfully with the configured Project URL, API Key, and API Secret',
        details: {
          apiKeyPrefix: `${liveKit.apiKey.slice(0, 6)}...`,
          serverUrl: liveKit.serverUrl,
          liveConnectivityVerified: true,
        },
      };
    }

    if (providerType === 'zegocloud') {
      const appId = config.appId;
      const secret = config.secret || config.serverSecret;
      if (!appId || !secret) {
        return { success: false, message: 'Missing ZEGOCLOUD App ID or Server Secret' };
      }
      return {
        success: true,
        message: 'ZEGOCLOUD credential structure validated; runtime media connectivity still requires a real RTC session test',
        details: { appId, liveConnectivityVerified: false },
      };
    }

    return { success: false, message: `Unsupported RTC provider: ${providerType}` };
  }

  private async testStorage(providerType: string, config: Record<string, any>) {
    if (providerType === 'local') {
      const path = config.path || config.basePath || process.env.UPLOAD_PATH;
      if (!path) return { success: false, message: 'Missing local storage path' };
      return {
        success: true,
        message: 'Local storage path configuration is present; filesystem write access is verified during runtime upload acceptance',
        details: { path, writeAccessVerified: false },
      };
    }

    const bucket = config.bucket || config.container;
    const accessKey = config.accessKeyId || config.accessKey;
    const secretKey = config.secretAccessKey || config.secretKey;
    if (!bucket || !accessKey || !secretKey) {
      return { success: false, message: 'Missing storage bucket/container or access credentials' };
    }

    if (config.endpoint) {
      try {
        await axios.head(config.endpoint, { timeout: 3000, validateStatus: (status) => status < 500 });
      } catch (error) {
        return { success: false, message: `Storage endpoint is unreachable: ${(error as Error).message}` };
      }
    }

    return {
      success: true,
      message: `Storage configuration for bucket '${bucket}' validated; bucket read/write permissions require an authenticated object operation`,
      details: { bucket, region: config.region || 'default', permissionsVerified: false },
    };
  }

  private async testPayment(providerType: string, config: Record<string, any>) {
    if (providerType === 'razorpay') {
      const keyId = config.keyId || config.key_id;
      const keySecret = config.keySecret || config.key_secret;
      if (!keyId || !keySecret) return { success: false, message: 'Missing Razorpay Key ID or Key Secret' };
      try {
        await axios.get('https://api.razorpay.com/v1/payments?count=1', {
          auth: { username: keyId, password: keySecret },
          timeout: 5000,
        });
        return { success: true, message: 'Razorpay API authentication verified', details: { keyIdPrefix: String(keyId).substring(0, 8) + '...' } };
      } catch (error) {
        return { success: false, message: `Razorpay API authentication failed: ${(error as Error).message}` };
      }
    }

    if (providerType === 'stripe') {
      const secretKey = config.secretKey || config.apiKey;
      if (!secretKey) return { success: false, message: 'Missing Stripe Secret Key' };
      try {
        await axios.get('https://api.stripe.com/v1/account', {
          headers: { Authorization: `Bearer ${secretKey}` },
          timeout: 5000,
        });
        return { success: true, message: 'Stripe API authentication verified', details: { keyType: String(secretKey).startsWith('sk_test') ? 'test' : 'live' } };
      } catch (error) {
        return { success: false, message: `Stripe API authentication failed: ${(error as Error).message}` };
      }
    }

    if (providerType === 'paypal') {
      const clientId = config.clientId || config.client_id;
      const clientSecret = config.clientSecret || config.client_secret;
      if (!clientId || !clientSecret) return { success: false, message: 'Missing PayPal Client ID or Client Secret' };
      return { success: true, message: 'PayPal credential structure validated; payment verification performs live OAuth/API validation', details: { liveConnectivityVerified: false } };
    }

    if (providerType === 'google_play') {
      const serviceAccount = config.serviceAccountJson;
      if (!serviceAccount || serviceAccount === '{}') return { success: false, message: 'Missing Google Play service-account credentials' };
      return { success: true, message: 'Google Play service-account configuration is present; server-side purchase adapter is not yet configured', details: { purchaseVerificationReady: false } };
    }

    if (providerType === 'apple_iap') {
      if (!config.issuerId || !config.keyId || !config.privateKey) return { success: false, message: 'Missing Apple App Store Server API issuer, key ID, or private key' };
      return { success: true, message: 'Apple App Store Server API credential structure is present; server-side transaction adapter is not yet configured', details: { purchaseVerificationReady: false } };
    }

    return { success: false, message: `Unsupported payment provider: ${providerType}` };
  }

  private async testFirebase(config: Record<string, any>) {
    const projectId = config.projectId;
    const clientEmail = config.clientEmail;
    const privateKey = config.privateKey;
    if (!projectId || !clientEmail || !privateKey || /\.\.\.|PLACEHOLDER/i.test(String(privateKey))) {
      return { success: false, message: 'Missing valid Firebase project ID, client email, or private key' };
    }
    return {
      success: true,
      message: `Firebase Admin credential structure validated for project '${projectId}'; FCM delivery is verified by an actual send operation`,
      details: { projectId, pushEnabled: config.enablePush !== false, deliveryVerified: false },
    };
  }

  private async testEmail(providerType: string, config: Record<string, any>) {
    if (providerType === 'smtp') {
      const host = config.host;
      const port = Number(config.port) || 587;
      if (!host) {
        return { success: false, message: 'Missing SMTP Host' };
      }

      // Socket probe to SMTP host:port
      return new Promise<{
        success: boolean;
        message: string;
        details?: Record<string, any>;
      }>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);

        socket.on('connect', () => {
          socket.destroy();
          resolve({
            success: true,
            message: `SMTP Mailer socket connection to ${host}:${port} successful`,
            details: { host, port },
          });
        });

        socket.on('error', (err) => {
          socket.destroy();
          resolve({
            success: false,
            message: `SMTP Connection failed to ${host}:${port} - ${err.message}`,
            details: { host, port },
          });
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve({
            success: false,
            message: `SMTP Connection timed out to ${host}:${port}`,
            details: { host, port },
          });
        });

        socket.connect(port, host);
      });
    }

    return { success: false, message: `Unsupported email provider: ${providerType}` };
  }

  private async testSms(providerType: string, config: Record<string, any>) {
    if (providerType === 'twilio') {
      const accountSid = config.accountSid || config.sid;
      const authToken = config.authToken || config.token;
      if (!accountSid || !authToken || !config.senderNumber) {
        return { success: false, message: 'Missing Twilio Account SID, Auth Token, or Sender Number' };
      }
      return {
        success: true,
        message: 'Twilio credential structure validated; delivery is verified by an actual OTP send',
        details: { sender: config.senderNumber, deliveryVerified: false },
      };
    }

    if (providerType === 'msg91') {
      if (!config.authKey || !config.senderId) {
        return { success: false, message: 'Missing MSG91 auth key or sender ID' };
      }
      return {
        success: true,
        message: 'MSG91 credential structure validated; delivery is verified by an actual OTP send',
        details: { senderId: config.senderId, deliveryVerified: false },
      };
    }

    return { success: false, message: `Unsupported SMS provider: ${providerType}` };
  }

  private async testAi(providerType: string, config: Record<string, any>) {
    if (providerType === 'gemini') {
      const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return { success: false, message: 'Missing valid Gemini API key' };
      }
      return {
        success: true,
        message: 'Gemini API key structure is configured; model availability is verified by the first real inference request',
        details: { model: config.model || 'gemini-2.5-flash', inferenceVerified: false },
      };
    }

    return { success: false, message: `Unsupported AI provider: ${providerType}` };
  }

  private async testMaps(config: Record<string, any>) {
    const apiKey = config.apiKey;
    if (!apiKey) {
      return { success: false, message: 'Missing Google Maps API Key' };
    }
    return {
      success: true,
      message: 'Google Maps API key is configured; API entitlement is verified by an actual Maps request',
      details: { keyPrefix: apiKey.substring(0, 6) + '...', entitlementVerified: false },
    };
  }
}
