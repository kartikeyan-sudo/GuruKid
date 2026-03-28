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
      x: 10,
      y: 10,
      width: Math.max(window.innerWidth - 20, 900),
      height: Math.max(window.innerHeight - 80, 640),
    });
  };

  const refreshImages = () => {
    if (!window.electronAPI) {
      console.warn("electronAPI not available");
      return;
    }

    setLoading(true);
    try {
      const files = window.electronAPI.listFiles("images");
      if (Array.isArray(files)) {
        const imageFiles = files
          .filter((f) => !f.isDirectory && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name))
          .sort((a, b) => new Date(b.modified) - new Date(a.modified));
        setImages(imageFiles);
      } else {
        setImages([]);
      }
    } catch (err) {
      console.error("Error loading images:", err);
      alert(`Error loading images: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshImages();
  }, []);

  useEffect(() => {
    const onStorageUpdated = (e) => {
      const area = e?.detail?.area;
      if (!area || area === "images") {
        refreshImages();
      }
    };

    window.addEventListener("os-storage-updated", onStorageUpdated);
    return () => {
      window.removeEventListener("os-storage-updated", onStorageUpdated);
    };
  }, []);

  const setAsWallpaper = () => {
    if (!selectedImage) return;

    try {
      const wallpaperPath = `images/${selectedImage.name}`;
      setWallpaper(wallpaperPath);
      alert("✓ Wallpaper updated!");
    } catch (err) {
      console.error("Wallpaper error:", err);
      alert(`Failed to set wallpaper: ${err.message}`);
    }
  };

  const deleteImage = () => {
    if (!selectedImage || !window.electronAPI) return;

    const confirmDelete = window.confirm(`Delete "${selectedImage.name}"?`);
    if (!confirmDelete) return;

    try {
      const result = window.electronAPI.deleteFile(`images/${selectedImage.name}`);
      if (result?.success) {
        alert(`Deleted: ${selectedImage.name}`);
        setImages(images.filter((i) => i.name !== selectedImage.name));
        setSelectedImage(null);
      } else {
        alert(`Error deleting image: ${result?.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const getImageUrl = (filename) => {
    if (!window.electronAPI) return "";
    const relPath = `images/${filename}`;
    return (
      window.electronAPI.getImageDataUrl?.(relPath) ||
      window.electronAPI.getFileUrl?.(relPath) ||
      ""
    );
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={refreshImages}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition disabled:opacity-50"
          title="Refresh"
        >
          <RotateCw size={16} />
        </button>
        <h2 className="text-sm font-medium text-slate-300">Gallery</h2>
        {loading && <span className="text-xs text-slate-500 ml-auto">Loading...</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-3 flex-1 min-h-0">
        {/* Grid */}
        <div className="border border-slate-800 rounded-lg p-3 bg-slate-900 overflow-auto">
          {images.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 gap-2 flex-col">
              <ImageIcon size={32} />
              <p className="text-sm">No images yet</p>
              <p className="text-xs text-slate-600">Take a photo in Camera!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-5 gap-2">
              {images.map((img) => (
                <button
                  key={img.name}
                  onClick={() => setSelectedImage(img)}
                  onDoubleClick={() => openImageViewer(img.name)}
                  className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition ${
                    selectedImage?.name === img.name
                      ? "border-accent bg-accent/20"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                  title={img.name}
                >
                  <img
                    src={getImageUrl(img.name)}
                    alt={img.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("Image load error:", img.name);
                      e.target.style.display = "none";
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Panel */}
        {selectedImage && (
          <div className="border border-slate-800 rounded-lg p-3 bg-slate-900 space-y-3 overflow-auto flex flex-col">
            <img
              src={getImageUrl(selectedImage.name)}
              alt={selectedImage.name}
              className="w-full max-h-48 object-cover rounded-lg border border-slate-700"
              onError={(e) => console.error("Preview load error")}
            />
            <div className="space-y-1 text-xs">
              <p className="text-slate-400 break-all">
                <span className="font-medium text-slate-300">Name:</span>
                <br />
                {selectedImage.name}
              </p>
              <p className="text-slate-400">
                <span className="font-medium text-slate-300">Size:</span>{" "}
                {(selectedImage.size / 1024).toFixed(1)} KB
              </p>
              {selectedImage.modified && (
                <p className="text-slate-500 text-xs">
                  {new Date(selectedImage.modified).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 mt-auto pt-2">
              <button
                onClick={setAsWallpaper}
                className="w-full px-3 py-2 rounded-lg bg-accent/30 text-accent border border-accent/60 hover:bg-accent/40 transition text-sm font-medium"
              >
                📷 Set Wallpaper
              </button>
              <button
                onClick={deleteImage}
                className="w-full px-3 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition text-sm flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
