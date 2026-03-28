const { contextBridge, ipcRenderer } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { pathToFileURL } = require("url");

const basePath = path.dirname(process.execPath);
const appDataDir = basePath;
const configDir = path.join(appDataDir, "config");
const deviceFile = path.join(configDir, "device.json");
const sessionFile = path.join(configDir, "session.json");
const settingsFile = path.join(appDataDir, "settings.json");
const userRoots = ["data", "downloads", "images", "videos"];
const dirsToCreate = [appDataDir, ...userRoots.map((d) => path.join(appDataDir, d)), configDir];

const ensureBaseDirs = () => {
  dirsToCreate.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify({}, null, 2), "utf-8");
  }
};
ensureBaseDirs();

const getCurrentUser = () => {
  try {
    if (!fs.existsSync(sessionFile)) return null;
    return JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
  } catch {
    return null;
  }
};

const ensureUserDirs = () => {
  const current = getCurrentUser();
  if (!current?.userId) return;
  userRoots.forEach((root) => {
    const userPath = path.join(appDataDir, root, current.userId);
    if (!fs.existsSync(userPath)) {
      fs.mkdirSync(userPath, { recursive: true });
    }
  });
};

const getOrCreateDeviceKey = () => {
  try {
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    if (fs.existsSync(deviceFile)) {
      const parsed = JSON.parse(fs.readFileSync(deviceFile, "utf-8"));
      if (parsed?.deviceKey) return parsed.deviceKey;
    }
    const key = crypto.randomUUID();
    fs.writeFileSync(deviceFile, JSON.stringify({ deviceKey: key }, null, 2), "utf-8");
    return key;
  } catch {
    return "";
  }
};

const withUserScope = (inputPath = "") => {
  const normalized = String(inputPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized === "settings.json") return normalized || "settings.json";
  if (normalized.startsWith("config/")) return normalized;

  const current = getCurrentUser();
  const userId = current?.userId || "guest";
  const segments = normalized.split("/").filter(Boolean);
  const root = segments[0];
  if (!userRoots.includes(root)) {
    return normalized;
  }

  if (segments.length === 1) {
    return `${root}/${userId}`;
  }

  if (segments[1] === userId) {
    return normalized;
  }

  return [root, userId, ...segments.slice(1)].join("/");
};

// Validate file path to prevent directory traversal attacks
const validatePath = (filePath) => {
  const normalized = withUserScope(filePath);
  const fullPath = path.join(appDataDir, normalized);
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(appDataDir))) {
    throw new Error("Path traversal attempt detected");
  }
  return resolved;
};

const getDirectorySize = (dirPath) => {
  let total = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += getDirectorySize(full);
    } else {
      total += fs.statSync(full).size;
    }
  }
  return total;
};

contextBridge.exposeInMainWorld("electronAPI", {
  // ============ IPC Communication ============
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },

  invoke: (channel, data) => {
    return ipcRenderer.invoke(channel, data);
  },

  on: (channel, func) => {
    const subscription = (_event, ...args) => func(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },

  once: (channel, func) => {
    ipcRenderer.once(channel, (_event, ...args) => func(...args));
  },

  openInFolder: (relativePath) => ipcRenderer.invoke("open-in-folder", relativePath),
  systemControl: (action) => ipcRenderer.invoke("system-control", action),
  getNetworkStatus: () => ipcRenderer.invoke("network:get-status"),
  getBasePath: () => basePath,

  getDeviceKey: () => getOrCreateDeviceKey(),
  getCurrentUser: () => getCurrentUser(),
  setCurrentUser: (session) => {
    try {
      if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        sessionFile,
        JSON.stringify(
          {
            userId: session?.userId || null,
            email: session?.email || "",
            nickname: session?.nickname || "",
            token: session?.token || "",
            deviceKey: session?.deviceKey || "",
          },
          null,
          2
        ),
        "utf-8"
      );
      ensureUserDirs();
      ipcRenderer.invoke("session:set-current-user", session || {});
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  clearCurrentUser: () => {
    try {
      if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
      ipcRenderer.invoke("session:clear");
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ============ Text File Operations ============
  readFile: (filePath) => {
    try {
      const fullPath = validatePath(filePath);
      if (!fs.existsSync(fullPath)) {
        return null;
      }
      return fs.readFileSync(fullPath, "utf-8");
    } catch (err) {
      console.error("readFile error:", err.message);
      return null;
    }
  },

  writeFile: (filePath, content) => {
    try {
      const fullPath = validatePath(filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, "utf-8");
      return { success: true };
    } catch (err) {
      console.error("writeFile error:", err.message);
      return { success: false, error: err.message };
    }
  },

  // ============ Binary File Operations (Images, Downloads) ============
  saveImage: (base64Data, filename) => {
    try {
      const fullPath = validatePath(`images/${filename}`);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Remove data:image/...;base64, prefix if present
      const base64String = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64String, "base64");
      fs.writeFileSync(fullPath, buffer);
      return { success: true, path: fullPath };
    } catch (err) {
      console.error("saveImage error:", err.message);
      return { success: false, error: err.message };
    }
  },

  saveBinary: (base64Data, filePath) => {
    try {
      const fullPath = validatePath(filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const base64String = base64Data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64String, "base64");
      fs.writeFileSync(fullPath, buffer);
      return { success: true, path: fullPath };
    } catch (err) {
      console.error("saveBinary error:", err.message);
      return { success: false, error: err.message };
    }
  },

  // ============ File System Operations ============
  listFiles: (directory) => {
    try {
      ensureUserDirs();
      const fullPath = validatePath(directory);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        return [];
      }
      const items = fs.readdirSync(fullPath);
      return items.map((file) => {
        const filePath = path.join(fullPath, file);
        try {
          const stat = fs.statSync(filePath);
          return {
            name: file,
            isDirectory: stat.isDirectory(),
            size: stat.size,
            modified: stat.mtime.toISOString(),
          };
        } catch {
          return { name: file, isDirectory: false, size: 0, modified: null };
        }
      });
    } catch (err) {
      console.error("listFiles error:", err.message);
      return [];
    }
  },

  deleteFile: (filePath) => {
    try {
      const fullPath = validatePath(filePath);
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: "File not found" };
      }
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      return { success: true };
    } catch (err) {
      console.error("deleteFile error:", err.message);
      return { success: false, error: err.message };
    }
  },

  renameFile: (oldPath, newPath) => {
    try {
      const oldFull = validatePath(oldPath);
      const newFull = validatePath(newPath);
      if (!fs.existsSync(oldFull)) {
        return { success: false, error: "File not found" };
      }
      fs.renameSync(oldFull, newFull);
      return { success: true };
    } catch (err) {
      console.error("renameFile error:", err.message);
      return { success: false, error: err.message };
    }
  },

  createDirectory: (dirPath) => {
    try {
      const fullPath = validatePath(dirPath);
      fs.mkdirSync(fullPath, { recursive: true });
      return { success: true };
    } catch (err) {
      console.error("createDirectory error:", err.message);
      return { success: false, error: err.message };
    }
  },

  openFile: (filePath) => {
    try {
      const fullPath = validatePath(filePath);
      if (!fs.existsSync(fullPath)) {
        return null;
      }
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) {
        return null;
      }
      return fs.readFileSync(fullPath, "utf-8");
    } catch (err) {
      console.error("openFile error:", err.message);
      return null;
    }
  },

  // ============ Utility ============
  getAppDataDir: () => appDataDir,
  getDownloadsDir: () => validatePath("downloads"),
  getImagesDir: () => validatePath("images"),
  getDataDir: () => validatePath("data"),
  getConfigDir: () => path.join(appDataDir, "config"),
  getFileUrl: (relativePath) => {
    try {
      const fullPath = validatePath(relativePath);
      return pathToFileURL(fullPath).toString();
    } catch {
      return "";
    }
  },
  getImageDataUrl: (relativePath) => {
    try {
      const fullPath = validatePath(relativePath);
      if (!fs.existsSync(fullPath)) return "";

      const ext = path.extname(fullPath).toLowerCase();
      const mimeMap = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".jfif": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".svg": "image/svg+xml",
        ".avif": "image/avif",
      };
      const mime = mimeMap[ext] || "image/png";
      const buffer = fs.readFileSync(fullPath);
      return `data:${mime};base64,${buffer.toString("base64")}`;
    } catch {
      return "";
    }
  },
  getDeviceInfo: () => ({
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  }),
  getStorageInfo: () => {
    try {
      const appUsedBytes = getDirectorySize(appDataDir);
      if (typeof fs.statfsSync === "function") {
        const stats = fs.statfsSync(appDataDir);
        const totalBytes = Number(stats.blocks) * Number(stats.bsize);
        const freeBytes = Number(stats.bavail) * Number(stats.bsize);
        return { totalBytes, freeBytes, usedBytes: totalBytes - freeBytes, appUsedBytes };
      }
      return { totalBytes: 0, freeBytes: 0, usedBytes: 0, appUsedBytes };
    } catch {
      return { totalBytes: 0, freeBytes: 0, usedBytes: 0, appUsedBytes: 0 };
    }
  },
  eraseDeviceData: () => {
    try {
      const current = getCurrentUser();
      const userId = current?.userId;
      if (!userId) return { success: false, error: "No active user" };

      for (const root of userRoots) {
        const dir = path.join(appDataDir, root, userId);
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
      ensureUserDirs();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
});