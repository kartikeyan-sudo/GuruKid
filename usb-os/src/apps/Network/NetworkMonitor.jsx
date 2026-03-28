import { useEffect, useMemo, useState } from "react";
import { Wifi, WifiOff, Activity, RefreshCw } from "lucide-react";
import clsx from "clsx";

function formatUptime(seconds) {
  const s = Number(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

export default function NetworkMonitorApp() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [error, setError] = useState("");

  const browserConnection = useMemo(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return null;
    return {
      type: conn.effectiveType || "unknown",
      downlink: conn.downlink || 0,
      rtt: conn.rtt || 0,
      saveData: !!conn.saveData,
    };
  }, [status?.online]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await window.electronAPI?.getNetworkStatus?.();
      setStatus(data || null);
      setLastChecked(new Date());
    } catch (err) {
      setError(err?.message || "Unable to fetch network status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);

    const onlineHandler = () => refresh();
    const offlineHandler = () => refresh();
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    return () => {
      clearInterval(timer);
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  const online = status?.online;

  return (
    <div className="h-full flex flex-col gap-3 p-3 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {online ? <Wifi className="text-emerald-300" size={18} /> : <WifiOff className="text-red-300" size={18} />}
          <p className="text-sm font-semibold text-white">Network and WiFi Monitor</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-60 flex items-center gap-1"
        >
          <RefreshCw size={12} className={clsx(loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className={clsx(
        "rounded-lg border px-3 py-2 text-sm",
        online ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200" : "bg-red-500/10 border-red-400/30 text-red-200"
      )}>
        Status: {online ? "Online" : "Offline"}
      </div>

      {error && <div className="text-xs text-red-300">{error}</div>}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Card label="Host" value={status?.hostname || "--"} />
        <Card label="Platform" value={status?.platform || "--"} />
        <Card label="System Uptime" value={formatUptime(status?.uptimeSec)} />
        <Card label="Last Checked" value={lastChecked ? lastChecked.toLocaleTimeString() : "--"} />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 text-sm font-medium">
          <Activity size={14} /> Browser Network Hints
        </div>
        {browserConnection ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Card label="Connection Type" value={browserConnection.type} />
            <Card label="Downlink" value={`${browserConnection.downlink} Mbps`} />
            <Card label="RTT" value={`${browserConnection.rtt} ms`} />
            <Card label="Data Saver" value={browserConnection.saveData ? "On" : "Off"} />
          </div>
        ) : (
          <p className="text-xs text-slate-500">Network Information API not available on this device.</p>
        )}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 flex-1 overflow-auto">
        <p className="text-sm text-slate-200 font-medium mb-2">Adapters</p>
        {(status?.interfaces || []).length === 0 ? (
          <p className="text-xs text-slate-500">No active network adapters detected.</p>
        ) : (
          <div className="space-y-2">
            {(status?.interfaces || []).map((net) => (
              <div key={net.name} className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-xs">
                <p className="text-slate-100 font-semibold">{net.name} {net.isWifi ? "(WiFi)" : ""}</p>
                <p className="text-slate-400">IPv4: {net.ipv4 || "--"}</p>
                <p className="text-slate-400">IPv6: {net.ipv6 || "--"}</p>
                <p className="text-slate-500">MAC: {net.mac || "--"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-2">
      <p className="text-slate-500">{label}</p>
      <p className="text-slate-100 truncate">{value || "--"}</p>
    </div>
  );
}
