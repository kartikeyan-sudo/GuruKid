import { create } from "zustand";

const CONFIG_FILE = "settings.json";

const defaultSettings = {
  pin: "1234",
  wallpaper: null,
  globalZoom: 100,
  theme: "dark",
  person: {
    childName: "Kid User",
    age: "10",
    guardianName: "Parent",
  },
};

export const useSettingsStore = create((set, get) => ({
  settings: defaultSettings,

  loadSettings: () => {
    if (!window.electronAPI) {
      set({ settings: defaultSettings });
      return;
    }
    try {
      const data = window.electronAPI.readFile(CONFIG_FILE);
      const parsed = data ? JSON.parse(data) : defaultSettings;
      set({ settings: { ...defaultSettings, ...parsed } });
    } catch (err) {
      console.error("Error loading settings:", err);
      set({ settings: defaultSettings });
    }
  },

  saveSettings: (updates) => {
    set((state) => {
      const newSettings = { ...state.settings, ...updates };
      if (window.electronAPI) {
        window.electronAPI.writeFile(CONFIG_FILE, JSON.stringify(newSettings, null, 2));
      }
      return { settings: newSettings };
    });
  },

  setWallpaper: (imagePath) => {
    get().saveSettings({ wallpaper: imagePath });
  },

  getWallpaper: () => get().settings.wallpaper,
  getPin: () => get().settings.pin,
  setPin: (pin) => get().saveSettings({ pin }),
  setPersonInfo: (person) => {
    const current = get().settings.person || defaultSettings.person;
    get().saveSettings({ person: { ...current, ...person } });
  },
  setGlobalZoom: (zoom) => get().saveSettings({ globalZoom: zoom }),
  getGlobalZoom: () => get().settings.globalZoom,
}));

export default useSettingsStore;
