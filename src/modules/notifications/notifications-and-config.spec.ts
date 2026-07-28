import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification, NotificationType } from './entities/notification.entity';
import { UserDevice } from '../users/entities/user-device.entity';
import { EventsGateway } from '../../common/events/events.gateway';

import { Reflector } from '@nestjs/core';
import { JwtTokenService } from '../auth/jwt-token.service';

import { RemoteConfigService } from '../config/remote-config.service';
import { RemoteConfigController } from '../config/remote-config.controller';
import { AdminSettingsService } from '../admin/admin-settings.service';
import { AdminFeatureFlagsService } from '../admin/admin-feature-flags.service';
import { AdminVersionsService } from '../admin/admin-versions.service';
import { AppPlatform } from '../admin/entities/app-version.entity';

describe('Phase 2E Notifications & Remote Config Business APIs', () => {
  let notificationsService: NotificationsService;
  let notificationsController: NotificationsController;

  let remoteConfigService: RemoteConfigService;
  let remoteConfigController: RemoteConfigController;

  const mockNotificationRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserDeviceRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockEventsGateway = {
    broadcastNotificationEvent: jest.fn(),
  };

  const mockAdminSettingsService = {
    getPublicSettings: jest.fn(),
  };

  const mockAdminFeatureFlagsService = {
    getAllFlagsMap: jest.fn(),
  };

  const mockAdminVersionsService = {
    findLatestByPlatform: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController, RemoteConfigController],
      providers: [
        NotificationsService,
        RemoteConfigService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepo,
        },
        {
          provide: getRepositoryToken(UserDevice),
          useValue: mockUserDeviceRepo,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
        {
          provide: AdminSettingsService,
          useValue: mockAdminSettingsService,
        },
        {
          provide: AdminFeatureFlagsService,
          useValue: mockAdminFeatureFlagsService,
        },
        {
          provide: AdminVersionsService,
          useValue: mockAdminVersionsService,
        },
        Reflector,
        {
          provide: JwtTokenService,
          useValue: {
            verifyAccessToken: jest.fn(),
          },
        },
      ],
    }).compile();

    notificationsService = module.get<NotificationsService>(NotificationsService);
    notificationsController = module.get<NotificationsController>(NotificationsController);

    remoteConfigService = module.get<RemoteConfigService>(RemoteConfigService);
    remoteConfigController = module.get<RemoteConfigController>(RemoteConfigController);
  });

  describe('NotificationsService - Device Registration', () => {
    it('should register a new device when none exists', async () => {
      mockUserDeviceRepo.findOne.mockResolvedValue(null);

      const dto = {
        deviceId: 'device-123',
        platform: 'android',
        deviceName: 'Pixel 8',
        osVersion: 'Android 14',
        appVersion: '1.2.0',
        pushToken: 'fcm-token-123',
      };

      const createdDevice = {
        id: 'user-device-1',
        userId: 'user-1',
        ...dto,
        deviceType: 'android',
        lastUsedAt: new Date(),
      };

      mockUserDeviceRepo.create.mockReturnValue(createdDevice);
      mockUserDeviceRepo.save.mockResolvedValue(createdDevice);

      const res = await notificationsService.registerDevice('user-1', dto);

      expect(res).toEqual(createdDevice);
      expect(mockUserDeviceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          deviceId: 'device-123',
          pushToken: 'fcm-token-123',
        }),
      );
      expect(mockUserDeviceRepo.save).toHaveBeenCalled();
    });

    it('should update existing device token and timestamps on re-registration', async () => {
      const existingDevice = {
        id: 'user-device-1',
        userId: 'user-1',
        deviceId: 'device-123',
        deviceType: 'mobile',
        deviceName: 'Old Phone',
        pushToken: 'old-token',
        lastUsedAt: new Date('2025-01-01'),
      };

      mockUserDeviceRepo.findOne.mockResolvedValue(existingDevice);
      mockUserDeviceRepo.save.mockImplementation((dev) => Promise.resolve(dev));

      const dto = {
        deviceId: 'device-123',
        pushToken: 'new-fcm-token-456',
        appVersion: '1.2.1',
      };

      const res = await notificationsService.registerDevice('user-1', dto);

      expect(res.pushToken).toBe('new-fcm-token-456');
      expect(res.appVersion).toBe('1.2.1');
      expect(mockUserDeviceRepo.save).toHaveBeenCalled();
    });
  });

  describe('NotificationsService - Notification Management', () => {
    it('should retrieve user notifications with pagination', async () => {
      const mockNotifications = [
        { id: 'notif-1', userId: 'user-1', title: 'Test 1', isRead: false },
        { id: 'notif-2', userId: 'user-1', title: 'Test 2', isRead: true },
      ];

      mockNotificationRepo.findAndCount.mockResolvedValue([mockNotifications, 2]);

      const res = await notificationsService.getUserNotifications('user-1', {
        page: 1,
        limit: 10,
        isRead: false,
      });

      expect(res.data).toEqual(mockNotifications);
      expect(res.total).toBe(2);
      expect(res.totalPages).toBe(1);
    });

    it('should return notification by ID for owner', async () => {
      const notif = { id: 'notif-1', userId: 'user-1', title: 'Hello' };
      mockNotificationRepo.findOne.mockResolvedValue(notif);

      const res = await notificationsService.getNotificationById('user-1', 'notif-1');

      expect(res).toEqual(notif);
    });

    it('should throw NotFoundException if notification is not found or not owned', async () => {
      mockNotificationRepo.findOne.mockResolvedValue(null);

      await expect(
        notificationsService.getNotificationById('user-1', 'notif-invalid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mark notification as read and emit realtime event', async () => {
      const notif = { id: 'notif-1', userId: 'user-1', isRead: false, readAt: null };
      mockNotificationRepo.findOne.mockResolvedValue(notif);
      mockNotificationRepo.save.mockImplementation((n) => Promise.resolve(n));

      const res = await notificationsService.markAsRead('user-1', 'notif-1');

      expect(res.isRead).toBe(true);
      expect(res.readAt).toBeDefined();
      expect(mockEventsGateway.broadcastNotificationEvent).toHaveBeenCalledWith(
        'notification:read',
        expect.objectContaining({ userId: 'user-1', notificationId: 'notif-1' }),
      );
    });

    it('should mark all unread notifications as read', async () => {
      const unread = [
        { id: 'notif-1', userId: 'user-1', isRead: false },
        { id: 'notif-2', userId: 'user-1', isRead: false },
      ];

      mockNotificationRepo.find.mockResolvedValue(unread);
      mockNotificationRepo.save.mockResolvedValue(unread);

      const res = await notificationsService.markAllAsRead('user-1');

      expect(res.success).toBe(true);
      expect(res.updatedCount).toBe(2);
    });

    it('should delete notification if owner', async () => {
      const notif = { id: 'notif-1', userId: 'user-1' };
      mockNotificationRepo.findOne.mockResolvedValue(notif);
      mockNotificationRepo.remove.mockResolvedValue(notif);

      const res = await notificationsService.deleteNotification('user-1', 'notif-1');

      expect(res.success).toBe(true);
      expect(mockEventsGateway.broadcastNotificationEvent).toHaveBeenCalledWith(
        'notification:deleted',
        expect.objectContaining({ userId: 'user-1', notificationId: 'notif-1' }),
      );
    });

    it('should return unread notification count', async () => {
      mockNotificationRepo.count.mockResolvedValue(5);

      const res = await notificationsService.getUnreadCount('user-1');

      expect(res.unreadCount).toBe(5);
    });
  });

  describe('NotificationsController Delegation', () => {
    it('should delegate registerDevice to service', async () => {
      const spy = jest.spyOn(notificationsService, 'registerDevice').mockResolvedValue({ id: 'dev-1' } as any);
      const dto = { deviceId: 'dev-123' };

      const res = await notificationsController.registerDevice('user-1', dto as any);

      expect(spy).toHaveBeenCalledWith('user-1', dto);
      expect(res).toEqual({ id: 'dev-1' });
    });

    it('should delegate getNotifications to service', async () => {
      const spy = jest.spyOn(notificationsService, 'getUserNotifications').mockResolvedValue({ total: 0 } as any);
      const query = { page: 1, limit: 10 };

      const res = await notificationsController.getNotifications('user-1', query);

      expect(spy).toHaveBeenCalledWith('user-1', query);
      expect(res).toEqual({ total: 0 });
    });

    it('should delegate getNotificationById to service', async () => {
      const spy = jest.spyOn(notificationsService, 'getNotificationById').mockResolvedValue({ id: 'notif-1' } as any);

      const res = await notificationsController.getNotificationById('user-1', 'notif-1');

      expect(spy).toHaveBeenCalledWith('user-1', 'notif-1');
      expect(res).toEqual({ id: 'notif-1' });
    });

    it('should delegate markAsRead to service', async () => {
      const spy = jest.spyOn(notificationsService, 'markAsRead').mockResolvedValue({ id: 'notif-1', isRead: true } as any);

      const res = await notificationsController.markAsRead('user-1', 'notif-1');

      expect(spy).toHaveBeenCalledWith('user-1', 'notif-1');
      expect(res.isRead).toBe(true);
    });

    it('should delegate markAllAsRead to service', async () => {
      const spy = jest.spyOn(notificationsService, 'markAllAsRead').mockResolvedValue({ success: true, updatedCount: 2 });

      const res = await notificationsController.markAllAsRead('user-1');

      expect(spy).toHaveBeenCalledWith('user-1');
      expect(res.updatedCount).toBe(2);
    });

    it('should delegate deleteNotification to service', async () => {
      const spy = jest.spyOn(notificationsService, 'deleteNotification').mockResolvedValue({ success: true });

      const res = await notificationsController.deleteNotification('user-1', 'notif-1');

      expect(spy).toHaveBeenCalledWith('user-1', 'notif-1');
      expect(res.success).toBe(true);
    });
  });

  describe('RemoteConfigService - Configuration & Version Checks', () => {
    it('should assemble public remote configuration correctly', async () => {
      mockAdminSettingsService.getPublicSettings.mockResolvedValue({
        maintenance_mode: false,
        max_room_capacity: 500,
        coin_exchange_rate: 100,
      });

      mockAdminFeatureFlagsService.getAllFlagsMap.mockResolvedValue({
        creator_economy_v2: true,
        agora_rtc_enabled: true,
      });

      const config = await remoteConfigService.getPublicRemoteConfig();

      expect(config.maintenanceMode).toBe(false);
      expect(config.featureFlags.creator_economy_v2).toBe(true);
      expect(config.supportedCapabilities).toContain('rtc_rooms');
      expect(config.applicationParameters.maxRoomCapacity).toBe(500);
      expect(config.rolloutFlags).toBeDefined();
    });

    it('should flag updateAvailable when client version is below latest version', async () => {
      mockAdminVersionsService.findLatestByPlatform.mockResolvedValue({
        platform: AppPlatform.ANDROID,
        latestVersion: '1.5.0',
        minSupportedVersion: '1.0.0',
        forceUpdate: false,
      });

      mockAdminSettingsService.getPublicSettings.mockResolvedValue({ maintenance_mode: false });

      const res = await remoteConfigService.checkVersion({
        platform: AppPlatform.ANDROID,
        currentVersion: '1.2.0',
      });

      expect(res.updateAvailable).toBe(true);
      expect(res.forceUpdate).toBe(false);
      expect(res.latestVersion).toBe('1.5.0');
    });

    it('should flag forceUpdate when client version is below minimum supported version', async () => {
      mockAdminVersionsService.findLatestByPlatform.mockResolvedValue({
        platform: AppPlatform.ANDROID,
        latestVersion: '2.0.0',
        minSupportedVersion: '1.3.0',
        forceUpdate: false,
      });

      mockAdminSettingsService.getPublicSettings.mockResolvedValue({ maintenance_mode: false });

      const res = await remoteConfigService.checkVersion({
        platform: AppPlatform.ANDROID,
        currentVersion: '1.1.0',
      });

      expect(res.updateAvailable).toBe(true);
      expect(res.forceUpdate).toBe(true);
    });

    it('should return updateAvailable=false when client is up to date', async () => {
      mockAdminVersionsService.findLatestByPlatform.mockResolvedValue({
        platform: AppPlatform.ANDROID,
        latestVersion: '1.5.0',
        minSupportedVersion: '1.0.0',
        forceUpdate: false,
      });

      mockAdminSettingsService.getPublicSettings.mockResolvedValue({ maintenance_mode: false });

      const res = await remoteConfigService.checkVersion({
        platform: AppPlatform.ANDROID,
        currentVersion: '1.5.0',
      });

      expect(res.updateAvailable).toBe(false);
      expect(res.forceUpdate).toBe(false);
    });
  });

  describe('RemoteConfigController Delegation', () => {
    it('should delegate getPublicRemoteConfig to service', async () => {
      const spy = jest.spyOn(remoteConfigService, 'getPublicRemoteConfig').mockResolvedValue({ maintenanceMode: false } as any);

      const res = await remoteConfigController.getPublicRemoteConfig();

      expect(spy).toHaveBeenCalled();
      expect(res.maintenanceMode).toBe(false);
    });

    it('should delegate checkVersion to service', async () => {
      const spy = jest.spyOn(remoteConfigService, 'checkVersion').mockResolvedValue({ latestVersion: '1.2.0' } as any);
      const dto = { platform: AppPlatform.ANDROID, currentVersion: '1.0.0' };

      const res = await remoteConfigController.checkVersion(dto);

      expect(spy).toHaveBeenCalledWith(dto);
      expect(res.latestVersion).toBe('1.2.0');
    });
  });
});
