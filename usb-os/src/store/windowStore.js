import { create } from "zustand";

export const useWindowStore = create((set, get) => ({
  windows: {},
  activeWindowId: null,
  zIndexCounter: 1000,

  openWindow: (id, title, appType, config = {}) => {
    set((state) => {
      const newZ = state.zIndexCounter + 1;
      return {
        windows: {
          ...state.windows,
          [id]: {
            id,
            title,
            appType,
            x: config.x || 100,
            y: config.y || 80,
            width: config.width || 800,
            height: config.height || 600,
            minimized: false,
            maximized: false,
            zIndex: newZ,
            zoom: 100,
          },
        },
        activeWindowId: id,
        zIndexCounter: newZ,
      };
    });
  },

  closeWindow: (id) => {
    set((state) => {
      const { [id]: _, ...remaining } = state.windows;
      return {
        windows: remaining,
        activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
      };
    });
  },

  focusWindow: (id) => {
    set((state) => {
      if (!state.windows[id]) return state;
      const newZ = state.zIndexCounter + 1;
      return {
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], zIndex: newZ },
        },
        activeWindowId: id,
        zIndexCounter: newZ,
      };
    });
  },

  updateWindow: (id, updates) => {
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], ...updates },
      },
    }));
  },

  minimizeWindow: (id) => {
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], minimized: !state.windows[id].minimized },
      },
    }));
  },

  maximizeWindow: (id) => {
    set((state) => {
      const win = state.windows[id];
      const isMax = win.maximized;
      return {
        windows: {
          ...state.windows,
          [id]: {
            ...win,
            maximized: !isMax,
            x: isMax ? win.prevX || 100 : 0,
            y: isMax ? win.prevY || 80 : 0,
            width: isMax ? win.prevWidth || 800 : window.innerWidth,
            height: isMax ? win.prevHeight || 600 : window.innerHeight - 50,
            prevX: win.x,
            prevY: win.y,
            prevWidth: win.width,
            prevHeight: win.height,
          },
        },
      };
    });
  },

  setZoom: (id, zoom) => {
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], zoom },
      },
    }));
  },

  getAllWindows: () => get().windows,
  getWindow: (id) => get().windows[id],
  getActiveWindow: () => {
    const state = get();
    return state.windows[state.activeWindowId];
  },
}));

export default useWindowStore;
