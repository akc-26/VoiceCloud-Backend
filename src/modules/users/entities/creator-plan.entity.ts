import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsUUID, IsArray } from 'class-validator';
import { User } from './user.entity';
import { CreatorPlanStatus, VisibilityType } from '../../../common/enums';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => (value === null || value === undefined ? 0 : Number(value)),
};

@Entity('creator_plans')
export class CreatorPlan {
  @ApiProperty({ description: 'Unique creator plan ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Creator user ID' })
  @Index('IDX_creator_plans_creatorId')
  @Column({ type: 'uuid' })
  @IsUUID()
  creatorId: string;

  @ApiProperty({ description: 'Plan title' })
  @Column({ type: 'varchar' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @Column({ type: 'text', default: '' })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Monthly subscription price' })
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0, transformer: decimalTransformer })
  @IsNumber()
  monthlyPrice: number;

  @ApiPropertyOptional({ description: 'Yearly subscription price' })
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, transformer: decimalTransformer })
  @IsOptional()
  @IsNumber()
  yearlyPrice: number;

  @ApiProperty({ description: 'List of plan benefits' })
  @Column({ type: 'jsonb', default: [] })
  @IsArray()
  benefits: string[];

  @ApiProperty({ enum: VisibilityType, default: VisibilityType.PUBLIC })
  @Column({ type: 'varchar', default: VisibilityType.PUBLIC })
  @IsEnum(VisibilityType)
  visibility: VisibilityType;

  @ApiProperty({ enum: CreatorPlanStatus, default: CreatorPlanStatus.ACTIVE })
  @Index('IDX_creator_plans_status')
  @Column({ type: 'varchar', default: CreatorPlanStatus.ACTIVE })
  @IsEnum(CreatorPlanStatus)
  status: CreatorPlanStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;
}
