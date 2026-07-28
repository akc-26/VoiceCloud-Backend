import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';

export class BuyTicketDto {
  @ApiPropertyOptional({ description: 'Payment method or gateway identifier' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Additional metadata or purchase notes' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
