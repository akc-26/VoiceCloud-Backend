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

  @Index('UQ_gift_transactions_operationKey', {
    unique: true,
    where: '"operationKey" IS NOT NULL',
  })
  @Column({ type: 'varchar', nullable: true })
  operationKey: string | null;

  @Index('IDX_gift_transactions_operationGroupId')
  @Column({ type: 'varchar', nullable: true })
  operationGroupId: string | null;

  @Column({ type: 'uuid', nullable: true })
  senderWalletTransactionId: string | null;

  @Column({ type: 'uuid', nullable: true })
  receiverWalletTransactionId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
