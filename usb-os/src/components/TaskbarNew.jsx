import { useState, useEffect } from "react";
import {
  Menu, X, Clock, Power, RotateCcw, Wifi, WifiOff, LogOut, ChevronUp,
  Search, Settings, Battery, BatteryCharging
} from "lucide-react";
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

  const formattedTime = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formattedDate = time.toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <>
      {/* ─── Taskbar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center taskbar-animate">
        <div className="flex items-center gap-1 px-2 py-1.5 mx-4 mb-2 rounded-2xl glass-heavy shadow-taskbar"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Start Button */}
          <button
            onClick={() => setStartMenuOpen(!startMenuOpen)}
            className={clsx(
              "p-2.5 rounded-xl transition-all duration-200",
              startMenuOpen
                ? "bg-indigo-500/20 text-indigo-400 shadow-glow"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Menu size={18} />
          </button>

          {/* Search */}
          <button
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            title="Search"
          >
            <Search size={18} />
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Pinned/Running Apps - Centered */}
          <div className="flex items-center gap-1">
            {Object.entries(appRegistry).slice(0, 6).map(([appId, app]) => {
              const isRunning = runningApps.some((w) => w.appType === appId);
              return (
                <button
                  key={appId}
                  onClick={() => onOpenApp(appId)}
                  className={clsx(
                    "relative p-2.5 rounded-xl transition-all duration-200 group",
                    isRunning
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                  title={app.title}
                >
                  <span className="text-lg group-hover:scale-110 inline-block transition-transform duration-200">
                    {app.icon}
                  </span>
                  {/* Active indicator dot */}
                  {isRunning && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400 shadow-glow" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* System Tray */}
          <div className="flex items-center gap-0.5">
            {/* Network */}
            <button
              onClick={() => onOpenApp("network")}
              className={clsx(
                "p-2 rounded-lg transition-all duration-200",
                online
                  ? "text-emerald-400 hover:bg-emerald-500/10"
                  : "text-red-400 hover:bg-red-500/10"
              )}
              title={online ? "Online" : "Offline"}
            >
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            </button>

            {/* Battery mock */}
            <div className="p-2 text-slate-400">
              <BatteryCharging size={14} />
            </div>

            {/* Clock */}
            <button className="px-3 py-1.5 rounded-lg text-slate-300 hover:bg-white/5 transition-all duration-200 text-right">
              <div className="text-xs font-medium leading-tight">{formattedTime}</div>
              <div className="text-[10px] text-slate-500 leading-tight">{formattedDate}</div>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Start Menu ─── */}
      {startMenuOpen && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 glass-heavy rounded-3xl shadow-2xl p-5 w-[400px] z-50 start-menu-animate"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white tracking-tight">Start</h2>
            <button
              onClick={() => setStartMenuOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search bar in start menu */}
          <div className="mb-4 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              placeholder="Search apps..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/40 transition-all"
            />
          </div>

          {/* Pinned Apps */}
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Pinned</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {Object.entries(appRegistry).map(([id, app]) => (
              <button
                key={id}
                onClick={() => onOpenApp(id)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-all duration-200 group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{app.icon}</span>
                <span className="text-[11px] text-slate-300 font-medium text-center leading-tight">{app.title}</span>
              </button>
            ))}
          </div>

          {/* Bottom actions */}
          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => onOpenApp("settings")}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                title="Settings"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onRestart}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                title="Restart"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={onShutdown}
                className="p-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Shutdown"
              >
                <Power size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
