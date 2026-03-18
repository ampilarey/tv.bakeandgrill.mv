/**
 * authStore
 * Zustand store that mirrors and supplements AuthContext.
 * AuthContext remains the source-of-truth (JWT logic, React context API);
 * this store provides a selector-friendly alternative for components that
 * would otherwise need to subscribe to the full context.
 */
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,

  // Call this when AuthContext resolves the user
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}));
