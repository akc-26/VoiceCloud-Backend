import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateTierBenefitsDto {
  @ApiProperty({
    description: 'List of tier benefit descriptions',
    type: [String],
    example: ['Exclusive chat access', 'Monthly Q&A session'],
  })
  @IsArray()
  @IsString({ each: true })
  benefits: string[];
}
