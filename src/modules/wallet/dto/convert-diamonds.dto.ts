import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ConvertDiamondsDto {
  @ApiProperty({ description: 'Number of diamonds to convert into coins' })
  @IsInt()
  @Min(1)
  diamondAmount: number;
}
