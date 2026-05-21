"use client";

import { Maximize2, Search, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

export function ProductDetailGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [magnify, setMagnify] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [lens, setLens] = useState<{ x: number; y: number; bgX: number; bgY: number; w: number; h: number } | null>(null);
  const activeImage = images[activeIndex];

  function moveLens(event: React.MouseEvent<HTMLDivElement>) {
    if (!magnify || !activeImage) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const lensSize = 150;
    const x = Math.max(lensSize / 2, Math.min(rect.width - lensSize / 2, event.clientX - rect.left));
    const y = Math.max(lensSize / 2, Math.min(rect.height - lensSize / 2, event.clientY - rect.top));
    setLens({
      x,
      y,
      bgX: (x / rect.width) * 100,
      bgY: (y / rect.height) * 100,
      w: rect.width,
      h: rect.height,
    });
  }

  return (
    <>
      <div className="space-y-3">
        <div
          className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-secondary"
          onMouseMove={moveLens}
          onMouseLeave={() => setLens(null)}
        >
          {activeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeImage}
              alt={alt}
              className="h-full w-full object-cover"
              onClick={() => setZoomOpen(true)}
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png"
                alt="Yehager Bahil Libs"
                className="h-28 w-28 rounded-full object-cover opacity-75"
              />
            </div>
          )}
          {magnify && lens && activeImage ? (
            <div
              className="pointer-events-none absolute z-10 rounded-full border-2 border-primary shadow-2xl"
              style={{
                left: lens.x - 75,
                top: lens.y - 75,
                width: 150,
                height: 150,
                backgroundImage: `url(${activeImage})`,
                backgroundSize: `${lens.w * 2.6}px ${lens.h * 2.6}px`,
                backgroundPosition: `${lens.bgX}% ${lens.bgY}%`,
                backgroundRepeat: "no-repeat",
              }}
            />
          ) : null}
          <button
            type="button"
            onClick={() => setMagnify((value) => !value)}
            className={`absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              magnify ? "bg-primary text-primary-foreground" : "bg-black/70 text-white hover:bg-black/85"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            {magnify ? "Stop Magnifier" : "Use Magnifier"}
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setZoomOpen(true);
            }}
            className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-black/85"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Full Screen
          </button>
        </div>
        {images.length > 1 ? (
          <div className="grid grid-cols-5 gap-2">
            {images.map((img, index) => (
              <button
                type="button"
                key={img}
                onClick={() => setActiveIndex(index)}
                className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${index === activeIndex ? "border-primary" : "border-transparent hover:border-primary/50"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {zoomOpen && activeImage ? (
        <div className="fixed inset-0 z-[120] flex flex-col bg-black/95" onClick={(event) => event.target === event.currentTarget && setZoomOpen(false)}>
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setZoom((value) => Math.min(4, value + 0.5))} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20">
                <ZoomIn className="h-3.5 w-3.5" />
                Zoom In
              </button>
              <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 0.5))} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20">
                <ZoomOut className="h-3.5 w-3.5" />
                Zoom Out
              </button>
              <span className="text-xs text-white/50">{Math.round(zoom * 100)}%</span>
            </div>
            <button type="button" onClick={() => setZoomOpen(false)} className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close full screen image">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden p-4" onClick={() => setZoom((value) => (value === 1 ? 2 : value))}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage}
              alt={alt}
              className="max-h-[82vh] max-w-[92vw] rounded-xl object-contain transition-transform"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          </div>
          {images.length > 1 ? (
            <div className="flex justify-center gap-2 px-4 pb-4">
              {images.map((img, index) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => {
                    setActiveIndex(index);
                    setZoom(1);
                  }}
                  className={`h-14 w-14 overflow-hidden rounded-lg border-2 ${activeIndex === index ? "border-primary" : "border-white/20"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
