import { ApiProperty } from '@nestjs/swagger';

export class HostLevelBenefitDto {
  @ApiProperty({ example: 'priority_discovery' })
  key: string;

  @ApiProperty({ example: 'Priority placement in Host discovery' })
  label: string;
}

export class HostLevelDefinitionDto {
  @ApiProperty({ example: 2 })
  level: number;

  @ApiProperty({ example: 'Rising Host' })
  name: string;

  @ApiProperty({ example: 1000 })
  minimumXp: number;

  @ApiProperty({ type: [HostLevelBenefitDto] })
  benefits: HostLevelBenefitDto[];
}

export class HostProgressionResponseDto {
  @ApiProperty({ example: 1 })
  currentLevel: number;

  @ApiProperty({ example: 'Starter Host' })
  currentLevelName: string;

  @ApiProperty({ example: 2, nullable: true })
  nextLevel: number | null;

  @ApiProperty({ example: 'Rising Host', nullable: true })
  nextLevelName: string | null;

  @ApiProperty({ example: 500 })
  currentXP: number;

  @ApiProperty({ example: 1000, nullable: true })
  requiredXP: number | null;

  @ApiProperty({ example: 50 })
  progressPercentage: number;

  @ApiProperty({ example: false })
  isEligible: boolean;

  @ApiProperty({ example: false })
  isMaximumLevel: boolean;

  @ApiProperty({ type: [HostLevelBenefitDto] })
  currentBenefits: HostLevelBenefitDto[];

  @ApiProperty({ type: [HostLevelBenefitDto] })
  nextBenefits: HostLevelBenefitDto[];
}
