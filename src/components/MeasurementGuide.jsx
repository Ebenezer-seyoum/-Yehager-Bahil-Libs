import { useState } from "react";
import { X, Ruler, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    id: "tools",
    title: "What You'll Need",
    icon: "📏",
    desc: "Before you start, gather these tools for accurate measurements.",
    items: [
      { label: "Soft Measuring Tape", hint: "A flexible tailor's tape is ideal — never use a rigid ruler." },
      { label: "A Mirror", hint: "Stand in front of a full-length mirror so you can see the tape placement." },
      { label: "Form-fitting Clothes", hint: "Measure over thin, snug clothing or underwear for best accuracy." },
      { label: "A Helper (optional)", hint: "Having someone measure you improves accuracy significantly." },
    ],
    diagram: null,
  },
  {
    id: "chest",
    title: "Chest",
    icon: "👔",
    desc: "Wrap the tape around the fullest part of your chest, keeping it level and parallel to the floor. Breathe normally — don't expand your chest.",
    tip: "The tape should be snug but not tight. You should be able to slide two fingers underneath.",
    svg: (
      <svg viewBox="0 0 200 280" className="w-full h-full">
        {/* Body */}
        <ellipse cx="100" cy="38" rx="22" ry="26" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        {/* Neck */}
        <rect x="90" y="60" width="20" height="18" rx="4" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        {/* Torso */}
        <path d="M58 78 Q52 82 50 100 Q48 130 52 160 Q56 185 100 188 Q144 185 148 160 Q152 130 150 100 Q148 82 142 78 Q130 72 100 72 Q70 72 58 78Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        {/* Left arm */}
        <path d="M58 78 Q42 90 38 120 Q36 140 40 158 Q44 168 50 165 Q56 162 56 148 Q54 130 58 110 Q60 95 65 85Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        {/* Right arm */}
        <path d="M142 78 Q158 90 162 120 Q164 140 160 158 Q156 168 150 165 Q144 162 144 148 Q146 130 142 110 Q140 95 135 85Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        {/* Legs */}
        <path d="M72 188 Q68 220 66 260 Q68 272 78 272 Q88 272 90 260 Q92 240 94 210 Q96 225 100 240" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M128 188 Q132 220 134 260 Q132 272 122 272 Q112 272 110 260 Q108 240 106 210 Q104 225 100 240" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        {/* Chest measurement line */}
        <ellipse cx="100" cy="100" rx="42" ry="12" fill="none" stroke="hsl(38,95%,54%)" strokeWidth="2.5" strokeDasharray="6 3"/>
        {/* Label */}
        <rect x="70" y="88" width="60" height="16" rx="4" fill="hsl(38,95%,54%)" opacity="0.9"/>
        <text x="100" y="99" textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold">CHEST</text>
        {/* Arrows */}
        <line x1="30" y1="100" x2="57" y2="100" stroke="hsl(38,95%,54%)" strokeWidth="1.5"/>
        <polygon points="58,97 58,103 64,100" fill="hsl(38,95%,54%)"/>
        <line x1="170" y1="100" x2="143" y2="100" stroke="hsl(38,95%,54%)" strokeWidth="1.5"/>
        <polygon points="142,97 142,103 136,100" fill="hsl(38,95%,54%)"/>
        <text x="100" y="275" textAnchor="middle" fill="hsl(0,0%,55%)" fontSize="8">Fullest part of chest, parallel to floor</text>
      </svg>
    ),
  },
  {
    id: "waist",
    title: "Waist",
    icon: "⬤",
    desc: "Measure around the narrowest part of your natural waist — typically about 1 inch above your belly button.",
    tip: "Stand relaxed, exhale gently, and measure. Don't suck in your stomach.",
    svg: (
      <svg viewBox="0 0 200 280" className="w-full h-full">
        <ellipse cx="100" cy="38" rx="22" ry="26" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <rect x="90" y="60" width="20" height="18" rx="4" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M58 78 Q52 82 50 100 Q48 130 52 160 Q56 185 100 188 Q144 185 148 160 Q152 130 150 100 Q148 82 142 78 Q130 72 100 72 Q70 72 58 78Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M58 78 Q42 90 38 120 Q36 140 40 158 Q44 168 50 165 Q56 162 56 148 Q54 130 58 110 Q60 95 65 85Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M142 78 Q158 90 162 120 Q164 140 160 158 Q156 168 150 165 Q144 162 144 148 Q146 130 142 110 Q140 95 135 85Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M72 188 Q68 220 66 260 Q68 272 78 272 Q88 272 90 260 Q92 240 94 210 Q96 225 100 240" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M128 188 Q132 220 134 260 Q132 272 122 272 Q112 272 110 260 Q108 240 106 210 Q104 225 100 240" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        {/* Waist measurement line */}
        <ellipse cx="100" cy="132" rx="33" ry="9" fill="none" stroke="hsl(38,95%,54%)" strokeWidth="2.5" strokeDasharray="6 3"/>
        <rect x="70" y="120" width="60" height="16" rx="4" fill="hsl(38,95%,54%)" opacity="0.9"/>
        <text x="100" y="131" textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold">WAIST</text>
        <line x1="30" y1="132" x2="66" y2="132" stroke="hsl(38,95%,54%)" strokeWidth="1.5"/>
        <polygon points="67,129 67,135 73,132" fill="hsl(38,95%,54%)"/>
        <line x1="170" y1="132" x2="134" y2="132" stroke="hsl(38,95%,54%)" strokeWidth="1.5"/>
        <polygon points="133,129 133,135 127,132" fill="hsl(38,95%,54%)"/>
        <text x="100" y="275" textAnchor="middle" fill="hsl(0,0%,55%)" fontSize="8">Narrowest part, ~1 inch above belly button</text>
      </svg>
    ),
  },
  {
    id: "hips",
    title: "Hips",
    icon: "〇",
    desc: "Stand with feet together. Wrap the tape around the fullest part of your hips and seat, about 7–9 inches below the waistline.",
    tip: "Keep the tape parallel to the floor all the way around.",
    svg: (
      <svg viewBox="0 0 200 280" className="w-full h-full">
        <ellipse cx="100" cy="38" rx="22" ry="26" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <rect x="90" y="60" width="20" height="18" rx="4" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M58 78 Q52 82 50 100 Q48 130 52 160 Q56 185 100 188 Q144 185 148 160 Q152 130 150 100 Q148 82 142 78 Q130 72 100 72 Q70 72 58 78Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M58 78 Q42 90 38 120 Q36 140 40 158 Q44 168 50 165 Q56 162 56 148 Q54 130 58 110 Q60 95 65 85Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M142 78 Q158 90 162 120 Q164 140 160 158 Q156 168 150 165 Q144 162 144 148 Q146 130 142 110 Q140 95 135 85Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M72 188 Q68 220 66 260 Q68 272 78 272 Q88 272 90 260 Q92 240 94 210 Q96 225 100 240" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M128 188 Q132 220 134 260 Q132 272 122 272 Q112 272 110 260 Q108 240 106 210 Q104 225 100 240" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        {/* Hips measurement line */}
        <ellipse cx="100" cy="162" rx="46" ry="12" fill="none" stroke="hsl(38,95%,54%)" strokeWidth="2.5" strokeDasharray="6 3"/>
        <rect x="72" y="150" width="56" height="16" rx="4" fill="hsl(38,95%,54%)" opacity="0.9"/>
        <text x="100" y="161" textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold">HIPS</text>
        <line x1="22" y1="162" x2="53" y2="162" stroke="hsl(38,95%,54%)" strokeWidth="1.5"/>
        <polygon points="54,159 54,165 60,162" fill="hsl(38,95%,54%)"/>
        <line x1="178" y1="162" x2="147" y2="162" stroke="hsl(38,95%,54%)" strokeWidth="1.5"/>
        <polygon points="146,159 146,165 140,162" fill="hsl(38,95%,54%)"/>
        <text x="100" y="275" textAnchor="middle" fill="hsl(0,0%,55%)" fontSize="8">Fullest part of hips, 7–9 inches below waist</text>
      </svg>
    ),
  },
  {
    id: "shoulder",
    title: "Shoulder Width",
    icon: "↔",
    desc: "Measure straight across your back from the outer edge of one shoulder to the outer edge of the other.",
    tip: "Have a helper do this one — it's hard to measure accurately on your own.",
    svg: (
      <svg viewBox="0 0 200 280" className="w-full h-full">
        <ellipse cx="100" cy="38" rx="22" ry="26" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <rect x="90" y="60" width="20" height="18" rx="4" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M58 78 Q52 82 50 100 Q48 130 52 160 Q56 185 100 188 Q144 185 148 160 Q152 130 150 100 Q148 82 142 78 Q130 72 100 72 Q70 72 58 78Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M58 78 Q42 90 38 120 Q36 140 40 158 Q44 168 50 165 Q56 162 56 148 Q54 130 58 110 Q60 95 65 85Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M142 78 Q158 90 162 120 Q164 140 160 158 Q156 168 150 165 Q144 162 144 148 Q146 130 142 110 Q140 95 135 85Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M72 188 Q68 220 66 260 Q68 272 78 272 Q88 272 90 260 Q92 240 94 210 Q96 225 100 240" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M128 188 Q132 220 134 260 Q132 272 122 272 Q112 272 110 260 Q108 240 106 210 Q104 225 100 240" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        {/* Shoulder measurement line */}
        <line x1="56" y1="82" x2="144" y2="82" stroke="hsl(38,95%,54%)" strokeWidth="2.5"/>
        <circle cx="56" cy="82" r="4" fill="hsl(38,95%,54%)"/>
        <circle cx="144" cy="82" r="4" fill="hsl(38,95%,54%)"/>
        {/* Vertical tick marks */}
        <line x1="56" y1="76" x2="56" y2="88" stroke="hsl(38,95%,54%)" strokeWidth="2"/>
        <line x1="144" y1="76" x2="144" y2="88" stroke="hsl(38,95%,54%)" strokeWidth="2"/>
        <rect x="64" y="70" width="72" height="16" rx="4" fill="hsl(38,95%,54%)" opacity="0.9"/>
        <text x="100" y="81" textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold">SHOULDER</text>
        <text x="100" y="275" textAnchor="middle" fill="hsl(0,0%,55%)" fontSize="8">Outer edge to outer edge, across back</text>
      </svg>
    ),
  },
  {
    id: "arm",
    title: "Arm Length",
    icon: "💪",
    desc: "With your arm slightly bent, measure from the top of your shoulder down to your wrist bone.",
    tip: "Bend your arm at 90°, measure from shoulder over the elbow to the wrist for the most accurate sleeve length.",
    svg: (
      <svg viewBox="0 0 200 280" className="w-full h-full">
        <ellipse cx="100" cy="38" rx="22" ry="26" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <rect x="90" y="60" width="20" height="18" rx="4" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M58 78 Q52 82 50 100 Q48 130 52 160 Q56 185 100 188 Q144 185 148 160 Q152 130 150 100 Q148 82 142 78 Q130 72 100 72 Q70 72 58 78Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        {/* Left arm extended slightly for visibility */}
        <path d="M58 78 Q42 90 36 120 Q32 145 34 165 Q38 175 46 172 Q54 169 54 155 Q52 135 56 112 Q58 95 64 85Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M142 78 Q158 90 162 120 Q164 140 160 158 Q156 168 150 165 Q144 162 144 148 Q146 130 142 110 Q140 95 135 85Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M72 188 Q68 220 66 260 Q68 272 78 272 Q88 272 90 260 Q92 240 94 210 Q96 225 100 240" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M128 188 Q132 220 134 260 Q132 272 122 272 Q112 272 110 260 Q108 240 106 210 Q104 225 100 240" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        {/* Arm measurement line */}
        <line x1="58" y1="80" x2="44" y2="170" stroke="hsl(38,95%,54%)" strokeWidth="2.5" strokeDasharray="5 3"/>
        <circle cx="58" cy="80" r="5" fill="hsl(38,95%,54%)"/>
        <circle cx="44" cy="170" r="5" fill="hsl(38,95%,54%)"/>
        {/* Label with connector */}
        <line x1="44" y1="125" x2="14" y2="125" stroke="hsl(38,95%,54%)" strokeWidth="1" strokeDasharray="3 2"/>
        <text x="12" y="110" fill="hsl(38,95%,54%)" fontSize="8" fontWeight="bold" textAnchor="middle">ARM</text>
        <text x="12" y="121" fill="hsl(38,95%,54%)" fontSize="8" fontWeight="bold" textAnchor="middle">LEN.</text>
        <text x="100" y="275" textAnchor="middle" fill="hsl(0,0%,55%)" fontSize="8">Shoulder point to wrist bone, arm slightly bent</text>
      </svg>
    ),
  },
  {
    id: "torso",
    title: "Torso Length",
    icon: "📐",
    desc: "Measure from the top of your shoulder (at the base of your neck) straight down to your natural waistline.",
    tip: "This determines the body length of your garment. Keep the tape straight and vertical.",
    svg: (
      <svg viewBox="0 0 200 280" className="w-full h-full">
        <ellipse cx="100" cy="38" rx="22" ry="26" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <rect x="90" y="60" width="20" height="18" rx="4" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M58 78 Q52 82 50 100 Q48 130 52 160 Q56 185 100 188 Q144 185 148 160 Q152 130 150 100 Q148 82 142 78 Q130 72 100 72 Q70 72 58 78Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M58 78 Q42 90 38 120 Q36 140 40 158 Q44 168 50 165 Q56 162 56 148 Q54 130 58 110 Q60 95 65 85Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M142 78 Q158 90 162 120 Q164 140 160 158 Q156 168 150 165 Q144 162 144 148 Q146 130 142 110 Q140 95 135 85Z" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M72 188 Q68 220 66 260 Q68 272 78 272 Q88 272 90 260 Q92 240 94 210 Q96 225 100 240" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        <path d="M128 188 Q132 220 134 260 Q132 272 122 272 Q112 272 110 260 Q108 240 106 210 Q104 225 100 240" fill="#c8956c" stroke="#a0714f" strokeWidth="1"/>
        {/* Torso measurement line */}
        <line x1="118" y1="72" x2="118" y2="132" stroke="hsl(38,95%,54%)" strokeWidth="2.5" strokeDasharray="5 3"/>
        <circle cx="118" cy="72" r="5" fill="hsl(38,95%,54%)"/>
        <circle cx="118" cy="132" r="5" fill="hsl(38,95%,54%)"/>
        {/* Tick ends */}
        <line x1="112" y1="72" x2="124" y2="72" stroke="hsl(38,95%,54%)" strokeWidth="2"/>
        <line x1="112" y1="132" x2="124" y2="132" stroke="hsl(38,95%,54%)" strokeWidth="2"/>
        {/* Label */}
        <line x1="118" y1="102" x2="148" y2="102" stroke="hsl(38,95%,54%)" strokeWidth="1" strokeDasharray="3 2"/>
        <rect x="148" y="94" width="44" height="16" rx="4" fill="hsl(38,95%,54%)" opacity="0.9"/>
        <text x="170" y="105" textAnchor="middle" fill="#000" fontSize="8" fontWeight="bold">TORSO</text>
        <text x="100" y="275" textAnchor="middle" fill="hsl(0,0%,55%)" fontSize="8">Shoulder base to natural waistline</text>
      </svg>
    ),
  },
];

export default function MeasurementGuide({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" />
            <span className="font-heading font-semibold text-sm">Measurement Guide</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-4 px-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all ${i === step ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-border hover:bg-muted-foreground"}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="text-center mb-4">
            <span className="text-3xl">{current.icon}</span>
            <h2 className="font-heading text-2xl font-bold mt-1">{current.title}</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{current.desc}</p>
          </div>

          {/* Diagram */}
          {current.svg && (
            <div className="w-52 h-64 mx-auto my-4">
              {current.svg}
            </div>
          )}

          {/* Tool list */}
          {current.items && (
            <div className="space-y-3 mt-4">
              {current.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-secondary/40 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          {current.tip && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl">
              <p className="text-xs font-semibold text-primary mb-0.5">💡 Pro Tip</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{current.tip}</p>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <span className="text-xs text-muted-foreground">{step + 1} / {STEPS.length}</span>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={onClose}>
              Done ✓
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}