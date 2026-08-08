import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('lucky_box_openings')
export class LuckyBoxOpening {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('UQ_lucky_box_openings_operationKey', { unique: true })
  @Column({ type: 'varchar' })
  operationKey: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar' })
  tier: string;

  @Column({ type: 'int' })
  count: number;

  @Column({ type: 'varchar', nullable: true })
  roomId: string | null;

  @Column({ type: 'bigint' })
  totalCost: number;

  @Column({ type: 'bigint', default: 0 })
  cashbackCoins: number;

  @Column({ type: 'uuid' })
  debitWalletTransactionId: string;

  @Column({ type: 'uuid', nullable: true })
  cashbackWalletTransactionId: string | null;

  @Column({ type: 'jsonb' })
  resultPayload: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
