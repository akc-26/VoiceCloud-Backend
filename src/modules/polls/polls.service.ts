import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Poll, PollStatus, PollType } from './entities/poll.entity';
import { PollOption } from './entities/poll-option.entity';
import { PollVote } from './entities/poll-vote.entity';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { EventsGateway } from '../../common/events/events.gateway';
import { RoomAuthorityService } from '../rooms/room-authority.service';

@Injectable()
export class PollsService {
  constructor(
    @InjectRepository(Poll)
    private readonly pollRepository: Repository<Poll>,
    @InjectRepository(PollOption)
    private readonly optionRepository: Repository<PollOption>,
    @InjectRepository(PollVote)
    private readonly voteRepository: Repository<PollVote>,
    private readonly eventsGateway: EventsGateway,
    private readonly roomAuthorityService: RoomAuthorityService,
  ) {}

  async createPoll(userId: string, dto: CreatePollDto): Promise<Poll> {
    await this.roomAuthorityService.assertManager(userId, dto.roomId);
    const expiresAt = dto.durationSeconds
      ? new Date(Date.now() + dto.durationSeconds * 1000)
      : null;

    const poll = this.pollRepository.create({
      roomId: dto.roomId,
      creatorId: userId,
      title: dto.title,
      pollType: dto.pollType || PollType.SINGLE,
      status: PollStatus.ACTIVE,
      expiresAt,
      options: dto.options.map((optText) =>
        this.optionRepository.create({ text: optText, voteCount: 0 }),
      ),
    });

    const savedPoll = await this.pollRepository.save(poll);

    // Broadcast realtime event
    this.eventsGateway.broadcastToRoom(dto.roomId, 'poll:created', savedPoll);

    return savedPoll;
  }

  async startPoll(userId: string, pollId: string): Promise<Poll> {
    const poll = await this.pollRepository.findOne({
      where: { id: pollId },
      relations: { options: true },
    });
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    await this.roomAuthorityService.assertManager(userId, poll.roomId);

    poll.status = PollStatus.ACTIVE;
    const updated = await this.pollRepository.save(poll);

    this.eventsGateway.broadcastToRoom(poll.roomId, 'poll:started', updated);
    return updated;
  }

  async stopPoll(userId: string, pollId: string): Promise<Poll> {
    const poll = await this.pollRepository.findOne({
      where: { id: pollId },
      relations: { options: true },
    });
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    await this.roomAuthorityService.assertManager(userId, poll.roomId);

    poll.status = PollStatus.STOPPED;
    const updated = await this.pollRepository.save(poll);

    this.eventsGateway.broadcastToRoom(poll.roomId, 'poll:stopped', updated);
    return updated;
  }

  async deletePoll(
    userId: string,
    pollId: string,
  ): Promise<{ success: boolean }> {
    const poll = await this.pollRepository.findOne({ where: { id: pollId } });
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    await this.roomAuthorityService.assertManager(userId, poll.roomId);

    await this.pollRepository.remove(poll);
    this.eventsGateway.broadcastToRoom(poll.roomId, 'poll:deleted', { pollId });
    return { success: true };
  }

  async vote(userId: string, pollId: string, dto: VotePollDto): Promise<Poll> {
    const poll = await this.pollRepository.findOne({
      where: { id: pollId },
      relations: { options: true },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.status !== PollStatus.ACTIVE) {
      throw new BadRequestException('Poll is not active');
    }

    if (poll.expiresAt && new Date() > poll.expiresAt) {
      poll.status = PollStatus.STOPPED;
      await this.pollRepository.save(poll);
      throw new BadRequestException('Poll has expired');
    }

    if (poll.pollType === PollType.SINGLE && dto.optionIds.length > 1) {
      throw new BadRequestException('Single choice poll accepts only 1 option');
    }

    // Verify option IDs exist in this poll
    const validOptionIds = new Set(poll.options.map((o) => o.id));
    for (const optId of dto.optionIds) {
      if (!validOptionIds.has(optId)) {
        throw new BadRequestException(
          `Invalid option ID ${optId} for this poll`,
        );
      }
    }

    // Remove existing votes by user for this poll (allows vote change until closed)
    const existingVotes = await this.voteRepository.find({
      where: { pollId, userId },
    });

    if (existingVotes.length > 0) {
      await this.voteRepository.remove(existingVotes);
    }

    // Create new votes
    const newVotes = dto.optionIds.map((optId) =>
      this.voteRepository.create({
        pollId,
        optionId: optId,
        userId,
      }),
    );
    await this.voteRepository.save(newVotes);

    // Recalculate vote counts
    const allVotes = await this.voteRepository.find({ where: { pollId } });

    for (const opt of poll.options) {
      const count = allVotes.filter((v) => v.optionId === opt.id).length;
      opt.voteCount = count;
      await this.optionRepository.save(opt);
    }

    const reloaded = await this.pollRepository.findOne({
      where: { id: pollId },
      relations: { options: true },
    });

    this.eventsGateway.broadcastToRoom(poll.roomId, 'poll:voted', {
      pollId,
      userId,
      options: reloaded?.options,
    });

    return reloaded;
  }

  async getPoll(pollId: string, userId?: string): Promise<any> {
    const poll = await this.pollRepository.findOne({
      where: { id: pollId },
      relations: { options: true },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    let userVotedOptionIds: string[] = [];
    if (userId) {
      const userVotes = await this.voteRepository.find({
        where: { pollId, userId },
      });
      userVotedOptionIds = userVotes.map((v) => v.optionId);
    }

    return {
      ...poll,
      userVotedOptionIds,
    };
  }

  async getRoomPolls(roomId: string): Promise<Poll[]> {
    return this.pollRepository.find({
      where: { roomId },
      relations: { options: true },
      order: { createdAt: 'DESC' },
    });
  }
}
