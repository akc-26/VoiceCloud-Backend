import { ApiProperty } from '@nestjs/swagger';

export class HostNumericEligibilityRequirementDto {
  @ApiProperty({ example: 75 })
  current: number;

  @ApiProperty({ example: 50 })
  minimum: number;

  @ApiProperty({ example: true })
  met: boolean;
}

export class HostCommunityStandingRequirementDto {
  @ApiProperty({ example: true })
  required: boolean;

  @ApiProperty({ example: true })
  met: boolean;
}

export class HostEligibilityRequirementsDto {
  @ApiProperty({ type: HostNumericEligibilityRequirementDto })
  followers: HostNumericEligibilityRequirementDto;

  @ApiProperty({ type: HostNumericEligibilityRequirementDto })
  completedRooms: HostNumericEligibilityRequirementDto;

  @ApiProperty({ type: HostCommunityStandingRequirementDto })
  communityStanding: HostCommunityStandingRequirementDto;
}

export class HostEligibilityResponseDto {
  @ApiProperty({ example: true })
  eligible: boolean;

  @ApiProperty({ example: true })
  applicationsEnabled: boolean;

  @ApiProperty({ type: HostEligibilityRequirementsDto })
  requirements: HostEligibilityRequirementsDto;

  @ApiProperty({ type: [String] })
  reasons: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  evaluatedAt: string;
}
