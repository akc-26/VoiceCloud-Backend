import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('user_follows')
@Unique(['followerId', 'followingId'])
export class Follow {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @Column({ type: 'varchar' })
  @Index()
  followerId: string;

  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  @Column({ type: 'varchar' })
  @Index()
  followingId: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
