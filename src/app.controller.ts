import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BRAND_CONFIG } from '../shared/branding';

@ApiTags('API Info')
@Controller()
export class AppController {
  @Get('api')
  @ApiOperation({
    summary: `${BRAND_CONFIG.products.backend.apiName} Information Endpoint`,
  })
  getRoot() {
    return {
      name: BRAND_CONFIG.products.backend.apiName,
      version: '1.0.0',
      status: 'online',
      documentation: '/api/docs',
      health: '/health',
      api: '/api',
    };
  }

  @Get('api/info')
  @ApiOperation({
    summary: `${BRAND_CONFIG.products.backend.apiName} Information Detail Endpoint`,
  })
  getHello() {
    return {
      name: BRAND_CONFIG.products.backend.apiName,
      version: '1.0.0',
      status: 'online',
      documentation: '/api/docs',
      health: '/health',
      api: '/api',
    };
  }
}
