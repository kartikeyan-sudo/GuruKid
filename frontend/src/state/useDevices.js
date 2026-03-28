import { create } from "zustand";
import { fetchDevices } from "../services/api";
import { socket } from "../services/socket";

export const useDevices = create((set, get) => ({
  devices: [],
  selected: null,
  loading: false,
  select: (id) => set({ selected: id }),
  load: async () => {
    set({ loading: true });
    try {
      const devices = await fetchDevices();
      set({ devices });
    } catch {
      set({ devices: [] });
    } finally {
      set({ loading: false });
    }
  },
  upsert: (device) => {
    const current = get().devices;
    const idx = current.findIndex((d) => d.id === device.id);
    const updated = idx === -1 ? [device, ...current] : current.map((d) => (d.id === device.id ? device : d));
    set({ devices: updated });
  },
  remove: (id) => {
    const next = get().devices.filter((d) => d.id !== id);
    const selected = get().selected === id ? next[0]?.id || null : get().selected;
    set({ devices: next, selected });
  },
}));

socket.on("device:update", (device) => {
  useDevices.getState().upsert(device);
});

socket.on("device:remove", ({ id }) => {
  useDevices.getState().remove(id);
});
