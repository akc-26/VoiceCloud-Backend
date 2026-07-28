import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { ConversationMember } from './conversation-member.entity';
import { Message } from './message.entity';

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
  ROOM = 'room',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  roomId: string;

  @Column({ nullable: true })
  createdById: string;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ nullable: true })
  lastMessageId: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => ConversationMember, (member) => member.conversation, {
    cascade: true,
  })
  members: ConversationMember[];

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}
