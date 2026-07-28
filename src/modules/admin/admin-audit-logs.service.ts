import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { QueryAuditLogsDto } from './dto/audit-log.dto';

@Injectable()
export class AdminAuditLogsService {
  private readonly logger = new Logger(AdminAuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(data: {
    userId?: string;
    module: string;
    action: string;
    previousValue?: Record<string, any>;
    newValue?: Record<string, any>;
    ipAddress?: string;
  }): Promise<AuditLog> {
    const logItem = this.auditLogRepo.create(data);
    const saved = await this.auditLogRepo.save(logItem);
    this.logger.debug(
      `[AuditLog] ${data.module}:${data.action} by ${data.userId || 'system'}`,
    );
    return saved;
  }

  async findAll(query: QueryAuditLogsDto) {
    const { module, action, userId, page = 1, limit = 20 } = query;
    const qb = this.auditLogRepo.createQueryBuilder('log');

    if (module) {
      qb.andWhere('log.module = :module', { module });
    }
    if (action) {
      qb.andWhere('log.action = :action', { action });
    }
    if (userId) {
      qb.andWhere('log.userId = :userId', { userId });
    }

    qb.orderBy('log.createdAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
