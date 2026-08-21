import { useSyncExternalStore } from 'react';
import {
  connectLiveKitAudio,
  type BrowserAudioState,
  type BrowserRtcSession,
} from '@shared/rtc/livekit-browser';
import { creatorApi } from './creator-api.service';
import type { CreatorRtcJoinResult } from '../types/creator.types';

export interface CreatorLiveMediaSnapshot {
  roomId: string | null;
  provider: string | null;
  serverUrl: string | null;
  state: BrowserAudioState;
  detail: string;
  microphoneEnabled: boolean;
  connecting: boolean;
}

type Listener = () => void;

class CreatorLiveMediaService {
  private session: BrowserRtcSession | null = null;
  private joinResult: CreatorRtcJoinResult | null = null;
  private connectPromise: Promise<BrowserRtcSession> | null = null;
  private listeners = new Set<Listener>();
  private snapshot: CreatorLiveMediaSnapshot = {
    roomId: null,
    provider: null,
    serverUrl: null,
    state: 'idle',
    detail: '',
    microphoneEnabled: false,
    connecting: false,
  };

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private update(patch: Partial<CreatorLiveMediaSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private mediaState = (state: BrowserAudioState, detail = '') => {
    this.update({ state, detail, connecting: state === 'loading-sdk' || state === 'connecting' });
  };

  async ensureConnected(roomId: string): Promise<BrowserRtcSession> {
    if (this.session && this.snapshot.roomId === roomId) return this.session;
    if (this.connectPromise && this.snapshot.roomId === roomId) return this.connectPromise;

    if (this.snapshot.roomId && this.snapshot.roomId !== roomId) {
      await this.disconnect();
    }

    this.update({ roomId, connecting: true, state: 'connecting', detail: '' });
    this.connectPromise = (async () => {
      await creatorApi.ensureVoiceSession(roomId);
      const joined = await creatorApi.joinRtcRoom(roomId);
      this.joinResult = joined;
      this.update({
        provider: joined.provider || null,
        serverUrl: joined.serverUrl || null,
      });

      if (joined.provider !== 'livekit' || !joined.serverUrl) {
        throw new Error(
          `Real browser audio requires an active LiveKit provider. Current provider: ${joined.provider || 'unknown'}.`,
        );
      }

      const session = await connectLiveKitAudio({
        serverUrl: joined.serverUrl,
        token: joined.token,
        publishMicrophone: false,
        onState: this.mediaState,
      });
      this.session = session;
      this.update({ state: 'connected', detail: '', connecting: false });
      return session;
    })()
      .catch(async (error) => {
        const message = error instanceof Error ? error.message : 'Unable to connect live audio';
        this.session = null;
        this.joinResult = null;
        this.update({ state: 'error', detail: message, connecting: false, microphoneEnabled: false });
        await creatorApi.leaveRtcRoom(roomId).catch(() => undefined);
        throw error;
      })
      .finally(() => {
        this.connectPromise = null;
      });

    return this.connectPromise;
  }

  async startSpeaking(roomId: string): Promise<void> {
    const session = await this.ensureConnected(roomId);
    await session.enableMicrophone();
    await creatorApi.reportSpeakingState(roomId, true);
    this.update({ microphoneEnabled: true, state: 'publishing', detail: '' });
  }

  async stopSpeaking(roomId = this.snapshot.roomId || ''): Promise<void> {
    if (!roomId) return;
    if (this.session) await this.session.disableMicrophone().catch(() => undefined);
    await creatorApi.reportSpeakingState(roomId, false).catch(() => undefined);
    this.update({ microphoneEnabled: false, state: this.session ? 'muted' : 'idle' });
  }

  async startAudio(): Promise<void> {
    if (!this.session) throw new Error('Live audio is not connected');
    await this.session.startAudio();
  }

  async disconnect(roomId = this.snapshot.roomId || ''): Promise<void> {
    if (roomId) await creatorApi.reportSpeakingState(roomId, false).catch(() => undefined);
    if (this.session) await this.session.disconnect().catch(() => undefined);
    if (roomId) await creatorApi.leaveRtcRoom(roomId).catch(() => undefined);
    this.session = null;
    this.joinResult = null;
    this.connectPromise = null;
    this.update({
      roomId: null,
      provider: null,
      serverUrl: null,
      state: 'disconnected',
      detail: '',
      microphoneEnabled: false,
      connecting: false,
    });
  }
}

export const creatorLiveMediaService = new CreatorLiveMediaService();

export function useCreatorLiveMedia(): CreatorLiveMediaSnapshot {
  return useSyncExternalStore(
    creatorLiveMediaService.subscribe,
    creatorLiveMediaService.getSnapshot,
    creatorLiveMediaService.getSnapshot,
  );
}
