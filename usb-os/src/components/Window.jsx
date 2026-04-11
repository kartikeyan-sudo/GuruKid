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
      position={{ x: win.x, y: win.y }}
      size={{ width: win.width, height: win.height }}
      disableDragging={win.maximized}
      onDrag={(e, d) => updateWindow(id, { x: d.x, y: d.y })}
      onDragStop={(e, d) => updateWindow(id, { x: d.x, y: d.y })}
      onResize={(e, direction, ref, delta, position) => {
        updateWindow(id, {
          ...position,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        updateWindow(id, {
          ...position,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        });
      }}
      onMouseDown={() => focusWindow(id)}
      dragHandleClassName="window-title-bar"
      enableResizing={win.maximized ? false : true}
      minWidth={300}
      minHeight={200}
      style={{ zIndex: win.zIndex }}
      className={clsx(
        "absolute overflow-hidden window-animate-open",
        "rounded-2xl",
        isActive
          ? "shadow-window-active ring-1 ring-indigo-500/20"
          : "shadow-window ring-1 ring-white/5"
      )}
    >
      <div className="flex flex-col h-full bg-[#0c1225]">
        {/* Title Bar */}
        <div
          className={clsx(
            "window-title-bar flex items-center justify-between px-3 py-2 cursor-move select-none border-b transition-colors duration-200",
            isActive
              ? "bg-[#0f172a] border-white/10"
              : "bg-[#0a0f1a] border-white/5"
          )}
        >
          <span className={clsx(
            "text-sm font-medium flex-1 truncate",
            isActive ? "text-white" : "text-slate-400"
          )}>
            {title}
          </span>
          <div className="flex items-center gap-1.5 ml-3">
            {/* Minimize - Yellow */}
            <button
              onClick={() => minimizeWindow(id)}
              className="group w-3.5 h-3.5 rounded-full bg-amber-500/20 hover:bg-amber-500 flex items-center justify-center transition-all duration-200"
              title="Minimize"
            >
              <Minus size={8} className="text-transparent group-hover:text-amber-900 transition-colors" />
            </button>
            {/* Maximize - Green */}
            <button
              onClick={() => maximizeWindow(id)}
              className="group w-3.5 h-3.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500 flex items-center justify-center transition-all duration-200"
              title="Maximize"
            >
              <Square size={7} className="text-transparent group-hover:text-emerald-900 transition-colors" />
            </button>
            {/* Close - Red */}
            <button
              onClick={() => closeWindow(id)}
              className="group w-3.5 h-3.5 rounded-full bg-red-500/20 hover:bg-red-500 flex items-center justify-center transition-all duration-200"
              title="Close"
            >
              <X size={8} className="text-transparent group-hover:text-red-900 transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-[#080d1a] p-3" style={zoomStyle}>
          {children}
        </div>
      </div>
    </Rnd>
  );
}
