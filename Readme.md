# GuruKid – Portable Kid-Safe Mini OS
## Professional Hackathon-Ready Implementation

Fully-featured Electron mini-OS with real window management, advanced browser, downloads, camera, gallery, and parental controls.

---

## 🚀 RUNNING THE SYSTEM

### All 4 Services Running:
```bash
# Terminal 1: Backend (localhost:4000)
cd server && npm run dev

# Terminal 2: Admin Dashboard (localhost:5173)
cd frontend && npm run dev

# Terminal 3: GuruKid OS (localhost:5175)
cd usb-os && npm run dev

# Terminal 4: Python Agent
cd client && .venv\Scripts\activate && python agent.py
```

---

## 🎯 CORE FEATURES IMPLEMENTED

### 1. **Advanced Window Management**
- ✅ Draggable windows (react-rnd)
- ✅ Resizable windows with handles
- ✅ Z-index stacking system (auto-focus on top)
- ✅ Minimize / Maximize / Close buttons
- ✅ Active window highlighting
- ✅ Smooth transitions

### 2. **Global Zoom System**
- ✅ `Ctrl+` : Zoom in (+10%)
- ✅ `Ctrl-` : Zoom out (-10%)
- ✅ `Ctrl+0` : Reset to 100%
- ✅ Range: 50% to 200%
- ✅ Live zoom percentage display in taskbar
- ✅ Per-window zoom persistence

### 3. **Advanced Browser (Chrome/Edge Style)**
- ✅ Multiple tabs (Chrome-style tab bar)
- ✅ Tab management (add, close, switch)
- ✅ Address bar with rounded design
- ✅ Navigation buttons (Back, Forward, Refresh)
- ✅ Domain blocking (Facebook, TikTok, X, YouTube)
- ✅ Blocked page display with warning
- ✅ URL tracking & logging to backend
- ✅ Download manager with progress bars
- ✅ Webview integration

### 4. **File System Operations**
- ✅ Read/write files (preload API)
- ✅ Directory listing
- ✅ File deletion
- ✅ File renaming
- ✅ Directory creation
- ✅ Persisted in `~/.gurukid/` directory

### 5. **Download Manager**
- ✅ Download interception
- ✅ Progress tracking
- ✅ Downloads saved to `/downloads`
- ✅ Download list UI
- ✅ File removal

### 6. **Notepad App**
- ✅ Text editor with syntax highlighting
- ✅ New / Open / Save / Save As
- ✅ `Ctrl+S` keyboard shortcut
- ✅ Zoom support (inherits window zoom)
- ✅ Recent files list
- ✅ Auto-save indicator (● when unsaved)
- ✅ Files persist in `/data`

### 7. **File Manager**
- ✅ Browse folders: `/data`, `/downloads`, `/images`
- ✅ Open files
- ✅ Delete files
- ✅ Rename files in-place
- ✅ Set image as wallpaper
- ✅ Refresh functionality
- ✅ File size display
- ✅ Icon indicators

### 8. **Camera App**
- ✅ Live camera preview
- ✅ Capture button
- ✅ Preview captured image
- ✅ Save to gallery (/images)
- ✅ Retake option
- ✅ Error handling for camera access

### 9. **Gallery App**
- ✅ Grid layout (responsive: 3-6 columns)
- ✅ Image preview
- ✅ Delete image
- ✅ Set as wallpaper
- ✅ Image metadata (size, name)
- ✅ Selected image highlighting

### 10. **Wallpaper System**
- ✅ Default wallpaper (or default gradient)
- ✅ Change via File Manager or Gallery
- ✅ Persisted in `/config/settings.json`
- ✅ Loaded on startup
- ✅ Smooth background display
- ✅ File:// protocol support

### 11. **PIN System & Focus Mode**
- ✅ PIN prompt on startup (default: `1234`)
- ✅ Stored in `/config/settings.json`
- ✅ Inline PIN input (no unsupported `prompt()`)
- ✅ Focus mode overlay (blocks all interactions)
- ✅ PIN unlock for exit
- ✅ Focus mode via command from admin

### 12. **Taskbar & Start Menu**
- ✅ Start button
- ✅ Running apps list
- ✅ System tray area
- ✅ Live clock (HH:MM format)
- ✅ Zoom percentage display
- ✅ Start menu with app grid
- ✅ App icons with labels
- ✅ Shortcuts (Settings, About)

### 13. **Right-Click Context Menu**
- ✅ Right-click desktop
- ✅ Refresh
- ✅ Personalize options
- ✅ Clean styled context menu

### 14. **Backend Integration**
- ✅ Socket.IO device registration
- ✅ Stats sending (CPU, RAM)
- ✅ Activity logging (browser visits, actions)
- ✅ Command receiver (focus, unlock, open app)
- ✅ Connection status

### 15. **Admin Dashboard**
- ✅ Device list
- ✅ CPU & RAM monitoring
- ✅ Status (online/offline)
- ✅ Controls (Focus Mode, Unlock, Open App)
- ✅ Recent logs display
- ✅ Real-time Socket.IO updates

### 16. **Python Client Agent**
- ✅ CPU usage tracking
- ✅ RAM usage tracking
- ✅ Heartbeat every 5 seconds
- ✅ USB presence detection
- ✅ Device registration
- ✅ HTTP POST to backend

---

## 📁 PROJECT STRUCTURE

```
usb-os/
├── electron/
│   ├── main.js              # Electron entry point (loads Vite dev server on 5175)
│   ├── preload.js           # File system & IPC API exposure
│
├── src/
│   ├── main.jsx             # React entry
│   ├── index.css            # Tailwind + custom styles
│   ├── App.jsx
│   │
│   ├── components/
│   │   ├── DesktopNew.jsx   # Main desktop with window manager, zoom, wallpaper
│   │   ├── Window.jsx       # Draggable/resizable window (react-rnd)
│   │   ├── TaskbarNew.jsx   # Enhanced taskbar with Start menu & clock
│   │
│   ├── apps/
│   │   ├── Browser/
│   │   │   └── BrowserAdvanced.jsx  # Tabs, domain blocking, downloads
│   │   ├── Notepad/
│   │   │   └── Notepad.jsx         # Text editor with Ctrl+S
│   │   ├── FileManager/
│   │   │   └── FileManagerAdvanced.jsx  # Browse, rename, delete, set wallpaper
│   │   ├── Camera/
│   │   │   └── Camera.jsx           # Live preview & capture
│   │   ├── Gallery/
│   │   │   └── Gallery.jsx          # Grid, preview, delete, set wallpaper
│   │
│   ├── store/
│   │   ├── windowStore.js   # Zustand: window state, z-index, zoom
│   │   ├── settingsStore.js # Zustand: wallpaper, PIN, global zoom
│   │
│   ├── services/
│   │   ├── socket.js        # Socket.IO client
│   │   ├── api.js           # HTTP API

frontend/                # React admin dashboard (unchanged)
server/                  # Express backend (unchanged)
client/                  # Python agent (unchanged)
```

---

## ⌨️ KEYBOARD SHORTCUTS

| Shortcut     | Action |
|-------------|--------|
| `Ctrl+`     | Zoom in window (+10%) |
| `Ctrl-`     | Zoom out window (-10%) |
| `Ctrl+0`    | Reset zoom to 100% |
| `Ctrl+S`    | Save file (in Notepad) |
| `Right-click` | Desktop context menu |

---

## 🎨 UI/UX HIGHLIGHTS

- **Dark Theme**: Windows 11 style (slate colors, accent cyan)
- **Rounded UI**: Modern rounded corners (12px)
- **Smooth Animations**: Transitions on hover, focus, drag
- **Responsive**: Works across different window sizes
- **Accessibility**: Clear focus states, high contrast
- **Icons**: Lucide React icons throughout
- **Taskbar**: Floating bottom position with backdrop blur

---

## 🔐 SECURITY / PARENTAL CONTROLS

1. **PIN Lock**: Required to unlock at startup
2. **Domain Blocking**: Browser blocks specific domains and shows warning
3. **Focus Mode**: Fullscreen overlay that blocks all interactions
4. **Admin Commands**: Remotely lock/unlock/focus from dashboard
5. **Sandboxed Preload**: File operations go through preload (no direct Node in renderer)
6. **Activity Logging**: Browser visits and actions logged to backend

---

## 📝 CONFIG & DATA PERSISTENCE

### Storage Location: `~/.gurukid/`

```
~/.gurukid/
├── config/
│   └── settings.json       # PIN, wallpaper path, global zoom, theme
├── data/                   # Notepad files
├── downloads/              # Downloaded files
└── images/                 # Camera captures, saved wallpapers
```

### Default settings.json:
```json
{
  "pin": "1234",
  "wallpaper": null,
  "globalZoom": 100,
  "theme": "dark"
}
```

---

## 🚀 QUICK START GUIDE

### 1. **Enter PIN**
   - Default: `1234`
   - Click "Unlock" button

### 2. **Start Menu**
   - Click Start button (top-left of taskbar)
   - Select app icon to open
   - Multiple instances of same app open in new windows

### 3. **Window Controls**
   - Drag title bar to move
   - Drag edges/corners to resize
   - Minimize / Maximize / Close buttons in title bar

### 4. **Browser**
   - Multiple tabs
   - Address bar to navigate
   - Blocked domains show warning page
   - Download indicator in toolbar

### 5. **File Manager**
   - Navigate: Data, Downloads, Images
   - Create folder, rename, delete
   - Right-click → Set as Wallpaper (images only)

### 6. **Camera**
   - Capture photos in real-time
   - Preview before saving
   - Save to Gallery

### 7. **Zoom**
   - `Ctrl++` to zoom in
   - `Ctrl+-` to zoom out
   - Zoom % shown in taskbar

---

## 🔧 TECH STACK

| Layer | Technology |
|-------|------------|
| Desktop | Electron 28 |
| Renderer | React 18 + Vite 5 |
| State | Zustand |
| UI | Tailwind CSS + Lucide React |
| Windowing | react-rnd |
| Backend | Express + Socket.IO |
| Frontend | React + Vite |
| Agent | Python + psutil |

---

## 🎯 HACKATHON CHECKLIST

- ✅ Real working applications
- ✅ File system operations (read, write, delete, rename)
- ✅ Download management
- ✅ Camera & gallery
- ✅ Window management (drag, resize, z-index)
- ✅ Zoom system
- ✅ Parental controls (PIN, blocking, focus mode)
- ✅ Backend integration
- ✅ Admin dashboard
- ✅ Python agent
- ✅ Professional UI/UX
- ✅ Smooth animations
- ✅ Full persistence

---

## 📱 ACCESSIBILITY FEATURES

- High contrast dark theme
- Clear focus indicators
- Keyboard navigation (Tab, Enter)
- Large touch targets (taskbar buttons, window controls)
- Keyboard shortcuts (`Ctrl+` zoom system)
- Error messages and alerts (PIN, domain blocking)

---

## 🐛 TROUBLESHOOTING

### Electron window not opening
- Check port 5175 is free (`Get-NetTCPConnection -LocalPort 5175`)
- Check main.js has correct DEV_PORT

### Preload API not working
- Verify preload.js path in main.js
- Check ~/.gurukid/ directories exist
- Check console for security warnings

### Wallpaper not loading
- Verify image path in settings.json
- Check file exists in ~/.gurukid/
- Try refreshing desktop

### Downloads not working
- Check ~/gurukid/downloads/ folder exists
- Verify download path in Electron main process
- Check webview permissions

---

## 🎬 NEXT IMPROVEMENTS

- [ ] File upload via drag-drop
- [ ] Text file preview (not just notepad)
- [ ] Settings app for PIN change, theme toggle
- [ ] Search functionality
- [ ] Favorites/bookmarks in browser
- [ ] Video camera app
- [ ] Screenshot tool
- [ ] Multi-user accounts
- [ ] Encryption for sensitive files
- [ ] Sync with admin dashboard in real-time

---

**GuruKid v1.0 - Built for hackathons. Production-ready core, extensible architecture.**
