import { app, BrowserWindow, ipcMain, session, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import isDev from "electron-is-dev";
import fs from "fs";
import os from "os";
import dns from "dns";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const basePath = path.dirname(process.execPath);
const appDataDir = basePath;
const configDir = path.join(appDataDir, "config");
const sessionFile = path.join(configDir, "session.json");

// Ensure required top-level directories exist
[appDataDir, path.join(appDataDir, "data"), path.join(appDataDir, "downloads"), path.join(appDataDir, "images"), path.join(appDataDir, "videos"), path.join(appDataDir, "config")].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function getCurrentSessionUser() {
  try {
    if (!fs.existsSync(sessionFile)) return null;
    const raw = fs.readFileSync(sessionFile, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed?.userId || null;
  } catch {
    return null;
  }
}

function getUserDownloadsDir() {
  const userId = getCurrentSessionUser() || "guest";
  const userDownloads = path.join(appDataDir, "downloads", userId);
  if (!fs.existsSync(userDownloads)) {
    fs.mkdirSync(userDownloads, { recursive: true });
  }
  return userDownloads;
}

let mainWindow;

// ============ Download Interception ============
// Setup AFTER app is ready
function setupDownloadInterception() {
  session.defaultSession.on("will-download", (event, item, webContents) => {
    const filename = item.getFilename();
    const downloadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const savePath = path.join(getUserDownloadsDir(), filename);

    console.log(`Download intercepted: ${filename} → ${savePath}`);

    mainWindow?.webContents.send("download-started", {
      id: downloadId,
      filename,
      path: savePath,
      progress: 0,
      total: item.getTotalBytes() || 0,
      percent: 0,
      state: "in-progress",
    });

    // Set custom save path
    item.setSavePath(savePath);

    // Track download progress
    item.on("updated", (event, state) => {
      if (state === "progressing") {
        const progress = item.getReceivedBytes();
        const total = item.getTotalBytes();
        const percent = Math.round((progress / total) * 100);

        // Send progress to renderer
        mainWindow?.webContents.send("download-progress", {
          id: downloadId,
          filename,
          progress,
          total,
          percent,
          state: "in-progress",
        });
      }
    });

    item.on("done", (event, state) => {
      if (state === "completed") {
        console.log(`Download completed: ${filename}`);
        mainWindow?.webContents.send("download-completed", {
          id: downloadId,
          filename,
          path: savePath,
          state: "completed",
        });
      } else if (state === "cancelled") {
        mainWindow?.webContents.send("download-cancelled", {
          id: downloadId,
          filename,
          state: "cancelled",
        });
      } else if (state === "interrupted") {
        mainWindow?.webContents.send("download-failed", {
          id: downloadId,
          filename,
          error: "interrupted",
          state: "failed",
        });
      }
    });
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#0b1221",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: false,
    },
  });

  const devPort = process.env.DEV_PORT || 5176;
  const url = isDev
    ? `http://localhost:${devPort}`
    : `file://${path.join(__dirname, "../dist/index.html")}`;
  
  await mainWindow.loadURL(url);

  if (isDev) {
    // mainWindow.webContents.openDevTools();
  }
}

// ============ IPC Handlers ============
ipcMain.handle("file-read", (event, filePath) => {
  try {
    const fullPath = path.join(appDataDir, filePath);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(appDataDir))) {
      throw new Error("Path traversal attempt detected");
    }
    if (!fs.existsSync(resolved)) {
      return { success: false, error: "File not found", data: null };
    }
    const data = fs.readFileSync(resolved, "utf-8");
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message, data: null };
  }
});

ipcMain.handle("file-write", (event, filePath, content) => {
  try {
    const fullPath = path.join(appDataDir, filePath);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(appDataDir))) {
      throw new Error("Path traversal attempt detected");
    }
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(resolved, content, "utf-8");
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("file-list", (event, directory) => {
  try {
    const fullPath = path.join(appDataDir, directory);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(appDataDir))) {
      throw new Error("Path traversal attempt detected");
    }
    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true });
      return { success: true, files: [] };
    }
    const files = fs.readdirSync(resolved).map((file) => {
      const filePath = path.join(resolved, file);
      const stat = fs.statSync(filePath);
      return {
        name: file,
        isDirectory: stat.isDirectory(),
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    });
    return { success: true, files };
  } catch (err) {
    return { success: false, error: err.message, files: [] };
  }
});

ipcMain.handle("file-delete", (event, filePath) => {
  try {
    const fullPath = path.join(appDataDir, filePath);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(appDataDir))) {
      throw new Error("Path traversal attempt detected");
    }
    if (!fs.existsSync(resolved)) {
      return { success: false, error: "File not found" };
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      fs.rmSync(resolved, { recursive: true, force: true });
    } else {
      fs.unlinkSync(resolved);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("file-rename", (event, oldPath, newPath) => {
  try {
    const oldFull = path.join(appDataDir, oldPath);
    const newFull = path.join(appDataDir, newPath);
    const oldResolved = path.resolve(oldFull);
    const newResolved = path.resolve(newFull);
    
    if (!oldResolved.startsWith(path.resolve(appDataDir)) || !newResolved.startsWith(path.resolve(appDataDir))) {
      throw new Error("Path traversal attempt detected");
    }
    if (!fs.existsSync(oldResolved)) {
      return { success: false, error: "File not found" };
    }
    fs.renameSync(oldResolved, newResolved);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("file-save-image", (event, base64Data, filename) => {
  try {
    const savePath = path.join(appDataDir, "images", filename);
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64String, "base64");
    fs.writeFileSync(savePath, buffer);
    return { success: true, path: savePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("open-in-folder", (event, relativePath) => {
  try {
    const currentUser = getCurrentSessionUser() || "guest";
    const normalized = (relativePath || "").replace(/^downloads(\\|\/)?/, `downloads/${currentUser}/`);
    const targetPath = relativePath
      ? path.resolve(path.join(appDataDir, normalized))
      : getUserDownloadsDir();
    if (!targetPath.startsWith(path.resolve(appDataDir))) {
      throw new Error("Path traversal attempt detected");
    }

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      shell.showItemInFolder(targetPath);
      return { success: true };
    }

    const dirPath = fs.existsSync(targetPath)
      ? targetPath
      : path.dirname(targetPath);
    shell.openPath(dirPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("session:set-current-user", (_event, payload) => {
  try {
    const next = {
      userId: payload?.userId || null,
      email: payload?.email || "",
      nickname: payload?.nickname || "",
      token: payload?.token || "",
      deviceKey: payload?.deviceKey || "",
    };

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(sessionFile, JSON.stringify(next, null, 2), "utf-8");
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("session:get-current-user", () => {
  try {
    if (!fs.existsSync(sessionFile)) return null;
    return JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
  } catch {
    return null;
  }
});

ipcMain.handle("session:clear", () => {
  try {
    if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("system-control", async (_event, action) => {
  try {
    if (action === "restart") {
      app.relaunch();
      app.exit(0);
      return { success: true };
    }

    if (action === "shutdown") {
      app.quit();
      return { success: true };
    }

    return { success: false, error: "Unknown action" };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("network:get-status", async () => {
  const interfaces = os.networkInterfaces();
  const normalizedInterfaces = Object.entries(interfaces).map(([name, entries]) => {
    const ipv4 = (entries || []).find((e) => e.family === "IPv4" && !e.internal);
    const ipv6 = (entries || []).find((e) => e.family === "IPv6" && !e.internal);
    const isWifi = /(wi-?fi|wlan|wireless)/i.test(name);
    return {
      name,
      isWifi,
      ipv4: ipv4?.address || null,
      ipv6: ipv6?.address || null,
      mac: ipv4?.mac || ipv6?.mac || null,
    };
  });

  const external = normalizedInterfaces.filter((n) => n.ipv4 || n.ipv6);
  const wifi = normalizedInterfaces.find((n) => n.isWifi && (n.ipv4 || n.ipv6)) || null;

  const dnsProbe = new Promise((resolve) => {
    dns.lookup("google.com", (err) => resolve(!err));
  });
  const timeout = new Promise((resolve) => setTimeout(() => resolve(false), 2500));
  const online = await Promise.race([dnsProbe, timeout]);

  return {
    online,
    hostname: os.hostname(),
    platform: os.platform(),
    uptimeSec: Math.floor(os.uptime()),
    wifi,
    interfaces: external,
  };
});

app.whenReady().then(() => {
  // Setup download interception AFTER app is ready
  setupDownloadInterception();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
