import { useState, useEffect } from "react";
import { Save, Plus, FolderOpen, FileText, Check } from "lucide-react";

export default function NotepadApp() {
  const [filename, setFilename] = useState("untitled.txt");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [modified, setModified] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // "saving" | "saved" | ""

  useEffect(() => { refreshFiles(); }, []);

  const refreshFiles = () => {
    if (window.electronAPI) {
      try {
        const items = window.electronAPI.listFiles("data");
        if (Array.isArray(items)) {
          setFiles(items.filter((f) => !f.isDirectory && f.name.endsWith(".txt")));
        }
      } catch (err) { console.error("Error loading files:", err); }
    }
  };

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
    if (!window.electronAPI) return;
    let finalFilename = filename;
    if (!finalFilename.endsWith(".txt")) finalFilename += ".txt";

    setSaveStatus("saving");
    try {
      const result = window.electronAPI.writeFile(`data/${finalFilename}`, content);
      if (result?.success) {
        setFilename(finalFilename);
        setModified(false);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(""), 1500);
        refreshFiles();
      } else {
        setSaveStatus("");
        alert(`Error: ${result?.error || "Unknown"}`);
      }
    } catch (err) {
      setSaveStatus("");
      alert(`Failed: ${err.message}`);
    }
  };

  const newFile = () => {
    if (modified && !window.confirm("Discard unsaved changes?")) return;
    setFilename("untitled.txt");
    setContent("");
    setModified(false);
  };

  const openFile = (name) => {
    if (modified && !window.confirm("Discard unsaved changes?")) return;
    if (!window.electronAPI) return;
    try {
      const fileContent = window.electronAPI.openFile(`data/${name}`);
      if (fileContent !== null) {
        setFilename(name);
        setContent(fileContent);
        setModified(false);
      }
    } catch (err) { alert(`Failed: ${err.message}`); }
  };

  const lineCount = content.split("\n").length;

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-white/[0.03] border border-white/5 rounded-xl">
        <button
          onClick={newFile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-medium"
        >
          <Plus size={14} /> New
        </button>
        <button
          onClick={save}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-all text-xs font-medium border border-indigo-500/20"
        >
          {saveStatus === "saving" ? (
            <div className="w-3.5 h-3.5 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          ) : saveStatus === "saved" ? (
            <Check size={14} className="text-emerald-400" />
          ) : (
            <Save size={14} />
          )}
          {saveStatus === "saved" ? "Saved!" : "Save"}
        </button>

        <div className="h-5 w-px bg-white/5" />

        <input
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="filename.txt"
          className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-white text-xs focus:outline-none focus:border-indigo-500/30 transition-all"
        />

        {modified && (
          <span className="flex items-center gap-1 text-amber-400 text-[10px] font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Modified
          </span>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setModified(true); }}
          placeholder="Start typing..."
          className="w-full h-full p-4 rounded-xl bg-white/[0.02] border border-white/5 text-white text-sm resize-none focus:outline-none focus:border-indigo-500/20 transition-all font-mono leading-relaxed placeholder:text-slate-700"
          spellCheck={false}
        />
        {/* Status bar */}
        <div className="absolute bottom-2 right-3 text-[10px] text-slate-600 pointer-events-none">
          {lineCount} lines • {content.length} chars
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="border border-white/5 rounded-xl p-2.5 bg-white/[0.02] max-h-24 overflow-auto">
          <p className="text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wider">Recent Files</p>
          <div className="flex gap-1.5 flex-wrap">
            {files.map((f) => (
              <button
                key={f.name}
                onClick={() => openFile(f.name)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-white text-xs hover:bg-white/10 transition-all"
              >
                <FileText size={11} className="text-slate-500" />
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
