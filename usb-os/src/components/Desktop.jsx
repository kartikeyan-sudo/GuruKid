import { useEffect, useState } from "react";
import { Shield, Lock } from "lucide-react";
import Window from "./Window.jsx";
import Taskbar from "./Taskbar.jsx";
import BrowserApp from "../apps/Browser/Browser.jsx";
import NotepadApp from "../apps/Notepad/Notepad.jsx";
import FileManagerApp from "../apps/FileManager/FileManager.jsx";
import { pullCommands, sendStats } from "../services/socket.js";

const defaultPin = "1234";

const appMap = {
  browser: { title: "Browser", component: <BrowserApp /> },
  notepad: { title: "Notepad", component: <NotepadApp /> },
  files: { title: "File Manager", component: <FileManagerApp /> },
};

export default function Desktop() {
  const [windows, setWindows] = useState([]);
  const [locked, setLocked] = useState(true);
  const [focus, setFocus] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [focusPin, setFocusPin] = useState("");

  useEffect(() => {
    const handler = (e) => {
      const cmd = e.detail;
      if (cmd.type === "focus") setFocus(true);
      if (cmd.type === "unlock") setFocus(false);
      if (cmd.type === "open-app" && cmd.payload?.app) openWindow(cmd.payload.app);
    };
    window.addEventListener("gurukid:command", handler);
    const poll = setInterval(pullCommands, 5000);
    const statTimer = setInterval(() => sendStats({ cpu: rand(), ram: rand() }), 4000);
    return () => {
      window.removeEventListener("gurukid:command", handler);
      clearInterval(poll);
      clearInterval(statTimer);
    };
  }, []);

  const rand = () => Math.round(Math.random() * 40 + 10);

  const handleUnlock = () => {
    if (pinInput === defaultPin) {
      setLocked(false);
      setPinInput("");
    }
  };

  const openWindow = (id) => {
    if (!appMap[id]) return;
    setWindows((ws) => {
      if (ws.some((w) => w.id === id)) return ws;
      return [...ws, { id, title: appMap[id].title }];
    });
  };

  const closeWindow = (id) => setWindows((ws) => ws.filter((w) => w.id !== id));

  if (locked) {
    return (
      <div className="min-h-screen bg-bg text-white grid place-items-center">
        <div className="p-6 rounded-2xl border border-slate-800 bg-card text-center space-y-3">
          <Shield className="mx-auto" />
          <p className="text-lg font-semibold">GuruKid Locked</p>
          <p className="text-sm text-slate-400">Enter PIN to start</p>
          <div className="flex gap-2 items-center justify-center">
            <input
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="1234"
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white w-32 text-center"
            />
            <button onClick={handleUnlock} className="px-3 py-2 rounded-lg bg-accent/30 text-white border border-accent/60">
              Unlock
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#22d3ee33,transparent_40%)]" />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4 max-w-md">
          {Object.keys(appMap).map((id) => (
            <button
              key={id}
              onClick={() => openWindow(id)}
              className="h-24 rounded-xl border border-slate-800 bg-card hover:border-accent/50 transition flex flex-col items-center justify-center gap-2"
            >
              <span className="text-2xl">🪟</span>
              <span className="text-sm text-white">{appMap[id].title}</span>
            </button>
          ))}
          <button
            onClick={() => setFocus(true)}
            className="h-24 rounded-xl border border-red-500/40 bg-red-500/10 flex flex-col items-center justify-center gap-2"
          >
            <Lock />
            <span className="text-sm">Focus Mode</span>
          </button>
        </div>

        {windows.map((w) => (
          <Window key={w.id} id={w.id} title={w.title} onClose={closeWindow}>
            {appMap[w.id]?.component}
          </Window>
        ))}
      </div>
      <Taskbar onOpen={openWindow} />

      {focus && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm grid place-items-center z-50">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 space-y-3 text-center">
            <p className="text-xl font-semibold">Focus Mode</p>
            <p className="text-sm text-slate-400">Unlocked remotely or via PIN</p>
            <div className="flex gap-2 justify-center">
              <input
                value={focusPin}
                onChange={(e) => setFocusPin(e.target.value)}
                placeholder="1234"
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white w-32 text-center"
              />
              <button
                onClick={() => {
                  if (focusPin === defaultPin) {
                    setFocus(false);
                    setFocusPin("");
                  }
                }}
                className="px-3 py-2 rounded-lg bg-accent/30 text-white border border-accent/60"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
