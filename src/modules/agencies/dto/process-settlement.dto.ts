import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SettlementStatus } from '../entities/agency-settlement.entity';

export class ProcessSettlementDto {
  @ApiProperty({ enum: SettlementStatus, example: SettlementStatus.COMPLETED })
  @IsEnum(SettlementStatus)
  status: SettlementStatus;

  @ApiPropertyOptional({ example: 'BANK_TRANSFER' })
  @IsOptional()
  @IsString()
  payoutMethod?: string;

  @ApiPropertyOptional({ example: 'REF-TX-2026-9092' })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({ example: 'Monthly payout processed successfully.' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
