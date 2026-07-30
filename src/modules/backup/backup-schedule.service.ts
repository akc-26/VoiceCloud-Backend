import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BackupSchedule,
  ScheduleFrequency,
} from './entities/backup-schedule.entity';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
} from './dto/backup-schedule.dto';
import { BackupService } from './backup.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BackupScheduleService {
  private readonly logger = new Logger(BackupScheduleService.name);

  constructor(
    @InjectRepository(BackupSchedule)
    private readonly scheduleRepository: Repository<BackupSchedule>,
    private readonly backupService: BackupService,
  ) {}

  async createSchedule(dto: CreateScheduleDto): Promise<BackupSchedule> {
    const schedule = this.scheduleRepository.create({
      name: dto.name,
      type: dto.type,
      frequency: dto.frequency,
      cronExpression: dto.cronExpression,
      isEnabled: dto.isEnabled ?? true,
      components: dto.components || [
        'database',
        'redis',
        'storage',
        'config',
        'ssl',
      ],
      retentionDays: dto.retentionDays || 30,
      maxBackupCount: dto.maxBackupCount || 10,
      targetStorage: dto.targetStorage || 'local',
      nextRunAt: this.calculateNextRun(dto.frequency, dto.cronExpression),
    });

    return this.scheduleRepository.save(schedule);
  }

  async findAllSchedules(): Promise<BackupSchedule[]> {
    return this.scheduleRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findScheduleById(id: string): Promise<BackupSchedule> {
    const sched = await this.scheduleRepository.findOne({ where: { id } });
    if (!sched) {
      throw new NotFoundException(`Backup schedule with ID '${id}' not found`);
    }
    return sched;
  }

  async updateSchedule(
    id: string,
    dto: UpdateScheduleDto,
  ): Promise<BackupSchedule> {
    const sched = await this.findScheduleById(id);
    Object.assign(sched, dto);
    if (dto.frequency || dto.cronExpression) {
      sched.nextRunAt = this.calculateNextRun(
        sched.frequency,
        sched.cronExpression,
      );
    }
    return this.scheduleRepository.save(sched);
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const sched = await this.findScheduleById(id);
    await this.scheduleRepository.remove(sched);
    return true;
  }

  // Cron task running every hour to check and execute due scheduled backups
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledBackups() {
    this.logger.log(
      `[Backup Schedule Engine] Checking for due scheduled backups...`,
    );
    const now = new Date();
    const dueSchedules = await this.scheduleRepository.find({
      where: { isEnabled: true },
    });

    for (const sched of dueSchedules) {
      if (!sched.nextRunAt || sched.nextRunAt <= now) {
        this.logger.log(
          `[Backup Schedule Engine] Executing scheduled backup '${sched.name}'`,
        );
        try {
          await this.backupService.createBackup(
            {
              name: `${sched.name.replace(/\s+/g, '_')}_${Date.now()}`,
              type: sched.type,
              components: sched.components,
              storageLocation: sched.targetStorage,
              notes: `Automated scheduled backup execution (Frequency: ${sched.frequency})`,
            },
            'SCHEDULED_CRON',
          );

          sched.lastRunAt = new Date();
          sched.nextRunAt = this.calculateNextRun(
            sched.frequency,
            sched.cronExpression,
          );
          await this.scheduleRepository.save(sched);
        } catch (e: any) {
          this.logger.error(
            `Failed to execute scheduled backup '${sched.name}': ${e.message}`,
          );
        }
      }
    }
  }

  private calculateNextRun(freq: ScheduleFrequency, cronExpr?: string): Date {
    const next = new Date();
    if (freq === ScheduleFrequency.DAILY) {
      next.setDate(next.getDate() + 1);
    } else if (freq === ScheduleFrequency.WEEKLY) {
      next.setDate(next.getDate() + 7);
    } else if (freq === ScheduleFrequency.MONTHLY) {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setHours(next.getHours() + 24);
    }
    return next;
  }
}
