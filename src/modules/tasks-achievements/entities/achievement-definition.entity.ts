import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AchievementRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  MYTHIC = 'mythic',
}

@Entity('achievement_definitions')
export class AchievementDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AchievementRarity,
    default: AchievementRarity.COMMON,
  })
  rarity: AchievementRarity;

  @Column({ default: 'badge_default' })
  badge: string;

  @Column({ default: 'icon_default' })
  icon: string;

  @Column({ default: 'frame_default' })
  frame: string;

  @Column()
  eventKey: string;

  @Column({ type: 'int', default: 1 })
  targetCount: number;

  @Column({ type: 'int', default: 0 })
  xpBonus: number;

  @Column({ type: 'int', default: 0 })
  coinReward: number;

  @Column({ type: 'int', default: 0 })
  diamondReward: number;

  @Column({ nullable: true })
  rewardProfileFrame: string;

  @Column({ nullable: true })
  rewardChatBubble: string;

  @Column({ nullable: true })
  rewardEntranceEffect: string;

  @Column({ nullable: true })
  rewardSticker: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
