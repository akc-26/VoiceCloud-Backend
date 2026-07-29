import {
  Controller,
  Get,
  Post,
  Put,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { StoreService } from '../store.service';
import { CreateStoreItemDto } from '../dto/create-store-item.dto';
import { UpdateStoreItemDto } from '../dto/update-store-item.dto';
import { GrantInventoryItemDto } from '../dto/grant-inventory-item.dto';
import {
  QueryStoreCatalogDto,
  QueryUserInventoryDto,
} from '../dto/query-store.dto';

@ApiTags('Phase 29 Admin Store & Mall Management')
@Controller('api/v1/admin/store')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminStoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('items')
  @ApiOperation({ summary: 'Admin: List store items' })
  @ApiResponse({ status: 200, description: 'Store catalog' })
  async listItems(@Query() query: QueryStoreCatalogDto) {
    return this.storeService.getCatalog(query);
  }

  @Post('items')
  @ApiOperation({ summary: 'Admin: Create new store decor item' })
  @ApiResponse({ status: 201, description: 'Item created successfully' })
  async createItem(@Body() dto: CreateStoreItemDto) {
    return this.storeService.createStoreItem(dto);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Admin: Update store decor item' })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  async updateItem(@Param('id') id: string, @Body() dto: UpdateStoreItemDto) {
    return this.storeService.updateStoreItem(id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Admin: Deactivate store item' })
  @ApiResponse({ status: 200, description: 'Item deactivated successfully' })
  async deleteItem(@Param('id') id: string) {
    return this.storeService.deleteStoreItem(id);
  }

  @Post('grant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: Grant inventory decor item manually to user',
  })
  @ApiResponse({ status: 200, description: 'Item granted to user' })
  async grantItem(@Body() dto: GrantInventoryItemDto) {
    return this.storeService.grantInventoryItem(dto);
  }

  @Get('inventory/:userId')
  @ApiOperation({ summary: 'Admin: Inspect user inventory' })
  @ApiResponse({ status: 200, description: 'User inventory list' })
  async getUserInventory(
    @Param('userId') userId: string,
    @Query() query: QueryUserInventoryDto,
  ) {
    return this.storeService.getUserInventory(userId, query);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Admin: Get store sales and revenue analytics' })
  @ApiResponse({ status: 200, description: 'Store analytics overview' })
  async getAnalytics() {
    return this.storeService.getStoreAnalytics();
  }
}
