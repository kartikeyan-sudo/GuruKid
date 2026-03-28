import { useState, useEffect } from "react";
import { Menu, X, Clock, Power, RotateCcw, Wifi, WifiOff } from "lucide-react";
import clsx from "clsx";

export default function TaskbarNew({
  startMenuOpen,
  setStartMenuOpen,
  onOpenApp,
  onRestart,
  onShutdown,
  onLogout,
  appRegistry,
  windows,
  zoomPercentage,
}) {
  const [time, setTime] = useState(new Date());
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : false);

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const runningApps = Object.values(windows).filter((w) => !w.minimized);

  return (
    <>
      {/* Taskbar */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-slate-900/95 border-t border-slate-800 flex items-center px-3 gap-3 backdrop-blur-sm z-40">
        {/* Start Button */}
        <button
          onClick={() => setStartMenuOpen(!startMenuOpen)}
          className={clsx(
            "p-2 rounded-lg transition hover:bg-slate-700",
            startMenuOpen ? "bg-slate-700 border border-accent/40" : "bg-slate-800"
          )}
        >
          <Menu size={20} className="text-white" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-700" />

        {/* Running Apps */}
        <div className="flex gap-1 flex-nowrap">
          {runningApps.slice(0, 5).map((app) => (
            <button
              key={app.id}
              className="px-3 py-2 rounded-lg bg-slate-700 text-white text-xs hover:bg-slate-600 transition border border-slate-600"
            >
              {app.title}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Zoom Percentage */}
        <div className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
          {zoomPercentage}%
        </div>

        {/* Network */}
        <button
          onClick={() => onOpenApp("network")}
          className={clsx(
            "px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap flex items-center gap-2",
            online
              ? "bg-emerald-500/10 text-emerald-200 border-emerald-400/30"
              : "bg-red-500/10 text-red-200 border-red-400/30"
          )}
          title="Open Network Monitor"
        >
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          {online ? "Online" : "Offline"}
        </button>

        {/* Clock */}
        <div className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700 whitespace-nowrap flex items-center gap-2">
          <Clock size={14} />
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Start Menu */}
      {startMenuOpen && (
        <div className="fixed bottom-16 left-3 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 w-64 z-50 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-white">Start</h2>
            <button
              onClick={() => setStartMenuOpen(false)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Apps Grid */}
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(appRegistry).map(([id, app]) => (
              <button
                key={id}
                onClick={() => onOpenApp(id)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition border border-slate-700 hover:border-accent/40"
              >
                <span className="text-3xl">{app.icon}</span>
                <span className="text-xs text-center text-white font-medium">{app.title}</span>
              </button>
            ))}
          </div>

          {/* Shortcuts */}
          <div className="mt-4 pt-3 border-t border-slate-700 space-y-1">
            <button
              onClick={() => onOpenApp("settings")}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-left text-xs text-slate-300 hover:text-white"
            >
              Settings
            </button>
            <button
              onClick={onRestart}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-left text-xs text-slate-300 hover:text-white flex items-center gap-2"
            >
              <RotateCcw size={14} />
              Restart
            </button>
            <button
              onClick={onShutdown}
              className="w-full px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 transition text-left text-xs text-red-200 border border-red-400/30 flex items-center gap-2"
            >
              <Power size={14} />
              Shutdown
            </button>
            <button
              onClick={onLogout}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-left text-xs text-slate-300 hover:text-white"
            >
              Logout User
            </button>
          </div>
        </div>
      )}
    </>
  );
}
