import { useMemo } from "react";
import { Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { useMediaStore } from "../../store/mediaStore.js";

export default function ImageViewerApp() {
  const { mediaItems, currentIndex, nextMedia, prevMedia } = useMediaStore();
  const currentPath = mediaItems[currentIndex] || null;

  const isVideo = useMemo(() => /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(currentPath || ""), [currentPath]);

  const imageUrl = useMemo(() => {
    if (!currentPath || !window.electronAPI) return "";
    return (
      (isVideo ? "" : window.electronAPI.getImageDataUrl?.(currentPath)) ||
      window.electronAPI.getFileUrl?.(currentPath) ||
      ""
    );
  }, [currentPath, isVideo]);

  if (!currentPath) {
    return (
      <div className="h-full grid place-items-center text-slate-400">
        <div className="text-center space-y-2">
          <Maximize2 className="mx-auto" size={28} />
          <p>No image selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
      {isVideo ? (
        <video src={imageUrl} controls autoPlay className="max-w-full max-h-full object-contain" />
      ) : (
        <img
          src={imageUrl}
          alt="Fullscreen preview"
          className="max-w-full max-h-full object-contain"
        />
      )}

      {mediaItems.length > 1 && (
        <>
          <button
            onClick={prevMedia}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 border border-slate-700 text-slate-200 hover:bg-black/70"
            title="Previous"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextMedia}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 border border-slate-700 text-slate-200 hover:bg-black/70"
            title="Next"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-slate-300 bg-black/60 px-2 py-1 rounded">
        {currentIndex + 1} / {mediaItems.length}
      </div>
    </div>
  );
}
