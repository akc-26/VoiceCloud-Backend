import { Club } from './entities/club.entity';
import { ClubMember } from './entities/club-member.entity';
import { ScheduledRoom } from '../rooms/entities/scheduled-room.entity';
import { RoomTicket } from '../rooms/entities/room-ticket.entity';
import { User } from '../users/entities/user.entity';
import { Room } from '../rooms/entities/room.entity';
import {
  ClubRole,
  ScheduledRoomStatus,
  TicketStatus,
  VisibilityType,
  VerificationStatus,
  RsvpStatus,
} from '../../common/enums';

describe('Phase 1A Core Domain Entities', () => {
  it('should instantiate Club entity correctly', () => {
    const club = new Club();
    club.id = '123e4567-e89b-12d3-a456-426614174000';
    club.name = 'Tech Pioneers';
    club.handle = 'tech_pioneers';
    club.description = 'Discussion on mobile & AI technology';
    club.category = 'Technology';
    club.visibility = VisibilityType.PUBLIC;
    club.memberCount = 10;
    club.isVerified = true;

    expect(club.name).toBe('Tech Pioneers');
    expect(club.handle).toBe('tech_pioneers');
    expect(club.visibility).toBe(VisibilityType.PUBLIC);
    expect(club.isVerified).toBe(true);
  });

  it('should instantiate ClubMember entity with ClubRole enum', () => {
    const member = new ClubMember();
    member.id = '123e4567-e89b-12d3-a456-426614174001';
    member.clubId = '123e4567-e89b-12d3-a456-426614174000';
    member.userId = '123e4567-e89b-12d3-a456-426614174002';
    member.role = ClubRole.ADMIN;

    expect(member.role).toBe(ClubRole.ADMIN);
  });

  it('should instantiate ScheduledRoom entity with ScheduledRoomStatus', () => {
    const scheduledRoom = new ScheduledRoom();
    scheduledRoom.id = '123e4567-e89b-12d3-a456-426614174003';
    scheduledRoom.title = 'AI Strategy 2026';
    scheduledRoom.scheduledStartTime = new Date();
    scheduledRoom.status = ScheduledRoomStatus.SCHEDULED;
    scheduledRoom.isPremium = true;
    scheduledRoom.ticketPriceAmount = 9.99;

    expect(scheduledRoom.title).toBe('AI Strategy 2026');
    expect(scheduledRoom.status).toBe(ScheduledRoomStatus.SCHEDULED);
    expect(scheduledRoom.isPremium).toBe(true);
    expect(scheduledRoom.ticketPriceAmount).toBe(9.99);
  });

  it('should instantiate RoomTicket entity with TicketStatus enum', () => {
    const ticket = new RoomTicket();
    ticket.id = '123e4567-e89b-12d3-a456-426614174004';
    ticket.ticketCode = 'VC-TKT-987654';
    ticket.status = TicketStatus.ACTIVE;
    ticket.isValid = true;
    ticket.priceUsd = 9.99;

    expect(ticket.ticketCode).toBe('VC-TKT-987654');
    expect(ticket.status).toBe(TicketStatus.ACTIVE);
  });

  it('should verify User entity extended fields without wallet balances', () => {
    const user = new User();
    user.id = '123e4567-e89b-12d3-a456-426614174002';
    user.username = 'john_creator';
    user.displayName = 'John Creator';
    user.email = 'john@example.com';
    user.coverUrl = 'https://example.com/cover.jpg';
    user.creatorBadge = 'VERIFIED_CREATOR';
    user.isCreatorEnabled = true;
    user.verificationStatus = VerificationStatus.VERIFIED;

    expect(user.creatorBadge).toBe('VERIFIED_CREATOR');
    expect(user.isCreatorEnabled).toBe(true);
    expect(user.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect((user as unknown as Record<string, unknown>).coinBalance).toBeUndefined();
    expect((user as unknown as Record<string, unknown>).diamondBalance).toBeUndefined();
  });

  it('should verify Room entity extended fields', () => {
    const room = new Room();
    room.id = '123e4567-e89b-12d3-a456-426614174005';
    room.title = 'Live Spatial Audio Jam';
    room.scheduledRoomId = '123e4567-e89b-12d3-a456-426614174003';
    room.clubId = '123e4567-e89b-12d3-a456-426614174000';
    room.isPremium = true;
    room.isTicketRequired = true;
    room.ticketPriceAmount = 14.99;

    expect(room.scheduledRoomId).toBe('123e4567-e89b-12d3-a456-426614174003');
    expect(room.isPremium).toBe(true);
    expect(room.isTicketRequired).toBe(true);
    expect(room.ticketPriceAmount).toBe(14.99);
  });
});
