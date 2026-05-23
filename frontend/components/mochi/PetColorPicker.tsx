"use client";

import { useState } from "react";
import { Cat, Palette } from "lucide-react";
import { usePetStore } from "@/lib/store/petStore";

const PRESETS = [
  { name: "Sandy", hex: "#F4A460" },
  { name: "Orange", hex: "#FF8C42" },
  { name: "Cream", hex: "#FFF5DC" },
  { name: "Grey", hex: "#9E9E9E" },
  { name: "Black", hex: "#2D2D2D" },
  { name: "White", hex: "#F8F8F8" },
  { name: "Pink", hex: "#FFB6C1" },
  { name: "Blue", hex: "#87CEEB" },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface Props {
  onClose: () => void;
}

export function PetColorPicker({ onClose }: Props) {
  const { petColor, setPetColor, isLoading } = usePetStore();
  const [selected, setSelected] = useState(petColor);
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState("");

  const handleCustomChange = (v: string) => {
    setCustom(v);
    setCustomError("");
    if (v && HEX_RE.test(v)) setSelected(v);
  };

  const handleApply = async () => {
    if (!HEX_RE.test(selected)) {
      setCustomError("Must be a valid hex color (#RRGGBB)");
      return;
    }
    await setPetColor(selected);
    onClose();
  };

  return (
    <div className="mochi-panel space-y-5 p-4">
      <h3 className="flex items-center gap-2 text-lg font-black">
        <Palette className="h-5 w-5 text-teal-200" />
        Customize Mochi Color
      </h3>

      <div className="flex justify-center">
        <div
          className="grid h-24 w-24 place-items-center rounded-full shadow-lg transition-all duration-300"
          style={{ background: selected, boxShadow: `0 0 28px ${selected}88` }}
        >
          <Cat className="h-12 w-12 text-black/70" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map(({ name, hex }) => (
          <button
            key={hex}
            title={name}
            onClick={() => { setSelected(hex); setCustom(""); }}
            className={`h-11 rounded-2xl border-2 transition-all ${
              selected === hex ? "scale-105 border-teal-200" : "border-transparent hover:border-white/40"
            }`}
            style={{ background: hex }}
          />
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-white/55">Custom hex color</label>
        <input
          type="text"
          value={custom}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="#FF8C42"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold outline-none focus:border-teal-300/60 placeholder:text-white/32"
        />
        {customError && <p className="text-xs font-bold text-red-300">{customError}</p>}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleApply}
          disabled={isLoading}
          className="mochi-primary-button flex-1 px-4 py-2 text-sm"
        >
          Apply
        </button>
        <button
          onClick={onClose}
          className="mochi-ghost-button flex-1 px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
