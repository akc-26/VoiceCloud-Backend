import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ScheduledRoomsService } from './scheduled-rooms.service';
import { CreateScheduledRoomDto } from './dto/create-scheduled-room.dto';
import { UpdateScheduledRoomDto } from './dto/update-scheduled-room.dto';
import { QueryScheduledRoomDto } from './dto/query-scheduled-room.dto';
import { RegisterReminderDto } from './dto/register-reminder.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Scheduled Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scheduled-rooms')
export class ScheduledRoomsController {
  constructor(private readonly scheduledRoomsService: ScheduledRoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule a new audio room' })
  @ApiResponse({
    status: 201,
    description: 'Scheduled room created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid scheduled start time or parameters.',
  })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() createDto: CreateScheduledRoomDto,
  ) {
    return this.scheduledRoomsService.createScheduledRoom(userId, createDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get paginated list of scheduled rooms' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled rooms retrieved successfully.',
  })
  async findAll(@Query() queryDto: QueryScheduledRoomDto) {
    return this.scheduledRoomsService.findAll(queryDto);
  }

  @Get(':id/lobby')
  @Public()
  @ApiOperation({
    summary: 'Get waiting lobby information for a scheduled room',
  })
  @ApiResponse({ status: 200, description: 'Lobby information retrieved.' })
  @ApiResponse({ status: 404, description: 'Scheduled room not found.' })
  async getLobby(
    @Param('id') id: string,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.scheduledRoomsService.getLobbyInfo(id, userId);
  }

  @Post(':id/reminder')
  @ApiOperation({ summary: 'Register a reminder / RSVP for a scheduled room' })
  @ApiResponse({
    status: 201,
    description: 'Reminder successfully registered.',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot register reminder for cancelled or completed room.',
  })
  async registerReminder(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() reminderDto: RegisterReminderDto,
  ) {
    return this.scheduledRoomsService.registerReminder(id, userId, reminderDto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get scheduled room details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled room details retrieved.',
  })
  @ApiResponse({ status: 404, description: 'Scheduled room not found.' })
  async findOne(@Param('id') id: string) {
    return this.scheduledRoomsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a scheduled room' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled room updated successfully.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden: Only host can update.' })
  async update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateDto: UpdateScheduledRoomDto,
  ) {
    return this.scheduledRoomsService.updateScheduledRoom(
      id,
      userId,
      updateDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel/delete a scheduled room' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled room cancelled successfully.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden: Only host can cancel.' })
  async remove(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.scheduledRoomsService.deleteScheduledRoom(id, userId);
  }
}
