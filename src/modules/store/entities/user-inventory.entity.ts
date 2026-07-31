import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { StoreItem } from './store-item.entity';

export enum InventoryObtainedVia {
  PURCHASE = 'PURCHASE',
  GIFT = 'GIFT',
  TASK_REWARD = 'TASK_REWARD',
  ACHIEVEMENT = 'ACHIEVEMENT',
  VIP_BENEFIT = 'VIP_BENEFIT',
  ADMIN_GRANT = 'ADMIN_GRANT',
}

@Entity('user_inventory')
export class UserInventory {
  @ApiProperty({ description: 'Unique user inventory record ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Store Item ID' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  itemId: string;

  @ManyToOne(() => StoreItem, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'itemId' })
  item: StoreItem;

  @ApiProperty({
    enum: InventoryObtainedVia,
    default: InventoryObtainedVia.PURCHASE,
  })
  @Column({ type: 'varchar', default: InventoryObtainedVia.PURCHASE })
  @IsEnum(InventoryObtainedVia)
  obtainedVia: InventoryObtainedVia;

  @ApiProperty({ description: 'Whether item is currently equipped' })
  @Index()
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isEquipped: boolean;

  @ApiPropertyOptional({
    description: 'Item expiration date (null if permanent)',
  })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  expiresAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
