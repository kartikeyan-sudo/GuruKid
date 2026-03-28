import { useState, useEffect } from "react";
import { Save, Plus, FolderOpen } from "lucide-react";

export default function NotepadApp() {
  const [filename, setFilename] = useState("untitled.txt");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [modified, setModified] = useState(false);

  // Load files on mount
  useEffect(() => {
    refreshFiles();
  }, []);

  const refreshFiles = () => {
    if (window.electronAPI) {
      try {
        const items = window.electronAPI.listFiles("data");
        if (Array.isArray(items)) {
          const txtFiles = items.filter((f) => !f.isDirectory && f.name.endsWith(".txt"));
          setFiles(txtFiles);
        }
      } catch (err) {
        console.error("Error loading files:", err);
      }
    }
  };

  // Ctrl+S to save
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

  const save = () => {
    if (!window.electronAPI) {
      alert("File API not available");
      return;
    }

    let finalFilename = filename;
    if (!finalFilename.endsWith(".txt")) {
      finalFilename = filename + ".txt";
    }

    try {
      const result = window.electronAPI.writeFile(`data/${finalFilename}`, content);
      if (result?.success) {
        setFilename(finalFilename);
        setModified(false);
        alert(`Saved: ${finalFilename}`);
        refreshFiles();
      } else {
        alert(`Error saving file: ${result?.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert(`Failed to save: ${err.message}`);
    }
  };

  const newFile = () => {
    if (modified) {
      const confirm = window.confirm("Discard unsaved changes?");
      if (!confirm) return;
    }
    setFilename("untitled.txt");
    setContent("");
    setModified(false);
  };

  const openFile = (name) => {
    if (modified) {
      const confirm = window.confirm("Discard unsaved changes?");
      if (!confirm) return;
    }

    if (!window.electronAPI) {
      alert("File API not available");
      return;
    }

    try {
      const fileContent = window.electronAPI.openFile(`data/${name}`);
      if (fileContent !== null) {
        setFilename(name);
        setContent(fileContent);
        setModified(false);
      } else {
        alert(`Could not open file: ${name}`);
      }
    } catch (err) {
      console.error("Open error:", err);
      alert(`Failed to open: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg">
        <button
          onClick={newFile}
          title="Create new file"
          className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition text-sm"
        >
          <Plus size={16} /> New
        </button>
        <button
          onClick={save}
          title="Save file (Ctrl+S)"
          className="flex items-center gap-2 px-3 py-1 rounded-lg bg-accent/30 text-accent hover:bg-accent/40 transition text-sm border border-accent/60"
        >
          <Save size={16} /> Save
        </button>
        <input
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="filename.txt"
          className="flex-1 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-accent"
        />
        {modified && <span className="text-amber-400 text-xs font-bold">●Modified</span>}
      </div>

      {/* Editor */}
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setModified(true);
        }}
        placeholder="Start typing..."
        className="flex-1 p-3 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm resize-none focus:outline-none focus:border-accent/50"
      />

      {/* Files List */}
      {files.length > 0 && (
        <div className="border border-slate-800 rounded-lg p-2 bg-slate-900 max-h-24 overflow-auto">
          <p className="text-xs text-slate-400 mb-1 font-semibold">Recent Files:</p>
          <div className="flex gap-2 flex-wrap">
            {files.map((f) => (
              <button
                key={f.name}
                onClick={() => openFile(f.name)}
                title={f.name}
                className="px-2 py-1 rounded-lg bg-slate-800 text-white text-xs hover:bg-slate-700 transition truncate"
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
