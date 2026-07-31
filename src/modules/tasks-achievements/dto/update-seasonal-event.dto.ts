import { PartialType } from '@nestjs/swagger';
import { CreateSeasonalEventDto } from './create-seasonal-event.dto';

export class UpdateSeasonalEventDto extends PartialType(
  CreateSeasonalEventDto,
) {}
