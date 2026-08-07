import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ConvertDiamondsDto {
  @ApiProperty({ description: 'Number of diamonds to convert into coins' })
  @IsInt()
  @Min(1)
  diamondAmount: number;

  @ApiPropertyOptional({
    description: 'Optional idempotency key for safely retrying this conversion',
  })
  @IsOptional()
  @IsString()
  operationKey?: string;
}
