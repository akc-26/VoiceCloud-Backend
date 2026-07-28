import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatorPlanStatus, VisibilityType } from '../../../common/enums';

export class UpdateCreatorPlanDto {
  @ApiPropertyOptional({ description: 'Plan title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Monthly subscription price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @ApiPropertyOptional({ description: 'Yearly subscription price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  yearlyPrice?: number;

  @ApiPropertyOptional({ description: 'List of plan benefits' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiPropertyOptional({ enum: VisibilityType })
  @IsOptional()
  @IsEnum(VisibilityType)
  visibility?: VisibilityType;

  @ApiPropertyOptional({ enum: CreatorPlanStatus })
  @IsOptional()
  @IsEnum(CreatorPlanStatus)
  status?: CreatorPlanStatus;
}
