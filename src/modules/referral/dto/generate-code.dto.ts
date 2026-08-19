import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class GenerateReferralCodeDto {
  @ApiPropertyOptional({
    description: 'Custom referral code (alphanumeric, 4-20 chars)',
    example: 'MYVIPCODE',
  })
  @IsOptional()
  @IsString()
  @Length(4, 20)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Custom referral code must contain only letters, numbers, underscores or hyphens',
  })
  customCode?: string;
}
