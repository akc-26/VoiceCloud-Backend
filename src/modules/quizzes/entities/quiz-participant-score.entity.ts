import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  UpdateDateColumn,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Quiz } from './quiz.entity';

@Entity('quiz_participant_scores')
@Unique(['quizId', 'userId'])
export class QuizParticipantScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  quizId: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  username: string;

  @Column({ type: 'int', default: 0 })
  totalScore: number;

  @Column({ type: 'int', default: 0 })
  rank: number;

  @Column({ type: 'int', default: 0 })
  correctAnswersCount: number;

  @ManyToOne(() => Quiz, (quiz) => quiz.scores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @UpdateDateColumn()
  updatedAt: Date;
}
