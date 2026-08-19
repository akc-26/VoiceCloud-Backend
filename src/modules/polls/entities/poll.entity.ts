import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PollOption } from './poll-option.entity';
import { PollVote } from './poll-vote.entity';

export enum PollType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

export enum PollStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  STOPPED = 'stopped',
}

@Entity('polls')
export class Poll {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  roomId: string;

  @Index()
  @Column({ type: 'varchar' })
  creatorId: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({
    type: 'enum',
    enum: PollType,
    default: PollType.SINGLE,
  })
  pollType: PollType;

  @Column({
    type: 'enum',
    enum: PollStatus,
    default: PollStatus.ACTIVE,
  })
  status: PollStatus;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @OneToMany(() => PollOption, (option) => option.poll, { cascade: true })
  options: PollOption[];

  @OneToMany(() => PollVote, (vote) => vote.poll)
  votes: PollVote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
