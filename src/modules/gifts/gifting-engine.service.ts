import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsGateway } from '../../common/events/events.gateway';
import { RedisService } from '../../redis/redis.service';
import {
  SendComboDto,
  SendGiftDto,
  SendMultiGiftPhase22Dto,
} from './dto/send-gift-phase22.dto';
import { GiftQueueItem } from './entities/gift-queue-item.entity';
import { GiftTransaction } from './entities/gift-transaction.entity';
import {
  GiftSettlementResult,
  GiftSettlementService,
} from './gift-settlement.service';

@Injectable()
export class GiftingEngineService {
  private readonly logger = new Logger(GiftingEngineService.name);

  constructor(
    @InjectRepository(GiftTransaction)
    private readonly transactionRepository: Repository<GiftTransaction>,
    @InjectRepository(GiftQueueItem)
    private readonly queueRepository: Repository<GiftQueueItem>,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
    private readonly giftSettlementService: GiftSettlementService,
  ) {}

  async sendGift(senderId: string, dto: SendGiftDto) {
    const {
      giftId,
      context = 'room',
      roomId,
      quantity = 1,
      operationKey,
    } = dto;

    const receiverIds = this.normalizeReceivers(dto);
    const expectedRecipientCount = Math.max(receiverIds.length, 1);
    const totalUnits = quantity * expectedRecipientCount;
    const combo = await this.readComboState(
      roomId,
      senderId,
      giftId,
      totalUnits,
    );

    const settlement = await this.giftSettlementService.settle({
      senderId,
      giftId,
      receiverIds,
      context,
      roomId,
      quantity,
      comboCount: combo.count,
      multiplier: combo.multiplier,
      operationKey,
    });

    let queueItem: GiftQueueItem | null = null;
    if (!settlement.idempotent) {
      await this.persistComboState(
        roomId,
        senderId,
        giftId,
        settlement.comboCount,
      );
      queueItem = await this.enqueueAnimation(settlement, senderId, roomId);
      this.broadcastSettlement(
        settlement,
        senderId,
        context,
        roomId,
        combo.wasNew,
      );
    }

    return {
      success: true,
      message: `Successfully sent '${settlement.gift.name}' to ${settlement.receiverIds.length} recipient(s)`,
      data: {
        gift: settlement.gift,
        operationGroupId: settlement.operationGroupId,
        totalCoinsDeducted: settlement.totalCoinsDeducted,
        remainingSenderCoins: settlement.remainingSenderCoins,
        comboCount: settlement.comboCount,
        multiplier: settlement.multiplier,
        recipients: settlement.receiverIds,
        transactions: settlement.transactions,
        queueItem,
        idempotent: settlement.idempotent,
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
      operationKey: dto.operationKey,
    });
  }

  async sendMultiGift(senderId: string, dto: SendMultiGiftPhase22Dto) {
    return this.sendGift(senderId, {
      giftId: dto.giftId,
      receiverIds: dto.targetUserIds,
      roomId: dto.roomId,
      quantity: dto.quantity || 1,
      context: 'room',
      operationKey: dto.operationKey,
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

  private normalizeReceivers(dto: SendGiftDto): string[] {
    const receivers: string[] = [];
    if (dto.receiverId?.trim()) receivers.push(dto.receiverId.trim());
    for (const receiverId of dto.receiverIds || []) {
      const normalized = receiverId.trim();
      if (normalized && !receivers.includes(normalized)) {
        receivers.push(normalized);
      }
    }
    return receivers;
  }

  private async readComboState(
    roomId: string | undefined,
    senderId: string,
    giftId: string,
    totalUnits: number,
  ): Promise<{ count: number; multiplier: number; wasNew: boolean }> {
    const comboKey = `combo:${roomId || 'global'}:${senderId}:${giftId}`;
    let previousCount = 0;

    try {
      const currentComboRaw = await this.redisService.get(comboKey);
      previousCount = currentComboRaw ? parseInt(currentComboRaw, 10) : 0;
      if (!Number.isFinite(previousCount) || previousCount < 0) {
        previousCount = 0;
      }
    } catch (error) {
      this.logger.warn(
        `Gift combo cache read failed; continuing without cached combo state: ${this.errorMessage(error)}`,
      );
    }

    const count = previousCount + totalUnits;
    let multiplier = 1;
    if (count >= 21) multiplier = 2;
    else if (count >= 11) multiplier = 1.5;
    else if (count >= 6) multiplier = 1.2;

    return { count, multiplier, wasNew: previousCount === 0 };
  }

  private async persistComboState(
    roomId: string | undefined,
    senderId: string,
    giftId: string,
    comboCount: number,
  ): Promise<void> {
    const comboKey = `combo:${roomId || 'global'}:${senderId}:${giftId}`;
    try {
      await this.redisService.set(comboKey, comboCount.toString(), 10);
    } catch (error) {
      this.logger.warn(
        `Gift combo cache update failed after committed settlement: ${this.errorMessage(error)}`,
      );
    }
  }

  private async enqueueAnimation(
    settlement: GiftSettlementResult,
    senderId: string,
    roomId?: string,
  ): Promise<GiftQueueItem | null> {
    if (!roomId) return null;

    const gift = settlement.gift;
    const isFullscreen =
      gift.type === 'svga' || gift.type === 'video' || gift.coinPrice >= 1000;
    const priority = isFullscreen ? 50 : 0;
    const quantity = settlement.transactions.reduce(
      (total, transaction) => total + transaction.quantity,
      0,
    );

    try {
      let queueItem = this.queueRepository.create({
        roomId,
        senderId,
        receiverId: settlement.receiverIds[0],
        giftId: gift.id,
        giftName: gift.name,
        animationUrl: gift.animationUrl || gift.iconUrl || '',
        quantity,
        status: 'queued',
        priority,
        isFullscreen,
      });
      queueItem = await this.queueRepository.save(queueItem);
      return queueItem;
    } catch (error) {
      this.logger.warn(
        `Gift animation queue failed after committed settlement ${settlement.operationGroupId}: ${this.errorMessage(error)}`,
      );
      return null;
    }
  }

  private broadcastSettlement(
    settlement: GiftSettlementResult,
    senderId: string,
    context: string,
    roomId: string | undefined,
    comboWasNew: boolean,
  ): void {
    const gift = settlement.gift;
    const isFullscreen =
      gift.type === 'svga' || gift.type === 'video' || gift.coinPrice >= 1000;
    const totalQuantity = settlement.transactions.reduce(
      (total, transaction) => total + transaction.quantity,
      0,
    );
    const eventPayload = {
      type: 'GIFT_SENT',
      txIds: settlement.transactions.map((transaction) => transaction.id),
      operationGroupId: settlement.operationGroupId,
      senderId,
      receivers: settlement.receiverIds,
      giftId: gift.id,
      giftName: gift.name,
      giftType: gift.type,
      rarity: gift.rarity,
      quantity: totalQuantity,
      totalCoins: settlement.totalCoinsDeducted,
      comboCount: settlement.comboCount,
      multiplier: settlement.multiplier,
      context,
      roomId,
      animationUrl: gift.animationUrl || gift.iconUrl,
      isFullscreen,
      timestamp: new Date().toISOString(),
    };

    try {
      this.eventsGateway.broadcastGiftSent(eventPayload, roomId);
      if (comboWasNew) {
        this.eventsGateway.broadcastComboStarted(
          {
            senderId,
            giftId: gift.id,
            comboCount: settlement.comboCount,
            roomId,
          },
          roomId,
        );
      } else {
        this.eventsGateway.broadcastComboUpdated(
          {
            senderId,
            giftId: gift.id,
            comboCount: settlement.comboCount,
            multiplier: settlement.multiplier,
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
    } catch (error) {
      this.logger.warn(
        `Gift realtime presentation failed after committed settlement ${settlement.operationGroupId}: ${this.errorMessage(error)}`,
      );
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
