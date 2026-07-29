import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('gift_transactions')
export class GiftTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  senderId: string;

  @Index()
  @Column({ type: 'varchar' })
  receiverId: string;

  @Index()
  @Column({ type: 'varchar' })
  giftId: string;

  @Column({ type: 'varchar', nullable: true })
  giftName: string;

  @Column({ type: 'varchar', nullable: true })
  giftCategory: string;

  @Column({ type: 'varchar', default: 'room' })
  context: string; // 'room', 'private', 'group', 'event'

  @Index()
  @Column({ type: 'varchar', nullable: true })
  roomId: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int' })
  totalCoins: number;

  @Column({ type: 'int', default: 1 })
  comboCount: number;

  @Column({ type: 'float', default: 1.0 })
  multiplier: number;

  @Column({ type: 'float', default: 0 })
  creatorEarnings: number;

  @Column({ type: 'float', default: 0 })
  agencyEarnings: number;

  @CreateDateColumn()
  createdAt: Date;
}
