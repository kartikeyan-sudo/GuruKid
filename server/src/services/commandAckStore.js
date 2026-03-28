const pending = new Map();

export function waitForCommandAck(requestId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error("Timed out waiting for device ack"));
    }, timeoutMs);

    pending.set(requestId, {
      resolve: (payload) => {
        clearTimeout(timer);
        pending.delete(requestId);
        resolve(payload);
      },
      reject: (err) => {
        clearTimeout(timer);
        pending.delete(requestId);
        reject(err instanceof Error ? err : new Error(String(err || "Ack failed")));
      },
    });
  });
}

export function resolveCommandAck(requestId, payload) {
  const waiter = pending.get(requestId);
  if (!waiter) return false;
  waiter.resolve(payload);
  return true;
}

export function rejectCommandAck(requestId, errorMessage) {
  const waiter = pending.get(requestId);
  if (!waiter) return false;
  waiter.reject(new Error(errorMessage || "Device returned failure"));
  return true;
}
