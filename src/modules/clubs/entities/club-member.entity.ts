import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { Club } from './club.entity';
import { User } from '../../users/entities/user.entity';
import { ClubRole } from '../../../common/enums';

@Entity('club_members')
@Unique(['clubId', 'userId'])
@Index(['clubId', 'userId'])
export class ClubMember {
  @ApiProperty({ description: 'Unique club member record ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Club ID' })
  @Index()
  @Column({ type: 'uuid' })
  @IsUUID()
  clubId: string;

  @ApiProperty({ description: 'User ID' })
  @Index()
  @Column({ type: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: ClubRole, default: ClubRole.MEMBER })
  @Column({ type: 'varchar', default: ClubRole.MEMBER })
  @IsEnum(ClubRole)
  role: ClubRole;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Club, (club) => club.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clubId' })
  club: Club;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
