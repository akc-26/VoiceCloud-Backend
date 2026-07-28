import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AdminCmsService } from './admin-cms.service';

@ApiTags('CMS Public Pages')
@Controller('cms')
export class PublicCmsController {
  constructor(private readonly cmsService: AdminCmsService) {}

  @Public()
  @Get('pages')
  @ApiOperation({ summary: 'Get list of published public CMS pages' })
  @ApiResponse({ status: 200, description: 'List of CMS pages' })
  async getPages() {
    return this.cmsService.findAllPublic();
  }

  @Public()
  @Get('pages/:slug')
  @ApiOperation({ summary: 'Get published CMS page details by slug' })
  @ApiParam({
    name: 'slug',
    description: 'Page slug e.g. privacy-policy, terms-and-conditions',
  })
  @ApiResponse({ status: 200, description: 'CMS Page details' })
  async getPageBySlug(@Param('slug') slug: string) {
    const page = await this.cmsService.findBySlug(slug);
    if (!page) {
      throw new NotFoundException(`CMS page with slug '${slug}' not found`);
    }
    return page;
  }
}
