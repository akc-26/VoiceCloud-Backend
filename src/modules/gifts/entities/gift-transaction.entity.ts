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

  @Column({ type: 'varchar' })
  giftId: string;

  @Column({ type: 'varchar', nullable: true })
  roomId: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int' })
  totalCoins: number;

  @CreateDateColumn()
  createdAt: Date;
}
