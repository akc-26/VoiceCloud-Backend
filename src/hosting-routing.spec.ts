import { INestApplication, RequestMethod } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  FrontendHostingPaths,
  registerFrontendHosting,
} from './hosting/frontend-hosting';
describe('Hosting & SPA Routing Reconciliation (e2e/unit)', () => {
  let app: INestApplication;
  let temporaryDistRoot: string;

  beforeAll(async () => {
    temporaryDistRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'voicecloud-hosting-'),
    );

    const websiteDist = path.join(temporaryDistRoot, 'website');
    const adminDist = path.join(temporaryDistRoot, 'admin');
    const creatorDist = path.join(temporaryDistRoot, 'creator');
    for (const directory of [websiteDist, adminDist, creatorDist]) {
      fs.mkdirSync(path.join(directory, 'assets'), { recursive: true });
      fs.writeFileSync(
        path.join(directory, 'assets', 'app.js'),
        'window.__VOICECLOUD_HOSTING_TEST__ = true;',
      );
    }
    fs.writeFileSync(
      path.join(websiteDist, 'index.html'),
      '<!doctype html><html><body>Landing<script src="/assets/app.js"></script></body></html>',
    );
    fs.writeFileSync(
      path.join(adminDist, 'index.html'),
      '<!doctype html><html><body>Admin<script src="/admin/assets/app.js"></script></body></html>',
    );
    fs.writeFileSync(
      path.join(creatorDist, 'index.html'),
      '<!doctype html><html><body>Creator<script src="/creator/assets/app.js"></script></body></html>',
    );
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleRef.createNestApplication();
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
      ],
    });
    const hostingPaths: FrontendHostingPaths = {
      distRoot: temporaryDistRoot,
      websiteDist,
      adminDist,
      creatorDist,
    };

    registerFrontendHosting(
      app.getHttpAdapter().getInstance(),
      hostingPaths,
      {
        log: () => undefined,
      },
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (temporaryDistRoot) {
      fs.rmSync(temporaryDistRoot, { recursive: true, force: true });
    }
  });
  it('GET /api should return API metadata JSON', async () => {
    const response = await request(app.getHttpServer()).get('/api').expect(200);
    expect(response.body.name).toBe('VoiceCloud Monolith API');
    expect(response.body.version).toBe('1.0.0');
    expect(response.body.status).toBe('online');
  });
  it('GET /api/info should return API metadata detail JSON', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/info')
      .expect(200);
    expect(response.body.name).toBe('VoiceCloud Monolith API');
    expect(response.body.api).toBe('/api');
    expect(response.body.health).toBe('/health');
  });
  it.each([
    ['Landing Website', '/', 'Landing'],
    ['Admin Portal', '/admin/', 'Admin'],
    ['Admin Portal index', '/admin/index.html', 'Admin'],
    ['Admin Portal history fallback', '/admin/users', 'Admin'],
    ['Creator Studio', '/creator/', 'Creator'],
    ['Creator Studio index', '/creator/index.html', 'Creator'],
    ['Creator Studio history fallback', '/creator/dashboard', 'Creator'],
  ])('%s serves HTML from %s', async (_label, route, marker) => {
    const response = await request(app.getHttpServer()).get(route).expect(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('<!doctype html>');
    expect(response.text).toContain(marker);
  });
  it.each([
    ['/administer', 'Landing'],
    ['/creator-tools', 'Landing'],
    ['/apiary', 'Landing'],
    ['/healthcare', 'Landing'],
  ])(
    'does not misclassify the non-reserved route %s',
    async (route, marker) => {
      const response = await request(app.getHttpServer())
        .get(route)
        .expect(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain(marker);
    },
  );
  it.each([
    ['/assets/app.js'],
    ['/admin/assets/app.js'],
    ['/creator/assets/app.js'],
  ])('serves the compiled frontend asset %s', async (route) => {
    const response = await request(app.getHttpServer()).get(route).expect(200);
    expect(response.text).toContain('__VOICECLOUD_HOSTING_TEST__');
  });
  it('does not use an SPA fallback for non-GET requests', async () => {
    const response = await request(app.getHttpServer()).post('/admin/users');
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.text).not.toContain('<html');
  });
  it(
    'GET /api/nonexistent-route returns JSON 404 instead of SPA HTML',
    async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/nonexistent-route',
      );
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.text).not.toContain('<html');
    },
  );
});
