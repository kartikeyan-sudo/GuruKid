import { v4 as uuid } from "uuid";
import { emitToDevice, emitToAdmins } from "./socketManager.js";
import { waitForCommandAck } from "./commandAckStore.js";
import { deleteDevicesByUserId, getDevice } from "./deviceStore.js";
import { deleteUserById } from "./authStore.js";

export async function wipeUserDataThenDeleteUser({ userId, deviceId }) {
  if (!userId || !deviceId) {
    throw new Error("userId and deviceId are required");
  }

  const requestId = uuid();
  emitToDevice(deviceId, "command", {
    id: requestId,
    type: "erase-data",
    payload: {
      requestId,
      userId,
      reason: "admin-delete-user",
    },
  });

  await waitForCommandAck(requestId, 20000);

  const deleted = await deleteUserById(userId);
  if (!deleted) {
    throw new Error("Failed to delete user from database");
  }

  const removedDeviceIds = deleteDevicesByUserId(userId);
  for (const id of removedDeviceIds) {
    emitToAdmins("device:remove", { id });
  }

  return { success: true, removedDeviceIds };
}

export function getUserDeleteContextByDevice(deviceId) {
  const device = getDevice(deviceId);
  if (!device) {
    throw new Error("Device not found");
  }
  if (!device.userId) {
    throw new Error("No user bound to this device");
  }
  return { userId: device.userId, deviceId: device.id };
}
