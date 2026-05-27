"use client";

import { Heart, ShieldCheck, Smile, Utensils, Zap } from "lucide-react";
import { usePetStore } from "@/lib/store/petStore";

interface StatBarProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function StatBar({ label, icon, value }: StatBarProps) {
  const low = value < 20;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 font-bold text-white/82">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white/[0.06] text-teal-200">
            {icon}
          </span>
          {label}
          {low && <ShieldCheck className="h-3.5 w-3.5 text-red-300" />}
        </span>
        <span className="font-mono text-xs font-bold text-white/55">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="mochi-stat-fill h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function StatsPanel() {
  const { hunger, energy, cleanliness, happiness } = usePetStore();

  return (
    <div className="mochi-panel px-3 py-2.5">
      <h3 className="mb-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/44">
        Stats
      </h3>
      <div className="space-y-2">
        <StatBar label="Hunger" icon={<Utensils className="h-3.5 w-3.5" />} value={hunger} />
        <StatBar label="Energy" icon={<Zap className="h-3.5 w-3.5" />} value={energy} />
        <StatBar label="Cleanliness" icon={<SparkleIcon />} value={cleanliness} />
        <StatBar label="Happiness" icon={<Smile className="h-3.5 w-3.5" />} value={happiness} />
      </div>
    </div>
  );
}

function SparkleIcon() {
  return <Heart className="h-3.5 w-3.5" />;
}
