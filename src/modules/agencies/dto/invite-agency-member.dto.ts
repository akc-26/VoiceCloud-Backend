import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { AgencyRole } from '../entities/agency-member.entity';

export class InviteAgencyMemberDto {
  @ApiProperty({ example: '22222222-3333-4444-5555-666666666666' })
  @IsUUID()
  inviteeId: string;

  @ApiPropertyOptional({ enum: AgencyRole, example: AgencyRole.HOST })
  @IsOptional()
  @IsEnum(AgencyRole)
  role?: AgencyRole;
}
