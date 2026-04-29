import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, User } from "lucide-react";

const FIELDS_MALE = [
  { key: "neck", label: "Neck", required: true, hint: "Around base of neck" },
  { key: "chest", label: "Chest", required: true, hint: "Fullest part of chest" },
  { key: "shoulder_width", label: "Shoulder Width", required: true, hint: "Shoulder seam to seam" },
  { key: "arm_length", label: "Sleeve Length", required: true, hint: "Shoulder to wrist" },
  { key: "torso_length", label: "Back Length", required: true, hint: "Nape of neck to waist" },
  { key: "waist", label: "Waist", required: true, hint: "Natural waistline" },
  { key: "hips", label: "Hips / Seat", required: true, hint: "Fullest part of hips" },
  { key: "inseam", label: "Inseam", required: false, hint: "Crotch to ankle" },
  { key: "wrist", label: "Wrist", required: false, hint: "Around wrist bone" },
];

const FIELDS_FEMALE = [
  { key: "chest", label: "Bust", required: true, hint: "Fullest part of bust" },
  { key: "underbust", label: "Underbust", required: true, hint: "Directly under bust" },
  { key: "waist", label: "Waist", required: true, hint: "Narrowest part of torso" },
  { key: "hips", label: "Hips", required: true, hint: "Fullest part of hips" },
  { key: "shoulder_width", label: "Shoulder Width", required: true, hint: "Shoulder seam to seam" },
  { key: "arm_length", label: "Sleeve Length", required: true, hint: "Shoulder point to wrist" },
  { key: "torso_length", label: "Back Length", required: true, hint: "Nape of neck to waist" },
  { key: "neck", label: "Neck", required: false, hint: "Around base of neck" },
  { key: "inseam", label: "Inseam", required: false, hint: "Crotch to ankle" },
  { key: "dress_length", label: "Dress Length", required: false, hint: "Nape of neck to hem" },
];

const RELATIONS = ["Myself", "Husband", "Wife", "Son", "Daughter", "Other"];

export default function AddFamilyMemberModal({ onSave, onClose }) {
  const [step, setStep] = useState(1); // 1=info, 2=measurements
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [relation, setRelation] = useState("");
  const [measurements, setMeasurements] = useState({});

  const fields = gender === "female" ? FIELDS_FEMALE : FIELDS_MALE;
  const setM = (key, val) => setMeasurements((prev) => ({ ...prev, [key]: val ? parseFloat(val) : "" }));
  const requiredDone = fields.filter((f) => f.required).every((f) => measurements[f.key] > 0);

  const handleSave = () => {
    onSave({ name, gender, relation, measurements });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-semibold text-lg">Add Family Member</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Step indicators */}
          <div className="flex gap-2">
            {["Member Info", "Measurements"].map((s, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${step > i ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Full Name <span className="text-primary">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Abebe Kebede"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">Gender <span className="text-primary">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {["male", "female"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`py-3 rounded-xl border-2 font-medium capitalize text-sm transition-all ${
                        gender === g ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {g === "male" ? "👔 Male" : "👗 Female"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">Relation <span className="text-primary">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {RELATIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRelation(r)}
                      className={`py-2 rounded-xl border-2 font-medium text-sm transition-all ${
                        relation === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!name.trim() || !gender || !relation}
                onClick={() => setStep(2)}
              >
                Continue to Measurements →
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-secondary/40 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{name}</span> · {gender === "female" ? "Women's" : "Men's"} measurements (inches)
              </div>
              <div className="grid grid-cols-2 gap-3">
                {fields.map((f) => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-muted-foreground">
                      {f.label}{f.required && <span className="text-primary ml-0.5">*</span>}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="0.0"
                      value={measurements[f.key] || ""}
                      onChange={(e) => setM(f.key, e.target.value)}
                      className="mt-1 w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                      title={f.hint}
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{f.hint}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
                <Button className="flex-1" disabled={!requiredDone} onClick={handleSave}>
                  Add to Family Group ✓
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}