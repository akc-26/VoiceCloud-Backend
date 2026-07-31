import { PartialType } from '@nestjs/swagger';
import { CreateTaskDefinitionDto } from './create-task-definition.dto';

export class UpdateTaskDefinitionDto extends PartialType(
  CreateTaskDefinitionDto,
) {}
