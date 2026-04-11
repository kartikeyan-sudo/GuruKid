import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, RotateCw, Plus, X, Download, DownloadCloud, Search, Globe } from "lucide-react";
import { sendLog } from "../../services/socket.js";
import { useSettingsStore } from "../../store/settingsStore.js";
import clsx from "clsx";

export default function BrowserApp() {
  const [tabs, setTabs] = useState([{ id: 1, title: "Google", url: "https://www.google.com" }]);
  const [activeTab, setActiveTab] = useState(1);
  const [downloads, setDownloads] = useState([]);
  const [downloadsPanelOpen, setDownloadsPanelOpen] = useState(false);
  const [addressInput, setAddressInput] = useState("https://www.google.com");
  const [isLoading, setIsLoading] = useState(false);
  const webviewRef = useRef(null);
  const addressInputRef = useRef(null);
  const completionPromptedRef = useRef(new Set());
  const blockedSites = useSettingsStore((s) => s.settings.blockedSites || []);

  const activeTabData = tabs.find((t) => t.id === activeTab);

  const openDownloadsInOs = () => {
    window.dispatchEvent(new CustomEvent("os-open-folder", { detail: { dir: "downloads" } }));
  };

  useEffect(() => {
    setAddressInput(activeTabData?.url || "https://www.google.com");
  }, [activeTabData?.id, activeTabData?.url]);

  useEffect(() => {
    const handleShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        addressInputRef.current?.focus();
        addressInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    return () => {
      try {
        if (webviewRef.current) {
          webviewRef.current.stop?.();
          webviewRef.current.src = "about:blank";
        }
      } catch { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleNavigate = (e) => {
      const nextUrl = e?.url || "";
      if (!nextUrl) return;
      const host = getHost(nextUrl);
      if (isBlockedHost(host)) {
        const html = `<html><body style="background:#080d1a;color:white;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><div style="font-size:48px;margin-bottom:16px">🚫</div><h1 style="font-size:20px;font-weight:600">Domain Blocked</h1><p style="color:#94a3b8;margin-top:8px">${host} is blocked by parental controls</p></div></body></html>`;
        if (webviewRef.current) webviewRef.current.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
        return;
      }
      setTabs((prev) => prev.map((t) => (t.id === activeTab ? { ...t, url: nextUrl } : t)));
      setAddressInput(nextUrl);
      setIsLoading(false);
      sendLog({ type: "browser", action: "visit", url: nextUrl });
    };

    const handleTitle = (e) => {
      const title = e?.title?.trim();
      if (!title) return;
      setTabs((prev) => prev.map((t) => (t.id === activeTab ? { ...t, title } : t)));
    };

    const handleStartLoading = () => setIsLoading(true);
    const handleStopLoading = () => setIsLoading(false);

    webview.addEventListener("did-navigate", handleNavigate);
    webview.addEventListener("did-navigate-in-page", handleNavigate);
    webview.addEventListener("page-title-updated", handleTitle);
    webview.addEventListener("did-start-loading", handleStartLoading);
    webview.addEventListener("did-stop-loading", handleStopLoading);
    webview.addEventListener("dom-ready", () => webview.focus());

    return () => {
      webview.removeEventListener("did-navigate", handleNavigate);
      webview.removeEventListener("did-navigate-in-page", handleNavigate);
      webview.removeEventListener("page-title-updated", handleTitle);
      webview.removeEventListener("did-start-loading", handleStartLoading);
      webview.removeEventListener("did-stop-loading", handleStopLoading);
    };
  }, [activeTab]);

  // Download listeners
  useEffect(() => {
    if (!window.electronAPI) return;
    const unsubStarted = window.electronAPI.on("download-started", (data) => {
      setDownloads((d) => d.some((dl) => dl.id === data.id) ? d : [data, ...d]);
      setDownloadsPanelOpen(true);
      sendLog({ type: "download", action: "started", filename: data.filename });
    });
    const unsubProgress = window.electronAPI.on("download-progress", (data) => {
      setDownloads((d) => {
        const existing = d.find((dl) => dl.id === data.id);
        if (existing) return d.map((dl) => dl.id === data.id ? { ...dl, progress: data.progress, total: data.total, percent: data.percent } : dl);
        return [{ id: data.id, filename: data.filename, state: "in-progress", percent: 0, ...data }, ...d];
      });
    });
    const unsubCompleted = window.electronAPI.on("download-completed", (data) => {
      setDownloads((d) => {
        const has = d.some((dl) => dl.id === data.id);
        return has
          ? d.map((dl) => dl.id === data.id ? { ...dl, ...data, state: "completed", percent: 100 } : dl)
          : [{ ...data, state: "completed", percent: 100 }, ...d];
      });
      sendLog({ type: "download", action: "completed", filename: data.filename, path: data.path });
      window.dispatchEvent(new CustomEvent("os-storage-updated", { detail: { area: "downloads" } }));
      if (!completionPromptedRef.current.has(data.id)) {
        completionPromptedRef.current.add(data.id);
        if (window.confirm(`${data.filename} downloaded. Open in Files?`)) openDownloadsInOs();
      }
    });
    const unsubCancelled = window.electronAPI.on("download-cancelled", (data) => {
      setDownloads((d) => d.map((dl) => dl.id === data.id ? { ...dl, state: "cancelled" } : dl));
    });
    const unsubFailed = window.electronAPI.on("download-failed", (data) => {
      setDownloads((d) => d.map((dl) => dl.id === data.id ? { ...dl, state: "failed", error: data.error } : dl));
      sendLog({ type: "download", action: "failed", filename: data.filename, error: data.error });
    });
    return () => { unsubStarted?.(); unsubProgress?.(); unsubCompleted?.(); unsubCancelled?.(); unsubFailed?.(); };
  }, []);

  const normalizeInputToUrl = (input) => {
    const value = (input || "").trim();
    if (!value) return "https://www.google.com";
    if (/^(https?:|file:|about:|data:)/i.test(value)) return value;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`;
    return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
  };

  const getHost = (input) => {
    try {
      return new URL(input).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return String(input || "")
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .split("/")[0]
        .split(":")[0]
        .replace(/^www\./, "");
    }
  };

  const isBlockedHost = (host) => (blockedSites || []).some((d) => host.includes(String(d).toLowerCase()));

  const navigate = (input) => {
    const url = normalizeInputToUrl(input);
    const host = getHost(url);
    if (isBlockedHost(host)) {
      const html = `<html><body style="background:#080d1a;color:white;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><div style="font-size:48px;margin-bottom:16px">🚫</div><h1 style="font-size:20px;font-weight:600">Domain Blocked</h1><p style="color:#94a3b8;margin-top:8px">${host} is blocked by parental controls</p></div></body></html>`;
      if (webviewRef.current) webviewRef.current.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
      return;
    }
    setIsLoading(true);
    sendLog({ type: "browser", url, action: "navigate" });
    setTabs((prev) => prev.map((t) => (t.id === activeTab ? { ...t, url } : t)));
    setAddressInput(url);
    if (webviewRef.current) webviewRef.current.loadURL(url);
  };

  const goBack = () => webviewRef.current?.canGoBack?.() && webviewRef.current.goBack();
  const goForward = () => webviewRef.current?.canGoForward?.() && webviewRef.current.goForward();
  const reload = () => webviewRef.current?.reload();

  const newTab = () => {
    const id = Math.max(...tabs.map((t) => t.id), 0) + 1;
    setTabs([...tabs, { id, title: "Google", url: "https://www.google.com" }]);
    setActiveTab(id);
  };

  const closeTab = (id) => {
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (activeTab === id) setActiveTab(newTabs[0]?.id);
  };

  return (
    <div className="flex flex-col h-full bg-[#080d1a] rounded-lg overflow-hidden">
      {/* Loading bar */}
      {isLoading && (
        <div className="h-0.5 bg-indigo-500/20 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-shimmer" style={{ width: "60%" }} />
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center gap-0.5 px-2 pt-1.5 pb-0 bg-[#0a0f1a] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-medium whitespace-nowrap transition-all duration-200 max-w-[180px]",
              activeTab === tab.id
                ? "bg-[#080d1a] text-white"
                : "bg-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"
            )}
          >
            <Globe size={12} className="flex-shrink-0 text-slate-500" />
            <span className="truncate">{tab.title}</span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                className="ml-1 p-0.5 hover:bg-white/10 rounded transition-colors flex-shrink-0"
              >
                <X size={11} />
              </button>
            )}
          </button>
        ))}
        <button
          onClick={newTab}
          className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Toolbar */}
      <form
        className="flex items-center gap-2 px-3 py-2 bg-[#080d1a] border-b border-white/5"
        onSubmit={(e) => { e.preventDefault(); navigate(addressInput); }}
      >
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={goBack} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Back">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={goForward} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Forward">
            <ChevronRight size={16} />
          </button>
          <button type="button" onClick={reload} className={clsx("p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all", isLoading && "animate-spin")} title="Reload">
            <RotateCw size={16} />
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            ref={addressInputRef}
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && navigate(addressInput)}
            placeholder="Search Google or type a URL"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/30 focus:bg-white/[0.07] transition-all"
          />
        </div>

        {/* Downloads */}
        <button
          type="button"
          onClick={() => setDownloadsPanelOpen(!downloadsPanelOpen)}
          className="relative p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          title="Downloads"
        >
          <Download size={16} />
          {downloads.some((d) => d.state === "in-progress") && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center font-bold">
              {downloads.filter((d) => d.state === "in-progress").length}
            </span>
          )}
        </button>
      </form>

      {/* Webview */}
      <div className="flex-1 overflow-hidden">
        <webview
          ref={webviewRef}
          src={activeTabData?.url || "about:blank"}
          tabIndex={0}
          style={{ width: "100%", height: "100%", background: "#080d1a" }}
          onClick={() => webviewRef.current?.focus()}
        />
      </div>

      {/* Downloads Panel */}
      {downloadsPanelOpen && (
        <div className="border-t border-white/5 bg-[#0a0f1a] p-3 max-h-40 overflow-auto animate-slide-up">
          {downloads.length === 0 ? (
            <p className="text-xs text-slate-600">No downloads</p>
          ) : (
            downloads.map((dl) => (
              <div key={dl.id} className="flex items-center gap-3 p-2 mb-1.5 rounded-xl bg-white/5">
                <DownloadCloud size={14} className={clsx(dl.state === "completed" ? "text-emerald-400" : "text-indigo-400")} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{dl.filename}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-white/5 rounded-full h-1">
                      <div
                        className={clsx("h-1 rounded-full transition-all duration-300", dl.state === "completed" ? "bg-emerald-500" : dl.state === "failed" ? "bg-red-500" : "bg-indigo-500")}
                        style={{ width: `${dl.percent || 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">{Math.round(dl.percent || 0)}%</span>
                  </div>
                  {dl.state !== "in-progress" && (
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <p className="text-[10px] text-slate-500">{dl.state.toUpperCase()}</p>
                      {dl.state === "completed" && (
                        <button onClick={openDownloadsInOs} className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-all">
                          Open in Files
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => setDownloads((d) => d.filter((item) => item.id !== dl.id))} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                  <X size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
