import { create } from 'zustand';
import type { RoomAccessIssue, RoomReactionEvent, RtcJoinResult } from './types';

interface RoomSessionState {
  roomId: string | null;
  rtc: RtcJoinResult | null;
  socketJoined: boolean;
  connectionState: 'idle' | 'joining' | 'connected' | 'reconnecting' | 'failed';
  accessIssue: RoomAccessIssue | null;
  reactions: RoomReactionEvent[];
  beginJoin: (roomId: string) => void;
  setConnected: (rtc: RtcJoinResult) => void;
  setSocketJoined: (joined: boolean) => void;
  setReconnecting: () => void;
  setFailure: (issue: RoomAccessIssue | null) => void;
  addReaction: (reaction: RoomReactionEvent) => void;
  reset: () => void;
}

const emptyState = {
  roomId: null,
  rtc: null,
  socketJoined: false,
  connectionState: 'idle' as const,
  accessIssue: null,
  reactions: [] as RoomReactionEvent[],
};

export const useRoomSessionStore = create<RoomSessionState>((set) => ({
  ...emptyState,
  beginJoin: (roomId) => set({ roomId, connectionState: 'joining', accessIssue: null }),
  setConnected: (rtc) => set({ roomId: rtc.roomId, rtc, connectionState: 'connected', accessIssue: null }),
  setSocketJoined: (socketJoined) => set({ socketJoined }),
  setReconnecting: () => set({ connectionState: 'reconnecting' }),
  setFailure: (accessIssue) => set({ connectionState: 'failed', accessIssue }),
  addReaction: (reaction) => set((state) => {
    const duplicate = state.reactions.some((item) =>
      item.roomId === reaction.roomId &&
      item.userId === reaction.userId &&
      item.emoji === reaction.emoji &&
      item.timestamp === reaction.timestamp,
    );
    return duplicate ? state : { reactions: [...state.reactions.slice(-20), reaction] };
  }),
  reset: () => set(emptyState),
}));
