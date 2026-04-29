import { useState } from "react";
import { X, Play } from "lucide-react";

const VIDEO_CATEGORIES = {
  female: {
    label: "Women's Tutorials",
    items: [
      { label: "Women's Clothing", id: "wVZ8JAjMGEY", desc: "Full women's measurement guide: bust, waist, hips, torso length, arm, skirt & gown" },
    ],
  },
  male: {
    label: "Men's Tutorials",
    items: [
      { label: "Men's Clothing", id: "-KNbh12GalU", desc: "Full men's measurement guide: chest, shoulder, sleeve, waist, hips, inseam & back length" },
    ],
  },
};

export default function MeasurementVideo({ gender, onClose }) {
  const defaultGender = gender === "male" ? "male" : "female";
  const [activeGender, setActiveGender] = useState(defaultGender);
  const [activeIdx, setActiveIdx] = useState(0);

  const category = VIDEO_CATEGORIES[activeGender];
  const video = category.items[activeIdx];

  const handleGenderChange = (g) => {
    setActiveGender(g);
    setActiveIdx(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <div>
            <h3 className="font-heading font-semibold text-white text-lg">Measurement Tutorials</h3>
            <p className="text-xs text-neutral-400 mt-0.5">All measurements in inches — watch before you measure</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Gender Toggle */}
        <div className="flex gap-1 p-3 border-b border-[#1e1e1e]">
          {Object.entries(VIDEO_CATEGORIES).map(([g, cat]) => (
            <button
              key={g}
              onClick={() => handleGenderChange(g)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeGender === g
                  ? "bg-[#F5A623] text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Garment Category Selector */}
        <div className="flex gap-2 px-3 py-3 border-b border-[#1e1e1e] overflow-x-auto">
          {category.items.map((item, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeIdx === i
                  ? "bg-white/15 text-white border border-[#F5A623]/40"
                  : "text-neutral-500 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Play className="w-3 h-3" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Video */}
        <div className="relative aspect-video bg-black group">
          <img
            src={activeGender === "male"
              ? "https://media.base44.com/images/public/69cc55fa50bba233144fe99d/482e8ecd5_Screenshot2026-04-07135506.png"
              : "https://media.base44.com/images/public/69cc55fa50bba233144fe99d/b3870ea49_image.png"
            }
            alt={video.label}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-4">
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[#F5A623] hover:bg-[#e09515] text-black font-bold px-6 py-3 rounded-full shadow-xl transition-all hover:scale-105 text-sm"
            >
              <Play className="w-5 h-5 fill-black" />
              Watch Tutorial on YouTube
            </a>
            <p className="text-white/60 text-xs">Opens in a new tab</p>
          </div>
        </div>

        {/* Caption */}
        <div className="px-5 py-3 bg-[#0f0f0f] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] flex-shrink-0" />
          <p className="text-xs text-neutral-400">{video.desc}</p>
        </div>
      </div>
    </div>
  );
}