export default function Taskbar({ onOpen }) {
  const apps = [
    { id: "browser", label: "Browser" },
    { id: "notepad", label: "Notepad" },
    { id: "files", label: "Files" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-slate-900/90 border-t border-slate-800 flex items-center gap-3 px-4">
      {apps.map((app) => (
        <button
          key={app.id}
          onClick={() => onOpen(app.id)}
          className="px-3 py-2 rounded-lg bg-slate-800 text-sm text-white hover:bg-slate-700"
        >
          {app.label}
        </button>
      ))}
    </div>
  );
}
