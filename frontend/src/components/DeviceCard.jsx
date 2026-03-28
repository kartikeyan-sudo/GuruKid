import { Cpu, MemoryStick, Wifi } from "lucide-react";
import clsx from "clsx";

export default function DeviceCard({ device, onSelect, isActive }) {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full text-left p-4 rounded-xl border transition shadow-sm",
        isActive ? "border-accent/60 bg-card" : "border-slate-800 bg-slate-900 hover:border-accent/40"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">{device.nickname || device.name || "Device"}</p>
          <p className="text-xs text-slate-400">{device.email || "No email"}</p>
          <p className="text-xs text-slate-500">ID: {device.id}</p>
          <p className="text-xs text-slate-500">Key: {device.deviceKey || "--"}</p>
        </div>
        <div className="flex items-center gap-2">
          {device.blocked && <span className="text-[10px] px-2 py-1 rounded-full bg-red-500/20 text-red-200">blocked</span>}
          <span
            className={clsx(
              "text-xs px-2 py-1 rounded-full",
              device.status === "online" ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-700 text-slate-300"
            )}
          >
            {device.status}
          </span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-300">
        <Metric icon={<Cpu size={14} />} label="CPU" value={`${device.stats?.cpu ?? 0}%`} />
        <Metric icon={<MemoryStick size={14} />} label="RAM" value={`${device.stats?.ram ?? 0}%`} />
        <Metric icon={<Wifi size={14} />} label="Last" value={device.lastActive?.slice(11, 19) || device.lastSeen?.slice(11, 19) || "--"} />
      </div>
    </button>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded-lg">
      {icon}
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
