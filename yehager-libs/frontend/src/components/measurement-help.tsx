"use client";

import { useState } from "react";
import { BookOpen, Play, Ruler, X } from "lucide-react";

const VIDEO_CATEGORIES = {
  female: {
    label: "Women's Tutorials",
    items: [
      {
        label: "Women's Clothing",
        id: "wVZ8JAjMGEY",
        desc: "Full women's measurement guide: bust, waist, hips, torso length, arm, skirt & gown",
        image: "https://media.base44.com/images/public/69cc55fa50bba233144fe99d/b3870ea49_image.png",
      },
    ],
  },
  male: {
    label: "Men's Tutorials",
    items: [
      {
        label: "Men's Clothing",
        id: "-KNbh12GalU",
        desc: "Full men's measurement guide: chest, shoulder, sleeve, waist, hips, inseam & back length",
        image: "https://media.base44.com/images/public/69cc55fa50bba233144fe99d/482e8ecd5_Screenshot2026-04-07135506.png",
      },
    ],
  },
};

type TutorialGender = keyof typeof VIDEO_CATEGORIES;

function normalGender(gender?: string | null): TutorialGender {
  return gender === "male" ? "male" : "female";
}

function MeasurementVideoModal({ gender, onClose }: { gender?: string | null; onClose: () => void }) {
  const [activeGender, setActiveGender] = useState<TutorialGender>(normalGender(gender));
  const [activeIdx, setActiveIdx] = useState(0);
  const category = VIDEO_CATEGORIES[activeGender];
  const video = category.items[activeIdx];

  function handleGenderChange(nextGender: TutorialGender) {
    setActiveGender(nextGender);
    setActiveIdx(0);
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#0a0a0a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1e1e1e] px-5 py-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-white">Measurement Tutorials</h3>
            <p className="mt-0.5 text-xs text-neutral-400">All measurements in inches - watch before you measure</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-white/10" aria-label="Close measurement tutorial">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-[#1e1e1e] p-3">
          {Object.entries(VIDEO_CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleGenderChange(key as TutorialGender)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                activeGender === key ? "bg-[#F5A623] text-black" : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-[#1e1e1e] px-3 py-3">
          {category.items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIdx(index)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                activeIdx === index ? "border-[#F5A623]/40 bg-white/15 text-white" : "border-transparent text-neutral-500 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Play className="h-3 w-3" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="group relative aspect-video bg-black">
          <img src={video.image} alt={video.label} className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40">
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-full bg-[#F5A623] px-6 py-3 text-sm font-bold text-black shadow-xl transition-all hover:scale-105 hover:bg-[#e09515]"
            >
              <Play className="h-5 w-5 fill-black" />
              Watch Tutorial on YouTube
            </a>
            <p className="text-xs text-white/60">Opens in a new tab</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#0f0f0f] px-5 py-3">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F5A623]" />
          <p className="text-xs text-neutral-400">{video.desc}</p>
        </div>
      </div>
    </div>
  );
}

export function MeasurementHelp({ gender }: { gender?: string | null }) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <>
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary" />
            <h3 className="font-heading text-sm font-semibold">Measurements</h3>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <BookOpen className="h-3 w-3" /> How to measure
            </button>
            <button
              type="button"
              onClick={() => setShowVideo(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              <Play className="h-3 w-3" /> Watch Tutorial
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs">
          <p className="font-semibold text-primary">Measure before you save</p>
          <p className="mt-0.5 text-muted-foreground">Watch the Base44 tutorial first, then enter your tailoring measurements carefully.</p>
        </div>
      </div>

      {showVideo ? <MeasurementVideoModal gender={gender} onClose={() => setShowVideo(false)} /> : null}
    </>
  );
}
