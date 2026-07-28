import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../entities/message.entity';

export class AttachmentDto {
  @ApiProperty()
  @IsString()
  url: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds for voice note/audio' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Waveform amplitude metadata array',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  waveform?: number[];
}

export class SendMessageDto {
  @ApiProperty({
    enum: MessageType,
    default: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiPropertyOptional({ description: 'Text content of the message' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({ description: 'ID of message being replied to' })
  @IsOptional()
  @IsString()
  replyToId?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds for voice note' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Waveform array for voice note',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  waveform?: number[];
}
