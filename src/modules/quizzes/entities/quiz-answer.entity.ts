import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('quiz_answers')
@Unique(['questionId', 'userId'])
export class QuizAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  quizId: string;

  @Index()
  @Column({ type: 'varchar' })
  questionId: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'int' })
  selectedOptionIndex: number;

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @Column({ type: 'float', default: 0 })
  timeTakenSeconds: number;

  @Column({ type: 'int', default: 0 })
  pointsEarned: number;

  @CreateDateColumn()
  createdAt: Date;
}
