import { io } from "socket.io-client";

const deviceKey = window.electronAPI?.getDeviceKey?.() || "";

function getSession() {
  return window.electronAPI?.getCurrentUser?.() || null;
}

function getDeviceIdentity() {
  const session = getSession();
  return {
    deviceId: deviceKey,
    deviceKey,
    userId: session?.userId || "",
    nickname: session?.nickname || "Guest",
    email: session?.email || "",
    name: session?.nickname || "GuruKid USB",
  };
}

export const socket = io(import.meta.env.VITE_WS_URL || "http://localhost:4000", {
  autoConnect: true,
});

socket.on("connect", () => {
  socket.emit("register", getDeviceIdentity());
});

export function sendLog(log) {
  const identity = getDeviceIdentity();
  socket.emit("log", { deviceId: identity.deviceId, log });
}

export function sendStats(stats) {
  const identity = getDeviceIdentity();
  socket.emit("stats", { deviceId: identity.deviceId, stats });
}

export function pullCommands() {
  const identity = getDeviceIdentity();
  socket.emit("commands:pull", { deviceId: identity.deviceId });
}

export function sendCommandResult({ requestId, status, message, data }) {
  socket.emit("command:result", { requestId, status, message, data });
}

socket.on("command", (cmd) => {
  window.dispatchEvent(new CustomEvent("gurukid:command", { detail: cmd }));
});

export function getDeviceId() {
  return deviceKey;
}

export function registerCurrentSessionDevice() {
  if (!socket.connected) return;
  socket.emit("register", getDeviceIdentity());
}
