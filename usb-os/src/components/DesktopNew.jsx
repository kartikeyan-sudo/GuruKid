import { useState, useEffect, useCallback } from "react";
import { Shield, Settings, Power, RotateCcw, Lock } from "lucide-react";
import Window from "./Window.jsx";
import TaskbarNew from "./TaskbarNew.jsx";
import AuthGate from "./AuthGate.jsx";
import BootScreen from "./BootScreen.jsx";
import ShutdownScreen from "./ShutdownScreen.jsx";
import BrowserApp from "../apps/Browser/BrowserAdvanced.jsx";
import NotepadApp from "../apps/Notepad/Notepad.jsx";
import FileManagerApp from "../apps/FileManager/FileManagerAdvanced.jsx";
import CameraApp from "../apps/Camera/Camera.jsx";
import GalleryApp from "../apps/Gallery/Gallery.jsx";
import SettingsApp from "../apps/Settings/Settings.jsx";
import ImageViewerApp from "../apps/ImageViewer/ImageViewer.jsx";
import NetworkMonitorApp from "../apps/Network/NetworkMonitor.jsx";
import NotesPreviewApp from "../apps/NotesPreview/NotesPreview.jsx";
import AppErrorBoundary from "./AppErrorBoundary.jsx";
import { pullCommands, sendCommandResult, sendLog, sendStats } from "../services/socket.js";
import { useWindowStore } from "../store/windowStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import { useFolderStore } from "../store/folderStore.js";

const APP_REGISTRY = {
  browser: { title: "Browser", component: <BrowserApp />, icon: "🌐" },
  notepad: { title: "Notepad", component: <NotepadApp />, icon: "📝" },
  files: { title: "Files", component: <FileManagerApp />, icon: "📁" },
  camera: { title: "Camera", component: <CameraApp />, icon: "📷" },
  gallery: { title: "Gallery", component: <GalleryApp />, icon: "🖼️" },
  settings: { title: "Settings", component: <SettingsApp />, icon: "⚙️" },
  network: { title: "Network", component: <NetworkMonitorApp />, icon: "📶" },
  imageViewer: { title: "Image Viewer", component: <ImageViewerApp />, icon: "🖼️", launcher: false },
  notesPreview: { title: "Notes Preview", component: <NotesPreviewApp />, icon: "📄", launcher: false },
};

export default function Desktop() {
  const { windows, openWindow, setZoom } = useWindowStore();
  const { settings, loadSettings, saveSettings, getWallpaper, addBlockedSite, removeBlockedSite } = useSettingsStore();
  const { setTargetDir } = useFolderStore();

  const [booting, setBooting] = useState(true);
  const [shuttingDown, setShuttingDown] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [focus, setFocus] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [focusPin, setFocusPin] = useState("");
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [desktopReady, setDesktopReady] = useState(false);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // Open folder handler
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

  const handleSystemAction = useCallback(async (action) => {
    if (action === "shutdown") {
      setShuttingDown(true);
      return;
    }
    try {
      const result = await window.electronAPI?.systemControl?.(action);
      if (result?.success) return;
    } catch { /* fallback */ }
    if (action === "restart") window.location.reload();
  }, []);

  const handleShutdownComplete = useCallback(async () => {
    try {
      const result = await window.electronAPI?.systemControl?.("shutdown");
      if (result?.success) return;
    } catch { /* fallback */ }
    window.close();
  }, []);

  // Commands polling
  useEffect(() => {
    if (!currentUser?.userId) return undefined;
    const handler = async (e) => {
      const cmd = e?.detail || {};
      if (cmd.type === "focus") setFocus(true);
      if (cmd.type === "unlock") setFocus(false);
      if (cmd.type === "block") setBlocked(true);
      if (cmd.type === "unblock") setBlocked(false);
      if (cmd.type === "open-app" && cmd.payload?.app) openApp(cmd.payload.app);
      if (cmd.type === "close-app") {
        const { windows: currentWindows, closeWindow: closeById } = useWindowStore.getState();
        const targetApp = cmd.payload?.app;
        const targetWindowId = cmd.payload?.windowId;
        if (targetWindowId && currentWindows[targetWindowId]) {
          closeById(targetWindowId);
        } else if (targetApp) {
          Object.values(currentWindows)
            .filter((w) => w.appType === targetApp)
            .forEach((w) => closeById(w.id));
        }
      }
      if (cmd.type === "block-site" && cmd.payload?.domain) {
        addBlockedSite(cmd.payload.domain);
        sendLog({ type: "system", message: `Blocked site added: ${cmd.payload.domain}` });
      }
      if (cmd.type === "unblock-site" && cmd.payload?.domain) {
        removeBlockedSite(cmd.payload.domain);
        sendLog({ type: "system", message: `Blocked site removed: ${cmd.payload.domain}` });
      }
      if (cmd.type === "erase-data") {
        const targetUser = cmd?.payload?.userId;
        if (targetUser && targetUser !== currentUser?.userId) {
          sendCommandResult({ requestId: cmd?.payload?.requestId, status: "error", message: "User mismatch" });
          return;
        }
        const result = window.electronAPI?.eraseDeviceData?.();
        if (result?.success) {
          window.dispatchEvent(new CustomEvent("os-storage-updated", { detail: { area: "all" } }));
          sendLog({ type: "system", message: "Device data erased by admin" });
          sendCommandResult({ requestId: cmd?.payload?.requestId, status: "ok", message: "Data erased" });
        } else {
          sendCommandResult({ requestId: cmd?.payload?.requestId, status: "error", message: result?.error || "Erase failed" });
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
  }, [
    settings.pin,
    currentUser?.userId,
    handleSystemAction,
    addBlockedSite,
    removeBlockedSite,
  ]);

  // Zoom shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!e.ctrlKey) return;
      const activeWin = Object.values(windows).find((w) => !w.minimized);
      if (!activeWin) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        const z = Math.min(activeWin.zoom + 10, 200);
        setZoom(activeWin.id, z);
        saveSettings({ globalZoom: z });
      } else if (e.key === "-") {
        e.preventDefault();
        const z = Math.max(activeWin.zoom - 10, 50);
        setZoom(activeWin.id, z);
        saveSettings({ globalZoom: z });
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
      setPinError(false);
      setTimeout(() => setDesktopReady(true), 100);
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 600);
    }
  };

  const openApp = (appId) => {
    const existingWindow = Object.values(windows).find((w) => w.appType === appId && !w.minimized);
    if (existingWindow) return;
    const windowId = `${appId}-${Date.now()}`;
    openWindow(windowId, APP_REGISTRY[appId].title, appId, {
      x: Math.random() * 200 + 100,
      y: Math.random() * 100 + 80,
    });
    sendLog({ type: "app-open", appId, appTitle: APP_REGISTRY[appId].title, message: `Opened ${APP_REGISTRY[appId].title}` });
    setStartMenuOpen(false);
  };

  const handleContextMenuAction = (action) => {
    if (action === "personalize") openApp("settings");
    setContextMenu(null);
  };

  const handleLogout = () => {
    window.electronAPI?.clearCurrentUser?.();
    setCurrentUser(null);
    setLocked(false);
    setFocus(false);
    setBlocked(false);
    setStartMenuOpen(false);
    setDesktopReady(false);
  };

  /* ── BOOT SCREEN ── */
  if (booting) {
    return <BootScreen onComplete={() => setBooting(false)} />;
  }

  /* ── SHUTDOWN SCREEN ── */
  if (shuttingDown) {
    return <ShutdownScreen onComplete={handleShutdownComplete} />;
  }

  /* ── AUTH GATE ── */
  if (!currentUser?.userId) {
    return <AuthGate onAuthenticated={(session) => {
      setCurrentUser(session);
      setLocked(false);
      setDesktopReady(true);
    }} />;
  }

  /* ── LOCK SCREEN ── */
  if (locked) {
    return (
      <div
        className="min-h-screen text-white grid place-items-center bg-gradient-auth relative overflow-hidden"
        onClick={() => setContextMenu(null)}
      >
        {/* Ambient orb */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.5), transparent 70%)" }}
        />

        <div className={`glass-heavy rounded-3xl p-8 w-[380px] text-center space-y-6 animate-scale-in ${pinError ? "shake" : ""}`}>
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow-lg">
              <Shield size={36} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">GuruKid</h1>
              <p className="text-xs text-slate-400 mt-0.5">Enter PIN to unlock</p>
            </div>
          </div>

          {/* PIN dots */}
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  pinInput.length > i
                    ? "bg-indigo-400 shadow-glow scale-110"
                    : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* PIN input */}
          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="••••"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-2xl tracking-[0.3em] focus:outline-none focus:border-indigo-500/50 focus:shadow-glow transition-all placeholder:text-slate-600"
          />

          <button
            onClick={handleUnlock}
            className="btn-accent w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
          >
            <Lock size={16} />
            Unlock
          </button>
        </div>
      </div>
    );
  }

  /* ── DESKTOP ── */
  const wallpaperPath = getWallpaper();
  const wallpaperUrl = wallpaperPath && window.electronAPI
    ? (window.electronAPI.getImageDataUrl?.(wallpaperPath) || window.electronAPI.getFileUrl?.(wallpaperPath) || "")
    : "";
  const launcherApps = Object.fromEntries(
    Object.entries(APP_REGISTRY).filter(([, app]) => app.launcher !== false)
  );

  return (
    <div
      className="min-h-screen text-white overflow-hidden relative"
      style={wallpaperUrl
        ? {
            backgroundImage: `url("${wallpaperUrl}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
          }
        : {
            background: "radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.04) 0%, transparent 40%), linear-gradient(180deg, #080d1a, #0c1225)",
          }
      }
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
      onClick={() => {
        setContextMenu(null);
        setStartMenuOpen(false);
      }}
    >
      {/* Desktop Icons */}
      <div className={`absolute left-4 top-4 z-20 grid grid-cols-1 gap-1 ${desktopReady ? "animate-fade-in" : ""}`}>
        {Object.entries(launcherApps).map(([appId, app], i) => (
          <button
            key={appId}
            onDoubleClick={() => openApp(appId)}
            onClick={(e) => { e.stopPropagation(); setContextMenu(null); }}
            className="desktop-icon w-20 p-2.5 rounded-xl text-center group"
            title={`Open ${app.title}`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="text-3xl mb-1.5 group-hover:scale-110 transition-transform duration-200">{app.icon}</div>
            <div className="text-[11px] text-white/80 leading-tight font-medium drop-shadow-lg">{app.title}</div>
          </button>
        ))}
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
          className="fixed glass rounded-xl shadow-2xl z-50 py-1.5 min-w-44 context-menu-animate"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleContextMenuAction("refresh")}
            className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all flex items-center gap-3"
          >
            <RotateCcw size={14} className="text-slate-500" />
            Refresh
          </button>
          <div className="h-px bg-white/5 mx-3" />
          <button
            onClick={() => handleContextMenuAction("personalize")}
            className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all flex items-center gap-3"
          >
            <Settings size={14} className="text-slate-500" />
            Personalize
          </button>
        </div>
      )}

      {/* Focus Mode Overlay */}
      {focus && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md grid place-items-center z-50 animate-fade-in">
          <div className="glass-heavy rounded-3xl p-8 space-y-5 text-center w-[340px] animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto">
              <Lock size={24} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-semibold text-white">Focus Mode Active</p>
              <p className="text-sm text-slate-400 mt-1">All interactions blocked</p>
            </div>
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
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 focus:shadow-glow transition-all text-center"
            />
          </div>
        </div>
      )}

      {/* Blocked Overlay */}
      {blocked && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md grid place-items-center z-[60] animate-fade-in">
          <div className="glass-heavy rounded-3xl p-8 text-center space-y-4 max-w-sm animate-scale-in border border-red-500/20">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto">
              <Shield size={24} className="text-red-400" />
            </div>
            <p className="text-xl font-semibold text-red-200">Device Blocked</p>
            <p className="text-sm text-slate-400">Access has been blocked by the admin portal.</p>
          </div>
        </div>
      )}
    </div>
  );
}
