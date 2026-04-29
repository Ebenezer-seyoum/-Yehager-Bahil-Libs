import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Ruler, BookOpen, AlertCircle } from "lucide-react";
import MeasurementVideo from "./MeasurementVideo";
import MeasurementGuide from "./MeasurementGuide";
import { useT } from "@/lib/i18n/I18nContext";
import { inchesToCm, cmToInches } from "@/lib/units";

// Standard tailoring measurement fields by gender
// NOTE: values are STORED in inches in the database, but the UI is CM-only.
const FIELDS_MALE = [
  { key: "neck", labelKey: "meas.field.neck", required: true, hintKey: "meas.hint.neck" },
  { key: "chest", labelKey: "meas.field.chest", required: true, hintKey: "meas.hint.chest" },
  { key: "shoulder_width", labelKey: "meas.field.shoulder_width", required: true, hintKey: "meas.hint.shoulder_width" },
  { key: "arm_length", labelKey: "meas.field.arm_length", required: true, hintKey: "meas.hint.arm_length" },
  { key: "torso_length", labelKey: "meas.field.torso_length", required: true, hintKey: "meas.hint.torso_length" },
  { key: "waist", labelKey: "meas.field.waist", required: true, hintKey: "meas.hint.waist" },
  { key: "hips", labelKey: "meas.field.hips", required: true, hintKey: "meas.hint.hips" },
  { key: "inseam", labelKey: "meas.field.inseam", required: true, hintKey: "meas.hint.inseam" },
  { key: "thigh", labelKey: "meas.field.thigh", required: false, hintKey: "meas.hint.thigh" },
  { key: "wrist", labelKey: "meas.field.wrist", required: false, hintKey: "meas.hint.wrist" },
];

const FIELDS_FEMALE = [
  { key: "chest", labelKey: "meas.field.bust", required: true, hintKey: "meas.hint.bust" },
  { key: "underbust", labelKey: "meas.field.underbust", required: true, hintKey: "meas.hint.underbust" },
  { key: "waist", labelKey: "meas.field.waist", required: true, hintKey: "meas.hint.waist" },
  { key: "hips", labelKey: "meas.field.hipsF", required: true, hintKey: "meas.hint.hips" },
  { key: "shoulder_width", labelKey: "meas.field.shoulder_width", required: true, hintKey: "meas.hint.shoulder_width" },
  { key: "arm_length", labelKey: "meas.field.arm_length", required: true, hintKey: "meas.hint.arm_length" },
  { key: "torso_length", labelKey: "meas.field.torso_length", required: true, hintKey: "meas.hint.torso_length" },
  { key: "neck", labelKey: "meas.field.neck", required: false, hintKey: "meas.hint.neck" },
  { key: "inseam", labelKey: "meas.field.inseam", required: false, hintKey: "meas.hint.inseamF" },
  { key: "dress_length", labelKey: "meas.field.dress_length", required: false, hintKey: "meas.hint.dress_length" },
];

export default function MeasurementForm({ gender: genderProp, initialValues, onSubmit, loading }) {
  const { t } = useT();
  const [selectedGender, setSelectedGender] = useState(genderProp || "");
  const fields = selectedGender === "female" ? FIELDS_FEMALE : FIELDS_MALE;
  const [showVideo, setShowVideo] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Display values are always in CM. Storage is in inches, so convert in/out.
  const [displayValues, setDisplayValues] = useState(() => {
    const out = {};
    for (const k of Object.keys(initialValues || {})) {
      const v = initialValues[k];
      if (v === null || v === undefined || v === "") { out[k] = ""; continue; }
      out[k] = inchesToCm(v);
    }
    return out;
  });

  const set = (key, val) => setDisplayValues((prev) => ({ ...prev, [key]: val }));

  const isValid = fields.filter((f) => f.required).every((f) => parseFloat(displayValues[f.key]) > 0);

  const handleSubmit = () => {
    // Always submit in INCHES to keep DB consistent
    const inchValues = {};
    for (const [k, v] of Object.entries(displayValues)) {
      if (v === "" || v === null || v === undefined) continue;
      const n = parseFloat(v);
      if (isNaN(n)) continue;
      inchValues[k] = cmToInches(n);
    }
    onSubmit({ ...inchValues, gender: selectedGender });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold">{t("meas.title")}</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <BookOpen className="w-3 h-3" /> {t("meas.howTo")}
          </button>
          <button
            onClick={() => setShowVideo(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            <Play className="w-3 h-3" /> {t("meas.watchTutorial")}
          </button>
        </div>
      </div>

      {/* CM-only reminder */}
      <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
        <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-semibold text-primary">{t("meas.cmReminderTitle")}</p>
          <p className="text-muted-foreground mt-0.5">{t("meas.cmReminderText")}</p>
        </div>
      </div>

      {/* Gender Selector */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("meas.selectGender")} <span className="text-primary">*</span></label>
        <div className="grid grid-cols-2 gap-2">
          {[{ value: "female", label: `👗 ${t("meas.women")}` }, { value: "male", label: `👔 ${t("meas.men")}` }].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedGender(value)}
              className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                selectedGender === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="text-xs font-medium text-muted-foreground">
              {t(f.labelKey)}{f.required && <span className="text-primary ml-0.5">*</span>}
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="0.0"
                value={displayValues[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background pl-3 pr-10 text-sm"
                title={t(f.hintKey)}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-primary pointer-events-none">
                cm
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t(f.hintKey)}</p>
          </div>
        ))}
      </div>

      <Button onClick={handleSubmit} disabled={!isValid || loading || !selectedGender} className="w-full">
        {loading ? t("meas.saving") : t("meas.save")}
      </Button>

      {showVideo && <MeasurementVideo gender={selectedGender} onClose={() => setShowVideo(false)} />}
      {showGuide && <MeasurementGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}