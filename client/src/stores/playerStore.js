/**
 * playerStore
 * Global player state shared between PlayerPage and its hooks.
 * Using Zustand for a minimal, hook-friendly alternative to prop-drilling.
 */
import { create } from 'zustand';

export const usePlayerStore = create((set) => ({
  currentChannel: null,
  isPlaying: false,
  volume: 1,
  isMuted: false,
  retryCount: 0,
  videoError: null,
  videoLoading: false,

  setCurrentChannel: (channel) => set({
    currentChannel: channel,
    videoError: null,
    retryCount: 0,
  }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => set({ volume: v }),
  setIsMuted: (v) => set({ isMuted: v }),
  incrementRetry: () => set((s) => ({ retryCount: s.retryCount + 1 })),
  resetRetry: () => set({ retryCount: 0 }),
  setVideoError: (err) => set({ videoError: err }),
  setVideoLoading: (v) => set({ videoLoading: v }),
}));
