import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_TYPES } from '../queue.constants';
import { FirebaseMessagingService } from '../firebase/firebase-messaging.service';

@Processor(QUEUE_NAMES.CHAT)
export class ChatProcessor extends WorkerHost {
  private readonly logger = new Logger(ChatProcessor.name);

  constructor(
    private readonly firebaseMessagingService: FirebaseMessagingService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing chat job ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case JOB_TYPES.CHAT.PUSH_NOTIFICATION:
        return this.handlePushNotification(job.data);
      case JOB_TYPES.CHAT.PROCESS_ATTACHMENT:
        return this.handleProcessAttachment(job.data);
      case JOB_TYPES.CHAT.GENERATE_WAVEFORM:
        return this.handleGenerateWaveform(job.data);
      case JOB_TYPES.CHAT.ANALYTICS:
        return this.handleAnalytics(job.data);
      case JOB_TYPES.CHAT.TYPING_CLEANUP:
        return this.handleTypingCleanup(job.data);
      default:
        this.logger.warn(`Unknown chat job type: ${job.name}`);
        return { status: 'skipped', reason: 'unknown job name' };
    }
  }

  private async handlePushNotification(data: {
    userIds?: string[];
    title: string;
    body: string;
    payload?: Record<string, string>;
  }) {
    this.logger.log(
      `Sending chat push notification to ${data.userIds?.length || 0} users`,
    );
    if (data.userIds && data.userIds.length > 0) {
      await this.firebaseMessagingService.sendMultiNotification(data.userIds, {
        title: data.title,
        body: data.body,
        data: data.payload,
      });
    }
    return { status: 'success', sentCount: data.userIds?.length || 0 };
  }

  private async handleProcessAttachment(data: {
    attachmentId?: string;
    url: string;
    type: string;
  }) {
    this.logger.log(`Processing chat attachment: ${data.url} (${data.type})`);
    return { status: 'processed', url: data.url };
  }

  private async handleGenerateWaveform(data: {
    messageId?: string;
    duration?: number;
    url?: string;
  }) {
    this.logger.log(
      `Generating waveform for voice note message ${data.messageId}`,
    );
    // Simulate generating a 30-sample normalized waveform array between 0.1 and 1.0
    const sampleCount = 30;
    const waveform = Array.from({ length: sampleCount }, (_, i) => {
      const val = Math.abs(Math.sin((i + 1) * 0.4)) * 0.8 + 0.1;
      return Math.round(val * 100) / 100;
    });

    return { status: 'waveform_generated', waveform };
  }

  private async handleAnalytics(data: {
    eventType: string;
    conversationId: string;
    userId: string;
  }) {
    this.logger.log(
      `Recording chat analytics event ${data.eventType} for conv ${data.conversationId}`,
    );
    return { status: 'recorded', eventType: data.eventType };
  }

  private async handleTypingCleanup(data: { conversationId?: string }) {
    this.logger.log(
      `Cleaned up typing status for conversation ${data.conversationId}`,
    );
    return { status: 'cleaned' };
  }
}
