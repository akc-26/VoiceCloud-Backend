import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import * as compression from 'compression';
import * as path from 'path';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger/app-logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RedisService } from './redis/redis.service';
import {
  registerApiRateLimiting,
  registerProductionSecurityHeaders,
} from './common/http/production-http-hardening';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { validateProductionEnvironment } from './config/env-validator';
import {
  registerFrontendHosting,
  resolveFrontendHostingPaths,
} from './hosting/frontend-hosting';

import { BRAND_CONFIG } from '../shared/branding';

async function bootstrap() {
  // 0. Perform strict environment validation for production
  validateProductionEnvironment();

  // 1. Create NestJS Application with our custom structured logger
  const appLogger = new AppLogger();
  appLogger.setContext('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: appLogger,
    // Required for authoritative RTC webhook verification (LiveKit signs the
    // SHA-256 of the exact raw request body, not a re-serialized JSON object).
    rawBody: true,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  const isProd = process.env.NODE_ENV === 'production';

  // Production HTTP hardening is registered before static assets and Nest routes.
  registerProductionSecurityHeaders(expressApp, isProd);
  registerApiRateLimiting(expressApp, app.get(RedisService), appLogger);

  // Enable HTTP response compression and CORS before static assets and Nest routes.
  expressApp.use(compression());
  const configuredCorsOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const corsOrigin =
    process.env.NODE_ENV === 'production' ? configuredCorsOrigins : true;

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Register middleware on the underlying Express instance before Nest maps routes.
  // This guarantees that compiled frontend assets are served before Nest's 404 handler.
  expressApp.use(
    '/uploads',
    express.static(path.resolve(process.cwd(), 'uploads')),
  );

  const frontendHostingPaths = resolveFrontendHostingPaths();
  registerFrontendHosting(expressApp, frontendHostingPaths, appLogger);

  // 2. Set API Global Prefix (v1)
  app.setGlobalPrefix('api/v1', {
    exclude: [
      'api',
      'api/info',
      'health',
      'health/{*path}',
      'docs',
      'docs/{*path}',
      { path: 'api', method: RequestMethod.GET },
      { path: 'api/info', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/metrics', method: RequestMethod.GET },
    ],
  });

  // 3. Register Global Pipes, Interceptors & Exception Filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const interceptorLogger = await app.resolve(AppLogger);
  const filterLogger = await app.resolve(AppLogger);
  app.useGlobalInterceptors(new LoggingInterceptor(interceptorLogger));
  app.useGlobalFilters(new HttpExceptionFilter(filterLogger));

  // 4. Configure Swagger OpenAPI Documentation (Protected in production)
  const port = Number(process.env.PORT ?? 3000);
  const enableSwagger = process.env.ENABLE_SWAGGER === 'true' || !isProd;

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle(BRAND_CONFIG.products.backend.apiName)
      .setDescription(
        `${BRAND_CONFIG.products.backend.apiName} - Rooms, Chat, Wallet, Gifts, VIP Membership, Host Verification, Agency Management, Notifications, Moderation & Reporting, Announcements, and Media & Storage.`,
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('Health Check', 'Service liveness and connection status metrics')
      .addTag(
        'Storage & Media Infrastructure',
        'Generic file upload, retrieval, replacement, deletion, and metadata querying',
      )
      .addTag(
        'User Avatars & Assets',
        'User avatar upload, replacement, deletion, and metadata',
      )
      .addTag(
        'Room Media Management',
        'Room cover, thumbnail, and background image uploads',
      )
      .addTag(
        'Chat Attachments',
        'Chat image, document, audio, and general file attachment uploads',
      )
      .addTag(
        'Gift Media Management',
        'Gift icon, animation, and preview media uploads',
      )
      .addTag(
        'VIP Membership',
        'VIP Plans, purchasing, renewals, cancellations, and status tracking',
      )
      .addTag(
        'Host Verification & Management',
        'Host verification application workflow, profiles, and administration',
      )
      .addTag(
        'Agency Management',
        'Agency CRUD, member roles, invitations, dashboard, rankings, and statistics',
      )
      .addTag(
        'Notifications',
        'In-app, system, room, gift, VIP, agency, host and announcement notifications',
      )
      .addTag(
        'User Blocking',
        'Block users, unblock users, list blocked users, and block checks',
      )
      .addTag(
        'User Reports',
        'Submit reports for users, rooms, messages, agencies, and hosts',
      )
      .addTag(
        'Admin Moderation',
        'Report management, user suspensions, bans, mutes, warnings, notes, and audit log',
      )
      .addTag(
        'Announcements',
        'Platform global, VIP, agency, and host announcements with scheduling and priorities',
      )
      .addTag(
        'Search & History',
        'Global unified search, entity-specific keyword search, history, and suggestions',
      )
      .addTag(
        'User, Room, Host & Agency Discovery',
        'Trending, popular, live, online, new, and recently active feeds',
      )
      .addTag(
        'Leaderboards, Trending & Recommendations',
        'Timeframed leaderboards, trending entities, and rule-based recommendation engine',
      )
      .addTag(
        'Room Soundboard & BGM',
        'Live room audio effects, background music tracks, volume controls, and sound triggers',
      )
      .addTag(
        'Gamified & Multi Gifting',
        'Multi-recipient room gifting blasts, mystery lucky box rolls, and gift streak combos',
      )
      .addTag(
        'Live Room Analytics',
        'Real-time listener retention curves, peak concurrent viewers, engagement index, and session reports',
      )
      .addTag(
        'Security & Auto-Moderation Shield',
        'Automated toxicity scoring, rule-based auto-mute/kick, and device fingerprint security',
      )
      .addTag(
        'Store & Personalization Mall',
        'Virtual Mall catalog, avatar frames, chat bubbles, entrance effects, vehicles/mounts, item purchasing/gifting, inventory, and equipping',
      )
      .addTag(
        'Admin Store & Mall Management',
        'Admin catalog CRUD, inventory inspector, manual item grants, and store revenue analytics',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    SwaggerModule.setup('api/docs', app, document);
    appLogger.log(
      `Swagger Documentation is available at http://localhost:${port}/docs and http://localhost:${port}/api/docs`,
    );
  } else {
    appLogger.log(
      'Swagger Documentation disabled in production mode (Set ENABLE_SWAGGER=true to override).',
    );
  }

  // 5. Load server configurations and listen

  appLogger.log(
    `Starting ${BRAND_CONFIG.products.backend.name} on 0.0.0.0:${port}...`,
  );
  await app.listen(port, '0.0.0.0');
  appLogger.log(
    `${BRAND_CONFIG.identity.name} API is live. Health: http://localhost:${port}/health`,
  );
}

void bootstrap();
