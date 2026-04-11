import { useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { useNotePreviewStore } from "../../store/notePreviewStore.js";

export default function NotesPreviewApp() {
  const filePath = useNotePreviewStore((s) => s.filePath);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadFile = () => {
    if (!filePath || !window.electronAPI?.openFile) {
      setContent("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = window.electronAPI.openFile(filePath);
      setContent(data || "");
    } catch (err) {
      setError(err?.message || "Failed to load note");
      setContent("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFile();
  }, [filePath]);

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center gap-2 p-2 rounded-xl border border-white/5 bg-white/[0.03]">
        <FileText size={14} className="text-indigo-400" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400">Previewing</p>
          <p className="text-xs text-white truncate font-mono">{filePath || "No file selected"}</p>
        </div>
        <button
          onClick={loadFile}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 rounded-xl border border-white/5 bg-white/[0.02] p-4 overflow-auto">
        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : filePath ? (
          <pre className="text-sm text-slate-100 whitespace-pre-wrap break-words font-mono leading-relaxed">{content}</pre>
        ) : (
          <p className="text-sm text-slate-500">Double-click a note file in Data folder to preview it.</p>
        )}
      </div>
    </div>
  );
}
