import { useEffect, useMemo, useState } from "react";
import { Monitor, User, Image as ImageIcon, Save, Shield } from "lucide-react";
import { useSettingsStore } from "../../store/settingsStore.js";

export default function SettingsApp() {
  const { settings, saveSettings, setWallpaper, setPersonInfo } = useSettingsStore();
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const [personForm, setPersonForm] = useState(settings.person);
  const [pin, setPin] = useState(settings.pin);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(settings.wallpaper || null);

  useEffect(() => {
    setPersonForm(settings.person);
    setPin(settings.pin);
  }, [settings.person, settings.pin]);

  useEffect(() => {
    if (!window.electronAPI) return;
    const info = window.electronAPI.getDeviceInfo?.();
    setDeviceInfo(info || null);
    const sInfo = window.electronAPI.getStorageInfo?.();
    setStorageInfo(sInfo || null);
  }, []);

  const formatBytes = (bytes) => {
    if (!bytes || bytes < 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let idx = 0;
    let val = bytes;
    while (val >= 1024 && idx < units.length - 1) {
      val /= 1024;
      idx += 1;
    }
    return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  };

  const loadGalleryImages = () => {
    if (!window.electronAPI) return;
    const files = window.electronAPI.listFiles("images") || [];
    const imageFiles = files
      .filter((f) => !f.isDirectory && /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name))
      .sort((a, b) => new Date(b.modified || 0) - new Date(a.modified || 0));
    setImages(imageFiles);
  };

  const previewUrl = useMemo(() => {
    if (!settings.wallpaper || !window.electronAPI) return "";
    return (
      window.electronAPI.getImageDataUrl?.(settings.wallpaper) ||
      window.electronAPI.getFileUrl?.(settings.wallpaper) ||
      ""
    );
  }, [settings.wallpaper]);

  const savePerson = () => {
    setPersonInfo(personForm);
    alert("Person info saved");
  };

  const savePin = () => {
    if (!pin || pin.length < 4) {
      alert("PIN must be at least 4 characters");
      return;
    }
    saveSettings({ pin });
    alert("PIN updated");
  };

  const openWallpaperPicker = () => {
    loadGalleryImages();
    setShowWallpaperPicker(true);
  };

  const applyWallpaper = () => {
    if (!selectedImage) {
      alert("Select an image first");
      return;
    }
    setWallpaper(selectedImage);
    setShowWallpaperPicker(false);
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-4 bg-slate-950 text-slate-100">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Monitor size={16} /> Device Info
          </h2>
          <div className="text-sm space-y-2 text-slate-300">
            <p><span className="text-slate-400">Storage Root:</span> {window.electronAPI?.getAppDataDir?.() || "Unavailable"}</p>
            <p><span className="text-slate-400">Platform:</span> {deviceInfo?.platform || "Unknown"}</p>
            <p><span className="text-slate-400">Architecture:</span> {deviceInfo?.arch || "Unknown"}</p>
            <p><span className="text-slate-400">Electron:</span> {deviceInfo?.electron || "Unknown"}</p>
            <p><span className="text-slate-400">Chrome:</span> {deviceInfo?.chrome || "Unknown"}</p>
            <p><span className="text-slate-400">Node:</span> {deviceInfo?.node || "Unknown"}</p>
            <p><span className="text-slate-400">Total Storage:</span> {formatBytes(storageInfo?.totalBytes)}</p>
            <p><span className="text-slate-400">Available Storage:</span> {formatBytes(storageInfo?.freeBytes)}</p>
            <p><span className="text-slate-400">USB OS Used:</span> {formatBytes(storageInfo?.appUsedBytes)}</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <User size={16} /> Person Info
          </h2>
          <div className="space-y-2">
            <input
              value={personForm?.childName || ""}
              onChange={(e) => setPersonForm((s) => ({ ...s, childName: e.target.value }))}
              placeholder="Child name"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            />
            <input
              value={personForm?.age || ""}
              onChange={(e) => setPersonForm((s) => ({ ...s, age: e.target.value }))}
              placeholder="Age"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            />
            <input
              value={personForm?.guardianName || ""}
              onChange={(e) => setPersonForm((s) => ({ ...s, guardianName: e.target.value }))}
              placeholder="Guardian name"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            />
            <button
              onClick={savePerson}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm"
            >
              <Save size={14} /> Save Person Info
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Shield size={16} /> Security
          </h2>
          <div className="space-y-2">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Set PIN"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            />
            <button
              onClick={savePin}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm"
            >
              <Save size={14} /> Save PIN
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <ImageIcon size={16} /> Wallpaper
          </h2>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Wallpaper"
              className="w-full h-40 object-cover rounded-lg border border-slate-700 mb-3"
            />
          ) : (
            <div className="w-full h-40 rounded-lg border border-slate-700 mb-3 grid place-items-center text-slate-500 text-sm">
              No wallpaper selected
            </div>
          )}
          <button
            onClick={openWallpaperPicker}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm"
          >
            <ImageIcon size={14} /> Change Wallpaper
          </button>
        </section>
      </div>

      {showWallpaperPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center">
          <div className="w-[90vw] max-w-5xl max-h-[80vh] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h3 className="text-lg font-semibold mb-3">Select from Gallery</h3>
            {images.length === 0 ? (
              <p className="text-sm text-slate-400">No images found in Gallery. Capture or add images first.</p>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {images.map((img) => {
                  const relPath = `images/${img.name}`;
                  const url =
                    window.electronAPI?.getImageDataUrl?.(relPath) ||
                    window.electronAPI?.getFileUrl?.(relPath) ||
                    "";
                  return (
                    <button
                      key={img.name}
                      onClick={() => setSelectedImage(relPath)}
                      className={`rounded-lg overflow-hidden border-2 ${selectedImage === relPath ? "border-cyan-400" : "border-slate-700"}`}
                    >
                      <img src={url} alt={img.name} className="w-full h-28 object-cover" />
                      <div className="text-xs p-2 text-left truncate bg-slate-800">{img.name}</div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowWallpaperPicker(false)}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={applyWallpaper}
                className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-sm"
              >
                Set as Wallpaper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
