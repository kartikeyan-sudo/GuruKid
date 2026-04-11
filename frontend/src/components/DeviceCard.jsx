import { Cpu, MemoryStick, Wifi, Clock } from "lucide-react";
import clsx from "clsx";

export default function DeviceCard({ device, onSelect, isActive }) {
  const cpuPercent = device.stats?.cpu ?? 0;
  const ramPercent = device.stats?.ram ?? 0;
  const isOnline = device.status === "online";

  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full text-left p-4 rounded-2xl border transition-all duration-300 hover-lift group",
        isActive
          ? "border-indigo-500/30 bg-indigo-500/5 shadow-glow"
          : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-medium text-sm truncate">{device.nickname || device.name || "Device"}</p>
            {device.blocked && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/20 font-medium">LOCKED</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">{device.email || "No email"}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={clsx(
            "w-2 h-2 rounded-full",
            isOnline ? "bg-emerald-400 status-online" : "bg-slate-600"
          )} />
          <span className={clsx(
            "text-[10px] font-medium",
            isOnline ? "text-emerald-400" : "text-slate-500"
          )}>
            {device.status}
          </span>
        </div>
      </div>

      {/* Stats bars */}
      <div className="grid grid-cols-2 gap-2">
        <StatBar icon={<Cpu size={11} />} label="CPU" value={cpuPercent} color="indigo" />
        <StatBar icon={<MemoryStick size={11} />} label="RAM" value={ramPercent} color="purple" />
      </div>

      {/* Last active */}
      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-500">
        <Clock size={10} />
        <span>Last: {device.lastActive?.slice(11, 19) || device.lastSeen?.slice(11, 19) || "--"}</span>
      </div>
    </button>
  );
}

function StatBar({ icon, label, value, color }) {
  const colorMap = {
    indigo: { bar: "bg-indigo-500", bg: "bg-indigo-500/10" },
    purple: { bar: "bg-purple-500", bg: "bg-purple-500/10" },
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-slate-400">
          {icon} {label}
        </span>
        <span className="text-white font-semibold">{value}%</span>
      </div>
      <div className={`h-1 rounded-full ${c.bg}`}>
        <div
          className={`h-1 rounded-full ${c.bar} transition-all duration-500`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
