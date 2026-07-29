import { create } from 'zustand';

interface AppSettingsState {
  appName: string;
  maintenanceMode: boolean;
  activeRtcProvider: string;
  featureFlags: Record<string, boolean>;
  setMaintenanceMode: (enabled: boolean) => void;
  setActiveRtcProvider: (provider: string) => void;
  setFeatureFlags: (flags: Record<string, boolean>) => void;
}

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  appName: 'VoiceCloud Admin Console',
  maintenanceMode: false,
  activeRtcProvider: 'agora',
  featureFlags: {
    enable_search: true,
    enable_moderation: true,
    enable_cms: true,
    enable_chat: true,
    enable_storage: true,
    enable_uploads: true,
    enable_registration: true,
  },
  setMaintenanceMode: (maintenanceMode) => set({ maintenanceMode }),
  setActiveRtcProvider: (activeRtcProvider) => set({ activeRtcProvider }),
  setFeatureFlags: (featureFlags) => set({ featureFlags }),
}));
