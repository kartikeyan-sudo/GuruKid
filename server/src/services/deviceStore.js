import dayjs from "dayjs";
import { v4 as uuid } from "uuid";

const devices = new Map();
const commands = [];

export function registerDevice(payload = {}) {
  const deviceId = payload.deviceId || uuid();
  const entry = devices.get(deviceId) || {
    id: deviceId,
    name: payload.name || payload.nickname || "Kid Device",
    nickname: payload.nickname || "",
    email: payload.email || "",
    userId: payload.userId || "",
    deviceKey: payload.deviceKey || "",
    status: "online",
    lastSeen: dayjs().toISOString(),
    lastActive: dayjs().toISOString(),
    stats: { cpu: 0, ram: 0 },
    logs: [],
    blocked: false,
  };
  entry.name = payload.name || payload.nickname || entry.name;
  entry.nickname = payload.nickname || entry.nickname;
  entry.email = payload.email || entry.email;
  entry.userId = payload.userId || entry.userId;
  entry.deviceKey = payload.deviceKey || entry.deviceKey;
  entry.status = "online";
  entry.lastSeen = dayjs().toISOString();
  entry.lastActive = dayjs().toISOString();
  devices.set(deviceId, entry);
  return entry;
}

export function updateDevice(deviceId, data = {}) {
  const current = devices.get(deviceId) || registerDevice({ deviceId });
  const updated = {
    ...current,
    status: data.status || current.status,
    lastSeen: dayjs().toISOString(),
    lastActive: dayjs().toISOString(),
    stats: data.stats || current.stats,
  };
  if (data.log) {
    updated.logs = [
      { id: uuid(), ts: dayjs().toISOString(), ...data.log },
      ...current.logs,
    ].slice(0, 1000);
  }
  devices.set(deviceId, updated);
  return updated;
}

export function addCommand(command) {
  const item = { id: uuid(), ts: dayjs().toISOString(), ...command };
  commands.push(item);
  return item;
}

export function getPendingCommands(deviceId) {
  return commands.filter((c) => c.deviceId === deviceId);
}

export function clearCommands(commandIds = []) {
  for (const id of commandIds) {
    const idx = commands.findIndex((c) => c.id === id);
    if (idx !== -1) commands.splice(idx, 1);
  }
}

export function getDevices() {
  return Array.from(devices.values());
}

export function getDevice(deviceId) {
  return devices.get(deviceId);
}

export function getDevicesByUserId(userId) {
  return Array.from(devices.values()).filter((d) => d.userId === userId);
}

export function setDeviceBlocked(deviceId, blocked) {
  const current = devices.get(deviceId);
  if (!current) return null;
  const updated = {
    ...current,
    blocked: Boolean(blocked),
    lastSeen: dayjs().toISOString(),
  };
  devices.set(deviceId, updated);
  return updated;
}

export function deleteDevice(deviceId) {
  const existing = devices.get(deviceId);
  if (!existing) return false;
  devices.delete(deviceId);

  for (let i = commands.length - 1; i >= 0; i -= 1) {
    if (commands[i].deviceId === deviceId) {
      commands.splice(i, 1);
    }
  }

  return true;
}

export function deleteDevicesByUserId(userId) {
  const deviceIds = Array.from(devices.values())
    .filter((d) => d.userId === userId)
    .map((d) => d.id);

  for (const id of deviceIds) {
    deleteDevice(id);
  }

  return deviceIds;
}

export function clearDeviceHistory(deviceId, scope = "all") {
  const current = devices.get(deviceId);
  if (!current) return null;

  const nextLogs = (current.logs || []).filter((log) => {
    if (scope === "browser") return log.type !== "browser";
    if (scope === "download") return log.type !== "download";
    return false;
  });

  const updated = {
    ...current,
    logs: nextLogs,
    lastSeen: dayjs().toISOString(),
  };
  devices.set(deviceId, updated);
  return updated;
}
