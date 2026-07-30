import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatorSettlementDto {
  @ApiProperty({ description: 'Creator user ID' })
  @IsUUID()
  creatorId: string;

  @ApiProperty({ description: 'Gross diamonds to settle' })
  @IsNumber()
  @Min(1)
  diamondsToSettle: number;

  @ApiPropertyOptional({ description: 'Platform fee percentage share' })
  @IsOptional()
  @IsNumber()
  platformFeeShare?: number = 20.0;

  @ApiPropertyOptional({ description: 'Agency fee percentage share' })
  @IsOptional()
  @IsNumber()
  agencyFeeShare?: number = 0.0;
}
