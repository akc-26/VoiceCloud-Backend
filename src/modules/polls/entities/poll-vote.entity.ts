import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Poll } from './poll.entity';
import { PollOption } from './poll-option.entity';

@Entity('poll_votes')
@Unique(['pollId', 'userId', 'optionId'])
export class PollVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  pollId: string;

  @Index()
  @Column({ type: 'varchar' })
  optionId: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => Poll, (poll) => poll.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pollId' })
  poll: Poll;

  @ManyToOne(() => PollOption, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'optionId' })
  option: PollOption;

  @CreateDateColumn()
  createdAt: Date;
}
