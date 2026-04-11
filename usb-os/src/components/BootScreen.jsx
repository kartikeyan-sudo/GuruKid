import { useState, useEffect } from "react";
import { Shield } from "lucide-react";

export default function BootScreen({ onComplete }) {
  const [phase, setPhase] = useState("loading"); // loading → fadeOut → done

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fadeOut"), 2800);
    const doneTimer = setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, 3400);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === "fadeOut" ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #0c1225 0%, #050810 100%)",
      }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.4), transparent 70%)",
            animation: "pulseGlow 2.5s ease-in-out infinite",
          }}
        />
      </div>

      {/* Logo */}
      <div className="boot-logo flex flex-col items-center gap-4 animate-fade-in-slow">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow-lg">
            <Shield size={40} className="text-white" />
          </div>
          {/* Glow ring */}
          <div
            className="absolute -inset-3 rounded-3xl opacity-30"
            style={{
              background: "radial-gradient(circle, rgba(99,102,241,0.3), transparent 70%)",
              animation: "pulseGlow 2s ease-in-out infinite",
            }}
          />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Guru<span className="text-indigo-400">Kid</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 tracking-widest uppercase">Safe Operating System</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-12 w-56">
        <div className="h-1 bg-slate-800/60 rounded-full overflow-hidden">
          <div className="boot-progress h-full rounded-full" />
        </div>
      </div>

      {/* Loading dots */}
      <div className="mt-6 flex gap-1.5">
        <div className="boot-dot w-1.5 h-1.5 rounded-full bg-indigo-400" />
        <div className="boot-dot w-1.5 h-1.5 rounded-full bg-indigo-400" />
        <div className="boot-dot w-1.5 h-1.5 rounded-full bg-indigo-400" />
      </div>
    </div>
  );
}
