import { useRef, useState } from "react";
import { sendLog } from "../../services/socket.js";

const blocked = ["facebook.com", "tiktok.com", "x.com"];

export default function BrowserApp() {
  const [url, setUrl] = useState("https://duckduckgo.com");
  const [blockedMsg, setBlocked] = useState("");
  const viewRef = useRef(null);

  const load = () => {
    const host = url.replace(/https?:\/\//, "");
    if (blocked.some((b) => host.includes(b))) {
      setBlocked("Domain blocked by parent controls");
      return;
    }
    setBlocked("");
    sendLog({ type: "browser", url });
    if (viewRef.current) {
      viewRef.current.src = url;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 bg-slate-900 text-white rounded-lg px-3 py-2 border border-slate-700"
        />
        <button onClick={load} className="px-3 py-2 rounded-lg bg-accent/30 text-white border border-accent/50">
          Go
        </button>
      </div>
      {blockedMsg && <p className="text-amber-300 text-sm">{blockedMsg}</p>}
      <webview ref={viewRef} src={url} style={{ width: "100%", height: "480px", background: "#0b1221" }} />
    </div>
  );
}
