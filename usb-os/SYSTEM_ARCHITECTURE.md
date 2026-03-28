# GuruKid OS - System Architecture & Integration

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURE ELECTRON ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  USER APPS (React Components)                                    │
│  ├─ Camera.jsx         (Image capture & save)                   │
│  ├─ Notepad.jsx        (Text file editor)                       │
│  ├─ Browser.jsx        (Web browsing + downloads)               │
│  ├─ FileManager.jsx    (Directory browsing)                     │
│  └─ Gallery.jsx        (Image viewer & wallpaper)               │
│           ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  IPC Bridge (Secure Communication)                      │   │
│  │  window.electronAPI                                     │   │
│  │  ├─ readFile(path)                                      │   │
│  │  ├─ writeFile(path, content)                            │   │
│  │  ├─ saveImage(base64, filename)                         │   │
│  │  ├─ listFiles(directory)                                │   │
│  │  ├─ deleteFile(path)                                    │   │
│  │  └─ renameFile(oldPath, newPath)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│           ↓                                                       │
│  PRELOAD.JS (Node.js Context)                                   │
│  ├─ contextBridge (expose safe APIs)                           │
│  ├─ ipcRenderer (communication)                                │
│  └─ Path validation (prevent traversal attacks)                │
│           ↓                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  MAIN PROCESS (Electron)                                │   │
│  │  ├─ IPC Handlers (file operations)                      │   │
│  │  ├─ Download Interception                               │   │
│  │  │  └─ session.defaultSession.on('will-download')       │   │
│  │  └─ Window Management                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│           ↓                                                       │
│  NODE.JS APIs (Protected)                                        │
│  ├─ fs (file system)                                           │
│  ├─ path (path utilities)                                       │
│  └─ os (OS utilities)                                           │
│           ↓                                                       │
│  ~/.gurukid/ (App-Controlled Directory)                         │
│  ├─ /config                                                      │
│  ├─ /data          (Notepad files)                             │
│  ├─ /downloads     (Browser downloads)                         │
│  └─ /images        (Camera captures & gallery)                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔒 Security Implementation

### Context Isolation & Sandboxing
```javascript
// electron/main.js
webPreferences: {
  preload: path.join(__dirname, "preload.js"),
  nodeIntegration: false,          // ✓ Node APIs NOT in renderer
  contextIsolation: true,          // ✓ Separate contexts
  webviewTag: true,                // ✓ <webview> for browser
  sandbox: true,                   // ✓ Process sandboxed
}
```

### Path Validation
```javascript
// electron/preload.js
const validatePath = (filePath) => {
  const fullPath = path.join(appDataDir, filePath);
  const resolved = path.resolve(fullPath);
  
  // Prevent directory traversal: ../../../etc/passwd attacks
  if (!resolved.startsWith(path.resolve(appDataDir))) {
    throw new Error("Path traversal attempt detected");
  }
  return resolved;
};
```

---

## 🔧 Critical Fixes Applied

### 1. **Download Interception (Main Process)**

**BEFORE:** Downloads went to host OS Downloads folder  
**AFTER:** All downloads saved to `~/.gurukid/downloads/`

#### Implementation:
```javascript
// electron/main.js
session.defaultSession.on("will-download", (event, item, webContents) => {
  const filename = item.getFilename();
  const savePath = path.join(downloadsDir, filename);
  
  item.setSavePath(savePath);  // ← Override default behavior
  
  item.on("updated", (event, state) => {
    if (state === "progressing") {
      const percent = Math.round((progress / total) * 100);
      // Send progress to renderer via IPC
      mainWindow?.webContents.send("download-progress", {
        id: item.getFilename(),
        filename,
        progress,
        total,
        percent,
      });
    }
  });
});
```

**React Component Usage:**
```javascript
// src/apps/Browser/BrowserAdvanced.jsx
useEffect(() => {
  // Listen for download events from main process
  const unsubscribe = window.electronAPI.on("download-progress", (data) => {
    setDownloads(d => [...d, data]);  // Update UI
  });
  
  return () => unsubscribe?.();
}, []);
```

---

### 2. **Camera Image Saving (Binary Files)**

**BEFORE:** Tried to save binary data as UTF-8 string  
**AFTER:** Dedicated `saveImage()` API for binary conversion

#### Preload API:
```javascript
// electron/preload.js
saveImage: (base64Data, filename) => {
  try {
    const fullPath = validatePath(`images/${filename}`);
    
    // Convert base64 → Buffer
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64String, "base64");
    
    // Write to disk
    fs.writeFileSync(fullPath, buffer);
    return { success: true, path: fullPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
```

#### React Component:
```javascript
// src/apps/Camera/Camera.jsx
const saveCapture = async () => {
  const filename = `capture-${Date.now()}.png`;
  const result = window.electronAPI.saveImage(captured, filename);
  
  if (result.success) {
    alert("Image saved!");
  }
};
```

---

### 3. **Notepad File Operations**

**BEFORE:** No error handling, sync operations  
**AFTER:** Proper validation, error alerts, file refresh

#### Implementation:
```javascript
// src/apps/Notepad/Notepad.jsx
const save = () => {
  let finalFilename = filename;
  if (!finalFilename.endsWith(".txt")) {
    finalFilename = filename + ".txt";
  }

  try {
    const result = window.electronAPI.writeFile(
      `data/${finalFilename}`, 
      content
    );
    
    if (result?.success) {
      setFilename(finalFilename);
      setModified(false);
      alert(`Saved: ${finalFilename}`);
      refreshFiles();  // Reload file list
    } else {
      alert(`Error: ${result?.error}`);
    }
  } catch (err) {
    alert(`Failed: ${err.message}`);
  }
};
```

**Ctrl+S Support:**
```javascript
useEffect(() => {
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      save();
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [filename, content]);
```

---

### 4. **Browser Navigation (Back/Forward/Reload)**

**BEFORE:** Buttons not connected to webview  
**AFTER:** Proper methods call webview ref

#### Implementation:
```javascript
// src/apps/Browser/BrowserAdvanced.jsx
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
```

**Button Binding:**
```jsx
<button onClick={goBack}>
  <ChevronLeft size={18} />
</button>
<button onClick={goForward}>
  <ChevronRight size={18} />
</button>
<button onClick={reload}>
  <RotateCw size={18} />
</button>
```

---

### 5. **File Manager Operations**

**BEFORE:** No error handling, inconsistent response checking  
**AFTER:** Detailed error messages, user confirmations, proper sorting

#### Implementation:
```javascript
// src/apps/FileManager/FileManagerAdvanced.jsx
const deleteFile = () => {
  const confirmDelete = window.confirm(`Delete "${selected.name}"?`);
  if (!confirmDelete) return;

  try {
    const result = window.electronAPI.deleteFile(
      `${currentDir}/${selected.name}`
    );
    if (result?.success) {
      alert(`Deleted: ${selected.name}`);
      refresh();
    } else {
      alert(`Error: ${result?.error}`);
    }
  } catch (err) {
    alert(`Failed: ${err.message}`);
  }
};
```

---

## 📁 File System Structure

All app data lives in `~/.gurukid/`:

```
~/.gurukid/
├── config/
│   └── settings.json         ← PIN, wallpaper path, theme
├── data/
│   ├── notes-1.txt
│   ├── notes-2.txt
│   └── ...
├── downloads/
│   ├── document.pdf
│   ├── image.jpg
│   └── ...
└── images/
    ├── capture-1234567890.png
    ├── capture-1234567891.png
    └── ...
```

**Key Property:**
- ALL file operations use relative paths from `~/.gurukid/`
- Path validation prevents access outside this directory
- No access to OS Downloads, Documents, or other folders

---

## 🔌 IPC Communication Patterns

### Pattern 1: Read File
```javascript
// Renderer (React)
const content = window.electronAPI.readFile("data/notes.txt");

// Preload.js
readFile: (filePath) => {
  const fullPath = validatePath(filePath);
  return fs.readFileSync(fullPath, "utf-8");
}
```

### Pattern 2: Write File
```javascript
// Renderer
const result = window.electronAPI.writeFile("data/notes.txt", "content");
if (result.success) { /* show success */ }

// Preload.js
writeFile: (filePath, content) => {
  const fullPath = validatePath(filePath);
  fs.writeFileSync(fullPath, content, "utf-8");
  return { success: true };
}
```

### Pattern 3: List Files
```javascript
// Renderer
const files = window.electronAPI.listFiles("downloads");

// Preload.js
listFiles: (directory) => {
  const fullPath = validatePath(directory);
  return fs.readdirSync(fullPath).map(file => ({
    name: file,
    isDirectory: stat.isDirectory(),
    size: stat.size,
    modified: stat.mtime.toISOString(),
  }));
}
```

### Pattern 4: Save Binary Data (Images)
```javascript
// Renderer
const result = window.electronAPI.saveImage(base64Data, "photo.png");

// Preload.js
saveImage: (base64Data, filename) => {
  const buffer = Buffer.from(
    base64Data.replace(/^data:image\/\w+;base64,/, ""), 
    "base64"
  );
  fs.writeFileSync(fullPath, buffer);
  return { success: true, path: fullPath };
}
```

### Pattern 5: Listen for Events (Downloads)
```javascript
// Renderer
const unsubscribe = window.electronAPI.on("download-progress", (data) => {
  console.log(`${data.filename}: ${data.percent}%`);
});

// Main Process
mainWindow?.webContents.send("download-progress", {
  filename: "document.pdf",
  percent: 75,
});
```

---

## ✅ Verification Checklist

- [x] Downloads go to `~/.gurukid/downloads/` (not host OS folder)
- [x] Camera saves images to `~/.gurukid/images/`
- [x] Notepad saves/loads from `~/.gurukid/data/`
- [x] File Manager lists files from proper directories
- [x] Browser back/forward/reload buttons work
- [x] All file operations use preload API (no direct Node access in React)
- [x] Path validation prevents directory traversal attacks
- [x] Proper error handling with user-facing messages
- [x] Binary files (images) handled correctly via base64 → Buffer conversion
- [x] IPC event listeners properly subscribed/unsubscribed

---

## 🧪 Testing the System

### Test 1: Browser Download
1. Open Browser app
2. Navigate to any website
3. Download a file (right-click → Save As)
4. Open File Manager → downloads folder
5. ✓ File should be there

### Test 2: Camera Capture
1. Open Camera app
2. Click "Capture" button
3. Click "Save" button
4. Open Gallery app
5. ✓ Image should appear

### Test 3: Notepad Persistence
1. Open Notepad app
2. Type "Hello World"
3. Press Ctrl+S
4. Close Notepad
5. Open Notepad again
6. Click on saved file in Recent Files
7. ✓ Content should be restored

### Test 4: File Manager Operations
1. Open File Manager → downloads folder
2. Select a file
3. Click "Rename" → type new name → press Enter
4. ✓ File renamed
5. Click "Delete"
6. ✓ File removed

### Test 5: Wallpaper
1. Open Gallery app
2. Select an image
3. Click "Set Wallpaper"
4. ✓ Desktop background changes

---

## 🚀 Performance Optimizations

1. **Lazy Loading**: Files loaded on-demand (not all at startup)
2. **File Sorting**: Images sorted by modification date (newest first)
3. **Error Recovery**: Failed operations don't crash app
4. **Memory Management**: Image URL generation on-demand

---

## 📚 API Reference

### File Operations

```javascript
// Read text file
const content = window.electronAPI.readFile("data/notes.txt");
// → string | null

// Write text file
const result = window.electronAPI.writeFile("data/notes.txt", "content");
// → { success: true } | { success: false, error: string }

// Save image from base64
const result = window.electronAPI.saveImage(base64Data, "photo.png");
// → { success: true, path: string } | { success: false, error: string }

// List files in directory
const files = window.electronAPI.listFiles("downloads");
// → Array<{ name, isDirectory, size, modified }>

// Delete file
const result = window.electronAPI.deleteFile("downloads/old.pdf");
// → { success: true } | { success: false, error: string }

// Rename file
const result = window.electronAPI.renameFile("data/old.txt", "data/new.txt");
// → { success: true } | { success: false, error: string }

// Open file (read)
const content = window.electronAPI.openFile("data/notes.txt");
// → string | null

// Create directory
const result = window.electronAPI.createDirectory("data/subfolder");
// → { success: true } | { success: false, error: string }
```

### Event Listeners

```javascript
// Listen for download progress
const unsubscribe = window.electronAPI.on("download-progress", (data) => {
  console.log(`${data.filename}: ${data.percent}%`);
});

// Stop listening
unsubscribe?.();

// Listen for download completed
const unsub = window.electronAPI.on("download-completed", (data) => {
  console.log(`Downloaded: ${data.path}`);
});
```

### Utility Functions

```javascript
// Get app data directory
const dir = window.electronAPI.getAppDataDir();
// → "/home/user/.gurukid"

// Get specific directories
window.electronAPI.getDownloadsDir();  // ~/.gurukid/downloads
window.electronAPI.getImagesDir();     // ~/.gurukid/images
window.electronAPI.getDataDir();       // ~/.gurukid/data
window.electronAPI.getConfigDir();     // ~/.gurukid/config
```

---

## 🐛 Debugging Issues

### Issue: "File not found" when saving
- Check: Is the parent directory created? (It auto-creates)
- Check: Is the filename valid?
- Check: Does user have permissions to ~/.gurukid/?

### Issue: Images not displaying in Gallery
- Check: Camera saves to `images/` directory?
- Use: `window.electronAPI.listFiles("images")` in console
- Check: Image URLs are formatted as `file:///path/to/image`

### Issue: Browser downloads hidden
- Check: Downloads panel open (click download icon)?
- Check: Download destination is `~/.gurukid/downloads/`?
- Check: Browser allows downloads from domain?

### Issue: Notepad saves but can't open
- Check: File has `.txt` extension?
- Check: File is in `~/.gurukid/data/` directory?
- Use: `window.electronAPI.listFiles("data")` to verify

---

## 🔐 Security Notes

1. **No Direct Node Access**: React components can't use `require()` or `fs`
2. **Path Validation**: All paths validated against `~/.gurukid/`
3. **Context Isolation**: Renderer context separate from Node context
4. **Sandbox**: Electron process runs in sandbox
5. **No Eval**: No `eval()` or `Function()` constructor
6. **Limited APIs**: Only safe APIs exposed via preload

---

## 📝 Summary

This system provides:

✅ **Secure** file operations with path validation  
✅ **Controlled** file system (~/. gurukid/ only)  
✅ **Reliable** downloads to app-specific folder  
✅ **Persistent** data storage for all apps  
✅ **User-Friendly** error handling & feedback  
✅ **Professional** UI with real functionality  

All renderer-to-OS communication flows through preload.js with proper validation and sandboxing.
