import { attachIO, emitToAdmins } from "../services/socketManager.js";
import {
  registerDevice,
  updateDevice,
  addCommand,
  clearCommands,
  getPendingCommands,
} from "../services/deviceStore.js";
import { ADMIN_TOKEN } from "../middleware/adminAuth.js";
import { rejectCommandAck, resolveCommandAck } from "../services/commandAckStore.js";

export function initSocket(io) {
  attachIO(io);

  io.on("connection", (socket) => {
    socket.on("register", (payload) => {
      const device = registerDevice(payload);
      socket.join(device.id);
      socket.emit("registered", { device });
      emitToAdmins("device:update", device);
    });

    socket.on("stats", ({ deviceId, stats }) => {
      const device = updateDevice(deviceId, { stats });
      emitToAdmins("device:update", device);
    });

    socket.on("log", ({ deviceId, log }) => {
      const device = updateDevice(deviceId, { log });
      emitToAdmins("device:update", device);
    });

    socket.on("commands:pull", ({ deviceId }) => {
      const pending = getPendingCommands(deviceId);
      if (pending.length) {
        socket.emit("commands", pending);
        clearCommands(pending.map((p) => p.id));
      }
    });

    socket.on("admin:join", ({ token } = {}) => {
      if (!token || token !== ADMIN_TOKEN) return;
      socket.join("admins");
    });

    socket.on("command:result", ({ requestId, status, message, data } = {}) => {
      if (!requestId) return;
      if (status === "ok") {
        resolveCommandAck(requestId, { message: message || "ok", data: data || null });
      } else {
        rejectCommandAck(requestId, message || "Device reported failure");
      }
    });
  });
}

export function queueCommand(command) {
  return addCommand(command);
}
