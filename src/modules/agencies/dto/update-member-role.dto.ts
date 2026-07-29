import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AgencyRole } from '../entities/agency-member.entity';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: AgencyRole, example: AgencyRole.MANAGER })
  @IsEnum(AgencyRole)
  role: AgencyRole;
}
