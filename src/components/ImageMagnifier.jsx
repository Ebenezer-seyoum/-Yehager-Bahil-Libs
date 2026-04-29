import { useState, useRef } from "react";

export default function ImageMagnifier({ src, alt, zoom = 4, lensSize = 180 }) {
  const [lens, setLens] = useState(null);
  const imgRef = useRef(null);

  const handleMove = (clientX, clientY) => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();

    let x = clientX - rect.left;
    let y = clientY - rect.top;

    // Clamp so the lens stays inside the image
    x = Math.max(lensSize / 2, Math.min(rect.width - lensSize / 2, x));
    y = Math.max(lensSize / 2, Math.min(rect.height - lensSize / 2, y));

    // Background position for the zoomed image inside the lens
    const bgX = (x / rect.width) * 100;
    const bgY = (y / rect.height) * 100;

    setLens({ x, y, bgX, bgY, w: rect.width, h: rect.height });
  };

  const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);
  const handleTouchMove = (e) => {
    e.preventDefault();
    const t = e.touches[0];
    handleMove(t.clientX, t.clientY);
  };

  return (
    <div
      className="relative w-full h-full select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setLens(null)}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setLens(null)}
      style={{ cursor: "crosshair" }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Lens overlay */}
      {lens && (
        <div
          style={{
            position: "absolute",
            left: lens.x - lensSize / 2,
            top: lens.y - lensSize / 2,
            width: lensSize,
            height: lensSize,
            borderRadius: "50%",
            border: "3px solid rgba(201,136,46,0.8)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            backgroundImage: `url(${src})`,
            backgroundSize: `${lens.w * zoom}px ${lens.h * zoom}px`,
            backgroundPosition: `${lens.bgX}% ${lens.bgY}%`,
            imageRendering: "crisp-edges",
            backgroundRepeat: "no-repeat",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}

      {/* Zoom badge */}
      {!lens && (
        <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 pointer-events-none">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Hover to magnify
        </div>
      )}
    </div>
  );
}