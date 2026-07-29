import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VotePollDto {
  @ApiProperty({
    description:
      'List of option IDs voted for (single choice = 1 item, multiple choice = 1+ items)',
    example: ['opt-uuid-123'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  optionIds: string[];
}
