import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventsGateway } from '../../common/events/events.gateway';
import { SendMultiRecipientGiftDto } from './dto/multi-gift.dto';
import { GiftingEngineService } from './gifting-engine.service';

@Injectable()
export class MultiGiftingService {
  private readonly logger = new Logger(MultiGiftingService.name);

  constructor(
    private readonly giftingEngineService: GiftingEngineService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async sendMultiRecipientGift(
    senderId: string,
    dto: SendMultiRecipientGiftDto,
  ) {
    if (!dto.targetUserIds || dto.targetUserIds.length === 0) {
      throw new BadRequestException(
        'At least one recipient target user ID must be specified',
      );
    }

    const result = await this.giftingEngineService.sendGift(senderId, {
      giftId: dto.giftId,
      receiverIds: dto.targetUserIds,
      roomId: dto.roomId,
      quantity: dto.quantity || 1,
      context: 'room',
      operationKey: dto.operationKey,
    });

    if (!result.data.idempotent) {
      this.broadcastLegacyMultiGift(senderId, dto, result.data);
    }

    return {
      success: result.success,
      message: result.message,
      data: {
        txId: result.data.operationGroupId,
        totalCoinsDeducted: result.data.totalCoinsDeducted,
        remainingSenderCoins: result.data.remainingSenderCoins,
        diamondsPerRecipient: result.data.transactions[0]?.creatorEarnings || 0,
        comboCount: result.data.comboCount,
        recipients: result.data.transactions.map((transaction) => ({
          userId: transaction.receiverId,
          diamondsEarned: transaction.creatorEarnings,
        })),
        idempotent: result.data.idempotent,
      },
    };
  }

  private broadcastLegacyMultiGift(
    senderId: string,
    dto: SendMultiRecipientGiftDto,
    data: {
      operationGroupId: string;
      totalCoinsDeducted: number;
      comboCount: number;
    },
  ): void {
    try {
      this.eventsGateway.server
        .to(`room:${dto.roomId}`)
        .emit('room_multi_gift_blast', {
          type: 'MULTI_GIFT_BLAST',
          txId: data.operationGroupId,
          senderId,
          roomId: dto.roomId,
          giftId: dto.giftId,
          quantityPerRecipient: dto.quantity || 1,
          recipients: dto.targetUserIds,
          totalCoins: data.totalCoinsDeducted,
          comboCount: data.comboCount,
          timestamp: new Date().toISOString(),
        });
    } catch (error) {
      this.logger.warn(
        `Legacy multi-gift presentation failed after committed settlement ${data.operationGroupId}: ${this.errorMessage(error)}`,
      );
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
