import { create } from "zustand";

export const useMediaStore = create((set) => ({
  mediaItems: [],
  currentIndex: 0,
  openViewer: (items, startPath) => {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    const idx = Math.max(0, list.indexOf(startPath));
    set({ mediaItems: list, currentIndex: idx });
  },
  nextMedia: () =>
    set((state) => {
      if (!state.mediaItems.length) return state;
      return { currentIndex: (state.currentIndex + 1) % state.mediaItems.length };
    }),
  prevMedia: () =>
    set((state) => {
      if (!state.mediaItems.length) return state;
      return { currentIndex: (state.currentIndex - 1 + state.mediaItems.length) % state.mediaItems.length };
    }),
}));

export default useMediaStore;
