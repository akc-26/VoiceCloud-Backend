import { create } from 'zustand';
import { CreatorProfile } from '../types/creator.types';

interface CreatorProfileState {
  profile: CreatorProfile;
  updateProfile: (partial: Partial<CreatorProfile>) => void;
  setProfile: (profile: CreatorProfile) => void;
}

const initialCreatorProfile: CreatorProfile = {
  id: 'creator-studio-001',
  userId: 'user-vc-creator-001',
  displayName: 'VoiceCloud Official Host',
  handle: '@voicecloud_official',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
  bio: 'Official VoiceCloud audio creator broadcasting high-fidelity podcasts, live music sessions, and voice lounge rooms.',
  verified: true,
  tier: 'Elite',
  followersCount: 14250,
  subscribersCount: 840,
  totalEarningsDiamonds: 458900,
  walletCoins: 12500,
  walletDiamonds: 84300,
  joinedAt: '2025-01-15T00:00:00Z',
  category: 'Podcast & Audio Lounge',
};

export const useCreatorProfileStore = create<CreatorProfileState>((set) => ({
  profile: initialCreatorProfile,
  updateProfile: (partial) =>
    set((state) => ({
      profile: { ...state.profile, ...partial },
    })),
  setProfile: (profile) => set({ profile }),
}));
