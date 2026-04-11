import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Monitor, Users, ShieldAlert, Activity, Clock, Globe, Download,
  Trash2, RefreshCw, Menu, X, Ban, AppWindow
} from "lucide-react";
import DeviceCard from "../components/DeviceCard.jsx";
import CommandPanel from "../components/CommandPanel.jsx";
import {
  blockDeviceSite,
  clearDeviceHistory,
  fetchAdminUsers,
  sendCommand,
  unblockDeviceSite,
} from "../services/api";
import { useDevices } from "../state/useDevices.js";

export default function Dashboard() {
  const { devices, selected, select, load, remove } = useDevices();
  const active = devices.find((d) => d.id === selected) || devices[0];
  const [historyView, setHistoryView] = useState("browser");
  const [historyStatus, setHistoryStatus] = useState("");
  const [users, setUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const browsingHistory = useMemo(
    () => (active?.logs || []).filter((log) => log.type === "browser"),
    [active?.logs]
  );
  const downloadHistory = useMemo(
    () => (active?.logs || []).filter((log) => log.type === "download"),
    [active?.logs]
  );
  const appHistory = useMemo(
    () => (active?.logs || []).filter((log) => log.type === "app-open"),
    [active?.logs]
  );
  const historyItems = historyView === "browser" ? browsingHistory : historyView === "download" ? downloadHistory : appHistory;
  const blockedSites = active?.blockedSites || [];

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const blockedCount = devices.filter((d) => d.blocked).length;

  useEffect(() => {
    const loadAll = async () => {
      await load();
      try { setUsers(await fetchAdminUsers()); } catch { setUsers([]); }
    };
    loadAll();
  }, [load]);

  const handleClearHistory = async () => {
    if (!active) return;
    const label = historyView === "browser" ? "browsing" : historyView === "download" ? "download" : "application";
    if (!window.confirm(`Clear ${label} history for this device?`)) return;
    setHistoryStatus("Clearing...");
    try {
      const scope = historyView === "download" ? "download" : historyView === "apps" ? "app" : "browser";
      await clearDeviceHistory(active.id, scope);
      await load();
      setHistoryStatus("Cleared ✔");
    } catch { setHistoryStatus("Failed"); }
    setTimeout(() => setHistoryStatus(""), 1500);
  };

  const getDomainFromUrl = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    try {
      return new URL(raw).hostname.replace(/^www\./, "");
    } catch {
      return raw.replace(/^https?:\/\//, "").split("/")[0].split(":")[0].replace(/^www\./, "");
    }
  };

  const toggleBlockedSite = async (domain, shouldBlock) => {
    if (!active || !domain) return;
    setHistoryStatus(shouldBlock ? "Blocking site..." : "Unblocking site...");
    try {
      if (shouldBlock) {
        await blockDeviceSite(active.id, domain);
        await sendCommand({ deviceId: active.id, type: "block-site", payload: { domain } });
      } else {
        await unblockDeviceSite(active.id, domain);
        await sendCommand({ deviceId: active.id, type: "unblock-site", payload: { domain } });
      }
      await load();
      setHistoryStatus(shouldBlock ? "Site blocked ✔" : "Site unblocked ✔");
    } catch {
      setHistoryStatus("Action failed");
    }
    setTimeout(() => setHistoryStatus(""), 1400);
  };

  const closeAppFromHistory = async (appId) => {
    if (!active || !appId) return;
    setHistoryStatus("Closing app...");
    try {
      await sendCommand({ deviceId: active.id, type: "close-app", payload: { app: appId } });
      setHistoryStatus("Close command sent ✔");
    } catch {
      setHistoryStatus("Close failed");
    }
    setTimeout(() => setHistoryStatus(""), 1400);
  };

  const sidebarContent = (
    <aside className="space-y-4">
      <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs text-slate-400 font-medium uppercase tracking-wider">Users</h2>
          <span className="text-[10px] text-slate-500">{users.length}</span>
        </div>
        <div className="space-y-1.5 max-h-32 overflow-auto">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400">
                {(u.nickname || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white font-medium truncate">{u.nickname}</p>
                <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-slate-600 text-xs">No users yet</p>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs text-slate-400 font-medium uppercase tracking-wider">Devices</h2>
          <button onClick={load} className="p-1 text-slate-500 hover:text-white transition-all">
            <RefreshCw size={12} />
          </button>
        </div>
        <div className="space-y-2">
          {devices.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              onSelect={() => {
                select(d.id);
                setSidebarOpen(false);
              }}
              isActive={active?.id === d.id}
            />
          ))}
          {devices.length === 0 && (
            <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center">
              <Monitor size={24} className="mx-auto text-slate-600 mb-2" />
              <p className="text-slate-500 text-sm">Waiting for devices...</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="lg:hidden flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200"
        >
          <Menu size={14} />
          Menu
        </button>
        <span className="text-xs text-slate-500">Admin Panel</span>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/70"
            aria-label="Close menu"
          />
          <div className="absolute left-0 top-0 h-full w-[84vw] max-w-[360px] bg-[#090f1d] border-r border-white/10 p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white font-semibold">Navigation</p>
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg bg-white/5 text-slate-300">
                <X size={14} />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Monitor size={18} />} label="Total Devices" value={devices.length} color="indigo" />
        <StatCard icon={<Activity size={18} />} label="Online" value={onlineCount} color="emerald" />
        <StatCard icon={<ShieldAlert size={18} />} label="Blocked" value={blockedCount} color="red" />
        <StatCard icon={<Users size={18} />} label="Users" value={users.length} color="purple" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Sidebar */}
        <div className="hidden lg:block">{sidebarContent}</div>

        {/* Main Content */}
        <main className="space-y-4">
          {active ? (
            <div className="space-y-4">
              {/* Device Overview */}
              <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-lg text-white font-semibold">{active.nickname || active.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{active.email || "No email"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {active.blocked && (
                      <span className="text-[9px] px-2 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/20 font-medium">BLOCKED</span>
                    )}
                    <div className={clsx(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium",
                      active.status === "online"
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        : "bg-white/5 text-slate-400 border border-white/5"
                    )}>
                      <div className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        active.status === "online" ? "bg-emerald-400 status-online" : "bg-slate-600"
                      )} />
                      {active.status}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-slate-500 text-[10px]">Device Key</span>
                    <p className="text-white font-mono text-[10px] truncate mt-0.5">{active.deviceKey || "--"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-slate-500 text-[10px]">Last Active</span>
                    <p className="text-white text-[10px] mt-0.5">{active.lastActive || active.lastSeen || "--"}</p>
                  </div>
                </div>
              </div>

              {/* Commands */}
              <CommandPanel device={active} onDeleted={(id) => remove(id)} />

              {/* History */}
              <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex gap-1 bg-white/[0.03] rounded-xl p-0.5 border border-white/5">
                    <button
                      onClick={() => setHistoryView("browser")}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        historyView === "browser"
                          ? "bg-indigo-500/15 text-indigo-400"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      <Globe size={12} />
                      Browsing
                    </button>
                    <button
                      onClick={() => setHistoryView("download")}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        historyView === "download"
                          ? "bg-indigo-500/15 text-indigo-400"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      <Download size={12} />
                      Downloads
                    </button>
                    <button
                      onClick={() => setHistoryView("apps")}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        historyView === "apps"
                          ? "bg-indigo-500/15 text-indigo-400"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      <AppWindow size={12} />
                      Applications
                    </button>
                  </div>
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 size={11} />
                    Clear
                  </button>
                </div>

                {historyStatus && <p className="text-xs text-emerald-400 mb-2 animate-fade-in">{historyStatus}</p>}

                <div className="space-y-1.5 max-h-48 overflow-auto">
                  {historyItems.map((log) => (
                    <div key={log.id} className="flex items-center gap-2 text-xs text-slate-300 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all">
                      <span className="text-slate-600 text-[10px] font-mono flex-shrink-0">{log.ts?.slice(11, 19)}</span>
                      <span className="truncate flex-1">{log.url || log.message}</span>
                      {historyView === "browser" && (() => {
                        const domain = getDomainFromUrl(log.url || "");
                        const isBlocked = blockedSites.includes(domain);
                        if (!domain) return null;
                        return (
                          <button
                            onClick={() => toggleBlockedSite(domain, !isBlocked)}
                            className={clsx(
                              "px-2 py-1 rounded-lg text-[10px] border transition-all",
                              isBlocked
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                                : "bg-red-500/10 text-red-300 border-red-500/25"
                            )}
                          >
                            {isBlocked ? "Unblock" : "Block"}
                          </button>
                        );
                      })()}
                      {historyView === "apps" && log.appId && (
                        <button
                          onClick={() => closeAppFromHistory(log.appId)}
                          className="px-2 py-1 rounded-lg text-[10px] border bg-amber-500/10 text-amber-300 border-amber-500/25"
                        >
                          Close App
                        </button>
                      )}
                    </div>
                  ))}
                  {historyItems.length === 0 && (
                    <p className="text-slate-600 text-sm text-center py-4">
                      No {historyView === "browser" ? "browsing" : historyView === "download" ? "download" : "application open"} history yet
                    </p>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Blocked Sites</p>
                  <span className="text-[10px] text-slate-500">{blockedSites.length}</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-auto">
                  {blockedSites.map((domain) => (
                    <div key={domain} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <Ban size={12} className="text-red-300" />
                      <span className="text-xs text-slate-200 flex-1 truncate">{domain}</span>
                      <button
                        onClick={() => toggleBlockedSite(domain, false)}
                        className="px-2 py-1 rounded-lg text-[10px] border bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                  {blockedSites.length === 0 && <p className="text-slate-600 text-sm text-center py-3">No blocked sites</p>}
                </div>
              </div>

              {/* Logs */}
              <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-3">Activity Logs</p>
                <div className="space-y-1.5 max-h-56 overflow-auto">
                  {(active.logs || []).map((log) => (
                    <div key={log.id} className="flex items-center gap-2 text-xs text-slate-300 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <Clock size={11} className="text-slate-600 flex-shrink-0" />
                      <span className="text-slate-600 text-[10px] font-mono flex-shrink-0">{log.ts?.slice(11, 19)}</span>
                      <span className="truncate">{log.message || log.url || JSON.stringify(log)}</span>
                    </div>
                  ))}
                  {(active.logs || []).length === 0 && <p className="text-slate-600 text-sm text-center py-4">No logs yet</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl border border-dashed border-white/10 text-center">
              <Monitor size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-500">Select a device to manage</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    indigo: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/15 text-indigo-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/15 text-emerald-400",
    red: "from-red-500/10 to-red-500/5 border-red-500/15 text-red-400",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/15 text-purple-400",
  };

  return (
    <div className={`p-4 rounded-2xl border bg-gradient-to-br hover-lift ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
