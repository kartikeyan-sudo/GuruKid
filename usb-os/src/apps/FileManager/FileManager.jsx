import { listFiles, loadText } from "../../utils/fileSystem.js";
import { useState } from "react";

export default function FileManagerApp() {
  const [selected, setSelected] = useState(null);
  const files = listFiles();
  return (
    <div className="grid grid-cols-[200px_1fr] gap-3">
      <div className="border border-slate-800 rounded-lg p-2 bg-slate-900">
        <p className="text-xs text-slate-400 mb-2">Files</p>
        <div className="space-y-1">
          {files.map((f) => (
            <button
              key={f}
              onClick={() => setSelected(f)}
              className="w-full text-left px-2 py-1 rounded bg-slate-800 text-sm text-white border border-slate-700"
            >
              {f}
            </button>
          ))}
          {files.length === 0 && <p className="text-slate-500 text-sm">No files yet</p>}
        </div>
      </div>
      <div className="border border-slate-800 rounded-lg p-3 bg-slate-900">
        <p className="text-xs text-slate-400 mb-2">Preview</p>
        <pre className="text-xs text-slate-200 whitespace-pre-wrap">
          {selected ? loadText(selected) : "Select a file"}
        </pre>
      </div>
    </div>
  );
}
