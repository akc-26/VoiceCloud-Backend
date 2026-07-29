import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Poll } from './poll.entity';

@Entity('poll_options')
export class PollOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  pollId: string;

  @Column({ type: 'varchar' })
  text: string;

  @Column({ type: 'int', default: 0 })
  voteCount: number;

  @ManyToOne(() => Poll, (poll) => poll.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pollId' })
  poll: Poll;

  @CreateDateColumn()
  createdAt: Date;
}
