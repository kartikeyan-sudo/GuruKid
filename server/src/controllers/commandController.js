import { queueCommand } from "../websocket/socket.js";
import { emitToDevice } from "../services/socketManager.js";

export function sendCommand(req, res) {
  const { deviceId, type, payload } = req.body || {};
  if (!deviceId || !type) {
    return res.status(400).json({ error: "deviceId and type are required" });
  }
  const cmd = queueCommand({ deviceId, type, payload });
  emitToDevice(deviceId, "command", cmd);
  res.json({ command: cmd });
}
