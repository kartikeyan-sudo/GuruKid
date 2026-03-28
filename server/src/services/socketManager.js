let ioRef = null;

export function attachIO(io) {
  ioRef = io;
}

export function emitToDevice(deviceId, event, payload) {
  if (!ioRef) return;
  ioRef.to(deviceId).emit(event, payload);
}

export function emitToAdmins(event, payload) {
  if (!ioRef) return;
  ioRef.to("admins").emit(event, payload);
}

export function getIO() {
  return ioRef;
}
