import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { createReadStream } from 'fs';
import { BackupService } from './backup.service';
import { RestoreService } from './restore.service';
import { BackupScheduleService } from './backup-schedule.service';
import { DisasterRecoveryService } from './disaster-recovery.service';
import { CreateBackupDto } from './dto/create-backup.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/backup-schedule.dto';

interface RequestWithUser extends Request {
  user?: {
    userId: string;
    email?: string;
  };
}

@ApiTags('Admin / Infrastructure Backup & Disaster Recovery')
@Controller('admin/backups')
export class BackupController {
  constructor(
    private readonly backupService: BackupService,
    private readonly restoreService: RestoreService,
    private readonly scheduleService: BackupScheduleService,
    private readonly disasterRecoveryService: DisasterRecoveryService,
  ) {}

  // 1. BACKUPS MANAGEMENT
  @Post()
  @ApiOperation({ summary: 'Create manual/emergency infrastructure backup' })
  async createBackup(@Body() dto: CreateBackupDto, @Req() req: RequestWithUser) {
    return this.backupService.createBackup(dto, req.user?.userId || 'ADMIN_USER');
  }

  @Get()
  @ApiOperation({ summary: 'List all infrastructure backups' })
  async listBackups() {
    return this.backupService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get backup details by ID' })
  async getBackupDetails(@Param('id') id: string) {
    return this.backupService.getBackupById(id);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify integrity and checksum of backup archive' })
  async verifyBackup(@Param('id') id: string) {
    return this.backupService.verifyBackup(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download backup ZIP archive' })
  async downloadBackup(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fullPath, fileName } = await this.backupService.getBackupFileStream(id);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    const file = createReadStream(fullPath);
    return new StreamableFile(file);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload external backup file package' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBackup(@UploadedFile() file: Express.Multer.File, @Req() req: RequestWithUser) {
    if (!file) {
      throw new BadRequestException('No backup ZIP file uploaded');
    }
    return this.backupService.createBackup({
      name: `Uploaded_Backup_${file.originalname.replace('.zip', '')}`,
      notes: `Uploaded external backup archive (${file.size} bytes)`,
    }, req.user?.userId || 'ADMIN_USER');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete backup archive' })
  async deleteBackup(@Param('id') id: string) {
    return this.backupService.deleteBackup(id);
  }

  // 2. RESTORE ENGINE
  @Get('restore/preview/:id')
  @ApiOperation({ summary: 'Generate restore preview and integrity check' })
  async getRestorePreview(@Param('id') id: string) {
    return this.restoreService.generateRestorePreview(id);
  }

  @Post('restore')
  @ApiOperation({ summary: 'Execute platform restoration with auto-rollback protection' })
  async restoreBackup(@Body() dto: RestoreBackupDto, @Req() req: RequestWithUser) {
    return this.restoreService.restoreBackup(dto, req.user?.userId || 'ADMIN_USER');
  }

  @Get('restore/history')
  @ApiOperation({ summary: 'List restore operations history' })
  async getRestoreHistory() {
    return this.restoreService.findAllHistory();
  }

  // 3. SCHEDULES & RETENTION
  @Get('schedules/list')
  @ApiOperation({ summary: 'List all backup schedule policies' })
  async listSchedules() {
    return this.scheduleService.findAllSchedules();
  }

  @Post('schedules')
  @ApiOperation({ summary: 'Create automated backup schedule policy' })
  async createSchedule(@Body() dto: CreateScheduleDto) {
    return this.scheduleService.createSchedule(dto);
  }

  @Patch('schedules/:id')
  @ApiOperation({ summary: 'Update backup schedule policy' })
  async updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.scheduleService.updateSchedule(id, dto);
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: 'Delete backup schedule policy' })
  async deleteSchedule(@Param('id') id: string) {
    return this.scheduleService.deleteSchedule(id);
  }

  @Post('retention/purge')
  @ApiOperation({ summary: 'Enforce retention policies and purge expired backups' })
  async purgeRetention() {
    return this.backupService.enforceRetentionPolicies();
  }

  // 4. DISASTER RECOVERY
  @Get('disaster-recovery/status')
  @ApiOperation({ summary: 'Get Disaster Recovery health status & RPO/RTO metrics' })
  async getDisasterRecoveryStatus() {
    return this.disasterRecoveryService.getDisasterRecoveryStatus();
  }
}
