import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
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
import { PurchaseStoreItemDto } from '../dto/purchase-item.dto';
import { GiftStoreItemDto } from '../dto/gift-item.dto';
import { EquipStoreItemDto, UnequipStoreItemDto } from '../dto/equip-item.dto';
import {
  QueryStoreCatalogDto,
  QueryUserInventoryDto,
} from '../dto/query-store.dto';

@ApiTags('Store & Personalization Mall')
@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('catalog')
  @ApiOperation({
    summary: 'Browse store catalog with category and rarity filters',
  })
  @ApiResponse({ status: 200, description: 'List of store catalog items' })
  async getCatalog(@Query() query: QueryStoreCatalogDto) {
    return this.storeService.getCatalog(query);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get store item detail by ID' })
  @ApiResponse({ status: 200, description: 'Store item details' })
  async getItemDetail(@Param('id') id: string) {
    return this.storeService.getItemById(id);
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase store item for self' })
  @ApiResponse({
    status: 200,
    description: 'Item purchased and added to inventory',
  })
  async purchaseItem(@Request() req: any, @Body() dto: PurchaseStoreItemDto) {
    const userId = req.user?.id || req.user?.userId;
    return this.storeService.purchaseItem(userId, dto);
  }

  @Post('gift')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purchase and gift store item to another user' })
  @ApiResponse({
    status: 200,
    description: 'Item purchased and gifted to target user',
  })
  async giftItem(@Request() req: any, @Body() dto: GiftStoreItemDto) {
    const senderId = req.user?.id || req.user?.userId;
    return this.storeService.giftItem(senderId, dto);
  }

  @Get('inventory')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View user owned inventory items' })
  @ApiResponse({ status: 200, description: 'User inventory list' })
  async getUserInventory(
    @Request() req: any,
    @Query() query: QueryUserInventoryDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.storeService.getUserInventory(userId, query);
  }

  @Get('inventory/equipped')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View user currently equipped store decor items' })
  @ApiResponse({ status: 200, description: 'Equipped decor items by category' })
  async getUserEquippedItems(@Request() req: any) {
    const userId = req.user?.id || req.user?.userId;
    return this.storeService.getUserEquippedItems(userId);
  }

  @Post('equip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Equip an inventory decor item' })
  @ApiResponse({ status: 200, description: 'Item equipped successfully' })
  async equipItem(@Request() req: any, @Body() dto: EquipStoreItemDto) {
    const userId = req.user?.id || req.user?.userId;
    return this.storeService.equipItem(userId, dto.inventoryId);
  }

  @Post('unequip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unequip an inventory decor item' })
  @ApiResponse({ status: 200, description: 'Item unequipped successfully' })
  async unequipItem(@Request() req: any, @Body() dto: UnequipStoreItemDto) {
    const userId = req.user?.id || req.user?.userId;
    return this.storeService.unequipItem(userId, dto.inventoryId);
  }
}
