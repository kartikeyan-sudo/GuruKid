import { useState, useEffect } from "react";
import { Trash2, Image as ImageIcon, RotateCw } from "lucide-react";
import { useSettingsStore } from "../../store/settingsStore.js";
import { useWindowStore } from "../../store/windowStore.js";
import { useMediaStore } from "../../store/mediaStore.js";

export default function GalleryApp() {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { setWallpaper } = useSettingsStore();
  const { openWindow } = useWindowStore();
  const { openViewer } = useMediaStore();

  const openImageViewer = (filename) => {
    const relativePath = `images/${filename}`;
    const items = images.map((img) => `images/${img.name}`);
    openViewer(items, relativePath);
    openWindow("image-viewer", "Image Viewer", "imageViewer", {
      x: 10, y: 10,
      width: Math.max(window.innerWidth - 20, 900),
      height: Math.max(window.innerHeight - 80, 640),
    });
  };

  const refreshImages = () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const files = window.electronAPI.listFiles("images");
      if (Array.isArray(files)) {
        setImages(files.filter((f) => !f.isDirectory && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name))
          .sort((a, b) => new Date(b.modified) - new Date(a.modified)));
      } else setImages([]);
    } catch (err) { console.error("Error:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { refreshImages(); }, []);

  useEffect(() => {
    const onStorageUpdated = (e) => {
      const area = e?.detail?.area;
      if (!area || area === "images") refreshImages();
    };
    window.addEventListener("os-storage-updated", onStorageUpdated);
    return () => window.removeEventListener("os-storage-updated", onStorageUpdated);
  }, []);

  const setAsWallpaper = () => {
    if (!selectedImage) return;
    setWallpaper(`images/${selectedImage.name}`);
    alert("✓ Wallpaper updated!");
  };

  const deleteImage = () => {
    if (!selectedImage || !window.electronAPI) return;
    if (!window.confirm(`Delete "${selectedImage.name}"?`)) return;
    try {
      const result = window.electronAPI.deleteFile(`images/${selectedImage.name}`);
      if (result?.success) {
        setImages(images.filter((i) => i.name !== selectedImage.name));
        setSelectedImage(null);
      }
    } catch (err) { alert(`Failed: ${err.message}`); }
  };

  const getImageUrl = (filename) => {
    if (!window.electronAPI) return "";
    const relPath = `images/${filename}`;
    return window.electronAPI.getImageDataUrl?.(relPath) || window.electronAPI.getFileUrl?.(relPath) || "";
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={refreshImages}
          disabled={loading}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
        >
          <RotateCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
        <h2 className="text-sm font-medium text-white">Gallery</h2>
        <span className="text-xs text-slate-500">{images.length} photos</span>
        {loading && <span className="text-[10px] text-slate-500 ml-auto">Loading...</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3 flex-1 min-h-0">
        {/* Grid */}
        <div className="border border-white/5 rounded-xl p-3 bg-white/[0.02] overflow-auto">
          {images.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-600 gap-3 flex-col">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                <ImageIcon size={24} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-400">No images yet</p>
                <p className="text-xs text-slate-600 mt-1">Take a photo in Camera!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {images.map((img) => (
                <button
                  key={img.name}
                  onClick={() => setSelectedImage(img)}
                  onDoubleClick={() => openImageViewer(img.name)}
                  className={`relative aspect-square rounded-xl overflow-hidden group transition-all duration-200 ${
                    selectedImage?.name === img.name
                      ? "ring-2 ring-indigo-500 shadow-glow"
                      : "ring-1 ring-white/5 hover:ring-white/15"
                  }`}
                  title={img.name}
                >
                  <img
                    src={getImageUrl(img.name)}
                    alt={img.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                    <p className="text-[10px] text-white/80 truncate">{img.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Panel */}
        {selectedImage && (
          <div className="border border-white/5 rounded-xl p-3 bg-white/[0.02] space-y-3 overflow-auto flex flex-col animate-slide-up">
            <img
              src={getImageUrl(selectedImage.name)}
              alt={selectedImage.name}
              className="w-full max-h-44 object-cover rounded-xl ring-1 ring-white/5"
            />
            <div className="space-y-1.5 text-xs">
              <p className="text-white font-medium truncate">{selectedImage.name}</p>
              <p className="text-slate-500">{(selectedImage.size / 1024).toFixed(1)} KB</p>
              {selectedImage.modified && (
                <p className="text-slate-600 text-[10px]">{new Date(selectedImage.modified).toLocaleString()}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 mt-auto pt-2">
              <button
                onClick={setAsWallpaper}
                className="w-full px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all text-xs font-medium border border-indigo-500/20"
              >
                🖼️ Set Wallpaper
              </button>
              <button
                onClick={deleteImage}
                className="w-full px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs flex items-center justify-center gap-2 border border-red-500/20"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
