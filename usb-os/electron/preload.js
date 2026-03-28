const { contextBridge, ipcRenderer } = require("electron");
const path = require("path");
const fs = require("fs");

// Keep device storage local to the usb-os project folder.
const appDataDir = path.resolve(__dirname, "..", "device-storage");
const dirsToCreate = [
  appDataDir,
  path.join(appDataDir, "data"),
  path.join(appDataDir, "downloads"),
  path.join(appDataDir, "images"),
  path.join(appDataDir, "config"),
];
dirsToCreate.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Validate file path to prevent directory traversal attacks
const validatePath = (filePath) => {
  const fullPath = path.join(appDataDir, filePath);
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(appDataDir))) {
    throw new Error("Path traversal attempt detected");
  }
  return resolved;
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
  getDownloadsDir: () => path.join(appDataDir, "downloads"),
  getImagesDir: () => path.join(appDataDir, "images"),
  getDataDir: () => path.join(appDataDir, "data"),
  getConfigDir: () => path.join(appDataDir, "config"),
  getDeviceInfo: () => ({
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  }),
});
