import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar' })
  hostId: string;

  @Column({ type: 'varchar', nullable: true })
  coverUrl: string;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ type: 'boolean', default: true })
  isLive: boolean;

  @Column({ type: 'varchar', default: 'en' })
  language: string;

  @Column({ type: 'varchar', default: 'General' })
  category: string;

  @Column({ type: 'int', default: 0 })
  listenerCount: number;

  @Column({ type: 'int', default: 0 })
  speakerCount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  giftActivity: number;

  @Column({ type: 'int', default: 0 })
  popularityScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
