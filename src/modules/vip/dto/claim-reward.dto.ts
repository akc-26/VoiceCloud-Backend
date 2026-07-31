import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ClaimRewardDto {
  @ApiProperty({ example: 'reward-uuid-123' })
  @IsString()
  rewardId: string;
}
