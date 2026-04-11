import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ShutdownScreen({ onComplete }) {
  const [phase, setPhase] = useState("visible"); // visible → fadeOut → done

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fadeOut"), 2000);
    const doneTimer = setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, 2600);
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
        background: "radial-gradient(ellipse at 50% 40%, #0a0f1a 0%, #030508 100%)",
      }}
    >
      {/* Spinner */}
      <Loader2 size={36} className="text-indigo-400 animate-spin-slow mb-6" />

      {/* Text */}
      <div className="text-center animate-fade-in">
        <p className="text-lg text-slate-300 font-medium">Shutting down GuruKid...</p>
        <p className="text-xs text-slate-600 mt-2">Please wait</p>
      </div>
    </div>
  );
}
