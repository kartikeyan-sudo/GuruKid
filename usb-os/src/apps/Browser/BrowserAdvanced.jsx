import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, RotateCw, Plus, X, Download, DownloadCloud, Search } from "lucide-react";
import { sendLog } from "../../services/socket.js";
import clsx from "clsx";

const BLOCKED_DOMAINS = ["facebook.com", "tiktok.com", "x.com", "youtube.com"];

export default function BrowserApp() {
  const [tabs, setTabs] = useState([{ id: 1, title: "Google", url: "https://www.google.com" }]);
  const [activeTab, setActiveTab] = useState(1);
  const [downloads, setDownloads] = useState([]);
  const [downloadsPanelOpen, setDownloadsPanelOpen] = useState(false);
  const [addressInput, setAddressInput] = useState("https://www.google.com");
  const webviewRef = useRef(null);
  const addressInputRef = useRef(null);
  const completionPromptedRef = useRef(new Set());

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
      } catch {
        // ignore webview teardown errors
      }
    };
  }, []);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleNavigate = (e) => {
      const nextUrl = e?.url || "";
      if (!nextUrl) return;
      setTabs((prev) => prev.map((t) => (t.id === activeTab ? { ...t, url: nextUrl } : t)));
      setAddressInput(nextUrl);
      sendLog({ type: "browser", action: "visit", url: nextUrl });
    };

    const handleTitle = (e) => {
      const title = e?.title?.trim();
      if (!title) return;
      setTabs((prev) => prev.map((t) => (t.id === activeTab ? { ...t, title } : t)));
    };

    webview.addEventListener("did-navigate", handleNavigate);
    webview.addEventListener("did-navigate-in-page", handleNavigate);
    webview.addEventListener("page-title-updated", handleTitle);
    webview.addEventListener("dom-ready", () => {
      webview.focus();
    });

    return () => {
      webview.removeEventListener("did-navigate", handleNavigate);
      webview.removeEventListener("did-navigate-in-page", handleNavigate);
      webview.removeEventListener("page-title-updated", handleTitle);
    };
  }, [activeTab]);

  // Listen for download progress from main process
  useEffect(() => {
    if (!window.electronAPI) return;

    // Listen for download progress
    const unsubscribeStarted = window.electronAPI.on("download-started", (data) => {
      setDownloads((d) => {
        const exists = d.some((dl) => dl.id === data.id);
        return exists ? d : [data, ...d];
      });
      setDownloadsPanelOpen(true);
      sendLog({ type: "download", action: "started", filename: data.filename });
    });

    // Listen for download progress
    const unsubscribeProgress = window.electronAPI.on("download-progress", (data) => {
      setDownloads((d) => {
        const existing = d.find((dl) => dl.id === data.id);
        if (existing) {
          return d.map((dl) =>
            dl.id === data.id
              ? { ...dl, progress: data.progress, total: data.total, percent: data.percent }
              : dl
          );
        } else {
          return [{ id: data.id, filename: data.filename, state: "in-progress", percent: 0, ...data }, ...d];
        }
      });
    });

    // Listen for completed downloads
    const unsubscribeCompleted = window.electronAPI.on("download-completed", (data) => {
      setDownloads((d) => {
        const hasItem = d.some((dl) => dl.id === data.id);
        const next = hasItem
          ? d.map((dl) => (dl.id === data.id ? { ...dl, ...data, state: "completed", percent: 100 } : dl))
          : [{ ...data, state: "completed", percent: 100 }, ...d];
        return next;
      });

      sendLog({ type: "download", action: "completed", filename: data.filename, path: data.path });

      // Notify other apps to refresh downloads folder.
      window.dispatchEvent(new CustomEvent("os-storage-updated", { detail: { area: "downloads" } }));

      if (!completionPromptedRef.current.has(data.id)) {
        completionPromptedRef.current.add(data.id);
        const shouldOpen = window.confirm(`${data.filename} downloaded successfully. Open in File Manager?`);
        if (shouldOpen) {
          openDownloadsInOs();
        }
      }
    });

    // Listen for cancelled downloads
    const unsubscribeCancelled = window.electronAPI.on("download-cancelled", (data) => {
      setDownloads((d) =>
        d.map((dl) => (dl.id === data.id ? { ...dl, state: "cancelled" } : dl))
      );
    });

    // Listen for failed downloads
    const unsubscribeFailed = window.electronAPI.on("download-failed", (data) => {
      setDownloads((d) =>
        d.map((dl) => (dl.id === data.id ? { ...dl, state: "failed", error: data.error } : dl))
      );
      sendLog({ type: "download", action: "failed", filename: data.filename, error: data.error });
    });

    return () => {
      unsubscribeStarted?.();
      unsubscribeProgress?.();
      unsubscribeCompleted?.();
      unsubscribeCancelled?.();
      unsubscribeFailed?.();
    };
  }, []);

  const normalizeInputToUrl = (input) => {
    const value = (input || "").trim();
    if (!value) return "https://www.google.com";

    if (/^(https?:|file:|about:|data:)/i.test(value)) {
      return value;
    }

    const looksLikeDomain = /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value);
    if (looksLikeDomain) {
      return `https://${value}`;
    }

    return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
  };

  const navigate = (input) => {
    const url = normalizeInputToUrl(input);
    let host = "";
    try {
      const parsed = new URL(url);
      host = parsed.hostname;
    } catch {
      host = url.replace(/https?:\/\//, "").split("/")[0];
    }

    const isBlocked = BLOCKED_DOMAINS.some((d) => host.includes(d));

    if (isBlocked) {
      // Show blocked page
      const blockedHtml = `
        <html><body style="background: #0f172a; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh;">
          <div style="text-align: center;">
            <h1>🚫 Domain Blocked</h1>
            <p>${host} is blocked by parental controls</p>
          </div>
        </body></html>
      `;
      if (webviewRef.current) {
        webviewRef.current.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(blockedHtml)}`);
      }
      return;
    }

    sendLog({ type: "browser", url, action: "navigate" });
    setTabs((prev) => prev.map((t) => (t.id === activeTab ? { ...t, url } : t)));
    setAddressInput(url);
    if (webviewRef.current) {
      webviewRef.current.loadURL(url);
    }
  };

  const goBack = () => {
    if (webviewRef.current && webviewRef.current.canGoBack?.()) {
      webviewRef.current.goBack();
    }
  };

  const goForward = () => {
    if (webviewRef.current && webviewRef.current.canGoForward?.()) {
      webviewRef.current.goForward();
    }
  };

  const reload = () => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  };

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

  const removeDownload = (id) => {
    setDownloads((d) => d.filter((dl) => dl.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-slate-900 border-b border-slate-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-t-xl text-sm whitespace-nowrap transition border-b-2",
              activeTab === tab.id
                ? "bg-card border-accent text-white"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            )}
          >
            {tab.title}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="hover:text-red-400"
              >
                <X size={14} />
              </button>
            )}
          </button>
        ))}
        <button
          onClick={newTab}
          className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700 rounded-t-lg transition"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Toolbar */}
      <form
        className="flex items-center gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(addressInput);
        }}
      >
        <button
          type="button"
          onClick={goBack}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
          title="Back"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={goForward}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
          title="Forward"
        >
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          onClick={reload}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
          title="Reload"
        >
          <RotateCw size={18} />
        </button>

        {/* Address Bar */}
        <input
          ref={addressInputRef}
          value={addressInput}
          onChange={(e) => {
            setAddressInput(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") navigate(addressInput);
          }}
          placeholder="Search Google or type a URL"
          className="flex-1 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-accent"
        />

        <button
          type="submit"
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
          title="Search"
        >
          <Search size={18} />
        </button>

        {/* Downloads Button */}
        <button
          type="button"
          onClick={() => setDownloadsPanelOpen(!downloadsPanelOpen)}
          className="relative p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
          title="Downloads"
        >
          <Download size={18} />
          {downloads.some((d) => d.state === "in-progress") && (
            <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
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
          style={{ width: "100%", height: "100%", background: "#0b1221" }}
          className="rounded-lg"
          onClick={() => webviewRef.current?.focus()}
        />
      </div>

      {/* Downloads Panel */}
      {downloadsPanelOpen && (
        <div className="border-t border-slate-800 bg-slate-900 p-3 max-h-40 overflow-auto">
          {downloads.length === 0 ? (
            <p className="text-xs text-slate-500">No downloads</p>
          ) : (
            downloads.map((dl) => (
              <div key={dl.id} className="flex items-center gap-2 p-2 mb-2 rounded-lg bg-slate-800">
                <DownloadCloud size={16} className={clsx(dl.state === "completed" ? "text-green-500" : "text-accent")} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{dl.filename}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-700 rounded-full h-1">
                      <div
                        className={clsx(
                          "h-1 rounded-full transition-all",
                          dl.state === "completed" ? "bg-green-500" : dl.state === "failed" ? "bg-red-500" : "bg-accent"
                        )}
                        style={{ width: `${dl.percent || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{Math.round(dl.percent || 0)}%</span>
                  </div>
                  {dl.state !== "in-progress" && (
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <p className="text-xs text-slate-400">{dl.state.toUpperCase()}</p>
                      {dl.state === "completed" && (
                        <button
                          onClick={openDownloadsInOs}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                        >
                          Open in Files
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeDownload(dl.id)}
                  className="p-1 text-slate-400 hover:text-red-400 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
