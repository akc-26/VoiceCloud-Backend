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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';

@ApiTags('Live Audio Rooms & Media')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new live audio room' })
  @ApiResponse({ status: 201, description: 'Room created successfully.' })
  async createRoom(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomsService.createRoom(userId, dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List live audio rooms with pagination & filters' })
  @ApiResponse({ status: 200, description: 'Rooms list retrieved.' })
  async findAll(@Query() queryDto: QueryRoomDto) {
    return this.roomsService.findAll(queryDto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get room details by ID' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Room details retrieved.' })
  async findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update room metadata and configuration' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Room updated successfully.' })
  async updateRoom(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.updateRoom(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive/Delete live audio room' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Room deleted successfully.' })
  async deleteRoom(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roomsService.deleteRoom(id, userId);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start live room broadcast' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Live broadcast started.' })
  async startRoom(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roomsService.startRoom(id, userId);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause live room broadcast' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Live broadcast paused.' })
  async pauseRoom(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roomsService.pauseRoom(id, userId);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume live room broadcast' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Live broadcast resumed.' })
  async resumeRoom(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roomsService.resumeRoom(id, userId);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End live room broadcast' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Live broadcast ended.' })
  async endRoom(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.roomsService.endRoom(id, userId);
  }

  @Get(':id/replay')
  @Public()
  @ApiOperation({ summary: 'Get room session replay metadata' })
  @ApiParam({ name: 'id', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Replay metadata retrieved.' })
  async getRoomReplay(@Param('id') id: string) {
    return this.roomsService.getRoomReplay(id);
  }

  @Post(':id/cover')
  @ApiOperation({ summary: 'Upload or update room cover image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Room cover uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadRoomCover(
    @Param('id') roomId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.roomsService.uploadRoomCover(roomId, file, userId);
  }

  @Post(':id/thumbnail')
  @ApiOperation({ summary: 'Upload or update room thumbnail image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Room thumbnail uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadRoomThumbnail(
    @Param('id') roomId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.roomsService.uploadRoomThumbnail(roomId, file, userId);
  }

  @Post(':id/background')
  @ApiOperation({ summary: 'Upload or update room background image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Room background uploaded successfully.',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadRoomBackground(
    @Param('id') roomId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.roomsService.uploadRoomBackground(roomId, file, userId);
  }
}
