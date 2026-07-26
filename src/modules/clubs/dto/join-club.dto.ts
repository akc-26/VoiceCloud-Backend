import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class JoinClubDto {
  @ApiPropertyOptional({ description: 'Optional invite code or token for private/invite-only clubs' })
  @IsOptional()
  @IsString()
  inviteCode?: string;
}
