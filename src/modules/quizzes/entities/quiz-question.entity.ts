import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Quiz } from './quiz.entity';

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  quizId: string;

  @Column({ type: 'int', default: 1 })
  roundNumber: number;

  @Column({ type: 'text' })
  questionText: string;

  @Column({ type: 'json' })
  options: string[];

  @Column({ type: 'int' })
  correctOptionIndex: number;

  @Column({ type: 'int', default: 30 })
  durationSeconds: number;

  @Column({ type: 'int', default: 100 })
  points: number;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @CreateDateColumn()
  createdAt: Date;
}
