import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsArray, IsUUID } from 'class-validator';
import { ConversationType } from '../entities/conversation.entity';

export class CreateConversationDto {
  @ApiProperty({
    enum: ConversationType,
    example: ConversationType.DIRECT,
    description: 'Type of conversation',
  })
  @IsEnum(ConversationType)
  type: ConversationType;

  @ApiPropertyOptional({
    description: 'Target recipient user ID for direct messaging',
  })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiPropertyOptional({ description: 'Name of the group or room chat' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Group description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Group avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Voice room ID if conversation is linked to a voice room',
  })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Initial member user IDs for group chat',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}
