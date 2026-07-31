import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WarnUserDto {
  @ApiProperty({
    example: 'Please refrain from using disrespectful language.',
    description: 'Warning message / reason',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    example: 'First official warning issued.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateNoteDto {
  @ApiProperty({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'Target Entity ID (e.g. user, room, agency)',
  })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({
    example: 'User requested verification document review.',
    description: 'Internal moderation note content',
  })
  @IsString()
  @IsNotEmpty()
  note: string;
}
