# 🚀 Quick Start - Testing GuruKid OS

## How to Run GuruKid OS

### Step 1: Start Dev Server
```bash
cd usb-os
npm run dev
```

✅ Wait for Electron window to open (takes 30-45 seconds)
- Vite dev server starts on port 5176/5177
- Electron loads React app from dev server
- Main process initializes download interception

### Step 2: If Port Issues (Common on Windows)
If you see "Port already in use" errors:
```bash
# Kill any Node.js processes
taskkill /F /IM node.exe

# Then start again
npm run dev
```

---

## 🧪 Testing Procedures

### TEST 1: Notepad File Persistence
**Goal**: Verify files save and load correctly

```
1. Click Start Menu → Notepad
2. Type: "Hello World Test"
3. Press Ctrl+S (or click Save)
4. Confirm file saved message
5. Close Notepad
6. Reopen Notepad
7. Click on saved file in Recent Files
8. ✅ Should see "Hello World Test"
```

**Expected Result**: File content persists after app restart

---

### TEST 2: Camera Image Capture
**Goal**: Verify camera saves images to gallery

```
1. Click Start Menu → Camera
2. Allow camera permission if prompted
3. Click "Capture" button
4. Click "Save" button
5. Confirm "Image saved!" message
6. Close Camera
7. Click Start Menu → Gallery
8. ✅ Should see captured image in grid
```

**Expected Result**: 
- Image appears in Gallery
- File saved to ~/.gurukid/images/
- Can set as wallpaper

---

### TEST 3: Browser Download Interception
**Goal**: Verify downloads go to app folder

```
1. Click Start Menu → Browser
2. Navigate to: https://example.com
3. Right-click on any link → "Save As"
4. Download completes
5. Download appears in download panel (📥 icon)
6. Open File Manager → downloads folder
7. ✅ Should see downloaded file
```

**Expected Result**:
- File in ~/.gurukid/downloads/ NOT host OS Downloads
- Progress bar shows percentage
- Download list updates

---

### TEST 4: File Manager Operations
**Goal**: Verify file operations with confirmations

```
1. Click Start Menu → File Manager
2. Click "downloads" tab (select downloads folder)
3. Select any file
4. Click "Rename" button
5. Change name, press Enter
6. ✅ File renamed successfully
7. Select different file
8. Click "Delete" button
9. Confirm in dialog
10. ✅ File deleted
```

**Expected Result**:
- Rename works with confirmation
- Delete works with confirmation
- Errors show clear messages
- File list refreshes

---

### TEST 5: Browser Navigation
**Goal**: Verify back/forward/reload buttons work

```
1. Click Start Menu → Browser
2. Navigate to google.com
3. Navigate to github.com
4. Click ← (Back) button
5. ✅ Should go back to google.com
6. Click → (Forward) button
7. ✅ Should go forward to github.com
8. Click ⟳ (Reload) button
9. ✅ Page reloads
```

**Expected Result**:
- All navigation buttons work
- History preserved
- No console errors

---

### TEST 6: Gallery & Wallpaper
**Goal**: Verify gallery and wallpaper setting

```
1. Open Camera → capture image → save
2. Click Start Menu → Gallery
3. ✅ Image appears in grid
4. Click on image (select)
5. Click "📷 Set Wallpaper"
6. Confirm message
7. Close Gallery
8. Desktop background changes
9. ✅ New wallpaper visible
```

**Expected Result**:
- Gallery loads all images
- Wallpaper updates immediately
- Persists on app restart

---

## 🔍 Console Testing (Advanced)

Open DevTools: **F12** → Console tab

### Test File API
```javascript
// Test write
> window.electronAPI.writeFile("data/test.txt", "Hello")
{success: true}

// Test read
> window.electronAPI.readFile("data/test.txt")
"Hello"

// Test list
> window.electronAPI.listFiles("downloads")
Array [{name: "file.pdf", size: 1234, ...}]

// Test image save
> const base64 = "data:image/png;base64,iVBORw0KGgo..."
> window.electronAPI.saveImage(base64, "test.png")
{success: true, path: "/home/user/.gurukid/images/test.png"}
```

### Check Directory Structure
```javascript
// Get app directory
> window.electronAPI.getAppDataDir()
"/home/user/.gurukid"

// List all directories
> window.electronAPI.listFiles("")
Array [
  {name: "config", isDirectory: true},
  {name: "data", isDirectory: true},
  {name: "downloads", isDirectory: true},
  {name: "images", isDirectory: true}
]
```

---

## 🐛 Troubleshooting

### Issue: Electron window doesn't open
**Solution**:
```bash
# Kill any leftover processes
taskkill /F /IM electron.exe
taskkill /F /IM node.exe

# Clear cache
rmdir /s %APPDATA%\.electron

# Run again
npm run dev
```

### Issue: Files not saving
**Solution**:
```javascript
// Check in console
> window.electronAPI.writeFile("data/test.txt", "test")
{success: true} ✅

// If false, check error
{success: false, error: "..."}
```

### Issue: Images not showing in Gallery
**Solution**:
```javascript
// Check if images exist
> window.electronAPI.listFiles("images")

// If empty, try saving from Camera
// If not empty but don't show, check URL generation
> window.electronAPI.getImagesDir()
```

### Issue: Port already in use
**Solution**:
```bash
# Method 1: Kill Node
taskkill /F /IM node.exe

# Method 2: Use different port
set DEV_PORT=5180
npm run dev

# Method 3: Edit package.json
# Change "vite --port 5176" to "vite --port 5180"
```

### Issue: Camera permission denied
**Solution**:
1. Close app
2. Go to Windows Settings → Privacy & Security → Camera
3. Enable camera access for GuruKid
4. Restart app

---

## ✅ Validation Checklist

After running each test, verify:

- [ ] Notepad files save & persist
- [ ] Camera captures save correctly
- [ ] Browser downloads intercepted
- [ ] File Manager operations work
- [ ] Browser navigation functional
- [ ] Gallery shows images
- [ ] Wallpaper setting works
- [ ] No console errors
- [ ] All files in ~/.gurukid/ directory

---

## 📊 Sign-Off

| Item | Status | Tester | Date |
|------|--------|--------|------|
| Notepad persistence | ✅ ☐ | ___ | ___ |
| Camera saving | ✅ ☐ | ___ | ___ |
| Download interception | ✅ ☐ | ___ | ___ |
| File Manager operations | ✅ ☐ | ___ | ___ |
| Browser navigation | ✅ ☐ | ___ | ___ |
| Gallery functionality | ✅ ☐ | ___ | ___ |
| Wallpaper setting | ✅ ☐ | ___ | ___ |
| Overall stability | ✅ ☐ | ___ | ___ |

---

## 📝 Notes

### File Locations
- **Config**: ~/.gurukid/config/settings.json
- **Notepad Files**: ~/.gurukid/data/*.txt
- **Downloads**: ~/.gurukid/downloads/*
- **Images**: ~/.gurukid/images/*.png|jpg|gif

### Default PIN
- PIN: **1234**
- Change in: Settings → Security → PIN

### Keyboard Shortcuts
- **Ctrl+S**: Save in Notepad
- **Ctrl++**: Zoom in
- **Ctrl+-**: Zoom out
- **Ctrl+0**: Reset zoom

---

## 🎓 Learning Resources

Detailed technical docs in:
- `SYSTEM_ARCHITECTURE.md` - Deep technical dive
- `INTEGRATION_COMPLETE.md` - API reference
- `FIXES_SUMMARY.md` - What was fixed

---

**Ready to test?** Run `npm run dev` and follow the tests above! 🚀
