import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SendMultiRecipientGiftDto } from './dto/multi-gift.dto';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';

@Injectable()
export class MultiGiftingService {
  private readonly REVENUE_SHARE_PERCENT = 0.7; // 70% to creator/speaker in diamonds

  constructor(
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async sendMultiRecipientGift(
    senderId: string,
    dto: SendMultiRecipientGiftDto,
  ) {
    const {
      targetUserIds,
      roomId,
      giftId,
      quantity = 1,
      pricePerUnit = 100,
    } = dto;

    if (!targetUserIds || targetUserIds.length === 0) {
      throw new BadRequestException(
        'At least one recipient target user ID must be specified',
      );
    }

    const recipientCount = targetUserIds.length;
    const totalUnits = quantity * recipientCount;
    const totalCoinsRequired = pricePerUnit * totalUnits;

    // Check sender wallet balance from Redis or DB
    const senderBalanceRaw = await this.redisService.get(
      `wallet:${senderId}:coins`,
    );
    const senderCoins = senderBalanceRaw
      ? parseInt(senderBalanceRaw, 10)
      : 10000; // Default simulated balance if new

    if (senderCoins < totalCoinsRequired) {
      throw new BadRequestException(
        `Insufficient coin balance. Required: ${totalCoinsRequired}, Available: ${senderCoins}`,
      );
    }

    // Deduct coins from sender
    const newSenderCoins = senderCoins - totalCoinsRequired;
    await this.redisService.set(
      `wallet:${senderId}:coins`,
      newSenderCoins.toString(),
    );

    // Calculate diamond allocation per recipient
    const totalDiamondsGenerated = Math.floor(
      totalCoinsRequired * this.REVENUE_SHARE_PERCENT,
    );
    const diamondsPerRecipient = Math.floor(
      totalDiamondsGenerated / recipientCount,
    );

    const recipientAllocations: { userId: string; diamondsEarned: number }[] =
      [];

    for (const recipientId of targetUserIds) {
      const currentDiamondsRaw = await this.redisService.get(
        `wallet:${recipientId}:diamonds`,
      );
      const currentDiamonds = currentDiamondsRaw
        ? parseInt(currentDiamondsRaw, 10)
        : 0;
      const newDiamonds = currentDiamonds + diamondsPerRecipient;

      await this.redisService.set(
        `wallet:${recipientId}:diamonds`,
        newDiamonds.toString(),
      );
      recipientAllocations.push({
        userId: recipientId,
        diamondsEarned: diamondsPerRecipient,
      });
    }

    // Record multi-gift transaction batch in Redis
    const txId = `mgift_${Date.now()}_${senderId.substring(0, 8)}`;
    const txData = {
      txId,
      senderId,
      roomId,
      giftId,
      quantityPerRecipient: quantity,
      pricePerUnit,
      recipientCount,
      totalCoinsDeducted: totalCoinsRequired,
      recipientAllocations,
      timestamp: new Date().toISOString(),
    };

    await this.redisService.set(
      `tx:multigift:${txId}`,
      JSON.stringify(txData),
      86400 * 7,
    );

    // Track combo streak in Redis
    const comboKey = `combo:${roomId}:${senderId}:${giftId}`;
    const currentComboRaw = await this.redisService.get(comboKey);
    const currentCombo = currentComboRaw ? parseInt(currentComboRaw, 10) : 0;
    const newCombo = currentCombo + totalUnits;
    await this.redisService.set(comboKey, newCombo.toString(), 15); // 15 second streak window

    // Emit real-time multi-gift event to room
    const broadcastPayload = {
      type: 'MULTI_GIFT_BLAST',
      txId,
      senderId,
      roomId,
      giftId,
      quantityPerRecipient: quantity,
      recipients: targetUserIds,
      totalCoins: totalCoinsRequired,
      comboCount: newCombo,
      timestamp: new Date().toISOString(),
    };

    this.eventsGateway.server
      .to(`room:${roomId}`)
      .emit('room_multi_gift_blast', broadcastPayload);

    return {
      success: true,
      message: `Multi-recipient gift sent to ${recipientCount} recipients successfully`,
      data: {
        txId,
        totalCoinsDeducted: totalCoinsRequired,
        remainingSenderCoins: newSenderCoins,
        diamondsPerRecipient,
        comboCount: newCombo,
        recipients: recipientAllocations,
      },
    };
  }
}
