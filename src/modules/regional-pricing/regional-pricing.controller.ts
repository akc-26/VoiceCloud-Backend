import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RegionalPricingService } from './regional-pricing.service';
import { CreateRegionalPricingDto } from './dto/create-regional-pricing.dto';
import { ConvertPriceDto } from './dto/convert-price.dto';
import { CalculateEarningsDto } from './dto/calculate-earnings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Regional Pricing Engine')
@Controller('regional-pricing')
export class RegionalPricingController {
  constructor(
    private readonly regionalPricingService: RegionalPricingService,
  ) {}

  @Post('countries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update regional country pricing configuration (Admin)' })
  @ApiResponse({ status: 200, description: 'Regional pricing configured' })
  async createOrUpdateConfig(@Body() dto: CreateRegionalPricingDto) {
    return this.regionalPricingService.createOrUpdateConfig(dto);
  }

  @Get('countries')
  @ApiOperation({ summary: 'Get list of all regional country pricing configurations' })
  @ApiResponse({ status: 200, description: 'List of country pricing configurations' })
  async getAllConfigs() {
    return this.regionalPricingService.getAllConfigs();
  }

  @Get('countries/:countryCode')
  @ApiOperation({ summary: 'Get pricing configuration for a specific country' })
  @ApiParam({ name: 'countryCode', description: 'ISO 2-letter country code' })
  @ApiResponse({ status: 200, description: 'Country pricing configuration' })
  async getConfigByCountry(@Param('countryCode') countryCode: string) {
    return this.regionalPricingService.getConfigByCountry(countryCode);
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convert coin prices into localized currency prices with taxes' })
  @ApiResponse({ status: 200, description: 'Price conversion details' })
  async convertPrice(@Body() dto: ConvertPriceDto) {
    return this.regionalPricingService.convertPrice(dto);
  }

  @Post('creator-earnings/calculate')
  @ApiOperation({ summary: 'Calculate localized creator earnings and platform fees' })
  @ApiResponse({ status: 200, description: 'Creator localized earnings breakdown' })
  async calculateCreatorEarnings(@Body() dto: CalculateEarningsDto) {
    return this.regionalPricingService.calculateCreatorEarnings(dto);
  }

  @Delete('countries/:countryCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete regional pricing config for country' })
  @ApiParam({ name: 'countryCode', description: 'ISO 2-letter country code' })
  @ApiResponse({ status: 200, description: 'Config deleted' })
  async deleteConfig(@Param('countryCode') countryCode: string) {
    return this.regionalPricingService.deleteConfig(countryCode);
  }
}
