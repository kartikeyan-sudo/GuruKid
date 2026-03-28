import { Rnd } from "react-rnd";
import { X, Minus, Square } from "lucide-react";
import { useWindowStore } from "../store/windowStore.js";
import clsx from "clsx";

export default function Window({ id, title, children }) {
  const { windows, focusWindow, updateWindow, minimizeWindow, maximizeWindow, closeWindow } = useWindowStore();
  const win = windows[id];

  if (!win || win.minimized) return null;

  const isActive = id === useWindowStore((s) => s.activeWindowId);
  const zoomStyle = { transform: `scale(${win.zoom / 100})`, transformOrigin: "top left" };

  return (
    <Rnd
      default={{
        x: win.x,
        y: win.y,
        width: win.width,
        height: win.height,
      }}
      onDragStop={(e, d) => updateWindow(id, { x: d.x, y: d.y })}
      onResizeStop={(e, direction, ref, delta, position) => {
        updateWindow(id, {
          ...position,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        });
      }}
      onMouseDown={() => focusWindow(id)}
      dragHandleClassName="window-title-bar"
      style={{ zIndex: win.zIndex }}
      className={clsx(
        "absolute rounded-xl shadow-2xl overflow-hidden border transition-shadow",
        isActive ? "border-accent/60 shadow-accent/20" : "border-slate-700 shadow-slate-900/50"
      )}
    >
      <div className="flex flex-col h-full bg-card">
        {/* Title Bar */}
        <div
          className={clsx(
            "window-title-bar flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800 cursor-move select-none",
            isActive ? "bg-slate-800 border-accent/30" : ""
          )}
        >
          <span className="text-sm text-white font-medium flex-1">{title}</span>
          <div className="flex gap-1">
            <button
              onClick={() => minimizeWindow(id)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => maximizeWindow(id)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition"
            >
              <Square size={14} />
            </button>
            <button
              onClick={() => closeWindow(id)}
              className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded transition"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-950/70 p-3" style={zoomStyle}>
          {children}
        </div>
      </div>
    </Rnd>
  );
}
