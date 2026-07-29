import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gift } from './entities/gift.entity';
import { GiftTransaction } from './entities/gift-transaction.entity';
import { GiftQueueItem } from './entities/gift-queue-item.entity';
import {
  SendGiftDto,
  SendComboDto,
  SendMultiGiftPhase22Dto,
} from './dto/send-gift-phase22.dto';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';

@Injectable()
export class GiftingEngineService {
  private readonly logger = new Logger(GiftingEngineService.name);

  constructor(
    @InjectRepository(Gift)
    private readonly giftRepository: Repository<Gift>,
    @InjectRepository(GiftTransaction)
    private readonly transactionRepository: Repository<GiftTransaction>,
    @InjectRepository(GiftQueueItem)
    private readonly queueRepository: Repository<GiftQueueItem>,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async sendGift(senderId: string, dto: SendGiftDto) {
    const {
      giftId,
      context = 'room',
      roomId,
      quantity = 1,
      comboStep = 1,
    } = dto;

    const gift = await this.giftRepository.findOne({ where: { id: giftId } });
    if (!gift)
      throw new NotFoundException(`Gift with ID '${giftId}' not found`);

    if (!gift.isActive || gift.isArchived) {
      throw new BadRequestException(
        `Gift '${gift.name}' is currently unavailable`,
      );
    }

    // Determine target receivers
    const receivers: string[] = [];
    if (dto.receiverId) receivers.push(dto.receiverId);
    if (dto.receiverIds && dto.receiverIds.length > 0) {
      for (const rId of dto.receiverIds) {
        if (!receivers.includes(rId)) receivers.push(rId);
      }
    }
    if (receivers.length === 0) {
      receivers.push('host_placeholder');
    }

    const recipientCount = receivers.length;
    const totalUnits = quantity * recipientCount;
    const totalCoinsRequired = gift.coinPrice * totalUnits;

    // Check limited stock
    if (gift.isLimitedEdition && gift.remainingStock !== null) {
      if (gift.remainingStock < totalUnits) {
        throw new BadRequestException(
          `Insufficient stock for '${gift.name}'. Requested: ${totalUnits}, Remaining: ${gift.remainingStock}`,
        );
      }
    }

    // Check sender wallet coins
    const senderCoinsRaw = await this.redisService.get(
      `wallet:${senderId}:coins`,
    );
    const senderCoins = senderCoinsRaw ? parseInt(senderCoinsRaw, 10) : 10000;

    if (senderCoins < totalCoinsRequired) {
      throw new BadRequestException(
        `Insufficient coin balance. Required: ${totalCoinsRequired}, Available: ${senderCoins}`,
      );
    }

    // Deduct coins
    const newSenderCoins = senderCoins - totalCoinsRequired;
    await this.redisService.set(
      `wallet:${senderId}:coins`,
      newSenderCoins.toString(),
    );

    // Deduct stock if limited
    if (gift.isLimitedEdition && gift.remainingStock !== null) {
      gift.remainingStock = Math.max(0, gift.remainingStock - totalUnits);
      await this.giftRepository.save(gift);
    }

    // Calculate Combo
    const comboKey = `combo:${roomId || 'global'}:${senderId}:${giftId}`;
    const currentComboRaw = await this.redisService.get(comboKey);
    const prevCombo = currentComboRaw ? parseInt(currentComboRaw, 10) : 0;
    const newComboCount = prevCombo + totalUnits;
    await this.redisService.set(comboKey, newComboCount.toString(), 10); // 10s combo window

    // Combo Multiplier
    let comboMultiplier = 1.0;
    if (newComboCount >= 21) comboMultiplier = 2.0;
    else if (newComboCount >= 11) comboMultiplier = 1.5;
    else if (newComboCount >= 6) comboMultiplier = 1.2;

    // Calculate earnings
    const creatorEarningsPct = gift.creatorEarningsPercentage || 70.0;
    const agencyEarningsPct = gift.agencyEarningsPercentage || 10.0;
    const totalDiamonds = Math.floor(
      totalCoinsRequired * (creatorEarningsPct / 100) * comboMultiplier,
    );
    const diamondsPerReceiver = Math.floor(totalDiamonds / recipientCount);

    // Save transactions & credit receivers
    const transactions: GiftTransaction[] = [];
    for (const rId of receivers) {
      // Credit receiver diamonds
      const receiverDiamondsRaw = await this.redisService.get(
        `wallet:${rId}:diamonds`,
      );
      const currentDiamonds = receiverDiamondsRaw
        ? parseInt(receiverDiamondsRaw, 10)
        : 0;
      await this.redisService.set(
        `wallet:${rId}:diamonds`,
        (currentDiamonds + diamondsPerReceiver).toString(),
      );

      const tx = this.transactionRepository.create({
        senderId,
        receiverId: rId,
        giftId: gift.id,
        giftName: gift.name,
        giftCategory: gift.category,
        context,
        roomId: roomId || null,
        quantity,
        totalCoins: gift.coinPrice * quantity,
        comboCount: newComboCount,
        multiplier: comboMultiplier,
        creatorEarnings: diamondsPerReceiver,
        agencyEarnings: gift.coinPrice * quantity * (agencyEarningsPct / 100),
      });
      transactions.push(await this.transactionRepository.save(tx));
    }

    // Queue Animation
    let queueItem: GiftQueueItem | null = null;
    const isFullscreen =
      gift.type === 'svga' || gift.type === 'video' || gift.coinPrice >= 1000;
    const priority = isFullscreen ? 50 : 0;

    if (roomId) {
      queueItem = this.queueRepository.create({
        roomId,
        senderId,
        receiverId: receivers[0],
        giftId: gift.id,
        giftName: gift.name,
        animationUrl: gift.animationUrl || gift.iconUrl || '',
        quantity: totalUnits,
        status: 'queued',
        priority,
        isFullscreen,
      });
      queueItem = await this.queueRepository.save(queueItem);
    }

    // Broadcast WebSocket Events
    const eventPayload = {
      type: 'GIFT_SENT',
      txIds: transactions.map((t) => t.id),
      senderId,
      receivers,
      giftId: gift.id,
      giftName: gift.name,
      giftType: gift.type,
      rarity: gift.rarity,
      quantity: totalUnits,
      totalCoins: totalCoinsRequired,
      comboCount: newComboCount,
      multiplier: comboMultiplier,
      context,
      roomId,
      animationUrl: gift.animationUrl || gift.iconUrl,
      isFullscreen,
      timestamp: new Date().toISOString(),
    };

    this.eventsGateway.broadcastGiftSent(eventPayload, roomId);

    if (prevCombo === 0) {
      this.eventsGateway.broadcastComboStarted(
        { senderId, giftId: gift.id, comboCount: newComboCount, roomId },
        roomId,
      );
    } else {
      this.eventsGateway.broadcastComboUpdated(
        {
          senderId,
          giftId: gift.id,
          comboCount: newComboCount,
          multiplier: comboMultiplier,
          roomId,
        },
        roomId,
      );
    }

    if (isFullscreen) {
      this.eventsGateway.broadcastFullscreenGift(eventPayload, roomId);
    } else if (roomId) {
      this.eventsGateway.broadcastRoomGiftAnimation(eventPayload, roomId);
    }

    return {
      success: true,
      message: `Successfully sent '${gift.name}' to ${recipientCount} recipient(s)`,
      data: {
        gift,
        totalCoinsDeducted: totalCoinsRequired,
        remainingSenderCoins: newSenderCoins,
        comboCount: newComboCount,
        multiplier: comboMultiplier,
        recipients: receivers,
        transactions,
        queueItem,
      },
    };
  }

  async sendCombo(senderId: string, dto: SendComboDto) {
    return this.sendGift(senderId, {
      giftId: dto.giftId,
      receiverId: dto.receiverId,
      roomId: dto.roomId,
      quantity: dto.count || 1,
      context: 'room',
    });
  }

  async sendMultiGift(senderId: string, dto: SendMultiGiftPhase22Dto) {
    return this.sendGift(senderId, {
      giftId: dto.giftId,
      receiverIds: dto.targetUserIds,
      roomId: dto.roomId,
      quantity: dto.quantity || 1,
      context: 'room',
    });
  }

  async getGiftQueue(roomId: string): Promise<GiftQueueItem[]> {
    return this.queueRepository.find({
      where: { roomId, status: 'queued' },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  async cancelQueuedGift(
    userId: string,
    queueId: string,
  ): Promise<{ success: boolean; message: string }> {
    const item = await this.queueRepository.findOne({ where: { id: queueId } });
    if (!item) throw new NotFoundException('Queued gift not found');

    if (item.senderId !== userId) {
      throw new BadRequestException('You can only cancel your own queued gift');
    }

    if (item.status !== 'queued') {
      throw new BadRequestException(
        `Cannot cancel gift in status '${item.status}'`,
      );
    }

    item.status = 'cancelled';
    item.cancelledAt = new Date();
    await this.queueRepository.save(item);

    return { success: true, message: 'Queued gift cancelled successfully' };
  }

  async getGiftHistory(
    userId: string,
    options: { role?: 'sender' | 'receiver'; limit?: number } = {},
  ): Promise<GiftTransaction[]> {
    const role = options.role || 'sender';
    const limit = options.limit || 50;

    const where =
      role === 'sender' ? { senderId: userId } : { receiverId: userId };
    return this.transactionRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
