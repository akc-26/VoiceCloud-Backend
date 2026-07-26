import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('gifts')
export class Gift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', default: 'General' })
  category: string;

  @Column({ type: 'int', default: 10 })
  coinPrice: number;

  @Column({ type: 'varchar', nullable: true })
  iconUrl: string;

  @Column({ type: 'varchar', nullable: true })
  animationUrl: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
