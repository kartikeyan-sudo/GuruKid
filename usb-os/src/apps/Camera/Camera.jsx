import { useState, useRef, useEffect } from "react";
import { Camera as CameraIcon } from "lucide-react";

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

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        if (!isMounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = mediaStream;
        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = mediaStream;
        }
        setStatus("Camera ready");
      } catch (err) {
        setError("Camera access denied or not available");
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const captureAndSave = async () => {
    if (isSaving) return;
    if (!window.electronAPI) {
      setError("API not available");
      return;
    }

    if (videoRef.current && canvasRef.current) {
      setIsSaving(true);
      setStatus("Saving...");
      const ctx = canvasRef.current.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const captured = canvasRef.current.toDataURL("image/png");

      try {
        const filename = `capture-${Date.now()}.png`;
        const result = window.electronAPI.saveImage(captured, filename);
        if (result.success) {
          window.dispatchEvent(new CustomEvent("os-storage-updated", { detail: { area: "images" } }));
          setStatus("Saved to Gallery");
          setTimeout(() => setStatus("Camera ready"), 1200);
        } else {
          setError(`Error saving image: ${result.error}`);
        }
      } catch (err) {
        console.error("Save error:", err);
        setError(`Save failed: ${err.message}`);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const startRecording = () => {
    if (!streamRef.current) {
      setError("Camera stream not available");
      return;
    }
    try {
      recordedChunksRef.current = [];
      const rec = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp8,opus" });
      mediaRecorderRef.current = rec;

      rec.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      rec.onstop = async () => {
        try {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          if (!blob.size) return;
          const dataUrl = await blobToDataUrl(blob);
          const filename = `recording-${Date.now()}.webm`;
          const result = window.electronAPI?.saveBinary?.(dataUrl, `videos/${filename}`);
          if (result?.success) {
            window.dispatchEvent(new CustomEvent("os-storage-updated", { detail: { area: "videos" } }));
            setStatus("Video saved");
            setTimeout(() => setStatus("Camera ready"), 1200);
          } else {
            setError(`Error saving video: ${result?.error || "Unknown error"}`);
          }
        } catch (err) {
          setError(`Video save failed: ${err.message}`);
        }
      };

      rec.start(300);
      setIsRecording(true);
      setStatus("Recording...");
    } catch (err) {
      setError(`Cannot start recording: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="max-w-full max-h-72 rounded-lg border border-slate-700"
        />
        <button
          onClick={captureAndSave}
          disabled={isSaving || isRecording}
          className="px-6 py-3 rounded-lg bg-accent/30 text-accent border border-accent/60 hover:bg-accent/40 transition flex items-center gap-2 text-lg disabled:opacity-50"
        >
          <CameraIcon size={20} /> {isSaving ? "Saving..." : "Capture"}
        </button>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isSaving}
          className={`px-6 py-3 rounded-lg border transition text-sm ${
            isRecording
              ? "bg-red-500/30 text-red-200 border-red-400/60 hover:bg-red-500/40"
              : "bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700"
          } disabled:opacity-50`}
        >
          {isRecording ? "Stop Recording" : "Start Video Recording"}
        </button>
        <p className="text-xs text-slate-400">{status}</p>
      </div>
      <canvas ref={canvasRef} width={1280} height={720} style={{ display: "none" }} />
    </div>
  );
}
