import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('API Info')
@Controller('api')
export class AppController {
  @Get()
  @ApiOperation({ summary: 'VoiceCloud Monolith API Information Endpoint' })
  getHello() {
    return {
      name: 'VoiceCloud Monolith API',
      version: '1.0.0',
      status: 'online',
      documentation: '/api/docs',
      health: '/api/v1/health',
    };
  }
}
