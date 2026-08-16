import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { ProviderCategory } from '../admin/entities/provider-config.entity';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface VerifiedGoogleUser {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private firebaseAdminInitialized = false;

  constructor(private readonly dynamicConfigService: DynamicConfigService) {}

  private async initializeFirebaseAdmin(): Promise<boolean> {
    if (this.firebaseAdminInitialized && getApps().length > 0) {
      return true;
    }

    try {
      const firebaseProvider =
        await this.dynamicConfigService.getActiveProviderConfig(
          ProviderCategory.FIREBASE,
        );

      if (firebaseProvider && firebaseProvider.config) {
        const { projectId, clientEmail, privateKey } = firebaseProvider.config;

        if (projectId && clientEmail && privateKey && getApps().length === 0) {
          initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
          this.firebaseAdminInitialized = true;
          this.logger.log(
            'Firebase Admin SDK initialized dynamically for Auth',
          );
          return true;
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to initialize Firebase Admin SDK: ${(err as Error).message}`,
      );
    }

    return false;
  }

  async verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
    if (!idToken) {
      throw new UnauthorizedException('Google ID token is required');
    }

    const isFirebaseReady = await this.initializeFirebaseAdmin();

    if (!isFirebaseReady || getApps().length === 0) {
      this.logger.error(
        'Google sign-in rejected because Firebase Admin verification is not configured.',
      );
      throw new UnauthorizedException(
        'Google authentication provider is not configured',
      );
    }

    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      return {
        googleId: decodedToken.uid || decodedToken.sub,
        email:
          decodedToken.email || `google_${decodedToken.uid}@voicecloud.app`,
        displayName:
          decodedToken.name ||
          decodedToken.email?.split('@')[0] ||
          `User_${decodedToken.uid.slice(-6)}`,
        avatarUrl: decodedToken.picture,
        emailVerified: !!decodedToken.email_verified,
      };
    } catch (err) {
      this.logger.warn(
        `Firebase ID token verification failed: ${(err as Error).message}`,
      );
      throw new UnauthorizedException('Invalid Google ID token');
    }
  }
}
