import { useState } from "react";
import {
  Eye, Lock, Unlock, Globe, Trash2, RotateCcw, Power,
  ShieldAlert, ShieldOff, UserX, Check, AppWindow, XCircle
} from "lucide-react";
import { blockDevice, deleteUserWithWipe, sendCommand, unblockDevice } from "../services/api";

const quickCommands = [
  { type: "focus", label: "Focus Mode", icon: <Eye size={13} />, variant: "accent" },
  { type: "unlock", label: "Unlock", icon: <Unlock size={13} />, variant: "default" },
  { type: "open-app", label: "Open Browser", icon: <Globe size={13} />, payload: { app: "browser" }, variant: "default" },
  { type: "restart", label: "Restart", icon: <RotateCcw size={13} />, variant: "default" },
  { type: "shutdown", label: "Shutdown", icon: <Power size={13} />, variant: "warning" },
];

const dangerCommands = [
  { type: "erase-data", label: "Erase Data", icon: <Trash2 size={13} /> },
];

const controlledApps = [
  { id: "browser", label: "Browser" },
  { id: "notepad", label: "Notepad" },
  { id: "files", label: "Files" },
  { id: "camera", label: "Camera" },
  { id: "gallery", label: "Gallery" },
  { id: "settings", label: "Settings" },
  { id: "network", label: "Network" },
  { id: "notesPreview", label: "Notes Preview" },
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
    setTimeout(() => setStatus(""), 1200);
  };

  const toggleBlock = async () => {
    setStatus(device.blocked ? "Unblocking..." : "Blocking...");
    if (device.blocked) {
      await unblockDevice(device.id);
      await sendCommand({ deviceId: device.id, type: "unblock" });
      setStatus("Unblocked ✔");
    } else {
      await blockDevice(device.id);
      await sendCommand({ deviceId: device.id, type: "block" });
      setStatus("Blocked ✔");
    }
    setTimeout(() => setStatus(""), 1200);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this user? Local data will be erased first.")) return;
    setStatus("Deleting...");
    await deleteUserWithWipe({ userId: device.userId, deviceId: device.id });
    setStatus("Deleted ✔");
    onDeleted?.(device.id);
  };

  const getVariantClasses = (variant) => {
    switch (variant) {
      case "accent":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20";
      default:
        return "bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:text-white";
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] space-y-4">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Remote Commands</p>

      {/* Quick commands */}
      <div className="flex flex-wrap gap-2">
        {quickCommands.map((cmd) => (
          <button
            key={cmd.type + cmd.label}
            onClick={() => trigger(cmd)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-200 ${getVariantClasses(cmd.variant)}`}
          >
            {cmd.icon}
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Block toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleBlock}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-200 ${
            device.blocked
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
          }`}
        >
          {device.blocked ? <ShieldOff size={13} /> : <ShieldAlert size={13} />}
          {device.blocked ? "Unblock Device" : "Block Device"}
        </button>
      </div>

      {/* Activity Control */}
      <div className="pt-3 border-t border-white/5">
        <p className="text-[10px] text-slate-400/80 font-medium uppercase tracking-wider mb-2">Activity Control</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {controlledApps.map((app) => (
            <div key={app.id} className="p-2 rounded-xl border border-white/5 bg-white/[0.02]">
              <p className="text-xs text-slate-200 mb-2">{app.label}</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => trigger({ type: "open-app", payload: { app: app.id } })}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 text-[11px] transition-all"
                >
                  <AppWindow size={12} />
                  Open
                </button>
                <button
                  onClick={() => trigger({ type: "close-app", payload: { app: app.id } })}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 text-[11px] transition-all"
                >
                  <XCircle size={12} />
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="pt-3 border-t border-white/5">
        <p className="text-[10px] text-red-400/60 font-medium uppercase tracking-wider mb-2">Danger Zone</p>
        <div className="flex flex-wrap gap-2">
          {dangerCommands.map((cmd) => (
            <button
              key={cmd.type}
              onClick={() => trigger(cmd)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-medium transition-all duration-200"
            >
              {cmd.icon}
              {cmd.label}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-medium transition-all duration-200"
          >
            <UserX size={13} />
            Delete User
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 animate-fade-in">
          <Check size={12} />
          {status}
        </div>
      )}
    </div>
  );
}
