import { create } from "zustand";

export const useFolderStore = create((set) => ({
  targetDir: null,
  setTargetDir: (dir) => set({ targetDir: dir }),
  clearTargetDir: () => set({ targetDir: null }),
}));

export default useFolderStore;
