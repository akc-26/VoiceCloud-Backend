import { BRAND_CONFIG } from '@shared/branding';
import { create } from 'zustand';
import { CreatorProfile } from '../types/creator.types';

interface CreatorProfileState {
  profile: CreatorProfile;
  updateProfile: (partial: Partial<CreatorProfile>) => void;
  setProfile: (profile: CreatorProfile) => void;
}

const initialCreatorProfile: CreatorProfile = {
  id: '',
  userId: '',
  displayName: BRAND_CONFIG.defaults.officialCreatorDisplayName,
  handle: BRAND_CONFIG.defaults.officialCreatorHandle,
  avatarUrl: '',
  coverUrl: '',
  bio: BRAND_CONFIG.defaults.officialCreatorBio,
  verified: false,
  tier: 'Standard',
  followersCount: 0,
  subscribersCount: 0,
  totalEarningsDiamonds: 0,
  walletCoins: 0,
  walletDiamonds: 0,
  joinedAt: '',
  category: 'Creator',
};

export const useCreatorProfileStore = create<CreatorProfileState>((set) => ({
  profile: initialCreatorProfile,
  updateProfile: (partial) =>
    set((state) => ({
      profile: { ...state.profile, ...partial },
    })),
  setProfile: (profile) => set({ profile }),
}));
