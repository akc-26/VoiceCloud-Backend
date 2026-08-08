import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LuckyBoxTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  DIAMOND = 'diamond',
}

export class OpenLuckyBoxDto {
  @ApiProperty({
    description: 'Tier or type of mystery lucky box',
    enum: LuckyBoxTier,
    example: LuckyBoxTier.GOLD,
  })
  @IsEnum(LuckyBoxTier)
  @IsNotEmpty()
  tier: LuckyBoxTier;

  @ApiPropertyOptional({
    description: 'Number of boxes to open at once',
    default: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  count?: number = 1;

  @ApiPropertyOptional({
    description: 'Persistent idempotency key for retry-safe opening',
    example: 'lucky-box:user-1:client-request-123',
  })
  @IsString()
  @IsOptional()
  operationKey?: string;

  @ApiPropertyOptional({
    description: 'Associated room ID if opened live in a room',
    example: 'room-uuid-123',
  })
  @IsString()
  @IsOptional()
  roomId?: string;
}
