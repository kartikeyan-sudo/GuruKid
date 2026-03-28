import {
  registerDevice,
  getDevices,
  getDevice,
  updateDevice,
  setDeviceBlocked,
  deleteDevice,
  clearDeviceHistory,
} from "../services/deviceStore.js";
import { emitToAdmins } from "../services/socketManager.js";
import { getUserDeleteContextByDevice, wipeUserDataThenDeleteUser } from "../services/adminDeletionService.js";

export function registerDeviceHttp(req, res) {
  const device = registerDevice(req.body || {});
  emitToAdmins("device:update", device);
  res.json({ device });
}

export function listDevices(req, res) {
  res.json({ devices: getDevices() });
}

export function getDeviceById(req, res) {
  const device = getDevice(req.params.id);
  if (!device) return res.status(404).json({ error: "Not found" });
  res.json({ device });
}

export function pushStatus(req, res) {
  const deviceId = req.params.id;
  const device = updateDevice(deviceId, req.body || {});
  emitToAdmins("device:update", device);
  res.json({ device });
}

export function blockDevice(req, res) {
  const device = setDeviceBlocked(req.params.id, true);
  if (!device) return res.status(404).json({ error: "Not found" });
  emitToAdmins("device:update", device);
  res.json({ device });
}

export function unblockDevice(req, res) {
  const device = setDeviceBlocked(req.params.id, false);
  if (!device) return res.status(404).json({ error: "Not found" });
  emitToAdmins("device:update", device);
  res.json({ device });
}

export async function removeDevice(req, res) {
  try {
    const { userId, deviceId } = getUserDeleteContextByDevice(req.params.id);
    const result = await wipeUserDataThenDeleteUser({ userId, deviceId });
    return res.json(result);
  } catch (err) {
    // Fallback for orphan device entries without user linkage.
    if ((err?.message || "").includes("No user bound")) {
      const ok = deleteDevice(req.params.id);
      if (!ok) return res.status(404).json({ error: "Not found" });
      emitToAdmins("device:remove", { id: req.params.id });
      return res.json({ success: true, removedDeviceIds: [req.params.id] });
    }

    const notFound = (err?.message || "").includes("not found") || (err?.message || "").includes("Device not found");
    return res.status(notFound ? 404 : 409).json({ error: err.message || "Delete failed" });
  }
}

export function clearHistory(req, res) {
  const scope = req.body?.scope || "all";
  if (!["all", "browser", "download"].includes(scope)) {
    return res.status(400).json({ error: "Invalid scope" });
  }

  const device = clearDeviceHistory(req.params.id, scope);
  if (!device) return res.status(404).json({ error: "Not found" });

  emitToAdmins("device:update", device);
  return res.json({ device });
}
