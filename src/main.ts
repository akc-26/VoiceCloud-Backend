import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger/app-logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  // 1. Create NestJS Application with our custom structured logger
  const appLogger = new AppLogger();
  appLogger.setContext('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: appLogger,
  });

  // Enable serving uploaded media files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Enable serving static files for Web Admin Panel
  const adminDist = path.join(process.cwd(), 'dist/admin');
  app.use(express.static(adminDist));

  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (
        req.method === 'GET' &&
        !req.path.startsWith('/api') &&
        !req.path.startsWith('/uploads')
      ) {
        const indexPath = path.join(adminDist, 'index.html');
        if (fs.existsSync(indexPath)) {
          return res.sendFile(indexPath);
        }
      }
      next();
    },
  );

  // 2. Enable CORS Support
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. Set API Global Prefix (v1)
  app.setGlobalPrefix('api/v1', {
    exclude: [
      '/',
      'api',
      { path: '/', method: RequestMethod.GET },
      { path: 'api', method: RequestMethod.GET },
    ],
  });

  // 4. Register Global Pipes, Interceptors & Exception Filters
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

  // 5. Configure Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('VoiceCloud Monolith API')
    .setDescription(
      'VoiceCloud Monolith API - Core Foundation, Rooms, Chat, Wallet, Gifts, VIP Membership, Host Verification, Agency Management, Notifications, Moderation & Reporting, Announcements, and Media & Storage.',
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
      'Phase 18 Gamified & Multi Gifting',
      'Multi-recipient room gifting blasts, mystery lucky box rolls, and gift streak combos',
    )
    .addTag(
      'Phase 18 Live Room Analytics',
      'Real-time listener retention curves, peak concurrent viewers, engagement index, and session reports',
    )
    .addTag(
      'Phase 18 Security & Auto-Moderation Shield',
      'Automated toxicity scoring, rule-based auto-mute/kick, and device fingerprint security',
    )
    .addTag(
      'Phase 29 Store & Personalization Mall',
      'Virtual Mall catalog, avatar frames, chat bubbles, entrance effects, vehicles/mounts, item purchasing/gifting, inventory, and equipping',
    )
    .addTag(
      'Phase 29 Admin Store & Mall Management',
      'Admin catalog CRUD, inventory inspector, manual item grants, and store revenue analytics',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 6. Load server configurations and listen
  const port = 3000;

  appLogger.log(
    `Starting VoiceCloud NestJS Backend Foundation on 0.0.0.0:${port}...`,
  );
  await app.listen(port, '0.0.0.0');
  appLogger.log(
    `VoiceCloud API is live! Access health checks at http://localhost:${port}/api/v1/health`,
  );
  appLogger.log(
    `Swagger Documentation is available at http://localhost:${port}/api/docs`,
  );
}

void bootstrap();
