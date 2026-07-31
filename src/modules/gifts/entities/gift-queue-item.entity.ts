import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('gift_queue_items')
export class GiftQueueItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  roomId: string;

  @Column({ type: 'varchar' })
  senderId: string;

  @Column({ type: 'varchar' })
  receiverId: string;

  @Column({ type: 'varchar' })
  giftId: string;

  @Column({ type: 'varchar', nullable: true })
  giftName: string;

  @Column({ type: 'varchar', nullable: true })
  animationUrl: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', default: 'queued' })
  status: string; // 'queued', 'playing', 'completed', 'cancelled'

  @Column({ type: 'int', default: 0 })
  priority: number; // e.g. 0 standard, 10 VIP, 50 Fullscreen, 100 Room-wide

  @Column({ type: 'boolean', default: false })
  isFullscreen: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;
}
