import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { StorageModule } from '../storage/storage.module';
import { RedisModule } from '../../redis/redis.module';
import { EventsModule } from '../../common/events/events.module';
import { QueueModule } from '../../queue/queue.module';
import { RoomsModule } from '../rooms/rooms.module';

import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { Message } from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { MessageReport } from './entities/message-report.entity';
import { VoiceNote } from './entities/voice-note.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationMember,
      Message,
      MessageReaction,
      MessageReport,
      VoiceNote,
      User,
    ]),
    StorageModule,
    RedisModule,
    EventsModule,
    QueueModule,
    RoomsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
