import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ConversionPreviewDto {
  @ApiProperty({
    description: 'Amount of diamonds to convert to coins',
    example: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  diamondAmount: number;
}
