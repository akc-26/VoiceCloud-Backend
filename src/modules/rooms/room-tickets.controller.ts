import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoomTicketsService } from './room-tickets.service';
import { BuyTicketDto } from './dto/buy-ticket.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Room Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scheduled-rooms')
export class RoomTicketsController {
  constructor(private readonly roomTicketsService: RoomTicketsService) {}

  @Get('my-tickets')
  @ApiOperation({ summary: 'Get current user purchased room tickets' })
  @ApiResponse({ status: 200, description: 'Tickets retrieved successfully.' })
  async getMyTickets(
    @CurrentUser('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.roomTicketsService.getMyTickets(userId, page, limit);
  }

  @Post(':id/buy-ticket')
  @ApiOperation({ summary: 'Purchase a ticket for a scheduled room' })
  @ApiResponse({ status: 201, description: 'Ticket purchased successfully.' })
  @ApiResponse({ status: 400, description: 'Capacity full or room cancelled/completed.' })
  @ApiResponse({ status: 409, description: 'User already owns an active ticket.' })
  async buyTicket(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() buyTicketDto: BuyTicketDto,
  ) {
    return this.roomTicketsService.buyTicket(id, userId, buyTicketDto);
  }
}
