# GuruKid – Quick Reference

## 🚀 START THE SYSTEM

**Open 4 terminals and run:**

```bash
# Terminal 1: Backend (Express + Socket.IO)
cd server && npm run dev
# → http://localhost:4000

# Terminal 2: Admin Dashboard (React)
cd frontend && npm run dev
# → http://localhost:5173

# Terminal 3: GuruKid OS (Electron + React)
cd usb-os && npm run dev
# → Electron window opens, Vite runs on http://localhost:5175

# Terminal 4: Python Agent
cd client
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python agent.py
```

**All services must be running concurrently for full functionality.**

---

## 🔑 DEFAULT PIN

```
1234
```

Used for:
- Initial unlock on startup
- Exit from focus mode
- Set custom PIN in `/config/settings.json`

---

## 🎮 CONTROLS

### Mouse
- **Click**: Open apps from Start menu, interact with UI
- **Drag title bar**: Move windows
- **Drag window edges**: Resize windows
- **Double-click title bar**: Maximize/restore
- **Right-click desktop**: Context menu

### Keyboard
| Shortcut | Action |
|----------|--------|
| `Ctrl+` | Zoom window in (+10%) |
| `Ctrl-` | Zoom window out (-10%) |
| `Ctrl+0` | Reset zoom to 100% |
| `Ctrl+S` | Save in Notepad |
| `Tab` | Navigate UI |
| `Enter` | Confirm |
| `Escape` | Close menu |

---

## 📱 APPS

### Browser
- Multiple tabs (Chrome-style)
- URL/search bar
- Navigation buttons
- Download manager
- Domain blocking (YouTube, Facebook, TikTok, X)

### Notepad
- Text editor
- New / Open / Save As
- Zoom support
- Recent files list

### File Manager
- Browse: `/data`, `/downloads`, `/images`
- Rename, delete files
- Set image as wallpaper

### Camera
- Live preview
- Capture photo
- Save to gallery

### Gallery
- Grid view of images
- Preview
- Delete
- Set as wallpaper

---

## 🏠 FILE LOCATIONS

All data saved in: `~/.gurukid/`

```
~/.gurukid/
├── config/settings.json       # PIN, wallpaper, zoom
├── data/                       # Notepad files
├── downloads/                  # Downloaded files
└── images/                     # Photos from camera
```

### Example: Find saved notes
```
C:\Users\<YourUser>\.gurukid\data\*.txt
```

---

## 📊 MONITORING

### Backend Health
```
http://localhost:4000/health
```

### Active Devices (Admin Dashboard)
```
http://localhost:5173
```
- Shows connected GuruKid devices
- CPU & RAM live stats
- Logs of browser activity
- Remote controls (lock, unlock, focus)

### Client Activity
```
Python agent sends heartbeat every 5 seconds
Check ~/gurukid_device_id.txt for device ID
```

---

## 🔒 PARENTAL CONTROLS

### 1. PIN Lock
- Required to unlock on startup
- Change in `~/.gurukid/config/settings.json`

### 2. Domain Blocking
- Edit [usb-os/src/apps/Browser/BrowserAdvanced.jsx](usb-os/src/apps/Browser/BrowserAdvanced.jsx#L5)
- Line 5: `const BLOCKED_DOMAINS = [...]`

### 3. Focus Mode
- Fullscreen overlay blocks all interactions
- Exit via PIN or admin dashboard command
- Admin trigger: `POST /api/commands` with `type: "focus"`

### 4. Activity Logging
- Browser visits tracked in admin dashboard
- Socket.IO sends logs per device
- Backend stores in-memory (clears on restart)

---

## 🛠️ CUSTOMIZATION

### Change PIN
Edit `~/.gurukid/config/settings.json`:
```json
{
  "pin": "4321"
}
```

### Block Additional Domains
Edit [usb-os/src/apps/Browser/BrowserAdvanced.jsx](usb-os/src/apps/Browser/BrowserAdvanced.jsx):
```javascript
const BLOCKED_DOMAINS = [
  "facebook.com",
  "tiktok.com",
  "x.com",
  "youtube.com",
  "twitch.tv"  // Add here
];
```

### Change Wallpaper Programmatically
Use File Manager or Gallery → "Set as Wallpaper"

### Adjust Zoom Limits
Edit [usb-os/src/components/DesktopNew.jsx](usb-os/src/components/DesktopNew.jsx) zoom handlers (lines ~35-48):
```javascript
const newZoom = Math.min(activeWin.zoom + 10, 300);  // Up to 300%
const newZoom = Math.max(activeWin.zoom - 10, 25);   // Low to 25%
```

---

## 🐛 DEBUGGING

### Check if Electron running
```powershell
Get-Process electron
```

### Check port issues
```powershell
Get-NetTCPConnection -LocalPort 5175 -State Listen
```

### View console logs (Browser DevTools)
- Right-click in Electron window → Inspect Element
- Or in main.js add: `win.webContents.openDevTools();`

### Check file system operations
- Files should appear in `~/.gurukid/` subdirs
- Check preload.js is correctly configured

---

## ✅ TEST CHECKLIST

- [ ] PIN unlock works (default 1234)
- [ ] Browser opens, loads websites
- [ ] Domain blocking works (try facebook.com)
- [ ] Notepad saves files
- [ ] File Manager lists files
- [ ] Camera captures photos
- [ ] Gallery shows photos
- [ ] Wallpaper changes
- [ ] Zoom Ctrl+/- works
- [ ] Window drag/resize works
- [ ] Admin dashboard shows device
- [ ] Admin commands work (focus, unlock)
- [ ] Python agent sends data

---

## 📦 DEPLOYMENT

### Build for Distribution
```bash
# USB-OS
cd usb-os
npm run build

# Creates dist/ folder with production build
```

### Convert Python to EXE (Optional)
```bash
cd client
pip install pyinstaller
pyinstaller --onefile agent.py
# Creates dist/agent.exe
```

---

## 🎯 ARCHITECTURE

```
┌─────────────────────────────────────┐
│       GuruKid Desktop (Electron)    │
│  ┌──────────────────────────────┐   │
│  │  React Apps (Renderer)       │   │
│  │  • Browser, Notepad, etc.    │   │
│  │  • Zustand state management  │   │
│  └────────────┬─────────────────┘   │
│               │ IPC / Preload API   │
│  ┌────────────▼─────────────────┐   │
│  │  Electron Main Process        │   │
│  │  • Window management          │   │
│  │  • File system access         │   │
│  │  • Download interception      │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
          │
          │ Socket.IO
          ▼
┌─────────────────────────────────────┐
│   Express Backend (Node.js)         │
│   • Device registration             │
│   • In-memory storage               │
│   • Command dispatch                │
└─────────────────────────────────────┘
          │
          │ Socket.IO
          ▼
┌─────────────────────────────────────┐
│   Admin Dashboard (React)           │
│   • Device monitoring               │
│   • Remote controls                 │
│   • Activity logs                   │
└─────────────────────────────────────┘

          │
          │ HTTP
          ▼
┌─────────────────────────────────────┐
│   Python Client Agent               │
│   • System monitoring               │
│   • Heartbeat & USB detection       │
└─────────────────────────────────────┘
```

---

## 📞 SUPPORT

### Common Issues

**Q: Wallpaper not showing**  
A: Ensure image path in settings.json is correct. Try re-setting wallpaper.

**Q: Pin not working**  
A: Default is `1234`. Check ~/.gurukid/config/settings.json for custom PIN.

**Q: Files not saving**  
A: Check ~/.gurukid/ folder exists. Restart and try again.

**Q: Camera not working**  
A: Grant permission when browser prompts. Check camera not in use by another app.

**Q: Admin dashboard not connecting**  
A: Ensure backend is running (`npm run dev` in server/). Check Socket.IO port 4000.

---

**GuruKid v1.0** | Hackathon-Ready Mini OS | Built with ❤️ in React + Electron
