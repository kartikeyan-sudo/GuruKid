import { useState, useEffect } from "react";
import { Shield, Settings, Power, RotateCcw } from "lucide-react";
import Window from "./Window.jsx";
import TaskbarNew from "./TaskbarNew.jsx";
import AuthGate from "./AuthGate.jsx";
import BrowserApp from "../apps/Browser/BrowserAdvanced.jsx";
import NotepadApp from "../apps/Notepad/Notepad.jsx";
import FileManagerApp from "../apps/FileManager/FileManagerAdvanced.jsx";
import CameraApp from "../apps/Camera/Camera.jsx";
import GalleryApp from "../apps/Gallery/Gallery.jsx";
import SettingsApp from "../apps/Settings/Settings.jsx";
import ImageViewerApp from "../apps/ImageViewer/ImageViewer.jsx";
import NetworkMonitorApp from "../apps/Network/NetworkMonitor.jsx";
import AppErrorBoundary from "./AppErrorBoundary.jsx";
import { pullCommands, sendCommandResult, sendLog, sendStats } from "../services/socket.js";
import { fetchKidSession } from "../services/authApi";
import { useWindowStore } from "../store/windowStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { useFolderStore } from "../store/folderStore.js";

const APP_REGISTRY = {
  browser: {
    title: "Browser",
    component: <BrowserApp />,
    icon: "🌐",
  },
  notepad: {
    title: "Notepad",
    component: <NotepadApp />,
    icon: "📝",
  },
  files: {
    title: "File Manager",
    component: <FileManagerApp />,
    icon: "📁",
  },
  camera: {
    title: "Camera",
    component: <CameraApp />,
    icon: "📷",
  },
  gallery: {
    title: "Gallery",
    component: <GalleryApp />,
    icon: "🖼️",
  },
  settings: {
    title: "Settings",
    component: <SettingsApp />,
    icon: "⚙️",
  },
  network: {
    title: "Network",
    component: <NetworkMonitorApp />,
    icon: "📶",
  },
  imageViewer: {
    title: "Image Viewer",
    component: <ImageViewerApp />,
    icon: "🖼️",
    launcher: false,
  },
};

export default function Desktop() {
  const { windows, openWindow, setZoom } = useWindowStore();
  const { settings, loadSettings, saveSettings, getWallpaper } = useSettingsStore();
  const { setTargetDir } = useFolderStore();
  const [locked, setLocked] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [focus, setFocus] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [focusPin, setFocusPin] = useState("");
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => window.electronAPI?.getCurrentUser?.() || null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    let mounted = true;
    const verify = async () => {
      const session = window.electronAPI?.getCurrentUser?.();
      if (!session?.token || !session?.userId) {
        if (mounted) {
          setCurrentUser(null);
          setCheckingSession(false);
        }
        return;
      }

      try {
        await fetchKidSession();
        if (mounted) {
          setCurrentUser(session);
        }
      } catch {
        window.electronAPI?.clearCurrentUser?.();
        if (mounted) {
          setCurrentUser(null);
        }
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    verify();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleOpenFolder = (e) => {
      const dir = e?.detail?.dir || "downloads";
      setTargetDir(dir);
      openApp("files");
    };

    window.addEventListener("os-open-folder", handleOpenFolder);
    return () => window.removeEventListener("os-open-folder", handleOpenFolder);
  }, [setTargetDir]);

  const rand = () => Math.round(Math.random() * 40 + 10);

  const handleSystemAction = async (action) => {
    try {
      const result = await window.electronAPI?.systemControl?.(action);
      if (result?.success) return;
    } catch {
      // fallback below
    }

    if (action === "restart") {
      window.location.reload();
    } else if (action === "shutdown") {
      window.close();
    }
  };

  useEffect(() => {
    if (!currentUser?.userId) return undefined;

    const handler = async (e) => {
      const cmd = e?.detail || {};
      if (cmd.type === "focus") setFocus(true);
      if (cmd.type === "unlock") setFocus(false);
      if (cmd.type === "block") setBlocked(true);
      if (cmd.type === "unblock") setBlocked(false);
      if (cmd.type === "open-app" && cmd.payload?.app) openApp(cmd.payload.app);
      if (cmd.type === "erase-data") {
        const targetUser = cmd?.payload?.userId;
        if (targetUser && targetUser !== currentUser?.userId) {
          sendCommandResult({
            requestId: cmd?.payload?.requestId,
            status: "error",
            message: "User mismatch for erase-data",
          });
          return;
        }

        const result = window.electronAPI?.eraseDeviceData?.();
        if (result?.success) {
          window.dispatchEvent(new CustomEvent("os-storage-updated", { detail: { area: "all" } }));
          sendLog({ type: "system", message: "Device data erased by admin" });
          sendCommandResult({
            requestId: cmd?.payload?.requestId,
            status: "ok",
            message: "Local user data erased",
          });
        } else {
          sendCommandResult({
            requestId: cmd?.payload?.requestId,
            status: "error",
            message: result?.error || "Erase failed",
          });
        }
      }
      if (cmd.type === "restart") handleSystemAction("restart");
      if (cmd.type === "shutdown") handleSystemAction("shutdown");
    };

    const poll = setInterval(() => pullCommands(), 5000);
    const statTimer = setInterval(() => sendStats({ cpu: rand(), ram: rand() }), 4000);
    window.addEventListener("gurukid:command", handler);

    return () => {
      window.removeEventListener("gurukid:command", handler);
      clearInterval(poll);
      clearInterval(statTimer);
    };
  }, [settings.pin, currentUser?.userId]);

  // Ctrl+- / Ctrl++ / Ctrl+0 for zoom
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!e.ctrlKey) return;
      
      // Get active window
      const activeWin = Object.values(windows).find((w) => !w.minimized);
      if (!activeWin) return;

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        const newZoom = Math.min(activeWin.zoom + 10, 200);
        setZoom(activeWin.id, newZoom);
        saveSettings({ globalZoom: newZoom });
      } else if (e.key === "-") {
        e.preventDefault();
        const newZoom = Math.max(activeWin.zoom - 10, 50);
        setZoom(activeWin.id, newZoom);
        saveSettings({ globalZoom: newZoom });
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(activeWin.id, 100);
        saveSettings({ globalZoom: 100 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [windows, setZoom, saveSettings]);

  const handleUnlock = () => {
    if (pinInput === settings.pin) {
      setLocked(false);
      setPinInput("");
    } else {
      alert("Incorrect PIN");
    }
  };

  const openApp = (appId) => {
    const existingWindow = Object.values(windows).find((w) => w.appType === appId && !w.minimized);
    if (existingWindow) return; // App already open

    const windowId = `${appId}-${Date.now()}`;
    openWindow(windowId, APP_REGISTRY[appId].title, appId, {
      x: Math.random() * 200 + 100,
      y: Math.random() * 100 + 80,
    });
    setStartMenuOpen(false);
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleContextMenuAction = (action) => {
    if (action === "personalize") {
      openApp("settings");
    }
    setContextMenu(null);
  };

  const handleLogout = () => {
    window.electronAPI?.clearCurrentUser?.();
    setCurrentUser(null);
    setLocked(true);
    setFocus(false);
    setBlocked(false);
    setStartMenuOpen(false);
  };

  if (checkingSession) {
    return <div className="min-h-screen bg-bg text-slate-300 grid place-items-center">Checking user session...</div>;
  }

  if (!currentUser?.userId) {
    return <AuthGate onAuthenticated={(session) => setCurrentUser(session)} />;
  }

  if (locked) {
    return (
      <div className="min-h-screen bg-bg text-white grid place-items-center">
        <div className="p-8 rounded-2xl border border-slate-800 bg-card/80 backdrop-blur-sm text-center space-y-4 w-96">
          <Shield size={48} className="mx-auto text-accent" />
          <h1 className="text-2xl font-bold">GuruKid Locked</h1>
          <p className="text-sm text-slate-400">Enter PIN to unlock</p>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="••••"
            className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleUnlock}
            className="w-full px-4 py-3 rounded-lg bg-accent/30 text-accent border border-accent/60 hover:bg-accent/40 transition font-medium"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  const wallpaperPath = getWallpaper();
  const wallpaperUrl = wallpaperPath && window.electronAPI
    ? (window.electronAPI.getImageDataUrl?.(wallpaperPath) || window.electronAPI.getFileUrl?.(wallpaperPath) || "")
    : "";
  const launcherApps = Object.fromEntries(
    Object.entries(APP_REGISTRY).filter(([, app]) => app.launcher !== false)
  );

  return (
    <div
      className="min-h-screen bg-bg text-white overflow-hidden relative"
      style={{
        backgroundImage: wallpaperUrl ? `url("${wallpaperUrl}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
      onRightClick={handleRightClick}
    >
      {/* Overlay gradient */}
      {!wallpaperUrl && (
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#22d3ee33,transparent_40%)]" />
      )}

      {/* Desktop App Icons */}
      <div className="absolute left-4 top-4 z-20 grid grid-cols-1 gap-3">
        {Object.entries(launcherApps).map(([appId, app]) => (
          <button
            key={appId}
            onDoubleClick={() => openApp(appId)}
            onClick={() => setContextMenu(null)}
            className="w-20 p-2 rounded-lg text-center hover:bg-slate-800/60 transition border border-transparent hover:border-slate-600"
            title={`Open ${app.title}`}
          >
            <div className="text-3xl mb-1">{app.icon}</div>
            <div className="text-xs text-slate-100 leading-tight">{app.title}</div>
          </button>
        ))}
      </div>

      {/* Top-right power controls */}
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
        <button
          onClick={() => handleSystemAction("restart")}
          className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-200 hover:bg-slate-800/90 flex items-center gap-2"
          title="Restart"
        >
          <RotateCcw size={14} />
          <span className="text-xs">Restart</span>
        </button>
        <button
          onClick={() => handleSystemAction("shutdown")}
          className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-400/40 text-red-100 hover:bg-red-500/30 flex items-center gap-2"
          title="Shutdown"
        >
          <Power size={14} />
          <span className="text-xs">Shutdown</span>
        </button>
      </div>

      {/* Windows */}
      <div className="relative w-full h-[calc(100vh-60px)]">
        {Object.values(windows).map((win) => (
          <Window key={win.id} id={win.id} title={win.title}>
            <AppErrorBoundary>
              {APP_REGISTRY[win.appType]?.component}
            </AppErrorBoundary>
          </Window>
        ))}
      </div>

      {/* Taskbar */}
      <TaskbarNew
        startMenuOpen={startMenuOpen}
        setStartMenuOpen={setStartMenuOpen}
        onOpenApp={openApp}
        onRestart={() => handleSystemAction("restart")}
        onShutdown={() => handleSystemAction("shutdown")}
        onLogout={handleLogout}
        appRegistry={launcherApps}
        windows={windows}
        zoomPercentage={Object.values(windows)[0]?.zoom || 100}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-slate-900 border border-slate-700 rounded-lg shadow-lg z-50 py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => handleContextMenuAction("refresh")}
            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 transition"
          >
            Refresh
          </button>
          <button
            onClick={() => handleContextMenuAction("personalize")}
            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 transition flex items-center gap-2"
          >
            <Settings size={14} /> Personalize
          </button>
        </div>
      )}

      {/* Focus Mode Overlay */}
      {focus && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm grid place-items-center z-50">
          <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900 space-y-4 text-center w-80">
            <p className="text-2xl font-bold">Focus Mode Active</p>
            <p className="text-sm text-slate-400">All interactions blocked</p>
            <input
              type="password"
              value={focusPin}
              onChange={(e) => setFocusPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && focusPin === settings.pin) {
                  setFocus(false);
                  setFocusPin("");
                }
              }}
              placeholder="Enter PIN to exit"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      )}

      {blocked && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm grid place-items-center z-[60]">
          <div className="p-8 rounded-2xl border border-red-400/40 bg-slate-900 text-center space-y-3 max-w-sm">
            <p className="text-2xl font-semibold text-red-200">Device Blocked</p>
            <p className="text-sm text-slate-300">Access has been blocked by the admin portal.</p>
          </div>
        </div>
      )}
    </div>
  );
}
