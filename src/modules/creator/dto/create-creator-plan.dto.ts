import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VisibilityType } from '../../../common/enums';

export class CreateCreatorPlanDto {
  @ApiProperty({ description: 'Plan title', example: 'VIP Fan Pass' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Plan description',
    example: 'Exclusive content and subscriber badges',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Monthly subscription price in USD',
    example: 4.99,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @ApiPropertyOptional({
    description: 'Yearly subscription price in USD',
    example: 49.99,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  yearlyPrice?: number;

  @ApiPropertyOptional({
    description: 'List of plan benefits',
    example: ['Exclusive Badge', 'VIP Room Access'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiPropertyOptional({ enum: VisibilityType, default: VisibilityType.PUBLIC })
  @IsOptional()
  @IsEnum(VisibilityType)
  visibility?: VisibilityType = VisibilityType.PUBLIC;
}
