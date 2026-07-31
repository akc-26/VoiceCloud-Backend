import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  App,
  initializeApp,
  cert,
  getApps,
  applicationDefault,
} from 'firebase-admin/app';
import {
  getMessaging,
  Message,
  MulticastMessage,
} from 'firebase-admin/messaging';

export interface FcmNotificationPayload {
  title: string;
  body: string;
  image?: string;
  deepLink?: string;
  data?: Record<string, string>;
}

export interface FcmBatchMessage {
  token: string;
  notification: FcmNotificationPayload;
}

export interface FcmSendResult {
  success: boolean;
  messageId?: string;
  failureCount?: number;
  successCount?: number;
  error?: string;
}

@Injectable()
export class FirebaseMessagingService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseMessagingService.name);
  private firebaseApp: App | null = null;
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.firebaseApp = existingApps[0]!;
        this.isInitialized = true;
        this.logger.log('Firebase Admin SDK already initialized.');
        return;
      }

      const serviceAccountStr = this.configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT',
      );
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const hasGoogleCreds = Boolean(
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      );

      if (serviceAccountStr) {
        let serviceAccount: any;
        try {
          serviceAccount = JSON.parse(serviceAccountStr);
        } catch {
          serviceAccount = serviceAccountStr;
        }

        this.firebaseApp = initializeApp({
          credential: cert(serviceAccount),
          projectId,
        });
        this.isInitialized = true;
        this.logger.log(
          'Firebase Admin SDK initialized successfully with service account.',
        );
      } else if (hasGoogleCreds && projectId) {
        this.firebaseApp = initializeApp({
          credential: applicationDefault(),
          projectId,
        });
        this.isInitialized = true;
        this.logger.log(
          'Firebase Admin SDK initialized with default credentials.',
        );
      } else {
        this.logger.warn(
          'Firebase credentials (FIREBASE_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS) not provided. Push notifications will run in dry-run/mock mode.',
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to initialize Firebase Admin SDK: ${error.message}`,
      );
    }
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Send push notification to a single device token.
   */
  async sendSingleNotification(
    token: string,
    payload: FcmNotificationPayload,
  ): Promise<FcmSendResult> {
    this.logger.log(
      `[FCM] Sending single notification to token: ${token.substring(0, 10)}...`,
    );

    if (!token) {
      return { success: false, error: 'NO_TOKEN_PROVIDED' };
    }

    const message: Message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.image,
      },
      data: {
        ...(payload.data || {}),
        ...(payload.deepLink ? { deepLink: payload.deepLink } : {}),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: payload.deepLink || 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
    };

    if (!this.isInitialized || !this.firebaseApp) {
      this.logger.debug(
        `[FCM Mock] Single notification sent to ${token.substring(0, 10)}: "${payload.title}"`,
      );
      return { success: true, messageId: `mock-msg-${Date.now()}` };
    }

    try {
      const messageId = await getMessaging(this.firebaseApp).send(message);
      this.logger.log(
        `[FCM] Successfully sent single message ID: ${messageId}`,
      );
      return { success: true, messageId };
    } catch (error: any) {
      this.logger.error(`[FCM Error] Single send failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple device tokens.
   */
  async sendMultiNotification(
    tokens: string[],
    payload: FcmNotificationPayload,
  ): Promise<FcmSendResult> {
    if (!tokens || tokens.length === 0) {
      return {
        success: false,
        error: 'NO_TOKENS_PROVIDED',
        successCount: 0,
        failureCount: 0,
      };
    }

    this.logger.log(
      `[FCM] Sending multicast notification to ${tokens.length} devices.`,
    );

    const multicastMessage: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.image,
      },
      data: {
        ...(payload.data || {}),
        ...(payload.deepLink ? { deepLink: payload.deepLink } : {}),
      },
      android: {
        priority: 'high',
      },
    };

    if (!this.isInitialized || !this.firebaseApp) {
      this.logger.debug(
        `[FCM Mock] Multicast notification sent to ${tokens.length} tokens: "${payload.title}"`,
      );
      return {
        success: true,
        successCount: tokens.length,
        failureCount: 0,
      };
    }

    try {
      const response = await getMessaging(
        this.firebaseApp,
      ).sendEachForMulticast(multicastMessage);
      this.logger.log(
        `[FCM] Multicast complete: ${response.successCount} succeeded, ${response.failureCount} failed.`,
      );
      return {
        success: response.failureCount === 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      this.logger.error(`[FCM Error] Multicast send failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        successCount: 0,
        failureCount: tokens.length,
      };
    }
  }

  /**
   * Send batch notifications with distinct payloads or target tokens.
   */
  async sendBatchNotification(
    messages: FcmBatchMessage[],
  ): Promise<FcmSendResult> {
    if (!messages || messages.length === 0) {
      return {
        success: false,
        error: 'NO_MESSAGES_PROVIDED',
        successCount: 0,
        failureCount: 0,
      };
    }

    this.logger.log(
      `[FCM] Sending batch notifications: ${messages.length} messages.`,
    );

    let successCount = 0;
    let failureCount = 0;

    for (const msg of messages) {
      const res = await this.sendSingleNotification(
        msg.token,
        msg.notification,
      );
      if (res.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      success: failureCount === 0,
      successCount,
      failureCount,
    };
  }
}
