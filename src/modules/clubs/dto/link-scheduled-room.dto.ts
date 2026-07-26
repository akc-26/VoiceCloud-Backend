import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class LinkScheduledRoomDto {
  @ApiProperty({
    description: 'Scheduled Room UUID to associate with the club',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  @IsNotEmpty()
  scheduledRoomId: string;
}
