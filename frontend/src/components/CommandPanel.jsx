import { useState } from "react";
import { blockDevice, deleteUserWithWipe, sendCommand, unblockDevice } from "../services/api";

const quickCommands = [
  { type: "focus", label: "Focus Mode" },
  { type: "unlock", label: "Unlock" },
  { type: "open-app", label: "Open Browser", payload: { app: "browser" } },
  { type: "erase-data", label: "Erase Data" },
  { type: "restart", label: "Restart" },
  { type: "shutdown", label: "Shutdown" },
];

export default function CommandPanel({ device, onDeleted }) {
  const [status, setStatus] = useState("");
  if (!device) return null;

  const trigger = async (cmd) => {
    setStatus("Sending...");
    const payload = cmd.type === "erase-data"
      ? { ...(cmd.payload || {}), userId: device.userId }
      : cmd.payload;
    await sendCommand({ deviceId: device.id, type: cmd.type, payload });
    setStatus("Sent ✔");
    setTimeout(() => setStatus(""), 1000);
  };

  const toggleBlock = async () => {
    setStatus(device.blocked ? "Unblocking..." : "Blocking...");
    if (device.blocked) {
      await unblockDevice(device.id);
      await sendCommand({ deviceId: device.id, type: "unblock" });
      setStatus("Device unblocked ✔");
    } else {
      await blockDevice(device.id);
      await sendCommand({ deviceId: device.id, type: "block" });
      setStatus("Device blocked ✔");
    }
    setTimeout(() => setStatus(""), 1200);
  };

  const handleDelete = async () => {
    const ok = window.confirm("Delete this user? Local user data on this device will be erased first, then DB data will be deleted.");
    if (!ok) return;
    setStatus("Erasing local data...");
    await deleteUserWithWipe({ userId: device.userId, deviceId: device.id });
    setStatus("User deleted after local wipe ✔");
    onDeleted?.(device.id);
  };

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-card">
      <p className="text-sm text-slate-400 mb-2">Commands</p>
      <div className="flex flex-wrap gap-2">
        {quickCommands.map((cmd) => (
          <button
            key={cmd.type + cmd.label}
            onClick={() => trigger(cmd)}
            className="px-3 py-2 rounded-lg bg-accent/20 text-accent border border-accent/50 text-sm"
          >
            {cmd.label}
          </button>
        ))}
        <button
          onClick={toggleBlock}
          className="px-3 py-2 rounded-lg bg-amber-400/20 text-amber-200 border border-amber-300/40 text-sm"
        >
          {device.blocked ? "Unblock Client" : "Block Client"}
        </button>
        <button
          onClick={handleDelete}
          className="px-3 py-2 rounded-lg bg-red-500/20 text-red-200 border border-red-400/40 text-sm"
        >
          Delete Client
        </button>
      </div>
      {status && <p className="text-xs text-emerald-300 mt-2">{status}</p>}
    </div>
  );
}
