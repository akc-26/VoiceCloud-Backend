import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod } from '@nestjs/common';
import * as request from 'supertest';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('Hosting & SPA Routing Reconciliation (e2e/unit)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleRef.createNestApplication();

    // Replicate global prefix exclusions
    app.setGlobalPrefix('api/v1', {
      exclude: [
        'api',
        'api/info',
        'health',
        'health/(.*)',
        'docs',
        'docs/(.*)',
        { path: 'api', method: RequestMethod.GET },
        { path: 'api/info', method: RequestMethod.GET },
      ],
    });

    // Replicate static asset & SPA fallback middleware
    const adminDist = path.join(process.cwd(), 'dist/admin');
    const creatorDist = path.join(process.cwd(), 'dist/creator');
    const websiteDist = path.join(process.cwd(), 'dist/website');

    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use('/admin', express.static(adminDist));
    expressApp.use('/creator', express.static(creatorDist));
    expressApp.use('/', express.static(websiteDist));

    expressApp.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        if (req.method !== 'GET') {
          return next();
        }

        const reqPath = req.path;

        if (
          reqPath.startsWith('/api') ||
          reqPath.startsWith('/socket.io') ||
          reqPath.startsWith('/uploads') ||
          reqPath.startsWith('/health') ||
          reqPath.startsWith('/metrics') ||
          reqPath.startsWith('/docs')
        ) {
          return next();
        }

        if (path.extname(reqPath) !== '') {
          return next();
        }

        if (reqPath === '/admin' || reqPath.startsWith('/admin/')) {
          const adminIndex = path.join(adminDist, 'index.html');
          if (fs.existsSync(adminIndex)) {
            return res.sendFile(adminIndex);
          }
        }

        if (reqPath === '/creator' || reqPath.startsWith('/creator/')) {
          const creatorIndex = path.join(creatorDist, 'index.html');
          if (fs.existsSync(creatorIndex)) {
            return res.sendFile(creatorIndex);
          }
        }

        const websiteIndex = path.join(websiteDist, 'index.html');
        if (fs.existsSync(websiteIndex)) {
          return res.sendFile(websiteIndex);
        }

        next();
      },
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api should return API metadata JSON', async () => {
    const res = await request(app.getHttpServer()).get('/api').expect(200);
    expect(res.body.name).toBe('VoiceCloud Monolith API');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.status).toBe('online');
  });

  it('GET /api/info should return API metadata detail JSON', async () => {
    const res = await request(app.getHttpServer()).get('/api/info').expect(200);
    expect(res.body.name).toBe('VoiceCloud Monolith API');
    expect(res.body.api).toBe('/api');
    expect(res.body.health).toBe('/health');
  });

  it('GET / should serve Landing Website HTML if built', async () => {
    const websiteIndex = path.join(process.cwd(), 'dist/website/index.html');
    if (fs.existsSync(websiteIndex)) {
      const res = await request(app.getHttpServer()).get('/').expect(200);
      expect(res.text).toContain('<html');
    }
  });

  it('GET /admin/users should serve Admin Portal HTML if built', async () => {
    const adminIndex = path.join(process.cwd(), 'dist/admin/index.html');
    if (fs.existsSync(adminIndex)) {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .expect(200);
      expect(res.text).toContain('<html');
    }
  });

  it('GET /creator/dashboard should serve Creator Studio HTML if built', async () => {
    const creatorIndex = path.join(process.cwd(), 'dist/creator/index.html');
    if (fs.existsSync(creatorIndex)) {
      const res = await request(app.getHttpServer())
        .get('/creator/dashboard')
        .expect(200);
      expect(res.text).toContain('<html');
    }
  });

  it('GET /api/nonexistent-route should return 404 JSON, not SPA HTML', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/nonexistent-route',
    );
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('<html');
  });
});
