"use client";

import { useState } from "react";

export function ProductDetailGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [magnify, setMagnify] = useState(false);
  const activeImage = images[activeIndex];

  return (
    <>
      <div className="space-y-3">
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl">
          {activeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeImage}
              alt={alt}
              className={`h-full w-full object-cover transition-transform duration-300 ${magnify ? "scale-125 cursor-zoom-in" : ""}`}
              onClick={() => setZoomOpen(true)}
            />
          ) : null}
          <button
            type="button"
            onClick={() => setMagnify((value) => !value)}
            className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs ${magnify ? "bg-primary text-primary-foreground" : "bg-black/70 text-white"}`}
          >
            {magnify ? "Stop magnify" : "Use magnifier"}
          </button>
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white"
          >
            Open zoom
          </button>
        </div>
        {images.length > 1 ? (
          <div className="grid grid-cols-5 gap-2">
            {images.map((img, index) => (
              <button
                type="button"
                key={img}
                onClick={() => setActiveIndex(index)}
                className={`aspect-square overflow-hidden rounded-lg border-2 ${index === activeIndex ? "border-primary" : "border-transparent"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {zoomOpen && activeImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setZoomOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeImage} alt={alt} className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      ) : null}
    </>
  );
}
