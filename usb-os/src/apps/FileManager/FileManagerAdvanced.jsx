import { useState, useEffect } from "react";
import { Trash2, Edit2, RotateCw, Folder, FileText, Grid, List, Image } from "lucide-react";
import { useSettingsStore } from "../../store/settingsStore.js";
import { useWindowStore } from "../../store/windowStore.js";
import { useMediaStore } from "../../store/mediaStore.js";
import { useFolderStore } from "../../store/folderStore.js";
import { useNotePreviewStore } from "../../store/notePreviewStore.js";
import { sendLog } from "../../services/socket.js";

const DIRECTORIES = ["data", "downloads", "images", "videos"];

export default function FileManagerApp() {
  const [currentDir, setCurrentDir] = useState("data");
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"
  const { setWallpaper } = useSettingsStore();
  const { openWindow } = useWindowStore();
  const { openViewer } = useMediaStore();
  const { targetDir, clearTargetDir } = useFolderStore();
  const { setFilePath } = useNotePreviewStore();

  const isMediaFile = (name) => /\.(jpg|jpeg|png|gif|webp|bmp|mp4|webm|mov|m4v|avi|mkv)$/i.test(name || "");
  const isImageFile = (name) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name || "");
  const isNoteFile = (name) => /\.(txt|md|log)$/i.test(name || "");

  const handleFileOpen = (file) => {
    if (!file || file.isDirectory) return;
    if (currentDir === "data" && isNoteFile(file.name)) {
      const path = `${currentDir}/${file.name}`;
      setFilePath(path);
      openWindow("notes-preview", "Notes Preview", "notesPreview", {
        x: 140,
        y: 90,
        width: 760,
        height: 520,
      });
      sendLog({ type: "app-open", appId: "notesPreview", appTitle: "Notes Preview", message: `Opened note preview for ${file.name}` });
      return;
    }
    openImageViewer(file);
  };

  const openImageViewer = (file) => {
    if (!file || file.isDirectory || !isMediaFile(file.name)) return;
    const relativePath = `${currentDir}/${file.name}`;
    const items = files.filter((f) => !f.isDirectory && isMediaFile(f.name)).map((f) => `${currentDir}/${f.name}`);
    openViewer(items, relativePath);
    openWindow("image-viewer", "Image Viewer", "imageViewer", {
      x: 10, y: 10,
      width: Math.max(window.innerWidth - 20, 900),
      height: Math.max(window.innerHeight - 80, 640),
    });
  };

  const refresh = () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const items = window.electronAPI.listFiles(currentDir);
      if (Array.isArray(items)) {
        setFiles(items.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        }));
      } else setFiles([]);
      setSelected(null);
    } catch (err) { console.error("Error:", err); } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [currentDir]);

  useEffect(() => {
    if (targetDir && DIRECTORIES.includes(targetDir) && targetDir !== currentDir) setCurrentDir(targetDir);
    if (targetDir) clearTargetDir();
  }, [targetDir]);

  useEffect(() => {
    const onStorageUpdated = (e) => {
      const area = e?.detail?.area;
      if (!area || area === currentDir) refresh();
    };
    const onDownloadCompleted = () => { if (currentDir === "downloads") refresh(); };
    window.addEventListener("os-storage-updated", onStorageUpdated);
    if (window.electronAPI?.on) {
      const unsub = window.electronAPI.on("download-completed", onDownloadCompleted);
      return () => { window.removeEventListener("os-storage-updated", onStorageUpdated); unsub?.(); };
    }
    return () => window.removeEventListener("os-storage-updated", onStorageUpdated);
  }, [currentDir]);

  const deleteFile = () => {
    if (!selected || !window.electronAPI) return;
    if (!window.confirm(`Delete "${selected.name}"?`)) return;
    try {
      const result = window.electronAPI.deleteFile(`${currentDir}/${selected.name}`);
      if (result?.success) refresh();
      else alert(`Error: ${result?.error || "Unknown"}`);
    } catch (err) { alert(`Failed: ${err.message}`); }
  };

  const rename = () => {
    if (!selected || !newName || !window.electronAPI) return;
    try {
      const result = window.electronAPI.renameFile(`${currentDir}/${selected.name}`, `${currentDir}/${newName}`);
      if (result?.success) { setRenaming(null); setNewName(""); refresh(); }
      else alert(`Error: ${result?.error || "Unknown"}`);
    } catch (err) { alert(`Failed: ${err.message}`); }
  };

  const setAsWallpaper = () => {
    if (!selected || !isImageFile(selected.name)) return;
    setWallpaper(`${currentDir}/${selected.name}`);
    alert("✓ Wallpaper updated!");
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "-";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (d) => {
    if (!d) return "-";
    try { return new Date(d).toLocaleString(); } catch { return "-"; }
  };

  const getFileIcon = (file) => {
    if (file.isDirectory) return <Folder size={18} className="text-amber-400" />;
    if (isImageFile(file.name)) return <Image size={18} className="text-pink-400" />;
    return <FileText size={18} className="text-blue-400" />;
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
          title="Refresh"
        >
          <RotateCw size={14} className={loading ? "animate-spin" : ""} />
        </button>

        {/* Directory tabs */}
        <div className="flex gap-0.5 bg-white/[0.03] rounded-xl p-0.5 border border-white/5">
          {DIRECTORIES.map((dir) => (
            <button
              key={dir}
              onClick={() => setCurrentDir(dir)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentDir === dir
                  ? "bg-indigo-500/15 text-indigo-400 shadow-glow"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {dir}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex gap-0.5 bg-white/[0.03] rounded-lg p-0.5 border border-white/5">
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}
          >
            <List size={13} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"}`}
          >
            <Grid size={13} />
          </button>
        </div>

        {loading && <span className="text-[10px] text-slate-500">Loading...</span>}
      </div>

      {/* Files */}
      <div className="flex-1 border border-white/5 rounded-xl p-3 bg-white/[0.02] overflow-auto">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
            <Folder size={32} />
            <p className="text-sm">Folder is empty</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {files.map((file) => (
              <button
                key={file.name}
                onClick={() => setSelected(file)}
                onDoubleClick={() => handleFileOpen(file)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 group ${
                  selected?.name === file.name
                    ? "bg-indigo-500/10 ring-1 ring-indigo-500/30"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="group-hover:scale-110 transition-transform duration-200">
                  {getFileIcon(file)}
                </div>
                <span className="text-[10px] text-slate-300 text-center truncate w-full">{file.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.name}
                onClick={() => setSelected(file)}
                onDoubleClick={() => handleFileOpen(file)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                  selected?.name === file.name
                    ? "bg-indigo-500/10 ring-1 ring-indigo-500/20"
                    : "hover:bg-white/5"
                }`}
              >
                {getFileIcon(file)}
                <div className="flex-1 min-w-0">
                  {renaming === file.name ? (
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") rename(); if (e.key === "Escape") { setRenaming(null); setNewName(""); } }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500/30"
                    />
                  ) : (
                    <>
                      <p className="text-white text-sm font-medium truncate">{file.name}</p>
                      <p className="text-slate-500 text-[10px]">
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
        <div className="flex gap-2 flex-wrap p-2 bg-white/[0.02] border border-white/5 rounded-xl animate-slide-up">
          <button
            onClick={() => { setRenaming(selected.name); setNewName(selected.name); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs"
          >
            <Edit2 size={12} /> Rename
          </button>
          {isImageFile(selected.name) && (
            <button
              onClick={setAsWallpaper}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all text-xs border border-indigo-500/20"
            >
              🖼️ Set Wallpaper
            </button>
          )}
          <button
            onClick={deleteFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-xs ml-auto border border-red-500/20"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
