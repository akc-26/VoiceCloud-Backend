import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AddHostAuditNoteDto {
  @ApiProperty({
    example:
      'Host verification documents manually verified by compliance team.',
  })
  @IsString()
  @IsNotEmpty()
  note: string;
}
