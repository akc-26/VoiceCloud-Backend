import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('moderation_notes')
export class ModerationNote {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  @Column({ type: 'varchar' })
  @Index()
  targetId: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @Column({ type: 'varchar' })
  authorId: string;

  @ApiProperty({ example: 'User requested appeal on 2026-07-20' })
  @Column({ type: 'text' })
  note: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
