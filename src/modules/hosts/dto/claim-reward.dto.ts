import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ClaimRewardDto {
  @ApiProperty({ example: 'reward-uuid-123' })
  @IsString()
  @IsNotEmpty()
  rewardId: string;
}
