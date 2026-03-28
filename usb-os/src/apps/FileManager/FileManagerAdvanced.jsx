import { useState, useEffect } from "react";
import { Trash2, Edit2, RotateCw, Folder, FileText } from "lucide-react";
import { useSettingsStore } from "../../store/settingsStore.js";
import { useWindowStore } from "../../store/windowStore.js";
import { useMediaStore } from "../../store/mediaStore.js";
import { useFolderStore } from "../../store/folderStore.js";

const DIRECTORIES = ["data", "downloads", "images", "videos"];

export default function FileManagerApp() {
  const [currentDir, setCurrentDir] = useState("data");
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const { setWallpaper } = useSettingsStore();
  const { openWindow } = useWindowStore();
  const { openViewer } = useMediaStore();
  const { targetDir, clearTargetDir } = useFolderStore();

  const isMediaFile = (name) => /\.(jpg|jpeg|png|gif|webp|bmp|mp4|webm|mov|m4v|avi|mkv)$/i.test(name || "");

  const openImageViewer = (file) => {
    if (!file || file.isDirectory || !isMediaFile(file.name)) return;
    const relativePath = `${currentDir}/${file.name}`;
    const items = files
      .filter((f) => !f.isDirectory && isMediaFile(f.name))
      .map((f) => `${currentDir}/${f.name}`);
    openViewer(items, relativePath);
    openWindow("image-viewer", "Image Viewer", "imageViewer", {
      x: 10,
      y: 10,
      width: Math.max(window.innerWidth - 20, 900),
      height: Math.max(window.innerHeight - 80, 640),
    });
  };

  const refresh = () => {
    if (!window.electronAPI) {
      console.warn("electronAPI not available");
      return;
    }

    setLoading(true);
    try {
      const items = window.electronAPI.listFiles(currentDir);
      if (Array.isArray(items)) {
        setFiles(items.sort((a, b) => {
          // Directories first
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        }));
      } else {
        setFiles([]);
      }
      setSelected(null);
    } catch (err) {
      console.error("Error refreshing files:", err);
      alert(`Error loading files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [currentDir]);

  useEffect(() => {
    if (targetDir && DIRECTORIES.includes(targetDir) && targetDir !== currentDir) {
      setCurrentDir(targetDir);
    }
    if (targetDir) {
      clearTargetDir();
    }
  }, [targetDir]);

  useEffect(() => {
    const onStorageUpdated = (e) => {
      const area = e?.detail?.area;
      if (!area || area === currentDir) {
        refresh();
      }
    };

    const onDownloadCompleted = () => {
      if (currentDir === "downloads") {
        refresh();
      }
    };

    window.addEventListener("os-storage-updated", onStorageUpdated);
    if (window.electronAPI?.on) {
      const unsubscribe = window.electronAPI.on("download-completed", onDownloadCompleted);
      return () => {
        window.removeEventListener("os-storage-updated", onStorageUpdated);
        unsubscribe?.();
      };
    }

    return () => {
      window.removeEventListener("os-storage-updated", onStorageUpdated);
    };
  }, [currentDir]);

  const deleteFile = () => {
    if (!selected || !window.electronAPI) return;

    const confirmDelete = window.confirm(`Delete "${selected.name}"?`);
    if (!confirmDelete) return;

    try {
      const result = window.electronAPI.deleteFile(`${currentDir}/${selected.name}`);
      if (result?.success) {
        alert(`Deleted: ${selected.name}`);
        refresh();
      } else {
        alert(`Error deleting file: ${result?.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const rename = () => {
    if (!selected || !newName || !window.electronAPI) return;

    try {
      const result = window.electronAPI.renameFile(
        `${currentDir}/${selected.name}`,
        `${currentDir}/${newName}`
      );
      if (result?.success) {
        alert(`Renamed to: ${newName}`);
        setRenaming(null);
        setNewName("");
        refresh();
      } else {
        alert(`Error renaming file: ${result?.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Rename error:", err);
      alert(`Failed to rename: ${err.message}`);
    }
  };

  const setAsWallpaper = () => {
    if (!selected) return;

    try {
      if (!/\.(jpg|jpeg|png|gif)$/i.test(selected.name)) {
        alert("Only image files (JPG, PNG, GIF) can be set as wallpaper");
        return;
      }

      const wallpaperPath = `${currentDir}/${selected.name}`;
      setWallpaper(wallpaperPath);
      alert("✓ Wallpaper updated!");
    } catch (err) {
      console.error("Wallpaper error:", err);
      alert(`Failed to set wallpaper: ${err.message}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0 || !bytes) return "-";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "-";
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition disabled:opacity-50"
          title="Refresh"
        >
          <RotateCw size={16} />
        </button>
        {DIRECTORIES.map((dir) => (
          <button
            key={dir}
            onClick={() => setCurrentDir(dir)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentDir === dir
                ? "bg-accent/30 text-accent border border-accent/60"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {dir}
          </button>
        ))}
        {loading && <span className="text-xs text-slate-500 ml-auto">Loading...</span>}
      </div>

      {/* Files List */}
      <div className="flex-1 border border-slate-800 rounded-lg p-3 bg-slate-900 overflow-auto">
        {files.length === 0 ? (
          <p className="text-slate-500 text-sm">Folder is empty</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.name}
                onClick={() => setSelected(file)}
                onDoubleClick={() => openImageViewer(file)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                  selected?.name === file.name
                    ? "bg-accent/20 border border-accent/60"
                    : "bg-slate-800 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                {file.isDirectory ? (
                  <Folder size={20} className="text-yellow-500 flex-shrink-0" />
                ) : (
                  <FileText size={20} className="text-blue-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {renaming === file.name ? (
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") rename();
                        if (e.key === "Escape") {
                          setRenaming(null);
                          setNewName("");
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-accent"
                    />
                  ) : (
                    <>
                      <p className="text-white text-sm font-medium truncate">{file.name}</p>
                      <p className="text-slate-500 text-xs">
                        {file.isDirectory ? "Folder" : formatFileSize(file.size)} • {formatDate(file.modified)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {selected && !selected.isDirectory && (
        <div className="flex gap-2 flex-wrap p-2 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => {
              setRenaming(selected.name);
              setNewName(selected.name);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition text-sm"
          >
            <Edit2 size={14} /> Rename
          </button>
          {/\.(jpg|jpeg|png|gif)$/i.test(selected.name) && (
            <button
              onClick={setAsWallpaper}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/30 text-accent border border-accent/60 hover:bg-accent/40 transition text-sm"
            >
              📷 Set Wallpaper
            </button>
          )}
          <button
            onClick={deleteFile}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition text-sm ml-auto"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
