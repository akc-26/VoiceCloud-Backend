import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray } from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { ClubMember } from './club-member.entity';
import { ScheduledRoom } from '../../rooms/entities/scheduled-room.entity';
import { Room } from '../../rooms/entities/room.entity';
import { VisibilityType } from '../../../common/enums';

@Entity('clubs')
export class Club {
  @ApiProperty({ description: 'Unique club identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Club display name' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Unique club handle/slug' })
  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  @IsString()
  handle: string;

  @ApiProperty({ description: 'Club description' })
  @Column({ type: 'text', default: '' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Club avatar/logo URL' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Club banner/cover image URL' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  bannerUrl: string;

  @ApiProperty({ description: 'Primary category' })
  @Index()
  @Column({ type: 'varchar', default: 'General' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Club rules list' })
  @Column({ type: 'json', default: [] })
  @IsArray()
  rules: string[];

  @ApiProperty({ enum: VisibilityType, default: VisibilityType.PUBLIC })
  @Column({ type: 'varchar', default: VisibilityType.PUBLIC })
  @IsEnum(VisibilityType)
  visibility: VisibilityType;

  @ApiProperty({ description: 'Total member count' })
  @Column({ type: 'int', default: 1 })
  @IsInt()
  memberCount: number;

  @ApiProperty({ description: 'Total host count' })
  @Column({ type: 'int', default: 1 })
  @IsInt()
  hostCount: number;

  @ApiProperty({ description: 'Number of upcoming scheduled rooms' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  upcomingRoomsCount: number;

  @ApiProperty({ description: 'Club owner user ID' })
  @Index()
  @Column({ type: 'uuid' })
  ownerId: string;

  @ApiProperty({ description: 'Verification badge indicator' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => ClubMember, (member) => member.club)
  members: ClubMember[];

  @OneToMany(() => ScheduledRoom, (scheduledRoom) => scheduledRoom.club)
  scheduledRooms: ScheduledRoom[];

  @OneToMany(() => Room, (room) => room.club)
  rooms: Room[];
}
