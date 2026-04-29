import { useState, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export default function ImageZoom({ images, initialIndex = 0, onClose }) {
  const [activeImg, setActiveImg] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef(null);
  const imgRef = useRef(null);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.002)));
  }, []);

  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !dragStart.current) return;
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    if (zoom <= 1) return;
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !dragStart.current) return;
    const touch = e.touches[0];
    setPosition({ x: touch.clientX - dragStart.current.x, y: touch.clientY - dragStart.current.y });
  };

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const changeImage = (i) => {
    setActiveImg(i);
    resetZoom();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">
            <ZoomIn className="w-3.5 h-3.5" /> Zoom In
          </button>
          <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">
            <ZoomOut className="w-3.5 h-3.5" /> Zoom Out
          </button>
          <button onClick={resetZoom} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <span className="text-white/40 text-xs">{Math.round(zoom * 100)}%</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main image */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in" }}
      >
        <img
          ref={imgRef}
          src={images[activeImg]}
          alt="Product zoom"
          draggable={false}
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transition: isDragging ? "none" : "transform 0.15s ease",
            maxWidth: "90vw",
            maxHeight: "75vh",
            objectFit: "contain",
            userSelect: "none",
          }}
          onClick={() => zoom === 1 && setZoom(2)}
        />
      </div>

      {/* Tip */}
      <p className="text-center text-white/30 text-xs py-2">
        Scroll to zoom · Click image to zoom in · Drag when zoomed
      </p>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 pb-4">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => changeImage(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${activeImg === i ? "border-amber-400 scale-110" : "border-white/20 hover:border-white/50"}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}