import { PartialType } from '@nestjs/swagger';
import { CreateAchievementDefinitionDto } from './create-achievement-definition.dto';

export class UpdateAchievementDefinitionDto extends PartialType(
  CreateAchievementDefinitionDto,
) {}
