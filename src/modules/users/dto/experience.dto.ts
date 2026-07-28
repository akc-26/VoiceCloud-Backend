import { IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ExperienceType {
  WEALTH = 'wealth',
  CHARM = 'charm',
}

export class AddExperienceDto {
  @ApiProperty({ enum: ExperienceType, example: ExperienceType.CHARM })
  @IsEnum(ExperienceType)
  type: ExperienceType;

  @ApiProperty({ example: 100, description: 'Amount of EXP points to add' })
  @IsNumber()
  @Min(1)
  amount: number;
}
