import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FraudAction } from '../enums/referral.enums';

export class FraudActionDto {
  @ApiProperty({ enum: FraudAction, description: 'Action to execute' })
  @IsEnum(FraudAction)
  action: FraudAction;

  @ApiPropertyOptional({ description: 'Referral Relationship ID' })
  @IsOptional()
  @IsString()
  relationshipId?: string;

  @ApiPropertyOptional({ description: 'Referrer User ID' })
  @IsOptional()
  @IsString()
  referrerId?: string;

  @ApiPropertyOptional({ description: 'Referred User ID' })
  @IsOptional()
  @IsString()
  referredUserId?: string;

  @ApiPropertyOptional({ description: 'Reason or notes for decision' })
  @IsOptional()
  @IsString()
  reason?: string;
}
