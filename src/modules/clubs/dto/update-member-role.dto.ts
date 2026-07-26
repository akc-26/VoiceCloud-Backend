import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ClubRole } from '../../../common/enums';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ClubRole, description: 'New role for the club member' })
  @IsEnum(ClubRole)
  @IsNotEmpty()
  role: ClubRole;
}
