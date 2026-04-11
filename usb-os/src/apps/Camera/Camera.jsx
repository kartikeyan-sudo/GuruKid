import { useState, useRef, useEffect } from "react";
import { Camera as CameraIcon, Video, Square } from "lucide-react";

export default function CameraApp() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Camera ready");
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        if (!isMounted) { mediaStream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = mediaStream;
        if (videoRef.current && isMounted) videoRef.current.srcObject = mediaStream;
        setStatus("Camera ready");
      } catch { setError("Camera access denied or not available"); }
    };
    startCamera();
    return () => {
      isMounted = false;
      if (streamRef.current) {
        if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const captureAndSave = async () => {
    if (isSaving || !window.electronAPI) return;
    if (!videoRef.current || !canvasRef.current) return;

    setIsSaving(true);
    setShowFlash(true);
    setStatus("Saving...");

    setTimeout(() => setShowFlash(false), 300);

    const ctx = canvasRef.current.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    const captured = canvasRef.current.toDataURL("image/png");

    try {
      const filename = `capture-${Date.now()}.png`;
      const result = window.electronAPI.saveImage(captured, filename);
      if (result.success) {
        window.dispatchEvent(new CustomEvent("os-storage-updated", { detail: { area: "images" } }));
        setStatus("✓ Saved to Gallery");
        setTimeout(() => setStatus("Camera ready"), 1500);
      } else setError(`Error: ${result.error}`);
    } catch (err) { setError(`Save failed: ${err.message}`); }
    finally { setIsSaving(false); }
  };

  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const startRecording = () => {
    if (!streamRef.current) return;
    try {
      recordedChunksRef.current = [];
      const rec = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp8,opus" });
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data?.size > 0) recordedChunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        if (!blob.size) return;
        const dataUrl = await blobToDataUrl(blob);
        const filename = `recording-${Date.now()}.webm`;
        const result = window.electronAPI?.saveBinary?.(dataUrl, `videos/${filename}`);
        if (result?.success) {
          window.dispatchEvent(new CustomEvent("os-storage-updated", { detail: { area: "videos" } }));
          setStatus("✓ Video saved");
          setTimeout(() => setStatus("Camera ready"), 1500);
        }
      };
      rec.start(300);
      setIsRecording(true);
      setStatus("Recording...");
    } catch (err) { setError(`Cannot record: ${err.message}`); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
            <CameraIcon size={24} className="text-red-400" />
          </div>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-4 relative">
        {/* Viewfinder */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-lg">
          <video ref={videoRef} autoPlay playsInline className="max-w-full max-h-72 rounded-2xl" />

          {/* Flash overlay */}
          {showFlash && (
            <div className="absolute inset-0 bg-white camera-flash rounded-2xl" />
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-white font-medium">REC</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Video record btn */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isSaving}
            className={`p-3 rounded-full transition-all duration-200 ${
              isRecording
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/30"
                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            } disabled:opacity-50`}
          >
            {isRecording ? <Square size={18} /> : <Video size={18} />}
          </button>

          {/* Capture btn - large */}
          <button
            onClick={captureAndSave}
            disabled={isSaving || isRecording}
            className="relative group disabled:opacity-50"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow-lg transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
              <CameraIcon size={24} className="text-white" />
            </div>
            {/* Outer ring */}
            <div className="absolute -inset-1 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-colors" />
          </button>

          {/* Placeholder for symmetry */}
          <div className="w-11 h-11" />
        </div>

        {/* Status */}
        <p className={`text-xs font-medium transition-colors duration-300 ${
          status.startsWith("✓") ? "text-emerald-400" : isRecording ? "text-red-400" : "text-slate-500"
        }`}>
          {status}
        </p>
      </div>
      <canvas ref={canvasRef} width={1280} height={720} style={{ display: "none" }} />
    </div>
  );
}
