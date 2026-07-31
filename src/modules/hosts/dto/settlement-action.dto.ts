import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SettlementActionDto {
  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ example: 'Monthly diamond settlement withdrawal' })
  @IsOptional()
  @IsString()
  notes?: string;
}
