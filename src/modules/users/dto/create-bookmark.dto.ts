import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookmarkDto {
  @ApiProperty({
    description: 'Type of target item to bookmark (e.g., room, scheduled_room, club, user)',
    example: 'scheduled_room',
  })
  @IsString()
  @IsNotEmpty()
  targetType: string;

  @ApiProperty({
    description: 'ID of the target item to bookmark',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiPropertyOptional({
    description: 'Title for display in bookmark lists',
    example: 'AI Audio Architecture Discussion',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Optional description or note',
    example: 'Scheduled for Friday 10 AM',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional cover or avatar image URL',
    example: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata dictionary',
    example: { category: 'Tech' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
