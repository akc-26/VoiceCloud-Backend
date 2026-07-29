import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('vip_benefits')
export class VipBenefit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  key: string; // e.g. animated_profile_frame, exclusive_badge, entrance_effect, priority_room_entry, higher_gifting_limit, exclusive_gifts, vip_chat_bubble, vip_name_color, additional_friend_limit, additional_room_limit, exclusive_emojis, exclusive_stickers

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ type: 'varchar', default: 'general' })
  category: string; // visual, privilege, limit, chat, badge

  @Column({ type: 'varchar', nullable: true })
  iconUrl: string;

  @Column({ type: 'int', default: 1 })
  minVipLevel: number; // minimum VIP level required (1..10)

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>; // configuration details (e.g. frame asset url, limit values)

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
