import {
  Controller,
  Post,
  Get,
  Param,
  Body,
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
import { MultiGiftingService } from './multi-gifting.service';
import { LuckyBoxService } from './lucky-box.service';
import { SendMultiRecipientGiftDto } from './dto/multi-gift.dto';
import { OpenLuckyBoxDto } from './dto/lucky-box.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Gamified & Multi Gifting')
@Controller('gifts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GiftsPhase18Controller {
  constructor(
    private readonly multiGiftingService: MultiGiftingService,
    private readonly luckyBoxService: LuckyBoxService,
  ) {}

  @Post('multi-send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send gift to multiple target recipients simultaneously in a room',
  })
  @ApiResponse({
    status: 200,
    description: 'Multi-recipient gift sent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient coin balance or invalid target recipients',
  })
  async sendMultiGift(
    @CurrentUser('userId') senderId: string,
    @Body() dto: SendMultiRecipientGiftDto,
  ) {
    return this.multiGiftingService.sendMultiRecipientGift(senderId, dto);
  }

  @Post('lucky-box/open')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Open mystery lucky box for gamified rewards & coin cashback',
  })
  @ApiResponse({ status: 200, description: 'Lucky box opened successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient coin balance' })
  async openLuckyBox(
    @CurrentUser('userId') userId: string,
    @Body() dto: OpenLuckyBoxDto,
  ) {
    return this.luckyBoxService.openLuckyBox(userId, dto);
  }
}
