import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'Recipient User ID',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'Sender User ID (if applicable)',
  })
  @IsUUID()
  @IsOptional()
  senderId?: string;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.IN_APP,
    description: 'Notification Type',
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    example: 'Welcome to VoiceCloud',
    description: 'Notification Title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Thank you for joining our platform!',
    description: 'Notification Message Content',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    example: { key: 'value' },
    description: 'Additional structured metadata',
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'notification:reward:daily:abc',
    description: 'Persistent idempotency key for notification creation',
  })
  @IsString()
  @IsOptional()
  operationKey?: string;
}
