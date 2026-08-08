import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendGiftDto {
  @ApiProperty({ description: 'Gift ID to send' })
  @IsString()
  giftId: string;

  @ApiPropertyOptional({
    description: 'Context where gift is sent: room, private, group, or event',
    example: 'room',
  })
  @IsOptional()
  @IsIn(['room', 'private', 'group', 'event'])
  context?: string = 'room';

  @ApiPropertyOptional({
    description: 'Room ID (required if context is room or event)',
  })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Single recipient user ID' })
  @IsOptional()
  @IsString()
  receiverId?: string;

  @ApiPropertyOptional({ description: 'Multiple recipient user IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  receiverIds?: string[];

  @ApiPropertyOptional({ description: 'Quantity per recipient', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number = 1;

  @ApiPropertyOptional({
    description: 'Combo count override / sequence step',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  comboStep?: number = 1;

  @ApiPropertyOptional({
    description: 'Optional idempotency key for safe gift-send retries',
  })
  @IsOptional()
  @IsString()
  operationKey?: string;
}

export class SendComboDto {
  @ApiProperty({ description: 'Gift ID' })
  @IsString()
  giftId: string;

  @ApiProperty({ description: 'Target Receiver User ID' })
  @IsString()
  receiverId: string;

  @ApiPropertyOptional({ description: 'Room ID' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Combo count increment', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  count?: number = 1;

  @ApiPropertyOptional({
    description: 'Optional idempotency key for safe combo-send retries',
  })
  @IsOptional()
  @IsString()
  operationKey?: string;
}

export class SendMultiGiftPhase22Dto {
  @ApiProperty({ description: 'Gift ID' })
  @IsString()
  giftId: string;

  @ApiProperty({ description: 'Target recipient user IDs array' })
  @IsArray()
  @IsString({ each: true })
  targetUserIds: string[];

  @ApiPropertyOptional({ description: 'Room ID' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Quantity per recipient', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number = 1;

  @ApiPropertyOptional({
    description: 'Optional idempotency key for safe multi-gift retries',
  })
  @IsOptional()
  @IsString()
  operationKey?: string;
}
