import { PartialType } from '@nestjs/swagger';
import { CreateVipPlanDto } from './create-vip-plan.dto';

export class UpdateVipPlanDto extends PartialType(CreateVipPlanDto) {}
