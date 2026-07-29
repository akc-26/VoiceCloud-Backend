import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return app status object for getRoot', () => {
      expect(appController.getRoot()).toEqual({
        name: 'VoiceCloud Monolith API',
        version: '1.0.0',
        status: 'online',
        documentation: '/api/docs',
        health: '/api/v1/health',
        api: '/api',
      });
    });

    it('should return app status object for getHello', () => {
      expect(appController.getHello()).toEqual({
        name: 'VoiceCloud Monolith API',
        version: '1.0.0',
        status: 'online',
        documentation: '/api/docs',
        health: '/api/v1/health',
      });
    });
  });
});
