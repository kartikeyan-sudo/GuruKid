import { create } from "zustand";

export const useNotePreviewStore = create((set) => ({
  filePath: "",
  setFilePath: (path) => set({ filePath: path || "" }),
}));

export default useNotePreviewStore;
