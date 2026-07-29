import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class RegisterReminderDto {
  @ApiPropertyOptional({
    description: 'Enable push notifications for this reminder',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enablePush?: boolean = true;

  @ApiPropertyOptional({
    description: 'Enable email notifications for this reminder',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  enableEmail?: boolean = false;
}
