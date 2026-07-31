import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve modular monolith health diagnostics' })
  @ApiResponse({
    status: 200,
    description: 'Database and cache connections status reports.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        database: { type: 'string', example: 'connected' },
        redis: { type: 'string', example: 'connected' },
      },
    },
  })
  async getHealth() {
    return this.healthService.checkHealth();
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Retrieve system operational metrics & resource diagnostics',
  })
  @ApiResponse({
    status: 200,
    description: 'Operational system metrics retrieved successfully',
  })
  async getMetrics() {
    return this.healthService.getOperationalMetrics();
  }
}
