import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AdminDashboardService } from './admin-dashboard.service';
import { RedisService } from '../../redis/redis.service';
import { PollStatus } from '../polls/entities/poll.entity';
import { QuizStatus } from '../quizzes/entities/quiz.entity';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let dataSource: any;
  let redisService: any;

  beforeEach(async () => {
    const repositories: Record<string, any> = {
      User: { count: jest.fn().mockResolvedValue(100) },
      Room: { count: jest.fn().mockResolvedValue(10) },
      WalletTransaction: { count: jest.fn().mockResolvedValue(50) },
      Gift: { count: jest.fn().mockResolvedValue(20) },
      VipMembership: { count: jest.fn().mockResolvedValue(5) },
      HostProfile: { count: jest.fn().mockResolvedValue(8) },
      Notification: { count: jest.fn().mockResolvedValue(200) },
      Poll: { count: jest.fn().mockResolvedValue(2) },
      PollVote: { count: jest.fn().mockResolvedValue(30) },
      Quiz: { count: jest.fn().mockResolvedValue(1) },
      QuizParticipantScore: { count: jest.fn().mockResolvedValue(15) },
      RegionalPricingConfig: { count: jest.fn().mockResolvedValue(4) },
    };

    dataSource = {
      hasMetadata: jest.fn((target: string) => !!repositories[target]),
      getRepository: jest.fn((target: string) => repositories[target]),
      isInitialized: true,
    };

    redisService = {
      ping: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: DataSource, useValue: dataSource },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
  });

  it('should generate dashboard stats successfully without exceptions', async () => {
    const stats = await service.getDashboardStats();

    expect(stats).toBeDefined();
    expect(stats.overview.users.total).toBe(100);
    expect(stats.overview.rooms.total).toBe(10);
    expect(stats.overview.polls.activeNow).toBe(2);
    expect(stats.overview.quizzes.activeNow).toBe(1);
    expect(stats.overview.pricing.activeCountries).toBe(4);
    expect(stats.infrastructure.database.status).toBe('connected');
    expect(stats.infrastructure.redis.status).toBe('connected');

    expect(dataSource.getRepository('Poll').count).toHaveBeenCalledWith({
      where: { status: PollStatus.ACTIVE },
    });
    expect(dataSource.getRepository('Quiz').count).toHaveBeenCalledWith({
      where: { status: QuizStatus.ACTIVE },
    });
  });
});
