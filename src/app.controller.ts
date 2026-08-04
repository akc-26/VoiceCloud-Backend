import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('API Info')
@Controller()
export class AppController {
  @Get('api')
  @ApiOperation({ summary: 'VoiceCloud Monolith API Information Endpoint' })
  getRoot() {
    return {
      name: 'VoiceCloud Monolith API',
      version: '1.0.0',
      status: 'online',
      documentation: '/api/docs',
      health: '/health',
      api: '/api',
    };
  }

  @Get('api/info')
  @ApiOperation({
    summary: 'VoiceCloud Monolith API Information Detail Endpoint',
  })
  getHello() {
    return {
      name: 'VoiceCloud Monolith API',
      version: '1.0.0',
      status: 'online',
      documentation: '/api/docs',
      health: '/health',
      api: '/api',
    };
  }
}
