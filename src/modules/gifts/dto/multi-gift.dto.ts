import { IsString, IsArray, IsNotEmpty, IsInt, Min, ArrayNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMultiRecipientGiftDto {
  @ApiProperty({
    description: 'Array of target user UUIDs receiving the gift',
    example: ['user-id-1', 'user-id-2', 'user-id-3'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  targetUserIds: string[];

  @ApiProperty({
    description: 'Room ID where gift is being sent',
    example: 'room-uuid-123',
  })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({
    description: 'Gift ID or Gift name',
    example: 'gift-superstar-rocket',
  })
  @IsString()
  @IsNotEmpty()
  giftId: string;

  @ApiPropertyOptional({
    description: 'Quantity per recipient',
    default: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;

  @ApiPropertyOptional({
    description: 'Coin price per gift unit',
    default: 100,
    example: 100,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  pricePerUnit?: number = 100;
}
