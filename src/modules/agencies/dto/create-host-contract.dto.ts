import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { CommissionModel } from '../entities/agency-contract.entity';

export class CreateHostContractDto {
  @ApiProperty({ example: 'host-user-uuid-123' })
  @IsString()
  @IsNotEmpty()
  hostUserId: string;

  @ApiPropertyOptional({
    enum: CommissionModel,
    example: CommissionModel.FIXED_PERCENTAGE,
  })
  @IsOptional()
  @IsEnum(CommissionModel)
  commissionModel?: CommissionModel;

  @ApiPropertyOptional({ example: 15.0 })
  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @ApiPropertyOptional({
    example: 'Standard 12-month host agreement with 15% agency commission.',
  })
  @IsOptional()
  @IsString()
  contractTerms?: string;
}
