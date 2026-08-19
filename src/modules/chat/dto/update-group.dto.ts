import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class AddMembersDto {
  @ApiPropertyOptional({ type: [String] })
  @IsString({ each: true })
  memberIds: string[];
}

export class TransferOwnershipDto {
  @ApiPropertyOptional()
  @IsString()
  newOwnerId: string;
}

export class UpdateMemberRoleDto {
  @ApiPropertyOptional({ enum: ['admin', 'member'] })
  @IsString()
  role: 'admin' | 'member';
}
