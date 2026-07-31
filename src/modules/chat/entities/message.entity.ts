import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { MessageReaction } from './message-reaction.entity';
import { MessageReport } from './message-report.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  DOCUMENT = 'document',
  GIF = 'gif',
  STICKER = 'sticker',
  VOICE_NOTE = 'voice_note',
  ANNOUNCEMENT = 'announcement',
}

export enum DeliveryStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

export interface MessageAttachment {
  url: string;
  type: string;
  name?: string;
  size?: number;
  mimeType?: string;
  duration?: number;
  waveform?: number[];
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  conversationId: string;

  @Column()
  @Index()
  senderId: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: MessageAttachment[];

  @Column({ nullable: true })
  replyToId: string;

  @Column({ nullable: true })
  forwardedFromId: string;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  editedAt: Date;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.SENT,
  })
  deliveryStatus: DeliveryStatus;

  @CreateDateColumn()
  @Index('IDX_messages_createdAt')
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @OneToMany(() => MessageReaction, (reaction) => reaction.message, {
    cascade: true,
  })
  reactions: MessageReaction[];

  @OneToMany(() => MessageReport, (report) => report.message)
  reports: MessageReport[];
}
